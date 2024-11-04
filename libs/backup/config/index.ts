import fs from 'fs'
import path from 'path'
import { ConfigSchema } from '../src/types'
import defaultConfig from './default'

// 加载本地配置（如果存在）
const localConfigPath = path.join(__dirname, 'local.js')
const localConfig = fs.existsSync(localConfigPath) ? require(localConfigPath) : {}

// 合并配置
const mergedConfig = {
  ...defaultConfig,
  ...localConfig,
}

// 验证配置
try {
  ConfigSchema.parse(mergedConfig)
} catch (error) {
  console.error('配置验证失败:', error)
  process.exit(1)
}

export default mergedConfig
