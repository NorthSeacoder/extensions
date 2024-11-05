import fs from 'fs'
import path from 'path'
import os from 'os'
import { ConfigSchema } from '../src/types'
import defaultConfig from './default'
import { deepmerge } from 'deepmerge-ts'

// 展开路径中的 ~ 符号
function expandPath(inputPath: string): string {
  if (typeof inputPath === 'string' && inputPath.startsWith('~')) {
    return path.join(os.homedir(), inputPath.slice(1))
  }
  return inputPath
}

// 判断是否为路径字段
function isPathField(key: string): boolean {
  const pathPatterns = [
    'path',
    'Path',
    'dir',
    'Dir',
    'directory',
    'Directory'
  ]
  return pathPatterns.some(pattern => 
    key === pattern || key.endsWith(pattern)
  )
}

// 递归处理配置对象中的路径
function expandPathsInConfig(config: any): any {
  if (typeof config !== 'object' || config === null) {
    return config
  }

  if (Array.isArray(config)) {
    return config.map(item => expandPathsInConfig(item))
  }

  const result: any = {}
  for (const [key, value] of Object.entries(config)) {
    // 处理可能包含路径的字段
    if (isPathField(key)) {
      result[key] = expandPath(value as string)
    } else {
      result[key] = expandPathsInConfig(value)
    }
  }
  return result
}

// 加载本地配置（如果存在）
const localConfigPath = path.join(__dirname, 'local.js')
const localConfig = fs.existsSync(localConfigPath) ? require(localConfigPath).default : {}

// 合并配置
const mergedConfig = deepmerge(defaultConfig, localConfig)

// 展开所有路径
const configWithExpandedPaths = expandPathsInConfig(mergedConfig)

// 验证配置
try {
  ConfigSchema.parse(configWithExpandedPaths)
} catch (error) {
  console.error('配置验证失败:', error)
  process.exit(1)
}

export default configWithExpandedPaths
