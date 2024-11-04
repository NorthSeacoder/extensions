import os from 'os'
import path from 'path'

// 导入配置类型定义
import type { Config } from '../src/types'

const defaultConfig: Config = {
  sources: [
    {
      path: path.join(os.homedir(), 'Documents'),
      type: 'common',
      retention: 7, // 默认保留7天
    }
  ],
  backup: {
    dir: path.join(os.homedir(), 'Backups'),
    compression: {
      first: {
        method: 'zip',
        level: 9,
        password: process.env.BACKUP_PASSWORD || 'default-password',
        encryptionMethod: 'aes256',
      },
      second: {
        method: 'zip', 
        level: 9,
        password: process.env.BACKUP_SECOND_PASSWORD || 'default-second-password',
        encryptionMethod: 'aes256',
      }
    }
  },
  cloud: {
    enabled: [],
    remoteDir: '/backups',
    baidu: {
      appKey: process.env.BAIDU_APP_KEY || '',
      secretKey: process.env.BAIDU_SECRET_KEY || '',
      accessToken: process.env.BAIDU_ACCESS_TOKEN || '',
    },
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
    format: 'combined'
  }
}

export default defaultConfig
