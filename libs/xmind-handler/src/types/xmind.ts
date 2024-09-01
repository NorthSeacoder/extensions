export type OutputType = 'json' | 'md' | 'xmind'

/**
 * Options for the `processXMind()` function.
 */
export interface XMindOptions {
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
import type { Topic } from './model'
/**
 * The JSON representation of an XMind file.
 */
export interface XMindJSON {
  id: string
  class: string
  rootTopic: Topic
  title: string
}