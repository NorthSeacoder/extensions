import { Uri, workspace } from "vscode";
import * as path from "path";

/**
 * 递归读取指定路径下的所有文件,并对每个文件执行指定的处理函数
 *
 * @param url 要读取的目录或文件的完整路径
 * @param handler 对每个文件执行的处理函数
 * @returns 返回一个 Promise,在所有文件处理完成后解决
 * @throws 如果无法访问指定路径或读取过程中出错,将抛出错误
 *
 * @example
 * // 异步读取目录下所有文件并打印其路径
 * try {
 *   await readerFile('/path/to/directory', (fileUri) => {
 *     console.log('File path:', fileUri.fsPath);
 *   });
 *   console.log('All files processed');
 * } catch (error) {
 *   console.error('读取文件失败:', error);
 * }
 *
 * @example
 * // 读取单个文件
 * try {
 *   await readerFile('/path/to/file.txt', (fileUri) => {
 *     console.log('Processing file:', fileUri.fsPath);
 *     // 在这里可以添加文件处理逻辑
 *   });
 * } catch (error) {
 *   console.error('处理文件失败:', error);
 * }
 */
export async function readerFile(url: string, handler: (fileUri: Uri) => void) {
  const queue: Uri[] = [Uri.file(url)];

  while (queue.length > 0) {
    const currentUri = queue.shift()!;
    const stat = await workspace.fs.stat(currentUri);

    if (stat.type === 1) {
      // File
      handler(currentUri);
    } else if (stat.type === 2) {
      // Directory
      const entries = await workspace.fs.readDirectory(currentUri);
      for (const [name, type] of entries) {
        const childUri = Uri.file(path.join(currentUri.fsPath, name));
        if (type === 2) {
          // Directory
          queue.push(childUri);
        } else if (type === 1) {
          // File
          handler(childUri);
        }
      }
    }
  }
}
