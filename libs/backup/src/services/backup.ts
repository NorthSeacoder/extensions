import { mkdir, stat, unlink, rmdir } from 'fs/promises'
import path from 'path'
import type { Config, Source, CompressionConfig } from '../types'
import logger from '../utils/logger'
import { formatSize } from '../utils'
import { readdir } from 'fs/promises'
import { writeFile } from 'fs/promises'
import fs from 'fs/promises'
import archiver from 'archiver'
import { createWriteStream, createReadStream } from 'fs'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { pipeline } from 'stream/promises'

export class BackupService {
  private readonly config: Config

  constructor(config: Config) {
    this.config = config
  }

  async createBackup(source: Source): Promise<string> {
    const globalStartTime = Date.now()
    await this.validateSource(source)
    const tempFiles: string[] = []
    try {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const firstZipName = `backup_${source.type}_${timestamp}_1.zip`
      const finalZipName = `backup_${source.type}_${timestamp}.zip`

      const tempDir = path.join(this.config.backup.dir, 'temp')
      const firstZipPath = path.join(tempDir, firstZipName)
      const finalZipPath = path.join(this.config.backup.dir, source.type, finalZipName)

      await mkdir(tempDir, { recursive: true })
      await mkdir(path.dirname(finalZipPath), { recursive: true })

      const lockFile = path.join(tempDir, `${firstZipName}.lock`)
      tempFiles.push(lockFile, firstZipPath)
      await this.createLockFile(lockFile)

      // 获取原始文件大小
      const originalSize = await this.calculateSize(source.path)

      const compressionStartTime = Date.now()

      // 记录第一次压缩开始
      logger.info('开始第一次压缩', {
        source: source.path,
        destination: firstZipPath,
      })
      await this.createEncryptedZip(source.path, firstZipPath, this.config.backup.compression.first)
      const firstZipStats = await stat(firstZipPath)
      const firstCompressionDuration = Date.now() - compressionStartTime

      logger.info('第一次压缩完成', {
        size: formatSize(firstZipStats.size),
        duration: this.formatDuration(firstCompressionDuration / 1000),
        compressionRatio: `${((1 - firstZipStats.size / originalSize) * 100).toFixed(2)}%`,
      })

      // 记录第二次压缩开始
      const secondStartTime = Date.now()
      logger.info('开始第二次压缩', {
        source: firstZipPath,
        destination: finalZipPath,
      })
      await this.createEncryptedZip(firstZipPath, finalZipPath, this.config.backup.compression.second)
      const secondCompressionDuration = Date.now() - secondStartTime

      const endTime = Date.now()
      const totalCompressionDuration = endTime - compressionStartTime
      const totalDuration = endTime - globalStartTime
      const stats = await stat(finalZipPath)

      // 添加详细的完成日志
      logger.info('备份完成', {
        source: source.path,
        sourceSize: formatSize(originalSize),
        destination: finalZipPath,
        finalSize: formatSize(stats.size),
        firstCompressionDuration: this.formatDuration(firstCompressionDuration / 1000),
        secondCompressionDuration: this.formatDuration(secondCompressionDuration / 1000),
        compressionDuration: this.formatDuration(totalCompressionDuration / 1000),
        totalDuration: this.formatDuration(totalDuration / 1000),
        finalCompressionRatio: `${((1 - stats.size / originalSize) * 100).toFixed(2)}%`,
      })

      await this.cleanupTemp(firstZipPath)
      return finalZipPath
    } catch (error) {
      const failDuration = (Date.now() - globalStartTime) / 1000
      logger.error('备份失败', {
        error: error as Error,
        duration: this.formatDuration(failDuration),
      })
      await Promise.all(tempFiles.map((file) => this.cleanupTemp(file).catch(() => {})))
      throw error
    }
  }

  private async createLockFile(lockPath: string): Promise<void> {
    const lockContent = {
      timestamp: new Date().toISOString(),
      pid: process.pid,
    }
    await writeFile(lockPath, JSON.stringify(lockContent))
  }

