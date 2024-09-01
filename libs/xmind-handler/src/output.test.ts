import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { writeJsonOutput, writeMarkdownOutput, writeXmindOutput } from './output'
import type { XMindJSON } from '../src/types/xmind'

vi.mock('node:fs/promises')
vi.mock('node:path')

describe('Output functions', () => {
  const mockOutputDir = '/mock/output'
  const mockInputFile = 'input.xmind'

  const mockData: XMindJSON[] = [
    {
      id: '1',
      class: 'sheet',
      title: 'Test Sheet',
      rootTopic: {
        title: 'Root Topic',
        children: {
          attached: [{ title: 'Child 1' }, { title: 'Child 2', children: { attached: [{ title: 'Grandchild' }] } }],
        },
      },
    },
  ]

  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('writeJsonOutput', () => {
    it('should write JSON data to a file', async () => {
      const mockWriteFile = vi.spyOn(fs, 'writeFile').mockResolvedValue()
      vi.spyOn(path, 'join').mockReturnValue(`${mockOutputDir}/output.json`)

      await writeJsonOutput(mockData, mockOutputDir)

      expect(mockWriteFile).toHaveBeenCalledWith(`${mockOutputDir}/output.json`, JSON.stringify(mockData, null, 2))
    })
  })

  describe('writeMarkdownOutput', () => {
    it('should write Markdown data to a file', async () => {
      const mockWriteFile = vi.spyOn(fs, 'writeFile').mockResolvedValue()
      vi.spyOn(path, 'join').mockReturnValue(`${mockOutputDir}/output.md`)

      await writeMarkdownOutput(mockData, mockOutputDir)

      const expectedMarkdown = '# Test Sheet\n\n# Root Topic\n\n## Child 1\n\n## Child 2\n\n### Grandchild\n\n'
      expect(mockWriteFile).toHaveBeenCalledWith(`${mockOutputDir}/output.md`, expectedMarkdown)
    })
  })

  describe('writeXmindOutput', () => {
    it('should write XMind data to a file', async () => {
      const mockWriteFile = vi.spyOn(fs, 'writeFile').mockResolvedValue()
      vi.spyOn(path, 'join').mockReturnValue(`${mockOutputDir}/filtered_${mockInputFile}`)
      vi.spyOn(path, 'basename').mockReturnValue(mockInputFile)

      const mockZip = {
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(Buffer.from('mock content')),
      }

      await writeXmindOutput(mockData, mockOutputDir, mockInputFile, mockZip as any)

      expect(mockZip.file).toHaveBeenCalledWith('content.json', JSON.stringify(mockData))
      expect(mockZip.generateAsync).toHaveBeenCalledWith({ type: 'nodebuffer' })
      expect(mockWriteFile).toHaveBeenCalledWith(
        `${mockOutputDir}/filtered_${mockInputFile}`,
        Buffer.from('mock content'),
      )
    })
  })
})
