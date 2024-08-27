import { describe, it, expect, vi } from "vitest";
import { Uri, workspace } from "vscode";
import { readerFile } from "./index";

// 模拟 vscode workspace
vi.mock("vscode", () => ({
  Uri: {
    file: vi.fn((path) => ({ fsPath: path })),
  },
  workspace: {
    fs: {
      stat: vi.fn(),
      readDirectory: vi.fn(),
    },
  },
}));

describe("readerFile", () => {
  it("should handle a single file", async () => {
    const mockStat = vi.fn().mockResolvedValue({ type: 1 });
    workspace.fs.stat = mockStat;

    const handler = vi.fn();
    await readerFile("/path/to/file.txt", handler);

    expect(mockStat).toHaveBeenCalledWith(Uri.file("/path/to/file.txt"));
    expect(handler).toHaveBeenCalledWith(Uri.file("/path/to/file.txt"));
  });

  it("should handle a directory with files", async () => {
    const mockStat = vi
      .fn()
      .mockResolvedValueOnce({ type: 2 }) // First call for directory
      .mockResolvedValue({ type: 1 }); // Subsequent calls for files
    workspace.fs.stat = mockStat;

    const mockReadDirectory = vi.fn().mockResolvedValue([
      ["file1.txt", 1],
      ["file2.txt", 1],
    ]);
    workspace.fs.readDirectory = mockReadDirectory;

    const handler = vi.fn();
    await readerFile("/path/to/dir", handler);

    expect(mockStat).toHaveBeenCalledWith(Uri.file("/path/to/dir"));
    expect(mockReadDirectory).toHaveBeenCalledWith(Uri.file("/path/to/dir"));
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith(Uri.file("/path/to/dir/file1.txt"));
    expect(handler).toHaveBeenCalledWith(Uri.file("/path/to/dir/file2.txt"));
  });
});
