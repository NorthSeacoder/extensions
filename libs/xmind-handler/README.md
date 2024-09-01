# @nsea/xmind-handler

A powerful Node.js library for processing XMind files, allowing you to filter, convert, and output XMind content in various formats.

## Features

- Filter XMind topics based on markers
- Convert XMind content to JSON, Markdown, or filtered XMind files
- Command-line interface for easy usage
- Supports multiple output formats

## Installation

Install the package using npm:

```bash
npm install @nsea/xmind-handler
```

Or using yarn:

```bash
yarn add @nsea/xmind-handler
```

## Usage

### Command Line Interface

You can use the CLI to process XMind files:

```bash
xmind -i input.xmind -o output -t json,md,xmind -m priority-1,important
```

Options:
- `-i, --input <filePath>`: Input XMind file path (required)
- `-o, --output-dir <dir>`: Output directory (default: current directory)
- `-t, --output-types <types>`: Output types (comma-separated, default: xmind)
- `-m, --filter-markers <markers>`: Filter markers (comma-separated, default: priority-1)

### Programmatic Usage

You can also use the library in your Node.js projects:

```javascript
import processXMind from '@nsea/xmind-handler';

const options = {
  inputFile: 'path/to/input.xmind',
  outputTypes: ['json', 'md', 'xmind'],
  outputDir: 'path/to/output',
  filterMarkers: ['priority-1', 'important']
};

processXMind(options)
  .then(() => console.log('XMind processing complete'))
  .catch(error => console.error('Error processing XMind:', error));
```

## API

### `processXMind(options: XMindOptions): Promise<void>`

Process an XMind file based on the provided options.

#### XMindOptions

- `inputFile: string` - The path to the input XMind file
- `outputTypes?: ('json' | 'md' | 'xmind')[]` - The types of output to generate (default: ['xmind'])
- `outputDir?: string` - The directory to write output files to (default: '.')
- `filterMarkers: string[]` - An array of marker IDs to filter topics by

## License

This project is licensed under the MIT License.