import fs from 'node:fs/promises'
import path from 'node:path'
import type JSZip from 'jszip'
import type { XMindJSON } from './types/xmind'
import type { Topic } from './types/model'

export async function writeJsonOutput(data: XMindJSON[], outputDir: string): Promise<void> {
  const outputPath = path.join(outputDir, 'output.json')
  await fs.writeFile(outputPath, JSON.stringify(data, null, 2))
}

export async function writeMarkdownOutput(data: XMindJSON[], outputDir: string): Promise<void> {
  const outputPath = path.join(outputDir, 'output.md')
  let markdown = ''
  data.forEach((sheet) => {
    markdown += `# ${sheet.title}\n\n`
    markdown += convertTopicToMarkdown(sheet.rootTopic, 1)
  })
  await fs.writeFile(outputPath, markdown)
}

function convertTopicToMarkdown(topic: Topic, level: number): string {
  let markdown = `${'#'.repeat(level)} ${topic.title}\n\n`
  if (topic.children?.attached) {
    topic.children.attached.forEach((child) => {
      markdown += convertTopicToMarkdown(child, level + 1)
    })
  }
  return markdown
}

export async function writeXmindOutput(
  data: XMindJSON[],
  outputDir: string,
  inputFile: string,
  zip: JSZip,
): Promise<void> {
  const outputPath = path.join(outputDir, `filtered_${path.basename(inputFile)}`)
  zip.file('content.json', JSON.stringify(data))
  const content = await zip.generateAsync({ type: 'nodebuffer' })
  await fs.writeFile(outputPath, content)
}
