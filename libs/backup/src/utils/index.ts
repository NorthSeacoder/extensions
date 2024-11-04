import { createWriteStream } from 'fs'
import archiver from 'archiver'
import logger from './logger'
export * from './retry'
export const compress = async (sourcePath: string, destPath: string, password?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destPath)
    const archive = archiver('zip', {
      zlib: { level: 9 },
    })

    output.on('close', () => {
      logger.info(`Compressed: ${destPath}`)
      resolve()
    })

    archive.on('error', (err) => {
      logger.error('Compression failed', err)
      reject(err)
    })

    if (password) {
      archive.setEncryption(password, { algorithm: 'aes256' })
    }

    archive.pipe(output)
    archive.directory(sourcePath, false)
    archive.finalize()
  })
}

export const formatSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}
export function calculateSpeed(bytes: number, durationMs: number): string {
  const bytesPerSecond = (bytes / durationMs) * 1000
  return formatSize(bytesPerSecond) + '/s'
}
