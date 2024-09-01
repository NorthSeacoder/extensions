import { readFileSync } from 'node:fs'
import { defineConfig } from 'bumpp'
import type { VersionBumpOptions } from 'bumpp'

export function createBumpConfig(additionalOptions: Partial<VersionBumpOptions> = {}): Partial<VersionBumpOptions> {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
  const packageName = packageJson.name

  return defineConfig({
    tag: `${packageName}@`,
    commit: `release ${packageName}@`,
    // 其他通用配置...
    ...additionalOptions,
  })
}

// 重新导出 defineConfig 以便子项目使用
export { defineConfig }
