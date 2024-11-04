import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as XLSX from 'xlsx'

import type { extractorOptions } from './types'

export default async function extractChineseAndGenerateExcel(options: extractorOptions): Promise<void> {
  try {
    // 读取 JSON 文件内容
    const jsonContent = await readFile(options.inputFile, 'utf8')
    const jsonData = JSON.parse(jsonContent)

    // 提取中文值和键路径
    const result: [string, string][] = []

    function traverse(obj: any, path: string[] = []): void {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key]

        if (typeof value === 'string' && /[\u4E00-\u9FA5]/.test(value)) {
          result.push([currentPath.join('.'), value])
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, currentPath)
        }
      }
    }

    traverse(jsonData)

    // 创建工作簿和工作表
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([['key', '中文'], ...result])

    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    // 确定输出目录
    const outputDir = options.outputDir || '.'

    // 构建输出文件路径
    const outputPath = path.join(outputDir, 'i18n.xlsx')

    // 将工作簿写入文件
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    await writeFile(outputPath, excelBuffer)

    console.info(`Excel file "${outputPath}" has been generated successfully.`)
  } catch (error) {
    console.error('An error occurred:', error)
  }
}
