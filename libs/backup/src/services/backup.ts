import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { pipeline } from 'stream/promises'
import { createReadStream, createWriteStream } from 'fs'
import { promisify } from 'util'
import path from 'path'
import type { Config, Source } from '../types'
import logger from '../utils/logger'
import { formatSize } from '../utils'
import { readdir } from 'fs/promises'
import { mkdir, stat, unlink } from 'fs/promises'
import * as tar from 'tar'
import { tmpdir } from 'os'

export class BackupService {
  private readonly config: Config

  constructor(config: Config) {
    this.config = config
  }

  async createBackup(source: Source): Promise<string> {
    const globalStartTime = Date.now()
    await this.validateSource(source)

    try {
      const stats = await stat(source.path)
      let sourceFilePath = source.path

      // 如果是目录，先创建临时 tar 文件
      if (stats.isDirectory()) {
        sourceFilePath = await this.createTempTar(source.path)
      }

      // 生成输出文件路径
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const encryptedFileName = `backup_${source.type}_${timestamp}.enc`
      const outputPath = path.join(this.config.backup.dir, source.type, encryptedFileName)

      // 创建目录
      await mkdir(path.dirname(outputPath), { recursive: true })

      // 获取原始文件大小用于进度显示
      const originalSize = await this.calculateSize(sourceFilePath)

      logger.info('开始加密', {
        source: sourceFilePath,
        destination: outputPath,
      })

      // 执行加密
      await this.encryptFile(sourceFilePath, outputPath, originalSize)

      // 如果创建了临时文件，删除它
      if (sourceFilePath !== source.path) {
        await unlink(sourceFilePath)
      }

      const endTime = Date.now()
      const finalStats = await stat(outputPath)

      logger.info('加密完成', {
        source: sourceFilePath,
        sourceSize: formatSize(originalSize),
        destination: outputPath,
        finalSize: formatSize(finalStats.size),
        duration: this.formatDuration((endTime - globalStartTime) / 1000),
      })

      return outputPath
    } catch (error) {
      const failDuration = (Date.now() - globalStartTime) / 1000
      logger.error('加密失败', {
        error: error as Error,
        duration: this.formatDuration(failDuration),
      })
      throw error
    }
  }

