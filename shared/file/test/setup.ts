import * as vscode from "vscode";
import { join } from "path";
import { runTests } from "vscode-test";

// 如果测试需要实际的 VSCode 环境，可以使用以下代码：
// 但注意，这可能会使测试变慢，所以只在必要时使用
/*
before(async () => {
  const extensionDevelopmentPath = join(__dirname, '..');
  const extensionTestsPath = __dirname;

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
  });
});
*/
