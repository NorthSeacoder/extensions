import type { Config, ICloudStorage, CloudStorageType } from '../../types'
import logger from '../../utils/logger'
import { calculateSpeed, formatSize, retry } from '../../utils'
import { stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { basename, dirname } from 'path'
import { Readable } from 'stream'

export interface UploadOptions {
  chunkSize?: number // 分片大小,默认4MB
  retryTimes?: number // 重试次数
  retryDelay?: number // 重试延迟(ms)
  onProgress?: (progress: number) => void // 上传进度回调
}

export interface UploadResult {
  success: boolean
  fileId?: string
  url?: string
  error?: Error
}

export abstract class BaseCloudStorage implements ICloudStorage {
  protected config: Config
  protected name: CloudStorageType
  protected defaultOptions: UploadOptions = {
    chunkSize: 4 * 1024 * 1024, // 4MB
    retryTimes: 3,
    retryDelay: 1000,
    onProgress: (progress: number) => {
      logger.debug(`${this.name}上传进度: ${progress}%`)
    },
  }

  constructor(config: Config, name: CloudStorageType) {
    this.config = config
    this.name = name
  }

  // 子类必须实现的方法
  abstract validateConfig(): Promise<void>
  protected abstract uploadFile(localPath: string, remotePath: string, options?: UploadOptions): Promise<UploadResult>
  protected abstract createUploadSession?(fileSize: number): Promise<string>
  protected abstract uploadChunk?(
    sessionId: string,
    chunk: Buffer | Readable,
    start: number,
    end: number,
    total: number,
  ): Promise<void>
  protected abstract completeUpload?(sessionId: string): Promise<UploadResult>

  // 通用上传实现
  async upload(localPath: string, remotePath: string, options?: UploadOptions): Promise<void> {
    const startTime = Date.now()
    const mergedOptions = { ...this.defaultOptions, ...options }

    try {
      // 验证配置
      await this.validateConfig()

      // 获取文件信息
      const stats = await stat(localPath)
      logger.info(`开始上传到${this.name}`, {
        file: localPath,
        size: formatSize(stats.size),
        destination: remotePath,
      })

      // 根据文件大小选择上传方式
      let result: UploadResult
      if (stats.size <= mergedOptions.chunkSize!) {
        // 小文件直接上传
        result = await retry(
          () => this.uploadFile(localPath, remotePath, mergedOptions),
          mergedOptions.retryTimes!,
          mergedOptions.retryDelay!,
        )
      } else {
        // 大文件分片上传
        result = await this.uploadLargeFile(localPath, remotePath, stats.size, mergedOptions)
      }

      if (!result.success) {
        throw result.error || new Error('上传失败')
      }

      // 记录上传统计
      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000
      logger.info(`${this.name}上传完成`, {
        file: localPath,
        size: formatSize(stats.size),
        duration: `${duration}s`,
        speed: calculateSpeed(stats.size, duration * 1000),
        fileId: result.fileId,
        url: result.url,
      })
    } catch (error: unknown) {
      logger.error(`${this.name}上传失败`, error as Error)
      throw error
    }
  }

  // 大文件分片上传
  protected async uploadLargeFile(
    localPath: string,
    remotePath: string,
    fileSize: number,
    options: UploadOptions,
  ): Promise<UploadResult> {
    if (!this.createUploadSession || !this.uploadChunk || !this.completeUpload) {
      return this.uploadFile(localPath, remotePath, options)
    }

    try {
      // 创建上传会话
      const sessionId = await this.createUploadSession(fileSize)
      const chunks = Math.ceil(fileSize / options.chunkSize!)
      let uploaded = 0

      // 分片上传
      for (let i = 0; i < chunks; i++) {
        const start = i * options.chunkSize!
        const end = Math.min(start + options.chunkSize!, fileSize)
        const chunk = createReadStream(localPath, { start, end: end - 1 })

        await retry(
          () => this.uploadChunk!(sessionId, chunk, start, end, fileSize),
          options.retryTimes!,
          options.retryDelay!,
        )

        uploaded += end - start
        options.onProgress?.(Math.floor((uploaded / fileSize) * 100))
      }

      // 完成上传
      return await this.completeUpload(sessionId)
    } catch (error) {
      logger.error('分片上传失败', error as Error)
      throw error
    }
  }

  // 工具方法
  protected async ensureRemoteDir(remotePath: string): Promise<void> {
    // 子类可以覆盖此方法以实现目录创建
    return Promise.resolve()
  }

  protected getFileName(path: string): string {
    return basename(path)
  }

  protected getParentPath(path: string): string {
    return dirname(path)
  }
}