  private async validateSource(source: Source): Promise<void> {
    logger.info('开始验证备份源', {
      type: source.type,
      path: source.path,
    })
    if (!source.path) {
      throw new Error('备份源路径不能为空')
    }

    try {
      const stats = await stat(source.path)

      if (!stats.isDirectory() && !stats.isFile()) {
        throw new Error(`无效的备份源类型: ${source.path}`)
      }

      logger.debug('备份源验证通过', {
        type: source.type,
        path: source.path,
        size: formatSize(stats.size),
      })
    } catch (error) {
      console.log(error)
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`备份源路径不存在: ${source.path}`)
      }
      throw error
    }
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分${Math.round(seconds % 60)}秒`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}时${minutes}分`
    }
  }

  private async createEncryptedZip(sourcePath: string, destPath: string, config: CompressionConfig): Promise<void> {
    const maxRetries = 3
    let attempt = 0
    const volumeSize = 2 * 1024 * 1024 * 1024 // 2GB per volume

    while (attempt < maxRetries) {
      try {
        const stats = await fs.stat(sourcePath)
        const totalSize = stats.size

        if (totalSize > volumeSize) {
          // 分卷处理 - 使用并行处理
          logger.info('文件较大，使用并行分卷压缩', {
            size: formatSize(totalSize),
            volumeSize: formatSize(volumeSize),
          })

          const baseDir = path.dirname(destPath)
          const baseName = path.basename(destPath, '.zip')
          const totalVolumes = Math.ceil(totalSize / volumeSize)

          // 创建所有分卷的任务
          const tasks = []
          for (let volumeIndex = 1; volumeIndex <= totalVolumes; volumeIndex++) {
            const volumePath = path.join(baseDir, `${baseName}.z${String(volumeIndex).padStart(2, '0')}`)
            const offset = (volumeIndex - 1) * volumeSize
            const currentVolumeSize = Math.min(volumeSize, totalSize - offset)

            tasks.push(
              this.createVolumeFile(
                sourcePath,
                volumePath,
                config,
                offset,
                currentVolumeSize,
                volumeIndex,
                totalVolumes,
              ),
            )
          }

          // 并行执行压缩任务，但限制并发数
          const concurrency = 3 // 根据CPU核心数调整
          for (let i = 0; i < tasks.length; i += concurrency) {
            const batch = tasks.slice(i, i + concurrency)
            await Promise.all(batch)
          }

          logger.info('并行分卷压缩完成', {
            volumes: totalVolumes,
            totalSize: formatSize(totalSize),
          })
        } else {
          // 单文件压缩
          await this.createSingleVolume(sourcePath, destPath, config)
        }
        return
      } catch (error) {
        attempt++
        if (attempt >= maxRetries) {
          logger.error('压缩失败，已达到最大重试次数', error as Error)
          throw error
        }
        await new Promise((resolve) => setTimeout(resolve, 5000 * attempt))
      }
    }
  }

  private async createVolumeFile(
    sourcePath: string,
    volumePath: string,
    config: CompressionConfig,
    offset: number,
    size: number,
    volumeIndex: number,
    totalVolumes: number,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const key = createHash('sha256')
        .update(config.password || '')
        .digest('hex')
        .slice(0, 32)
      const iv = randomBytes(16)
      const cipher = createCipheriv('aes-256-cbc', Buffer.from(key), iv)

      const archive = archiver('zip', {
        zlib: { level: config.level },
      })

      const output = createWriteStream(volumePath)
      output.write(iv)

      // 添加分卷信息到文件头
      const volumeInfo = Buffer.from(
        JSON.stringify({
          index: volumeIndex,
          total: totalVolumes,
          offset: offset,
          size: size,
        }),
      )
      output.write(Buffer.from([volumeInfo.length])) // 写入信息长度
      output.write(volumeInfo) // 写入信息

      let lastBytes = 0
      let lastTime = Date.now()

      archive.on('progress', (progress) => {
        if (size === 0) return // 避免除以零
        const currentVolumePercent = (progress.fs.processedBytes / size) * 100
        const totalPercent = ((volumeIndex - 1) * 100 + currentVolumePercent) / totalVolumes

        const now = Date.now()
        const timeDiff = (now - lastTime) / 1000
        const bytesDiff = progress.fs.processedBytes - lastBytes
        const speed = timeDiff > 0 ? Math.floor(bytesDiff / timeDiff) : 0

        // 根据文件路径判断是第一次还是第二次压缩
        const isSecondCompression = sourcePath.includes('.zip')
        const progressPrefix = isSecondCompression ? '二次压缩' : '压缩中'
        console.log('updateProgressBar', totalPercent, speed, progressPrefix)
        this.updateProgressBar(totalPercent, speed, progressPrefix)

        lastBytes = progress.fs.processedBytes
        lastTime = now
      })

      archive.on('warning', (err) => {
        logger.warn('压缩警告', { volume: volumeIndex, error: err })
      })

      archive.on('error', reject)

      output.on('close', () => {
        logger.info('分卷完成', {
          volume: volumeIndex,
          total: totalVolumes,
          size: formatSize(archive.pointer()),
        })
        resolve()
      })

      archive.pipe(cipher).pipe(output)

      // 根据offset和size读取相应的文件片段
      if (await fs.stat(sourcePath).then((stat) => stat.isDirectory())) {
        archive.directory(sourcePath, false)
      } else {
        const stream = createReadStream(sourcePath, { start: offset, end: offset + size - 1 })
        archive.append(stream, { name: path.basename(sourcePath) })
      }

      await archive.finalize()
    })
  }

  private async createSingleVolume(sourcePath: string, destPath: string, config: CompressionConfig): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const totalSize = await this.calculateSize(sourcePath)
        logger.info('开始单文件压缩', {
          size: formatSize(totalSize),
        })
        const archive = archiver('zip', {
          zlib: { level: config.level },
        })

        const output = createWriteStream(destPath)

        let lastBytes = 0
        let lastTime = Date.now()
        let processedBytes = 0
        let lastUpdateTime = Date.now()
        const updateInterval = 500 // 更新间隔
        
        // 平滑处理速度
        const speedWindow: number[] = []
        const windowSize = 5

        const calculateAverage = (arr: number[]): number => {
          return arr.reduce((a, b) => a + b, 0) / arr.length
        }

        output.on('pipe', (source) => {
          source.on('data', (chunk: Buffer) => {
            processedBytes += chunk.length
            
            const now = Date.now()
            if (now - lastUpdateTime < updateInterval) {
              return
            }
            
            const timeDiff = (now - lastTime) / 1000
            const bytesDiff = processedBytes - lastBytes
            
            // 计算并平滑处理速度
            const currentSpeed = timeDiff > 0 ? Math.floor(bytesDiff / timeDiff) : 0
            speedWindow.push(currentSpeed)
            if (speedWindow.length > windowSize) {
              speedWindow.shift()
            }

            const smoothedSpeed = Math.floor(calculateAverage(speedWindow))
            const percent = (processedBytes / totalSize) * 100
            const isSecondCompression = sourcePath.includes('.zip')
            const progressPrefix = isSecondCompression ? '二次压缩' : '压缩中'

            this.updateProgressBar(
              percent, 
              smoothedSpeed, 
              progressPrefix
            )

            lastBytes = processedBytes
            lastTime = now
            lastUpdateTime = now
          })
        })

        archive.on('warning', (err) => {
          logger.warn('压缩警告', err)
        })

        archive.on('error', reject)

        output.on('close', () => {
          this.updateProgressBar(100, 0, sourcePath.includes('.zip') ? '二次压缩完成' : '压缩完成')
          resolve()
        })

        // 设置压缩管道
        archive.pipe(output)

        // 添加源文件到压缩流
        const stats = await fs.stat(sourcePath)
        if (stats.isDirectory()) {
          archive.directory(sourcePath, false)
        } else {
          archive.file(sourcePath, { name: path.basename(sourcePath) })
        }

        await archive.finalize()
      } catch (error) {
        reject(error)
      }
    })
  }

  // 添加计算文件/目录大小的辅助方法
  private async calculateSize(sourcePath: string): Promise<number> {
    try {
      const stats = await stat(sourcePath)

      if (stats.isFile()) {
        return stats.size
      }

      if (stats.isDirectory()) {
        let totalSize = 0
        const files = await readdir(sourcePath, { withFileTypes: true })

        for (const file of files) {
          const fullPath = path.join(sourcePath, file.name)
          if (file.isFile()) {
            const fileStats = await stat(fullPath)
            totalSize += fileStats.size
          } else if (file.isDirectory()) {
            totalSize += await this.calculateSize(fullPath)
          }
        }

        return totalSize
      }

      return 0
    } catch (error) {
      logger.error('计算文件大小失败', error as Error)
      return 0
    }
  }

  private async mergeAndDecrypt(volumePaths: string[], outputPath: string, password: string): Promise<void> {
    const output = createWriteStream(outputPath)

    for (const volumePath of volumePaths) {
      const input = createReadStream(volumePath)

      // 读取IV
      const ivBuffer = Buffer.alloc(16)
      await new Promise((resolve, reject) => {
        input.once('error', reject)
        input.once('readable', () => {
          input.read(16)
          resolve(null)
        })
      })

      // 读取分卷信息
      const infoLength = (await input.read(1))[0]
      const infoBuffer = await input.read(infoLength)
      const volumeInfo = JSON.parse(infoBuffer.toString())

      const key = createHash('sha256').update(password).digest('hex').slice(0, 32)

      const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key), ivBuffer)
      await pipeline(input, decipher, output)
    }

    output.close()
  }

  // 更新进度条显示方法,添加压缩比信息
  private updateProgressBar(
    percent: number,
    bytesPerSecond: number,
    operation: string = '压缩中'
  ): void {
    const width = 30
    const complete = Math.floor((width * Math.min(percent, 100)) / 100)
    const incomplete = width - complete

    const progressBar = '[' + '='.repeat(complete) + '>' + ' '.repeat(Math.max(0, incomplete - 1)) + ']'
    const speed = bytesPerSecond ? formatSize(bytesPerSecond) + '/s' : 'N/A'
    const percentStr = Math.min(percent, 100).toFixed(1).padStart(5)

    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
    process.stdout.write(`${operation} ${progressBar} ${percentStr}% 速度:${speed}`)
  }

  async cleanOldBackups(type: string): Promise<void> {
    const source = this.config.sources.find((s: { type: string }) => s.type === type)
    if (!source) return

    const typeDir = path.join(this.config.backup.dir, type)
    const retention = source.retention || 7 // 默认保留7天
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retention)

    try {
      const files = await readdir(typeDir)
      const deletionPromises = files
        .filter((file) => file.startsWith(`backup_${type}_`))
        .map(async (file) => {
          const dateStr = file?.split('_')[2]?.split('.')[0]
          const fileDate = new Date(
            parseInt(dateStr?.slice(0, 4) || ''),
            parseInt(dateStr?.slice(4, 6) || '0') - 1,
            parseInt(dateStr?.slice(6, 8) || '0'),
          )

          if (fileDate < cutoffDate) {
            const filePath = path.join(typeDir, file)
            try {
              const stats = await stat(filePath)
              await unlink(filePath)
              logger.info('删除过期备份', {
                file: filePath,
                size: formatSize(stats.size),
                age: Math.floor((Date.now() - fileDate.getTime()) / (1000 * 60 * 60 * 24)) + '天',
              })
            } catch (error) {
              logger.error(`删除文件 ${filePath} 失败`, error as Error)
            }
          }
        })

      await Promise.all(deletionPromises)
    } catch (error) {
      logger.error('清理旧备份失败', error as Error)
      throw error
    }
  }

  private async cleanupTemp(filePath: string): Promise<void> {
    try {
      const startTime = Date.now()

      // 检查文件是否存在
      const exists = await stat(filePath).catch(() => false)
      if (!exists) {
        logger.debug('临时文件已不存在', { file: filePath })
        return
      }

      // 获取文件大小用于日志记录
      const fileStats = await stat(filePath)
      const fileSize = formatSize(fileStats.size)

      // 删除文件
      await unlink(filePath)

      const duration = (Date.now() - startTime) / 1000
      logger.debug('清理临时文件完成', {
        file: filePath,
        size: fileSize,
        duration: this.formatDuration(duration),
      })

      // 如果是最后一个临时文件，尝试删除临时目录
      const tempDir = path.dirname(filePath)
      const remainingFiles = await readdir(tempDir)
      if (remainingFiles.length === 0) {
        try {
          await rmdir(tempDir)
          logger.debug('清理空临时目录', { dir: tempDir })
        } catch (error) {
          logger.warn('清理临时目录失败', { dir: tempDir, error })
        }
      }
    } catch (error) {
      logger.warn('清理临时文件失败', {
        file: filePath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
