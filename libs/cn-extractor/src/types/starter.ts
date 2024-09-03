export type OutputType = 'json' | 'md' | 'xmind'

/**
 * Options for the `processXMind()` function.
 */
export interface StarterOptions {
  /**
   * The path to the XMind file to process.
   */
  inputFile: string
  /**
   * The types of output files to generate.
   * Default: `['xmind']`
   */
  outputTypes?: OutputType[]
  /**
   * The directory to write the output files to.
   * Default: `'.'`
   */
  outputDir?: string
  /**
   * An array of markers to filter the topics by.
   */
  filterMarkers: string[]
}
