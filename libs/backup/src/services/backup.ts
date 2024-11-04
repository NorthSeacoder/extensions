import { mkdir, stat, unlink, rmdir } from 'fs/promises'
import path from 'path'
import Seven from 'node-7z'
import sevenBin from '7zip-bin'
import type { Config, Source, CompressionConfig } from '../types'
import logger from '../utils/logger'
import { formatSize } from '../utils'
import { readdir } from 'fs/promises'
import { writeFile } from 'fs/promises'

export class BackupService {
  private readonly config: Config
  private readonly sevenBin: string

  constructor(config: Config) {
    this.config = config
    this.sevenBin = sevenBin.path7za
  }

  async createBackup(source: Source): Promise<string> {
    await this.validateSource(source)
    const tempFiles: string[] = []
    try {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const firstZipName = `backup_${source.type}_${timestamp}_1.7z`
      const finalZipName = `backup_${source.type}_${timestamp}.7z`

      const tempDir = path.join(this.config.backup.dir, 'temp')
      const firstZipPath = path.join(tempDir, firstZipName)
      const finalZipPath = path.join(this.config.backup.dir, source.type, finalZipName)

      await mkdir(tempDir, { recursive: true })
      await mkdir(path.dirname(finalZipPath), { recursive: true })

      // 添加备份锁文件
      const lockFile = path.join(tempDir, `${firstZipName}.lock`)
      tempFiles.push(lockFile, firstZipPath)
      await this.createLockFile(lockFile)

      const startTime = Date.now()

      // 第一次压缩
      await this.createSevenZip(source.path, firstZipPath, this.config.backup.compression.first)
      await this.verifyArchive(firstZipPath, this.config.backup.compression.first)

      // 第二次压缩
      await this.createSevenZip(firstZipPath, finalZipPath, this.config.backup.compression.second)
      await this.verifyArchive(finalZipPath, this.config.backup.compression.second)

      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000
      const stats = await stat(finalZipPath)

      logger.info('双重压缩完成', {
        source: source.path,
        destination: finalZipPath,
        size: formatSize(stats.size),
        duration,
      })

      await this.cleanupTemp(firstZipPath)
      return finalZipPath
    } catch (error) {
      logger.error('备份过程出错', error as Error)
      // 清理所有临时文件
      await Promise.all(tempFiles.map((file) => this.cleanupTemp(file).catch(() => {})))
      throw error
    }
  }

  private async verifyArchive(archivePath: string, config: CompressionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const seven = Seven.test(archivePath, {
        $bin: this.sevenBin,
        password: config.password,
      })

      seven.on('end', resolve)
      seven.on('error', reject)
    })
  }

  private async createLockFile(lockPath: string): Promise<void> {
    const lockContent = {
      timestamp: new Date().toISOString(),
      pid: process.pid,
    }
    await writeFile(lockPath, JSON.stringify(lockContent))
  }

  //   private async calculateChecksum(filePath: string): Promise<string> {
  //     return new Promise((resolve, reject) => {
  //       const hash = createHash('sha256')
  //       const stream = createReadStream(filePath)

  //       stream.on('data', (data) => hash.update(data))
  //       stream.on('end', () => resolve(hash.digest('hex')))
  //       stream.on('error', reject)
  //     })
  //   }

  private async createSevenZip(sourcePath: string, destPath: string, config: CompressionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const seven = Seven.add(destPath, sourcePath, {
        $bin: this.sevenBin,
        password: config.password,
        // @ts-ignore 忽略类型检查，因为 node-7z 类型定义不完整
        mx: config.level,
        m0: `=${config.encryptionMethod}`,
        ssc: 'on',
        mt: 'on',
      })

      let lastProgressReport = Date.now()
      const progressInterval = 1000 // 每秒最多报告一次进度

      seven.on('end', resolve)
      seven.on('error', reject)
      seven.on('progress', (progress: { percent: undefined; bytes: number }) => {
        const now = Date.now()
        if (progress.percent !== undefined && now - lastProgressReport >= progressInterval) {
          lastProgressReport = now
          logger.info(`压缩进度: ${progress.percent}%`, {
            file: path.basename(destPath),
            speed: progress.bytes ? formatSize(progress.bytes) + '/s' : 'N/A',
          })
        }
      })
    })
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
      // 检查文件是否存在
      const exists = await stat(filePath).catch(() => false)
      if (!exists) {
        logger.debug('临时文件已不存在', { file: filePath })
        return
      }

      // 获取文件大小用于日志记录
      const fileStats = await stat(filePath)

      // 删除文件
      await unlink(filePath)

      logger.debug('清理临时文件成功', {
        file: filePath,
        size: formatSize(fileStats.size),
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
      // 如果清理过程中出现错误，记录但不抛出异常
      logger.warn('清理临时文件失败', {
        file: filePath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async validateSource(source: Source): Promise<void> {
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
        size: formatSize(stats.size)
      })
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`备份源路径不存在: ${source.path}`)
      }
      throw error
    }
  }
}
