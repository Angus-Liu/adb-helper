import * as vscode from 'vscode';
import * as adb from 'adbkit';

const client = adb.createClient();

export function activate(context: vscode.ExtensionContext) {
    let refreshDivicesCmd = vscode.commands.registerCommand('adb-helper.refreshDivices', function () {
        vscode.window.showInformationMessage('refreshDivicesCmd');
        listDevices();
    });

    context.subscriptions.push(refreshDivicesCmd);
}

enum NodeType {
    Device,
    Dir,
    File
}

class DeviceNode {
    deviceId: string;
    name: string;
    path: string;
    type: NodeType;

    parent?: DeviceNode;
    children: DeviceNode[];


    constructor(
        deviceId: string, type: NodeType, name?: string, path?: string,
        parent?: DeviceNode, children?: DeviceNode[]) {
        this.deviceId = deviceId;
        this.type = type;
        this.name = name ? name : deviceId;
        this.path = path ? path : deviceId;
        if (parent) {
            this.parent = parent;
        }
        if (children) {
            this.children = children;
        }
    }

    public string(): string {
        return `deviceId: ${this.deviceId}, type: ${this.type}, name: ${this.name}, path: ${this.path}`;
    }
}

class DevicesProvider implements vscode.TreeDataProvider<DeviceNode> {

    onDidChangeTreeData?: vscode.Event<void | DeviceNode | DeviceNode[] | null | undefined> | undefined;

    getTreeItem(element: DeviceNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            label: (element.type === NodeType.Device ? '📱 ' : '') + element.name,
            collapsibleState: element.type !== NodeType.File ? vscode.TreeItemCollapsibleState.Collapsed : void 0
        };
    }



    getChildren(element?: DeviceNode | undefined): vscode.ProviderResult<DeviceNode[]> {
        if (!element) {
            return client.listDevices().map(device => new DeviceNode(device.id, NodeType.Device, device.id, '/'));
        }
        vscode.window.showInformationMessage(element.string());

        return client.readdir(element.deviceId, element.path).map(
            file => new DeviceNode(
                element.deviceId,
                file.isFile() ? NodeType.File : NodeType.Dir,
                file.name,
                element.type === NodeType.Device ? file.name : `${element.path}/${file.name}`,
                element
            )
        );
    }

    getParent?(element: DeviceNode): vscode.ProviderResult<DeviceNode> {
        return element.parent;
    }

    resolveTreeItem?(item: vscode.TreeItem, element: DeviceNode, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
        throw new Error('Method not implemented.');
    }


}


function listDevices() {
    vscode.window.createTreeView('adb-helper-devices', {
        treeDataProvider: new DevicesProvider()
    });
}
