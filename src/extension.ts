import * as vscode from 'vscode';
import * as adb from 'adbkit';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.showDeviceFileStructure', () => {
        const panel = vscode.window.createWebviewPanel(
            'deviceFileStructure',
            'Device File Structure',
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = getWebviewContent();

        panel.webview.onDidReceiveMessage(message => {
            if (message.command === 'ls') {
                executeAdbCommand(panel, 'ls');
            }
        });
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Device File Structure</title>
        </head>
        <body>
            <h1>Device File Structure</h1>
            <button onclick="listFiles()">List Files</button>
            <ul id="fileList"></ul>

            <script>
            const vscode = acquireVsCodeApi();

            function listFiles() {
                vscode.postMessage({ command: 'ls' });
            }

            function updateFileList(files) {
                const fileList = document.getElementById('fileList');
                fileList.innerHTML = '';

                files.forEach(file => {
                    const listItem = document.createElement('li');
                    listItem.textContent = file;
                    fileList.appendChild(listItem);
                });
            }

            // 在Webview加载完成后发送消息给插件
            window.addEventListener('load', () => {
                vscode.postMessage({ command: 'ready' });
            });

            // 接收插件发送的消息
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'updateFileList':
                        updateFileList(message.files);
                        break;
                }
            });
            </script>
        </body>
        </html>
    `;
}

async function executeAdbCommand(panel: vscode.WebviewPanel, command: string) {
    const client = adb.createClient();
    const devices = await client.listDevices();

    if (devices.length === 0) {
        panel.webview.postMessage({ command: 'updateFileList', files: [] });
        return;
    }

    const deviceSerial = devices[0].id;

    const output = await client.shell(deviceSerial, command);
    const files = output.trim().split('\n');

    panel.webview.postMessage({ command: 'updateFileList', files });
}
