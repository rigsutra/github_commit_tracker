import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "commit-dev" is now active!');

  const disposable = vscode.commands.registerCommand(
    "commit-dev.helloWorld",
    () => {
      vscode.window.showInformationMessage(
        "Hello from GitHub Activity Extension!"
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
