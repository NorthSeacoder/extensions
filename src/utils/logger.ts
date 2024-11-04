import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'
import fs from 'fs'
import type { Config } from '../types'

interface LogMeta {
  [key: string]: any
}

interface LoggerConfig {
  dir: string
  level: 'debug' | 'info' | 'warn' | 'error'
  maxFiles: number
  format: string
}

class Logger {
  private logger: winston.Logger
  private config: LoggerConfig

  constructor(config: Config) {
    this.config = config.logger
    const logDir = path.join(config.backup.dir, this.config.dir)

    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    this.logger = winston.createLogger({
      level: this.config.level,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: this.createTransports(logDir)
    })
  }

  private createTransports(logDir: string): winston.transport[] {
    const transports: winston.transport[] = [
      // 控制台输出
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} ${level}: ${message}${
              Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : ''
            }`
          })
        )
      }),
      // 文件输出
      new DailyRotateFile({
        dirname: logDir,
        filename: 'backup-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: this.config.maxFiles,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    ]

    // 错误日志单独存储
    if (this.config.level === 'error') {
      transports.push(
        new DailyRotateFile({
          dirname: logDir,
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxFiles: this.config.maxFiles
        })
      )
    }

    return transports
  }

  debug(message: string, meta: LogMeta = {}): void {
    this.logger.debug(message, meta)
  }

  info(message: string, meta: LogMeta = {}): void {
    this.logger.info(message, meta)
  }

  warn(message: string, meta: LogMeta = {}): void {
    this.logger.warn(message, meta)
  }

  error(message: string, error: Error | null = null): void {
    const meta: LogMeta = {}
    if (error) {
      meta.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    }
    this.logger.error(message, meta)
  }

  // 用于记录性能指标
  profile(label: string): void {
    this.logger.profile(label)
  }

  // 用于记录备份统计信息
  stats(stats: {
    type: string
    size: number
    duration: number
    success: boolean
  }): void {
    this.logger.info('备份统计', stats)
  }
}

// 创建单例
export default new Logger(require('../../config')) 