import { describe, expect, it } from 'vitest'
import { loadCliArgs } from './parse-args'

const defaultArgs = ['node', 'xmind']

describe('loadCliArgs', () => {
  it('returns an object with the correct properties', () => {
    const result = loadCliArgs(defaultArgs)

    expect(result).toHaveProperty('args')
    expect(result).toHaveProperty('_')
  })

  it('sets default values when no arguments are provided', () => {
    const result = loadCliArgs(defaultArgs)

    expect(result.args).toEqual({
      input: undefined,
      outputDir: '.',
      outputTypes: ['xmind'],
      filterMarkers: ['priority-1'],
      help: undefined,
      version: undefined,
    })
  })

  it('correctly parses input file path', () => {
    const result = loadCliArgs([...defaultArgs, '-i', 'test.xmind'])

    expect(result.args.input).toBe('test.xmind')
  })

  it('correctly parses output directory', () => {
    const result = loadCliArgs([...defaultArgs, '-o', 'output'])

    expect(result.args.outputDir).toBe('output')
  })

  it('correctly parses output types', () => {
    const result = loadCliArgs([...defaultArgs, '-t', 'xmind,pdf,png'])

    expect(result.args.outputTypes).toEqual(['xmind', 'pdf', 'png'])
  })

  it('correctly parses filter markers', () => {
    const result = loadCliArgs([...defaultArgs, '-m', 'priority-1,important'])

    expect(result.args.filterMarkers).toEqual(['priority-1', 'important'])
  })

  it('sets help flag when --help is provided', () => {
    const result = loadCliArgs([...defaultArgs, '--help'])

    expect(result.args.help).toBe(true)
  })

  it('sets version flag when --version is provided', () => {
    const result = loadCliArgs([...defaultArgs, '--version'])

    expect(result.args.version).toBe(true)
  })

  it('handles long option names', () => {
    const result = loadCliArgs([
      ...defaultArgs,
      '--input', 'test.xmind',
      '--output-dir', 'output',
      '--output-types', 'xmind,pdf',
      '--filter-markers', 'priority-1,important'
    ])

    expect(result.args).toEqual({
      input: 'test.xmind',
      outputDir: 'output',
      outputTypes: ['xmind', 'pdf'],
      filterMarkers: ['priority-1', 'important'],
      help: undefined,
      version: undefined,
    })
  })
})