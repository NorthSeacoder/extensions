import { Uri, workspace } from "vscode";
import * as path from "path";

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
