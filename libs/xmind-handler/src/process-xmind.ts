import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import type { XMindJSON, XMindOptions } from './types/xmind'
import type { Topic as TopicJson } from './types/model'
import { writeJsonOutput, writeMarkdownOutput, writeXmindOutput } from './output'

export async function processXMind(
  { inputFile, outputTypes = ['xmind'], outputDir = '.', filterMarkers }: XMindOptions,
  cwd = process.cwd(),
): Promise<void> {
  const absoluteOutputDir = path.resolve(cwd, outputDir)
  // 确保输出目录存在
  await fs.mkdir(absoluteOutputDir, { recursive: true })

  const filePath = path.join(cwd, inputFile)
  // 读取XMind文件
  const data = await fs.readFile(filePath)
  // 使用JSZip解压缩文件
  const zip = await JSZip.loadAsync(data)
  // 获取content.json文件内容
  const content = (await zip?.file('content.json')?.async('text')) ?? ''
  const jsonData: XMindJSON[] = JSON.parse(content)
  // 处理 filterMarkers
  if (filterMarkers && filterMarkers.length > 0) {
    jsonData.forEach((sheet) => {
      filterTopicsByMarkers(sheet.rootTopic, filterMarkers)
    })
  }
  // 处理 outputTypes
  for (const outputType of outputTypes) {
    switch (outputType) {
      case 'json':
        await writeJsonOutput(jsonData, outputDir)
        break
      case 'md':
        await writeMarkdownOutput(jsonData, outputDir)
        break
      case 'xmind':
        await writeXmindOutput(jsonData, outputDir, inputFile, zip)
        break
    }
  }
}

function filterTopicsByMarkers(topic: TopicJson, markers: string[]): boolean {
  if (!topic) return false

  const hasMarker = topic.markers?.some((marker) => markers.includes(marker.markerId)) ?? false

  if (topic.children?.attached) {
    topic.children.attached = topic.children.attached.filter((child) => filterTopicsByMarkers(child, markers))
  }

  return hasMarker || (topic?.children?.attached?.length ?? 0) > 0
}
