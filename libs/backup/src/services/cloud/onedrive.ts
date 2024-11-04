import type { Config } from '../../types'
import { BaseCloudStorage, type UploadOptions, type UploadResult } from './base'
import { ClientSecretCredential } from '@azure/identity'
import { Client } from '@microsoft/microsoft-graph-client'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

export class OneDriveCloud extends BaseCloudStorage {
  private client!: Client

  constructor(config: Config) {
    super(config, 'onedrive')
    this.initClient()
  }

  private async initClient(): Promise<void> {
    const credential = new ClientSecretCredential(
      this.config.onedrive.tenantId,
      this.config.onedrive.clientId,
      this.config.onedrive.clientSecret,
    )

    this.client = Client.initWithMiddleware({
      authProvider: async (done) => {
        try {
          const token = await credential.getToken(['https://graph.microsoft.com/.default'])
          done(null, token?.token || '')
        } catch (error) {
          done(error as Error, '')
        }
      },
    })
  }

  async validateConfig(): Promise<void> {
    if (!this.config.onedrive?.tenantId || !this.config.onedrive?.clientId || !this.config.onedrive?.clientSecret) {
      throw new Error('OneDrive配置不完整')
    }
  }

  protected async uploadFile(localPath: string, remotePath: string, _options?: UploadOptions): Promise<UploadResult> {
    const fileStream = createReadStream(localPath)
    await this.client.api(`/me/drive/root:/${remotePath}:/content`).put(fileStream)
    return { success: true }
  }

  protected async createUploadSession(fileSize: number, remotePath: string): Promise<string> {
    const response = await this.client.api(`/me/drive/root:/${remotePath}:/createUploadSession`).post({
      item: {
        '@microsoft.graph.conflictBehavior': 'replace',
        name: this.getFileName(remotePath),
        fileSize,
      },
    })
    return response.uploadUrl
  }

  protected async uploadChunk(
    sessionUrl: string,
    chunk: Buffer | Readable,
    start: number,
    end: number,
    total: number,
  ): Promise<void> {
    await this.client
      .api(sessionUrl)
      .headers({
        'Content-Range': `bytes ${start}-${end - 1}/${total}`,
        'Content-Length': String(end - start),
      })
      .put(chunk)
  }

  protected async completeUpload(_sessionUrl: string): Promise<UploadResult> {
    // OneDrive 会自动完成上传,不需要额外操作
    return { success: true }
  }
}
