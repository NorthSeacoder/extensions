import path from 'path'

// 导入配置类型定义
import type { Config } from '../src/types'

const defaultConfig: Config = {
  sources: [
    // {
    //   path: path.join(os.homedir(), 'Documents'),
    //   type: 'common',
    //   retention: 7, // 默认保留7天
    // }
  ],
  encryption: {
    key: process.env.BACKUP_PASSWORD || 'default-password',
  },
  backup: {
    dir: path.join(process.cwd(), 'backups'),
  },
  cloud: {
    enabled: [],
    remoteDir: '/backups',
    quark: {
      cookie: process.env.QUARK_COOKIE || '',
    },
    onedrive: {
      clientId: process.env.ONEDRIVE_CLIENT_ID || '',
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET || '',
      tenantId: process.env.ONEDRIVE_TENANT_ID || '',
    }
  },
  logger: {
    dir: 'logs',
    level: 'info',
    maxFiles: 14, // 保留14天的日志
  }
}

export default defaultConfig
