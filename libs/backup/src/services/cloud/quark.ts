import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import { createReadStream } from 'fs'
import { ICloudStorage } from '../../types'
import { logger } from '../../utils/logger'
import { calculateSpeed } from '../../utils'

export class QuarkCloud implements ICloudStorage {
  constructor(config) {
    this.config = config
  }

  async upload(localPath, remotePath) {
    const startTime = Date.now()
    logger.info(`开始上传到夸克网盘: ${localPath} -> ${remotePath}`)

    try {
      const formData = new FormData()
      formData.append('file', fs.createReadStream(localPath))
      formData.append('path', remotePath)

      const response = await axios.post('https://drive.quark.cn/1/clouddrive/file/upload', formData, {
        headers: {
          ...formData.getHeaders(),
          Cookie: this.config.quark.cookie,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      })

      const endTime = Date.now()
      const duration = endTime - startTime
      const stats = await fs.promises.stat(localPath)

      logger.info('夸克网盘上传完成', {
        file: localPath,
        size: stats.size,
        duration: duration / 1000,
        speed: calculateSpeed(stats.size, duration),
      })

      return response.data
    } catch (error) {
      logger.error('夸克网盘上传失败', error)
      throw error
    }
  }
}