  private async encryptFile(sourcePath: string, destPath: string, totalSize: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // 生成加密所需的密钥和 IV
        const password = this.config.encryption.key
        if (!password) {
          throw new Error('未配置加密密钥')
        }

        const salt = randomBytes(32)
        const iv = randomBytes(16)
        const key = (await promisify(scrypt)(password, salt, 32)) as Buffer

        // 创建加密器
        const cipher = createCipheriv('aes-256-gcm', key, iv)

        // 创建读写流
        const input = createReadStream(sourcePath)
        const output = createWriteStream(destPath)

        // 写入加密元数据
        const header = Buffer.concat([
          Buffer.from([1]), // 版本号
          salt, // 32 字节
          iv, // 16 字节
        ])
        output.write(header)

        // 进度追踪
        let processedBytes = 0
        let lastBytes = 0
        let lastTime = Date.now()

        input.on('data', (chunk) => {
          processedBytes += chunk.length

          const now = Date.now()
          const timeDiff = (now - lastTime) / 1000
          if (timeDiff >= 0.5) {
            // 每500ms更新一次进度
            const bytesDiff = processedBytes - lastBytes
            const speed = Math.floor(bytesDiff / timeDiff)
            const percent = (processedBytes / totalSize) * 100

            this.updateProgressBar(percent, speed, '加密中')

            lastBytes = processedBytes
            lastTime = now
          }
        })

        // 错误处理
        const cleanup = () => {
          input.removeAllListeners()
          output.removeAllListeners()
          cipher.removeAllListeners()
        }

        input.on('error', (err) => {
          cleanup()
          reject(err)
        })

        output.on('error', (err) => {
          cleanup()
          reject(err)
        })

        // 完成处理
        output.on('finish', () => {
          cleanup()
          this.updateProgressBar(100, 0, '加密完成')
          resolve()
        })

        // 执行加密流程
        await pipeline(input, cipher, output)

        // 写入认证标签
        output.write(cipher.getAuthTag())
      } catch (error) {
        reject(error)
      }
    })
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

  // 添加计算文件/目录大小的辅助方法
  private async calculateSize(sourcePath: string): Promise<number> {
    const stats = await stat(sourcePath)
    return stats.size
  }

  // 更新进度条显示方法
  private updateProgressBar(percent: number, bytesPerSecond: number, operation: string = '加密中'): void {
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

  private async createTempTar(dirPath: string): Promise<string> {
    const tempFile = path.join(tmpdir(), `backup-${Date.now()}.tar`);
    await tar.create(
      {
        file: tempFile,
        cwd: path.dirname(dirPath),
      },
      [path.basename(dirPath)]
    );

    return tempFile;
  }

  async decryptBackup(encryptedPath: string, outputPath: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('开始解密', {
        source: encryptedPath,
        destination: outputPath,
      });

      // 确保输出目录存在
      await mkdir(path.dirname(outputPath), { recursive: true });
      
      const stats = await stat(encryptedPath);
      await this.decryptFile(encryptedPath, outputPath, stats.size);
      
      const endTime = Date.now();
      const finalStats = await stat(outputPath);
      
      logger.info('解密完成', {
        source: encryptedPath,
        sourceSize: formatSize(stats.size),
        destination: outputPath,
        finalSize: formatSize(finalStats.size),
        duration: this.formatDuration((endTime - startTime) / 1000),
      });
    } catch (error) {
      const failDuration = (Date.now() - startTime) / 1000;
      logger.error('解密失败', {
        error: error as Error,
        duration: this.formatDuration(failDuration),
      });
      throw error;
    }
  }

  private async decryptFile(sourcePath: string, destPath: string, totalSize: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const password = this.config.encryption.key;
        if (!password) {
          throw new Error('未配置解密密钥');
        }

        // 创建读写流
        const input = createReadStream(sourcePath);
        const output = createWriteStream(destPath);

        // 读取文件头
        const headerBuffer = Buffer.alloc(49); // 1(版本) + 32(salt) + 16(iv) 字节
        await new Promise<void>((resolve, reject) => {
          input.once('error', reject);
          input.once('readable', () => {
            const chunk = input.read(49);
            if (!chunk || chunk.length !== 49) {
              reject(new Error('无效的加密文件格式'));
              return;
            }
            chunk.copy(headerBuffer);
            resolve();
          });
        });

        // 解析文件头
        const version = headerBuffer[0];
        if (version !== 1) {
          throw new Error(`不支持的文件版本: ${version}`);
        }

        const salt = headerBuffer.subarray(1, 33);
        const iv = headerBuffer.subarray(33, 49);

        // 派生解密密钥
        const key = await promisify(scrypt)(password, salt, 32) as Buffer;

        // 创建解密器
        const decipher = createDecipheriv('aes-256-gcm', key, iv);

        // 读取认证标签（位于文件末尾）
        const authTagBuffer = Buffer.alloc(16);
        await new Promise<void>((resolve, reject) => {
          input.once('end', () => {
            const chunk = input.read();
            if (chunk) {
              const authTag = chunk.subarray(chunk.length - 16);
              authTag.copy(authTagBuffer);
              decipher.setAuthTag(authTag);
            }
            resolve();
          });
        });

        // 进度追踪
        let processedBytes = 49; // 从文件头之后开始计算
        let lastBytes = processedBytes;
        let lastTime = Date.now();

        input.on('data', (chunk) => {
          processedBytes += chunk.length;
          
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.5) { // 每500ms更新一次进度
            const bytesDiff = processedBytes - lastBytes;
            const speed = Math.floor(bytesDiff / timeDiff);
            const percent = (processedBytes / totalSize) * 100;
            
            this.updateProgressBar(percent, speed, '解密中');
            
            lastBytes = processedBytes;
            lastTime = now;
          }
        });

        // 错误处理
        const cleanup = () => {
          input.removeAllListeners();
          output.removeAllListeners();
          decipher.removeAllListeners();
        };

        input.on('error', (err) => {
          cleanup();
          reject(err);
        });

        output.on('error', (err) => {
          cleanup();
          reject(err);
        });

        // 完成处理
        output.on('finish', () => {
          cleanup();
          this.updateProgressBar(100, 0, '解密完成');
          resolve();
        });

        // 执行解密流程
        await pipeline(
          input,
          decipher,
          output
        );

      } catch (error) {
        reject(error);
      }
    });
  }
}
