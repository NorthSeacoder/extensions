import { z } from 'zod'

// 备份源配置
export const SourceSchema = z.object({
  path: z.string(),
  type: z.enum(['mp', 'cr', 'common']),
  retention: z.number().min(1).default(7), // 保留天数
  schedule: z.string().optional(), // cron 表达式
})

// 压缩配置
export const CompressionSchema = z.object({
  method: z.enum(['zip', '7z']),
  level: z.number().min(1).max(9),
  password: z.string().optional(),
  encryptionMethod: z.enum(['aes256', 'zip20']),
  volumeSize: z.string().optional(),
})

// 云存储配置
export const CloudConfigSchema = z.object({
  enabled: z.array(z.enum(['baidu', 'quark', 'onedrive'])),
  remoteDir: z.string(),
  baidu: z.object({
    appKey: z.string(),
    secretKey: z.string(),
    accessToken: z.string(),
  }).optional(),
  quark: z.object({
    cookie: z.string(),
  }).optional(),
  onedrive: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    tenantId: z.string(),
  }).optional(),
})

// 完整配置
export const ConfigSchema = z.object({
  sources: z.array(SourceSchema),
  backup: z.object({
    dir: z.string(),
    compression: z.object({
      first: CompressionSchema,
      second: CompressionSchema,
    }),
  }),
  cloud: CloudConfigSchema,
  logger: z.object({
    dir: z.string(),
    level: z.enum(['info', 'warn', 'error', 'debug']),
    maxFiles: z.number().optional(),
  }),
})

export type Source = z.infer<typeof SourceSchema>
export type CloudConfig = z.infer<typeof CloudConfigSchema>
export type Config = z.infer<typeof ConfigSchema>
export type CompressionConfig = z.infer<typeof CompressionSchema>
// 云存储类型
export type CloudStorageType = 'baidu' | 'quark' | 'onedrive'


export interface ICloudStorage {
  upload(localPath: string, remotePath: string): Promise<void>
  validateConfig(): Promise<void>
}