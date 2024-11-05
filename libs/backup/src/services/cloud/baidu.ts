import { spawn } from 'child_process'
import type { Config } from '../../types'
import { BaseCloudStorage, type UploadResult } from './base'

export class BaiduCloud extends BaseCloudStorage {
  constructor(config: Config) {
    super(config, 'baidu')
  }

  async validateConfig(): Promise<void> {
    // 验证百度网盘配置是否有效
    if (!this.config.cloud.baidu?.accessToken) {
      throw new Error('百度网盘配置无效：缺少 accessToken')
    }

    // 检查 bypy 是否已安装
    try {
      await this.runBypyCommand(['--version'])
    } catch (error) {
      throw new Error('请先安装 bypy: pip install bypy')
    }

    // 检查 bypy 是否已授权
    try {
      await this.runBypyCommand(['info'])
    } catch (error) {
      throw new Error('bypy 未授权，请先运行 bypy auth 完成授权')
    }
  }

  protected async uploadFile(localPath: string, remotePath: string): Promise<UploadResult> {
    try {
      await this.runBypyCommand(['upload', localPath, remotePath])

      return {
        success: true,
        fileId: remotePath,
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      }
    }
  }

  private async runBypyCommand(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('bypy', args)
      let output = ''

      // 收集命令输出
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        output += data.toString()
      })

      process.on('error', (error) => {
        reject(new Error(`bypy 命令执行失败: ${error.message}`))
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`bypy 命令执行失败: ${output}`))
        }
      })
    })
  }

  protected override async ensureRemoteDir(remotePath: string): Promise<void> {
    const dir = this.getParentPath(remotePath)
    if (dir !== '.') {
      await this.runBypyCommand(['mkdir', dir])
    }
  }

  async createUploadSession(): Promise<string> {
    throw new Error('百度网盘不支持分片上传，请使用 uploadFile 方法')
  }

  async uploadChunk(): Promise<void> {
    throw new Error('百度网盘不支持分片上传，请使用 uploadFile 方法')
  }

  async completeUpload(): Promise<UploadResult> {
    throw new Error('百度网盘不支持分片上传，请使用 uploadFile 方法')
  }
}
