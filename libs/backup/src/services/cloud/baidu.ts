import BaiduPCS from 'baidupcs'
import type { Config } from '../../types'
import { BaseCloudStorage, type UploadOptions, type UploadResult } from './base'

export class BaiduCloud extends BaseCloudStorage {
  private client: BaiduPCS

  constructor(config: Config) {
    super(config, 'baidu')
    this.client = new BaiduPCS(config.baidu)
  }

  async validateConfig(): Promise<void> {
    // 验证百度网盘配置是否有效
    if (!this.config.baidu?.accessToken) {
      throw new Error('百度网盘配置无效：缺少 accessToken')
    }
  }

  protected async uploadFile(
    localPath: string,
    remotePath: string,
  ): Promise<UploadResult> {
    try {
      await this.client.upload({
        localPath,
        remotePath,
      })

      return {
        success: true,
        // 百度网盘 API 可能会返回文件 ID 和 URL，具体需要查看 BaiduPCS 的实现
        fileId: remotePath,
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      }
    }
  }

  // 如果 BaiduPCS 支持分片上传，可以实现以下方法
  protected async createUploadSession(fileSize: number): Promise<string> {
    // 实现创建上传会话的逻辑
    throw new Error('百度网盘暂不支持分片上传')
  }

  protected async uploadChunk(): Promise<void> {
    // 实现分片上传的逻辑
    throw new Error('百度网盘暂不支持分片上传')
  }

  protected async completeUpload(sessionId: string): Promise<UploadResult> {
    // 实现完成上传的逻辑
    throw new Error('百度网盘暂不支持分片上传')
  }

  protected override async ensureRemoteDir(remotePath: string): Promise<void> {
    // 确保远程目录存在
    const dir = this.getParentPath(remotePath)
    if (dir !== '.') {
      await this.client.mkdir(dir, { recursive: true })
    }
  }
}
