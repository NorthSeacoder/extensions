import fs from 'fs'
import path from 'path'
import { ConfigSchema } from '../src/types'
import defaultConfig from './default'
import { deepmerge } from 'deepmerge-ts'

// 加载本地配置（如果存在）
const localConfigPath = path.join(__dirname, 'local.js')
const localConfig = fs.existsSync(localConfigPath) ? require(localConfigPath).default : {}

// 合并配置
const mergedConfig = deepmerge(defaultConfig, localConfig)
console.log(localConfig,defaultConfig,mergedConfig)
// 验证配置
try {
  ConfigSchema.parse(mergedConfig)
} catch (error) {
  console.error('配置验证失败:', error)
  process.exit(1)
}

export default mergedConfig
