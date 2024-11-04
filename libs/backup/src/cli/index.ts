import process from 'node:process'
import { version as packageVersion } from '../../package.json'
import { starter } from '../starter'
import { ExitCode } from './exit-code'
import { parseArgs } from './parse-args'

/**
 * The main entry point of the CLI
 */
export async function main(): Promise<void> {
  try {
    // Setup global error handlers
    process.on('uncaughtException', errorHandler)
    process.on('unhandledRejection', errorHandler)

    // Parse the command-line arguments
    const { help, version, options } = await parseArgs()
    if (help) {
      process.exit(ExitCode.Success)
    } else if (version) {
      // Show the version number and exit
      console.log(packageVersion)
      process.exit(ExitCode.Success)
    } else {
      if (!options.inputFile) {
        console.log('inputFile is required')
        process.exit(ExitCode.FatalError)
      }
      await starter()
    }
  } catch (error) {
    errorHandler(error as Error)
  }
}

function errorHandler(error: Error): void {
  let message = error.message || String(error)

  if (process.env.DEBUG || process.env.NODE_ENV === 'development') message = error.stack || message

  console.error(message)
  process.exit(ExitCode.FatalError)
}
