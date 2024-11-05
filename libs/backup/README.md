# Starter Template for NPM Libraries

这是一个用于创建新NPM库的起始模板，包含常用配置和工具函数。本模板设计用于monorepo子仓库，适合快速启动新的npm库项目。

This is a starter template for creating new NPM libraries, containing common configurations and utility functions. This template is designed for monorepo sub-repositories and is suitable for quickly starting new npm library projects.

## 技术栈 / Tech Stack

- TypeScript
- Vitest (用于测试 / for testing)
- tsup (用于构建 / for building)
- ESLint (用于代码规范 / for code linting)
- CAC (用于命令行解析 / for command-line parsing)

## 特性 / Features

- 支持TypeScript
- 支持注册命令行工具 (bin)
- 内置测试配置
- 支持NPM发布
- 包含基本的工具函数
- 支持多种输出格式 (CJS, ESM)
- 包含错误处理和参数解析

- TypeScript support
- CLI tool registration support (bin)
- Built-in test configuration
- NPM publishing support
- Basic utility functions included
- Support for multiple output formats (CJS, ESM)
- Includes error handling and argument parsing

## 使用方法 / Usage

- 百度上传前要安装 bypy,且登录授权

## 开发 / Development

主要开发文件：
- `src/index.ts`: 库的主入口
- `src/cli/index.ts`: CLI工具的入口
- `src/types/`: 类型定义
- `src/utils.ts`: 工具函数

Main development files:
- `src/index.ts`: Main entry of the library
- `src/cli/index.ts`: Entry for CLI tools
- `src/types/`: Type definitions
- `src/utils.ts`: Utility functions

## 测试 / Testing

运行 `npm test` 来执行测试。测试文件应放在 `src` 目录中，并以 `.test.ts` 结尾。

Run `npm test` to execute tests. Test files should be placed in the `src` directory and end with `.test.ts`.

## 构建 / Building

使用 `npm run build` 构建项目。这将生成 CJS 和 ESM 格式的输出文件。

Use `npm run build` to build the project. This will generate output files in both CJS and ESM formats.

## 发布 / Publishing

1. 在根目录执行 CI 检查 / Run CI checks in the project directory: `npm run ci`
2. 如果检查通过，在根目录执行发布脚本 / If checks pass, run the release script in the root directory: `npm run release:xxx`

注意：发布脚本会自动处理版本更新、构建和发布过程。由于已设置 `publishConfig`，无需手动设置 npm 源。

Note: The release script will automatically handle version updating, building, and publishing processes. As `publishConfig` is already set, there's no need to manually set the npm registry.

注意：发布前请确保已经登录到npm。

Note: Make sure you're logged in to npm before publishing.

## 命令行工具 / CLI Tool

此模板包含一个基本的命令行工具结构。主要文件：
- `bin/starter.js`: CLI入口点
- `src/cli/index.ts`: CLI主逻辑
- `src/cli/parse-args.ts`: 参数解析

This template includes a basic CLI tool structure. Main files:
- `bin/starter.js`: CLI entry point
- `src/cli/index.ts`: Main CLI logic
- `src/cli/parse-args.ts`: Argument parsing

## 配置文件 / Configuration Files

- `tsconfig.json`: TypeScript配置
- `tsup.config.ts`: 构建配置
- `bump.config.ts`: 版本升级配置

- `tsconfig.json`: TypeScript configuration
- `tsup.config.ts`: Build configuration
- `bump.config.ts`: Version bump configuration

## 脚本说明 / Script Descriptions

- `build`: 构建项目 / Build the project
- `lint`: 运行TypeScript类型检查 / Run TypeScript type checking
- `test`: 运行测试 / Run tests
- `format`: 格式化代码 / Format code
- `check-format`: 检查代码格式 / Check code formatting
- `check-exports`: 检查导出 / Check exports
- `ci`: 运行CI检查 / Run CI checks
- `release`: 发布新版本 / Release a new version

## 依赖说明 / Dependencies

主要依赖包括：
- `@shared/config`: 共享配置（workspace依赖）
- `cac`: 命令行参数解析
- 其他开发依赖参见根目录 `package.json`

Main dependencies include:
- `@shared/config`: Shared configuration (workspace dependency)
- `cac`: Command-line argument parsing
- See root `package.json` for other dev dependencies

## 许可证 / License

请查看 `LICENSE` 文件。

Please see the `LICENSE` file.
