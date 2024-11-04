import logger from './logger'

export interface RetryOptions {
  times: number
  delay: number
  onRetry?: (error: Error, attempt: number) => void
}

/**
 * 通用重试函数
 * @param fn 需要重试的异步函数
 * @param times 重试次数
 * @param delay 重试延迟(ms)
 * @param onRetry 重试回调
 */
export async function retry<T>(
  fn: () => Promise<T>,
  times: number = 3,
  delay: number = 1000,
  onRetry?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= times; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === times) {
        logger.error(`重试${times}次后仍然失败`, error as Error)
        throw error
      }

      logger.warn(`第${attempt}次尝试失败,${delay}ms后重试`, {
        error: lastError.message
      })

      onRetry?.(lastError, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// 工具函数 - 带进度的重试
export async function retryWithProgress<T>(
  fn: () => Promise<T>,
  options: RetryOptions & { 
    onProgress?: (progress: number) => void 
  }
): Promise<T> {
  let progress = 0
  const progressStep = 100 / (options.times + 1)

  return retry(
    async () => {
      const result = await fn()
      progress += progressStep
      options.onProgress?.(Math.min(progress, 100))
      return result
    },
    options.times,
    options.delay,
    (error, attempt) => {
      progress = attempt * progressStep
      options.onProgress?.(progress)
      options.onRetry?.(error, attempt)
    }
  )
}