import { createBumpConfig, defineConfig } from '@shared/config/bump-config'

export default defineConfig({
  ...createBumpConfig(),
  // 可以在这里添加或覆盖特定项目的配置
  // 例如：
  // files: ['package.json', 'README.md'],
})
