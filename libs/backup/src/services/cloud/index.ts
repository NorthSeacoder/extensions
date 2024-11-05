// export * from './baidu'
export * from './quark'
export * from './onedrive'

export interface CloudService {
  upload(localPath: string, remotePath: string): Promise<void>
}
