import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { processXMind, filterTopicsByMarkers } from './process-xmind'
import * as output from '../src/output'
import type { Topic } from '../src/types/model'

vi.mock('node:fs/promises')
vi.mock('node:path')
vi.mock('jszip')
vi.mock('../src/output')

describe('processXMind', () => {
  const mockInputFile = 'test.xmind'
  const mockOutputDir = 'output'
  const mockCwd = '/mock/cwd'
  const mockZipContent = JSON.stringify([
    {
      title: 'Test Sheet',
      rootTopic: {
        title: 'Root',
        children: {
          attached: [{ title: 'Child 1', markers: [{ markerId: 'priority-1' }] }, { title: 'Child 2' }],
        },
      },
    },
  ])

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(path, 'resolve').mockReturnValue(`${mockCwd}/${mockOutputDir}`)
    vi.spyOn(path, 'join').mockReturnValue(`${mockCwd}/${mockInputFile}`)
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined)
    vi.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('mock data'))
    vi.spyOn(JSZip, 'loadAsync').mockResolvedValue({
      file: () => ({
        async: () => Promise.resolve(mockZipContent),
      }),
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should process XMind file and generate outputs', async () => {
    await processXMind(
      {
        inputFile: mockInputFile,
        outputTypes: ['json', 'md', 'xmind'],
        outputDir: mockOutputDir,
        filterMarkers: ['priority-1'],
      },
      mockCwd,
    )

    expect(fs.mkdir).toHaveBeenCalledWith(`${mockCwd}/${mockOutputDir}`, { recursive: true })
    expect(fs.readFile).toHaveBeenCalledWith(`${mockCwd}/${mockInputFile}`)
    expect(JSZip.loadAsync).toHaveBeenCalled()
    expect(output.writeJsonOutput).toHaveBeenCalled()
    expect(output.writeMarkdownOutput).toHaveBeenCalled()
    expect(output.writeXmindOutput).toHaveBeenCalled()
  })

  it('should filter topics based on markers', async () => {
    await processXMind(
      {
        inputFile: mockInputFile,
        outputTypes: ['json'],
        outputDir: mockOutputDir,
        filterMarkers: ['priority-1'],
      },
      mockCwd,
    )

    const expectedFilteredData = [
      {
        title: 'Test Sheet',
        rootTopic: {
          title: 'Root',
          children: {
            attached: [{ title: 'Child 1', markers: [{ markerId: 'priority-1' }] }],
          },
        },
      },
    ]

    expect(output.writeJsonOutput).toHaveBeenCalledWith(expectedFilteredData, mockOutputDir)
  })
})

describe('filterTopicsByMarkers', () => {
  it('should return false for null topic', () => {
    expect(filterTopicsByMarkers(null as any, ['priority-1'])).toBe(false)
  })

  it('should return true for topic with matching marker', () => {
    const topic: Topic = {
      title: 'Test',
      markers: [{ markerId: 'priority-1', groupId: '1' }],
    }
    expect(filterTopicsByMarkers(topic, ['priority-1'])).toBe(true)
  })

  it('should return false for topic without matching marker', () => {
    const topic: Topic = {
      title: 'Test',
      markers: [{ markerId: 'priority-2', groupId: '1' }],
    }
    expect(filterTopicsByMarkers(topic, ['priority-1'])).toBe(false)
  })

  it('should filter children and return true if any child matches', () => {
    const topic: Topic = {
      title: 'Parent',
      children: {
        attached: [{ title: 'Child 1', markers: [{ markerId: 'priority-1', groupId: '1' }] }, { title: 'Child 2' }],
      },
    }
    expect(filterTopicsByMarkers(topic, ['priority-1'])).toBe(true)
    expect(topic.children?.attached?.length).toBe(1)
    expect(topic.children?.attached?.[0]?.title).toBe('Child 1')
  })
})
