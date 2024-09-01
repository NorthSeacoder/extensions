# @nsea/xmind-handler

一个强大的 Node.js 库，用于处理 XMind 文件，允许您过滤、转换和以各种格式输出 XMind 内容。

## 特性

- 基于标记过滤 XMind 主题
- 将 XMind 内容转换为 JSON、Markdown 或过滤后的 XMind 文件
- 命令行界面，易于使用
- 支持多种输出格式

## 安装

使用 npm 安装包：

```bash
npm install @nsea/xmind-handler
```

或使用 yarn：

```bash
yarn add @nsea/xmind-handler
```

## 使用方法

### 命令行界面

您可以使用 CLI 处理 XMind 文件：

```bash
xmind -i input.xmind -o output -t json,md,xmind -m priority-1,important
```

选项：

- `-i, --input <filePath>`：输入 XMind 文件路径（必需）
- `-o, --output-dir <dir>`：输出目录（默认：当前目录）
- `-t, --output-types <types>`：输出类型（逗号分隔，默认：xmind）
- `-m, --filter-markers <markers>`：过滤标记（逗号分隔，默认：priority-1）

### 程序化使用

您也可以在 Node.js 项目中使用该库：

```javascript
import processXMind from '@nsea/xmind-handler'

const options = {
  inputFile: 'path/to/input.xmind',
  outputTypes: ['json', 'md', 'xmind'],
  outputDir: 'path/to/output',
  filterMarkers: ['priority-1', 'important'],
}

processXMind(options)
  .then(() => console.log('XMind 处理完成'))
  .catch((error) => console.error('处理 XMind 时出错:', error))
```

## API

### `processXMind(options: XMindOptions): Promise<void>`

基于提供的选项处理 XMind 文件。

#### XMindOptions

- `inputFile: string` - 输入 XMind 文件的路径
- `outputTypes?: ('json' | 'md' | 'xmind')[]` - 要生成的输出类型（默认：['xmind']）
- `outputDir?: string` - 写入输出文件的目录（默认：'.'）
- `filterMarkers: string[]` - 用于过滤主题的标记 ID 数组

## 许可证

本项目采用 MIT 许可证。
