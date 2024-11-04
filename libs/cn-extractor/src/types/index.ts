/**
 * Options for the `extractor()` function.
 */
export interface extractorOptions {
  /**
   * The path to the JSON file to extractor.
   */
  inputFile: string

  /**
   * The directory to write the output files to.
   * Default: `'.'`
   */
  outputDir?: string
}
