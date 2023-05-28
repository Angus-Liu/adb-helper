import * as vscode from 'vscode';
import * as adb from 'adbkit';
import { ThemeIcon } from 'vscode';

const client = adb.createClient();

export function activate(context: vscode.ExtensionContext) {
    let refreshDivicesCmd = vscode.commands.registerCommand('adb-helper.refreshDivices', function () {
        listDevices();
    });

    client.trackDevices()
        .then(function (tracker) {
            tracker.on('add', function (device) {
                listDevices();
            });
        });

    context.subscriptions.push(refreshDivicesCmd);
}

enum NodeType {
    device, dir, file
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

    public toString(): string {
        return `deviceId: ${this.deviceId}, type: ${this.type}, name: ${this.name}, path: ${this.path}`;
    }
}

class DevicesProvider implements vscode.TreeDataProvider<DeviceNode> {

    onDidChangeTreeData?: vscode.Event<void | DeviceNode | DeviceNode[] | null | undefined> | undefined;

    private getIconPath(element: DeviceNode): ThemeIcon {
        switch (element.type) {
            case NodeType.device:
                return new ThemeIcon('device-mobile');
            case NodeType.file:
                return ThemeIcon.File;
            case NodeType.dir:
                return ThemeIcon.Folder;
        }
    }

    getTreeItem(element: DeviceNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            iconPath: this.getIconPath(element),
            label: element.name,
            collapsibleState: element.type !== NodeType.file ? vscode.TreeItemCollapsibleState.Collapsed : void 0
        };
    }

    private getPath(parent: DeviceNode, current: { name: string }): string {
        return parent.type === NodeType.device ? current.name : `${parent.path}/${current.name}`;
    }

    getChildren(element?: DeviceNode | undefined): vscode.ProviderResult<DeviceNode[]> {
        if (!element) {
            return client.listDevices().map(device => new DeviceNode(device.id, NodeType.device, device.id, '/'));
        }

        console.log(element);

        return client.readdir(element.deviceId, element.path).map(
            file => new DeviceNode(
                element.deviceId,
                file.isFile() ? NodeType.file : NodeType.dir,
                file.name,
                this.getPath(element, file),
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
