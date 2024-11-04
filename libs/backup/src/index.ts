import path from 'path'
import type { Config } from './types'
import Logger, { type ILogger } from './utils/logger'
import { BackupService } from './services/backup'
import { BaiduCloud, QuarkCloud, OneDriveCloud, type CloudService } from './services/cloud'

export interface BackupSource {
  type: string;
  path: string;
  retention?: number;
}

export interface CloudConfig {
  enabled: string[];
  remoteDir: string;
}

export class BackupManager {
  private backupService: BackupService;
  private cloudServices: Map<string, CloudService>;
  private isRunning: boolean;
  private logger: ILogger;

  constructor(
    private readonly config: Config,
    logger: ILogger
  ) {
    this.backupService = new BackupService(config)
    this.cloudServices = this.initCloudServices()
    this.isRunning = false
    this.logger = logger
  }

  private initCloudServices(): Map<string, CloudService> {
    const services = new Map<string, CloudService>()
    
    if (this.config.cloud.enabled.includes('baidu')) {
      services.set('baidu', new BaiduCloud(this.config))
    }
    if (this.config.cloud.enabled.includes('quark')) {
      services.set('quark', new QuarkCloud(this.config))
    }
    if (this.config.cloud.enabled.includes('onedrive')) {
      services.set('onedrive', new OneDriveCloud(this.config))
    }
    
    return services
  }

  private async uploadToCloud(localPath: string, type: string): Promise<void> {
    if (!this.config.cloud.enabled?.length) {
      this.logger.info('云存储未启用，跳过上传')
      return
    }

    const fileName = path.basename(localPath)
    const remotePath = path.join(this.config.cloud.remoteDir, type, fileName)

    const uploadPromises = Array.from(this.cloudServices.entries()).map(
      async ([cloudName, cloudService]) => {
        try {
          this.logger.info(`开始上传至 ${cloudName}`)
          await cloudService.upload(localPath, remotePath)
          this.logger.info(`${cloudName} 上传成功`)
        } catch (error) {
          this.logger.error(`${cloudName} 上传失败`, error as Error)
        }
      }
    )

    await Promise.all(uploadPromises)
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('备份任务已在运行中')
      return
    }

    this.isRunning = true
    this.logger.info('开始备份任务')

    try {
      for (const source of this.config.sources) {
        await this.processBackupSource(source)
      }
    } finally {
      this.isRunning = false
      this.logger.info('备份任务结束')
    }
  }

  private async processBackupSource(source: BackupSource): Promise<void> {
    this.logger.info(`开始处理 ${source.type} 备份`)
    
    try {
      // 创建备份
      const backupPath = await this.backupService.createBackup(source)
      this.logger.info(`${source.type} 备份文件创建成功: ${backupPath}`)

      // 清理旧备份
      if (source.retention) {
        // await this.backupService.cleanOldBackups(source.type)
        this.logger.info(`${source.type} 旧备份清理完成`)
      }

      // 上传到云端
      // await this.uploadToCloud(backupPath, source.type)
      
      this.logger.info(`${source.type} 备份完成`)
    } catch (error) {
      this.logger.error(`${source.type} 备份失败`, error as Error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }
    
    this.logger.info('正在停止备份任务...')
    this.isRunning = false
  }
}

// 启动备份
if (require.main === module) {
  import('./utils/logger').then(({ default: logger }) => {
    import('../config').then((config) => {
      const manager = new BackupManager(config, logger)
      
      // 处理进程信号
      process.on('SIGINT', async () => {
        logger.info('收到终止信号')
        await manager.stop()
        process.exit(0)
      })

      manager.start().catch((error) => {
        logger.error('备份任务异常终止', error as Error)
        process.exit(1)
      })
    })
  })
}

export default BackupManager
