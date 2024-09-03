import process from 'node:process'
import cac from 'cac'
import type { StarterOptions } from '../types/starter'
import { version } from '../../package.json'
import { ExitCode } from './exit-code'

/**
 * The parsed command-line arguments
 */
export interface ParsedArgs {
  help?: boolean
  version?: boolean
  options: StarterOptions
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
        outputTypes: args.outputTypes,
        outputDir: args.outputDir,
        filterMarkers: args.filterMarkers,
      },
    }

    return parsedArgs
  } catch (error) {
    // There was an error parsing the command-line args
    return errorHandler(error as Error)
  }
}

export function loadCliArgs(argv = process.argv) {
  const cli = cac('xmind')

  cli
    .version(version)
    .option('-i, --input <filePath>', 'Input file path')
    .option('-o, --output-dir <dir>', `Output directory default: '.'`)
    .option('-t, --output-types <types>', `Output types (comma-separated) default:xmind`)
    .option('-m, --filter-markers <markers>', `Filter markers (comma-separated) default:priority-1`)
    .help()

  const parsed = cli.parse(argv)
  return {
    args: {
      input: parsed.options.input,
      outputDir: parsed.options.outputDir ?? '.',
      outputTypes: parsed.options.outputTypes?.split(',') ?? ['xmind'],
      filterMarkers: parsed.options.filterMarkers?.split(',') ?? ['priority-1'],
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
