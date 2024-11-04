import process from 'node:process'
import cac from 'cac'
import type { extractorOptions } from '../types'
import { version } from '../../package.json'
import { ExitCode } from './exit-code'

/**
 * The parsed command-line arguments
 */
export interface ParsedArgs {
  help?: boolean
  version?: boolean
  options: extractorOptions
}

/**
 * Parses the command-line arguments
 */
export async function parseArgs(): Promise<ParsedArgs> {
  try {
    const { args } = loadCliArgs()

    const parsedArgs: ParsedArgs = {
      help: args.help as boolean,
      version: args.version as boolean,
      options: {
        inputFile: args.input,
        outputDir: args.outputDir,
      },
    }

    return parsedArgs
  } catch (error) {
    // There was an error parsing the command-line args
    return errorHandler(error as Error)
  }
}

export function loadCliArgs(argv = process.argv) {
  const cli = cac('cn')

  cli
    .version(version)
    .option('-i, --input <filePath>', 'Input file path')
    .option('-o, --output-dir <dir>', `Output directory default: '.'`)
    .help()

  const parsed = cli.parse(argv)
  return {
    args: {
      input: parsed.options.input,
      outputDir: parsed.options.outputDir ?? '.',
      help: parsed.options.help,
      version: parsed.options.version,
    },
    _: parsed.args,
  }
}

function errorHandler(error: Error): never {
  console.error(error.message)
  return process.exit(ExitCode.InvalidArgument)
}
