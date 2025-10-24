# VSCode 插件开发深度指南

本文档基于你的 TODO List 插件项目，深入讲解 VSCode 插件开发的核心概念和常用 API。

---

## 目录

1. [插件生命周期](#1-插件生命周期)
2. [ExtensionContext 详解](#2-extensioncontext-详解)
3. [数据持久化与缓存](#3-数据持久化与缓存)
4. [TreeView 视图系统](#4-treeview-视图系统)
5. [Webview 页面开发](#5-webview-页面开发)
6. [命令系统](#6-命令系统)
7. [配置管理](#7-配置管理)
8. [事件系统](#8-事件系统)
9. [UI 交互 API](#9-ui-交互-api)
10. [最佳实践](#10-最佳实践)

---

## 1. 插件生命周期

### 1.1 激活函数 (activate)

插件的入口点，当满足激活条件时被调用。

```typescript
export async function activate(context: vscode.ExtensionContext) {
    console.log('TODO List Plugin is now active!');
    
    // 初始化服务
    const storageManager = new StorageManager(context);
    await storageManager.initialize();
    
    // 注册命令、视图等
    // ...
}
```

**关键点：**
- 可以是同步或异步函数（推荐异步）
- 接收一个 `ExtensionContext` 参数
- 在此函数中进行所有初始化工作

### 1.2 停用函数 (deactivate)

插件停用时调用，用于清理资源。

```typescript
export function deactivate() {
    console.log('TODO List Plugin is now deactivated');
    // VSCode 会自动处理 context.subscriptions 中的资源
}
```

### 1.3 激活事件 (activationEvents)

在 `package.json` 中定义何时激活插件：

```json
{
  "activationEvents": [
    "onView:todoTreeView",        // 打开特定视图时
    "onCommand:todo.addTodo",      // 执行特定命令时
    "onLanguage:javascript",       // 打开特定语言文件时
    "*"                            // VSCode 启动时（不推荐）
  ]
}
```

**最佳实践：** 使用精确的激活事件，避免使用 `*`，以提高性能。

---

## 2. ExtensionContext 详解

`ExtensionContext` 是插件的核心上下文对象，提供了插件运行所需的各种资源和能力。

### 2.1 核心属性

```typescript
export async function activate(context: vscode.ExtensionContext) {
    // 1. subscriptions - 资源订阅管理
    context.subscriptions.push(
        vscode.commands.registerCommand('myCommand', () => {}),
        treeView,
        eventListener
    );
    // 当插件停用时，所有订阅会自动被清理
    
    // 2. extensionUri - 插件根目录的 URI
    const resourceUri = vscode.Uri.joinPath(
        context.extensionUri, 
        'resources', 
        'icon.png'
    );
    
    // 3. extensionPath - 插件根目录的文件系统路径（已废弃，使用 extensionUri）
    const path = context.extensionPath;
    
    // 4. globalStoragePath - 全局存储目录
    console.log(context.globalStoragePath);
    // 例如：/Users/username/Library/Application Support/Code/User/globalStorage/publisher.extension-name
    
    // 5. workspaceState - 工作区级别的状态存储
    await context.workspaceState.update('key', 'value');
    const value = context.workspaceState.get('key');
    
    // 6. globalState - 全局状态存储（跨工作区）
    await context.globalState.update('key', 'value');
    const globalValue = context.globalState.get('key');
    
    // 7. secrets - 安全存储敏感信息
    await context.secrets.store('token', 'secret-token');
    const token = await context.secrets.get('token');
    
    // 8. environmentVariableCollection - 环境变量管理
    context.environmentVariableCollection.replace('MY_VAR', 'value');
}
```

### 2.2 subscriptions 的使用

所有需要清理的资源都应该添加到 `subscriptions`：

```typescript
// 命令
context.subscriptions.push(
    vscode.commands.registerCommand('cmd', handler)
);

// 视图
const treeView = vscode.window.createTreeView('myView', { treeDataProvider });
context.subscriptions.push(treeView);

// 事件监听
context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(handler)
);

// 自定义 Disposable 对象
context.subscriptions.push({
    dispose() {
        // 清理逻辑
    }
});
```

---

## 3. 数据持久化与缓存

### 3.1 globalState - 全局状态存储

用于存储跨工作区的数据（推荐用于插件的主要数据）。

```typescript
export class StorageManager {
    private static readonly STORAGE_KEY = 'todoList.data';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    // 保存数据
    async saveTodos(items: TodoItem[]): Promise<void> {
        const todoData = {
            items,
            version: 1,
            lastSync: Date.now()
        };
        await this.context.globalState.update(
            StorageManager.STORAGE_KEY, 
            todoData
        );
    }

    // 读取数据
    async getTodos(): Promise<TodoItem[]> {
        const data = this.context.globalState.get<TodoData>(
            StorageManager.STORAGE_KEY
        );
        return data?.items || [];
    }

    // 删除数据
    async clearAll(): Promise<void> {
        await this.context.globalState.update(
            StorageManager.STORAGE_KEY, 
            undefined
        );
    }

    // 获取所有键
    keys(): readonly string[] {
        return this.context.globalState.keys();
    }
}
```

### 3.2 workspaceState - 工作区状态存储

用于存储特定工作区的数据。

```typescript
// 保存工作区特定数据
await context.workspaceState.update('lastOpenedFile', '/path/to/file.txt');

// 读取
const lastFile = context.workspaceState.get<string>('lastOpenedFile');
```

### 3.3 globalState.setKeysForSync

同步数据到云端（需要启用设置同步）。

```typescript
// 标记需要同步的键
context.globalState.setKeysForSync(['todoList.data']);
```

### 3.4 secrets - 安全存储

用于存储密码、token 等敏感信息。

```typescript
// 存储
await context.secrets.store('github.token', 'ghp_xxxxx');

// 读取
const token = await context.secrets.get('github.token');

// 删除
await context.secrets.delete('github.token');

// 监听变化
context.secrets.onDidChange(e => {
    console.log('Secret changed:', e.key);
});
```

### 3.5 文件系统存储

对于大量数据或文件，可以使用文件系统：

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

class FileStorageManager {
    private storagePath: string;

    constructor(context: vscode.ExtensionContext) {
        // 使用全局存储路径
        this.storagePath = context.globalStorageUri.fsPath;
    }

    async initialize(): Promise<void> {
        // 确保目录存在
        await fs.mkdir(this.storagePath, { recursive: true });
    }

    async saveData(filename: string, data: any): Promise<void> {
        const filePath = path.join(this.storagePath, filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    async loadData<T>(filename: string): Promise<T | null> {
        const filePath = path.join(this.storagePath, filename);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content) as T;
        } catch {
            return null;
        }
    }
}
```

### 3.6 数据备份策略

```typescript
async saveTodos(items: TodoItem[]): Promise<void> {
    try {
        // 1. 保存当前数据作为备份
        const currentData = await this.loadDataRaw();
        if (currentData) {
            await this.context.globalState.update(
                'todoList.data.backup', 
                currentData
            );
        }

        // 2. 保存新数据
        const todoData = {
            items,
            version: 1,
            lastSync: Date.now()
        };
        await this.context.globalState.update(
            'todoList.data', 
            todoData
        );
    } catch (error) {
        // 恢复备份
        await this.restoreFromBackup();
        throw error;
    }
}
```

---

## 4. TreeView 视图系统

TreeView 是 VSCode 中常用的树形视图组件，用于侧边栏展示层级数据。

### 4.1 TreeDataProvider 实现

```typescript
export class TodoTreeDataProvider implements vscode.TreeDataProvider<TodoTreeItem> {
    // 1. 必须实现的事件发射器
    private _onDidChangeTreeData = new vscode.EventEmitter<TodoTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private todoService: TodoService) {
        // 监听数据变化
        this.todoService.onDidChangeTodos(() => {
            this.refresh();
        });
    }

    // 2. 刷新视图
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    // 3. 必须实现：获取树节点
    getTreeItem(element: TodoTreeItem): vscode.TreeItem {
        return element;
    }

    // 4. 必须实现：获取子节点
    getChildren(element?: TodoTreeItem): Thenable<TodoTreeItem[]> {
        if (!element) {
            // 返回根节点
            return Promise.resolve(this.getRootNodes());
        }
        // 返回子节点
        return Promise.resolve(this.getGroupChildren(element));
    }

    // 5. 可选实现：获取父节点
    getParent?(element: TodoTreeItem): vscode.ProviderResult<TodoTreeItem> {
        return element.parent;
    }

    // 6. 可选实现：解析树节点
    resolveTreeItem?(item: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem> {
        // 延迟加载节点详细信息
        return item;
    }
}
```

### 4.2 TreeItem 自定义

```typescript
export class TodoTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly todoItem?: TodoItem
    ) {
        super(label, collapsibleState);

        if (todoItem) {
            // 1. contextValue - 用于菜单显示控制
            this.contextValue = 'todoItem';

            // 2. tooltip - 悬停提示
            this.tooltip = `${todoItem.title}\n${todoItem.description}`;

            // 3. description - 右侧描述文本
            this.description = `[${todoItem.tags?.join(', ')}]`;

            // 4. iconPath - 图标
            this.iconPath = new vscode.ThemeIcon(
                'check',
                new vscode.ThemeColor('testing.iconPassed')
            );

            // 5. command - 点击时执行的命令
            this.command = {
                command: 'todo.showDetails',
                title: 'Show Details',
                arguments: [todoItem]
            };

            // 6. resourceUri - 资源 URI（用于文件节点）
            this.resourceUri = vscode.Uri.file('/path/to/file');
        }
    }
}
```

### 4.3 注册 TreeView

```typescript
// 方式 1：使用 createTreeView（推荐）
const treeView = vscode.window.createTreeView('todoTreeView', {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,           // 显示"折叠所有"按钮
    canSelectMany: false,             // 是否允许多选
    dragAndDropController: undefined  // 拖拽控制器
});

context.subscriptions.push(treeView);

// 访问 TreeView 属性
treeView.title = 'My Tasks';
treeView.description = '10 tasks';
treeView.badge = {
    tooltip: '5 new tasks',
    value: 5
};

// 方式 2：使用 registerTreeDataProvider
vscode.window.registerTreeDataProvider('todoTreeView', treeDataProvider);
```

### 4.4 TreeView 事件

```typescript
// 选中事件
treeView.onDidChangeSelection(e => {
    console.log('Selected:', e.selection);
});

// 展开/折叠事件
treeView.onDidExpandElement(e => {
    console.log('Expanded:', e.element);
});

treeView.onDidCollapseElement(e => {
    console.log('Collapsed:', e.element);
});

// 可见性变化
treeView.onDidChangeVisibility(e => {
    console.log('Visible:', e.visible);
});
```

### 4.5 图标使用

```typescript
// 1. 内置图标（推荐）
this.iconPath = new vscode.ThemeIcon('check');

// 2. 带颜色的内置图标
this.iconPath = new vscode.ThemeIcon(
    'error',
    new vscode.ThemeColor('testing.iconFailed')
);

// 3. 自定义图标
this.iconPath = {
    light: vscode.Uri.file('/path/to/light/icon.svg'),
    dark: vscode.Uri.file('/path/to/dark/icon.svg')
};

// 4. 扩展资源图标
this.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    'resources',
    'icon.svg'
);
```

常用内置图标：
- `check` - 勾选
- `error` - 错误
- `warning` - 警告
- `sync~spin` - 旋转同步
- `circle-outline` - 空心圆
- `circle-filled` - 实心圆
- `folder` - 文件夹
- `file` - 文件

### 4.6 package.json 配置

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "todo-container",
          "title": "TODO List",
          "icon": "resources/icons/todo-icon.svg"
        }
      ]
    },
    "views": {
      "todo-container": [
        {
          "id": "todoTreeView",
          "name": "Tasks",
          "contextualTitle": "TODO Tasks",
          "icon": "resources/icons/view-icon.svg",
          "visibility": "visible"
        }
      ]
    },
    "menus": {
      "view/title": [
        {
          "command": "todo.addTodo",
          "when": "view == todoTreeView",
          "group": "navigation@1"
        }
      ],
      "view/item/context": [
        {
          "command": "todo.editTodo",
          "when": "view == todoTreeView && viewItem == todoItem",
          "group": "inline@1"
        }
      ]
    }
  }
}
```

---

## 5. Webview 页面开发

Webview 允许在 VSCode 中嵌入自定义 HTML/CSS/JavaScript 界面。

### 5.1 创建 Webview Panel

```typescript
export class TodoWebviewProvider {
    private static currentPanel: vscode.WebviewPanel | undefined;

    public showTodoDetails(todo: TodoItem): void {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (TodoWebviewProvider.currentPanel) {
            // 复用已存在的面板
            TodoWebviewProvider.currentPanel.reveal(columnToShowIn);
            TodoWebviewProvider.currentPanel.webview.html = this.getWebviewContent(todo);
        } else {
            // 创建新面板
            TodoWebviewProvider.currentPanel = vscode.window.createWebviewPanel(
                'todoDetails',                      // 唯一标识符
                `TODO: ${todo.title}`,              // 面板标题
                columnToShowIn || vscode.ViewColumn.One,  // 显示列
                {
                    enableScripts: true,            // 启用 JavaScript
                    retainContextWhenHidden: true,  // 隐藏时保留上下文
                    localResourceRoots: [           // 允许访问的本地资源
                        vscode.Uri.joinPath(this.context.extensionUri, 'resources')
                    ]
                }
            );

            TodoWebviewProvider.currentPanel.webview.html = this.getWebviewContent(todo);

            // 监听面板关闭
            TodoWebviewProvider.currentPanel.onDidDispose(
                () => {
                    TodoWebviewProvider.currentPanel = undefined;
                },
                null,
                this.context.subscriptions
            );

            // 监听消息
            TodoWebviewProvider.currentPanel.webview.onDidReceiveMessage(
                message => this.handleMessage(message),
                undefined,
                this.context.subscriptions
            );
        }
    }
}
```

### 5.2 Webview HTML 内容

```typescript
private getWebviewContent(todo: TodoItem): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- 内容安全策略 -->
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; 
                   style-src 'unsafe-inline'; 
                   script-src 'unsafe-inline';">
    
    <title>TODO Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            cursor: pointer;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <h1>${this.escapeHtml(todo.title)}</h1>
    <p>${this.escapeHtml(todo.description || '')}</p>
    
    <button onclick="editTodo()">编辑</button>
    <button onclick="deleteTodo()">删除</button>
    
    <script>
        // 获取 VSCode API（只能调用一次）
        const vscode = acquireVsCodeApi();
        
        // 保存状态（刷新后保留）
        vscode.setState({ todoId: '${todo.id}' });
        
        // 获取状态
        const previousState = vscode.getState();
        
        function editTodo() {
            // 发送消息到插件
            vscode.postMessage({
                command: 'edit',
                todoId: '${todo.id}'
            });
        }
        
        function deleteTodo() {
            vscode.postMessage({
                command: 'delete',
                todoId: '${todo.id}'
            });
        }
    </script>
</body>
</html>`;
}
```

### 5.3 消息通信

#### 从 Webview 发送消息到插件

```typescript
// Webview 中
vscode.postMessage({
    command: 'update',
    data: { id: 1, name: 'test' }
});
```

#### 插件接收消息

```typescript
panel.webview.onDidReceiveMessage(
    async message => {
        switch (message.command) {
            case 'edit':
                await vscode.commands.executeCommand('todo.editTodo', message.todoId);
                break;
            case 'delete':
                await this.deleteTodo(message.todoId);
                break;
        }
    },
    undefined,
    this.context.subscriptions
);
```

#### 从插件发送消息到 Webview

```typescript
// 插件中
panel.webview.postMessage({
    command: 'update',
    data: updatedTodo
});
```

#### Webview 接收消息

```typescript
// Webview 中
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'update':
            updateUI(message.data);
            break;
    }
});
```

### 5.4 资源 URI 处理

```typescript
// 获取本地资源的 Webview URI
const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'resources', 'script.js')
);

const styleUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'resources', 'style.css')
);

// 在 HTML 中使用
const html = `
    <link rel="stylesheet" href="${styleUri}">
    <script src="${scriptUri}"></script>
`;
```

### 5.5 Webview 状态管理

```typescript
// Webview 中保存状态
vscode.setState({ scrollPosition: window.scrollY });

// 恢复状态
const state = vscode.getState();
if (state) {
    window.scrollTo(0, state.scrollPosition);
}
```

### 5.6 内容安全策略 (CSP)

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               img-src ${webview.cspSource} https:; 
               script-src ${webview.cspSource} 'unsafe-inline'; 
               style-src ${webview.cspSource} 'unsafe-inline';">
```

### 5.7 Webview View Provider (侧边栏 Webview)

```typescript
export class MyWebviewViewProvider implements vscode.WebviewViewProvider {
    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlContent();

        webviewView.webview.onDidReceiveMessage(message => {
            // 处理消息
        });
    }
}

// 注册
vscode.window.registerWebviewViewProvider(
    'myViewId',
    new MyWebviewViewProvider(context.extensionUri)
);
```

---

## 6. 命令系统

### 6.1 注册命令

```typescript
export class TodoCommands {
    public registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            // 简单命令
            vscode.commands.registerCommand('todo.refresh', () => {
                this.refresh();
            }),

            // 带参数的命令
            vscode.commands.registerCommand('todo.editTodo', (todoId?: string) => {
                this.editTodo(todoId);
            }),

            // 文本编辑器命令
            vscode.commands.registerTextEditorCommand(
                'todo.insertTask',
                (editor, edit, ...args) => {
                    edit.insert(editor.selection.active, 'TODO: ');
                }
            )
        );
    }
}
```

### 6.2 执行命令

```typescript
// 执行内置命令
await vscode.commands.executeCommand('workbench.action.files.save');

// 执行自定义命令
await vscode.commands.executeCommand('todo.addTodo');

// 带参数执行
await vscode.commands.executeCommand('todo.editTodo', 'task-id-123');

// 执行并获取返回值
const result = await vscode.commands.executeCommand<string>('myCommand');
```

### 6.3 获取所有命令

```typescript
const allCommands = await vscode.commands.getCommands();
console.log(allCommands);
```

### 6.4 package.json 配置

```json
{
  "contributes": {
    "commands": [
      {
        "command": "todo.addTodo",
        "title": "Add TODO",
        "category": "TODO",
        "icon": "$(add)",
        "enablement": "!inputFocus"
      }
    ],
    "keybindings": [
      {
        "command": "todo.addTodo",
        "key": "ctrl+shift+t",
        "mac": "cmd+shift+t",
        "when": "editorTextFocus"
      }
    ]
  }
}
```

### 6.5 常用内置命令

```typescript
// 文件操作
vscode.commands.executeCommand('workbench.action.files.save');
vscode.commands.executeCommand('workbench.action.files.saveAs');
vscode.commands.executeCommand('workbench.action.files.newUntitledFile');

// 编辑器操作
vscode.commands.executeCommand('editor.action.formatDocument');
vscode.commands.executeCommand('editor.action.commentLine');

// 窗口操作
vscode.commands.executeCommand('workbench.action.closeActiveEditor');
vscode.commands.executeCommand('workbench.action.splitEditor');

// Git 操作
vscode.commands.executeCommand('git.commit');
vscode.commands.executeCommand('git.push');
```

---

## 7. 配置管理

### 7.1 定义配置

```json
{
  "contributes": {
    "configuration": {
      "title": "TODO List",
      "properties": {
        "todo.defaultPriority": {
          "type": "string",
          "enum": ["low", "medium", "high"],
          "default": "medium",
          "description": "新任务的默认优先级"
        },
        "todo.autoRefresh": {
          "type": "boolean",
          "default": true,
          "description": "是否自动刷新任务列表"
        },
        "todo.maxTasks": {
          "type": "number",
          "default": 100,
          "minimum": 1,
          "maximum": 1000,
          "description": "最大任务数量"
        }
      }
    }
  }
}
```

### 7.2 读取配置

```typescript
// 获取配置对象
const config = vscode.workspace.getConfiguration('todo');

// 读取配置值
const defaultPriority = config.get<string>('defaultPriority', 'medium');
const autoRefresh = config.get<boolean>('autoRefresh', true);

// 检查配置是否存在
const hasValue = config.has('defaultPriority');

// 获取配置详情
const inspection = config.inspect('defaultPriority');
console.log(inspection?.defaultValue);      // 默认值
console.log(inspection?.globalValue);       // 用户设置
console.log(inspection?.workspaceValue);    // 工作区设置
```

### 7.3 更新配置

```typescript
// 更新全局配置
await config.update('defaultPriority', 'high', vscode.ConfigurationTarget.Global);

// 更新工作区配置
await config.update('defaultPriority', 'low', vscode.ConfigurationTarget.Workspace);

// 更新工作区文件夹配置
await config.update('defaultPriority', 'medium', vscode.ConfigurationTarget.WorkspaceFolder);

// 删除配置（恢复默认值）
await config.update('defaultPriority', undefined);
```

### 7.4 监听配置变化

```typescript
vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('todo.defaultPriority')) {
        const config = vscode.workspace.getConfiguration('todo');
        const newValue = config.get('defaultPriority');
        console.log('Default priority changed to:', newValue);
        
        // 更新界面或重新加载数据
        this.updatePriority(newValue);
    }
    
    // 检查多个配置
    if (e.affectsConfiguration('todo')) {
        console.log('TODO configuration changed');
    }
});
```

---

## 8. 事件系统

### 8.1 自定义事件

```typescript
export class TodoService {
    // 1. 创建事件发射器
    private _onDidChangeTodos = new vscode.EventEmitter<void>();
    
    // 2. 暴露事件
    public readonly onDidChangeTodos: vscode.Event<void> = this._onDidChangeTodos.event;

    async createTodo(title: string): Promise<TodoItem> {
        const newTodo = { /* ... */ };
        this.todos.push(newTodo);
        
        // 3. 触发事件
        this._onDidChangeTodos.fire();
        
        return newTodo;
    }

    // 4. 清理资源
    dispose(): void {
        this._onDidChangeTodos.dispose();
    }
}

// 使用事件
const disposable = todoService.onDidChangeTodos(() => {
    console.log('Todos changed!');
    this.refresh();
});

// 取消订阅
disposable.dispose();
```

### 8.2 常用工作区事件

```typescript
// 文件系统变化
vscode.workspace.onDidCreateFiles(e => {
    console.log('Created:', e.files);
});

vscode.workspace.onDidDeleteFiles(e => {
    console.log('Deleted:', e.files);
});

vscode.workspace.onDidRenameFiles(e => {
    console.log('Renamed:', e.files);
});

vscode.workspace.onDidSaveTextDocument(doc => {
    console.log('Saved:', doc.fileName);
});

vscode.workspace.onDidChangeTextDocument(e => {
    console.log('Changed:', e.document.fileName);
    console.log('Changes:', e.contentChanges);
});

// 工作区变化
vscode.workspace.onDidChangeWorkspaceFolders(e => {
    console.log('Added:', e.added);
    console.log('Removed:', e.removed);
});
```

### 8.3 窗口事件

```typescript
// 编辑器变化
vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
        console.log('Active editor:', editor.document.fileName);
    }
});

vscode.window.onDidChangeVisibleTextEditors(editors => {
    console.log('Visible editors:', editors.length);
});

// 选中内容变化
vscode.window.onDidChangeTextEditorSelection(e => {
    console.log('Selection:', e.selections);
});

// 终端事件
vscode.window.onDidOpenTerminal(terminal => {
    console.log('Terminal opened:', terminal.name);
});

vscode.window.onDidCloseTerminal(terminal => {
    console.log('Terminal closed:', terminal.name);
});
```

---

## 9. UI 交互 API

### 9.1 消息提示

```typescript
// 信息消息
vscode.window.showInformationMessage('操作成功！');

// 警告消息
vscode.window.showWarningMessage('注意：这可能需要一些时间');

// 错误消息
vscode.window.showErrorMessage('操作失败：文件不存在');

// 带按钮的消息
const selection = await vscode.window.showInformationMessage(
    '发现新版本',
    '更新',
    '稍后提醒',
    '忽略'
);

if (selection === '更新') {
    // 执行更新
}

// 模态对话框
const result = await vscode.window.showWarningMessage(
    '确定要删除吗？',
    { modal: true },
    '删除',
    '取消'
);
```

### 9.2 输入框

```typescript
// 简单输入
const title = await vscode.window.showInputBox({
    prompt: '请输入任务标题',
    placeHolder: '例如：完成项目文档',
    value: '默认值',
    valueSelection: [0, 4],  // 选中范围
    ignoreFocusOut: true,     // 失焦不关闭
    validateInput: (value) => {
        if (!value) {
            return '标题不能为空';
        }
        if (value.length > 100) {
            return '标题过长';
        }
        return null;  // 验证通过
    }
});

// 密码输入
const password = await vscode.window.showInputBox({
    prompt: '请输入密码',
    password: true
});
```

### 9.3 快速选择

```typescript
// 简单选择
const items = ['选项1', '选项2', '选项3'];
const selected = await vscode.window.showQuickPick(items, {
    placeHolder: '请选择一个选项'
});

// 复杂选择
interface MyQuickPickItem extends vscode.QuickPickItem {
    data: any;
}

const items: MyQuickPickItem[] = [
    {
        label: '$(check) 选项1',
        description: '这是描述',
        detail: '这是详细信息',
        picked: true,
        data: { id: 1 }
    },
    {
        label: '选项2',
        description: '推荐',
        kind: vscode.QuickPickItemKind.Separator,
        data: { id: 2 }
    }
];

const selected = await vscode.window.showQuickPick(items, {
    placeHolder: '选择一个任务',
    canPickMany: true,         // 允许多选
    ignoreFocusOut: true,      // 失焦不关闭
    matchOnDescription: true,  // 搜索时匹配描述
    matchOnDetail: true        // 搜索时匹配详情
});

if (selected) {
    console.log(selected.data);
}
```

### 9.4 进度提示

```typescript
// 通知栏进度
vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: '正在处理',
    cancellable: true
}, async (progress, token) => {
    // 检查取消
    token.onCancellationRequested(() => {
        console.log('User canceled');
    });

    progress.report({ increment: 0, message: '开始处理...' });
    await delay(1000);

    progress.report({ increment: 50, message: '处理中...' });
    await delay(1000);

    progress.report({ increment: 50, message: '完成！' });
});

// 状态栏进度
vscode.window.withProgress({
    location: vscode.ProgressLocation.Window,
    title: '同步中'
}, async (progress) => {
    // 状态栏进度不支持 increment
    await doWork();
});
```

### 9.5 状态栏

```typescript
// 创建状态栏项
const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100  // 优先级
);

statusBarItem.text = '$(check) 10 Tasks';
statusBarItem.tooltip = '10 个待处理任务';
statusBarItem.command = 'todo.showTasks';
statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
statusBarItem.show();

context.subscriptions.push(statusBarItem);

// 更新状态栏
function updateStatusBar() {
    const count = todoService.getTodos().length;
    statusBarItem.text = `$(checklist) ${count}`;
}
```

### 9.6 输出面板

```typescript
// 创建输出通道
const outputChannel = vscode.window.createOutputChannel('TODO List');

outputChannel.appendLine('插件已启动');
outputChannel.append('Processing... ');
outputChannel.appendLine('Done!');

// 显示输出面板
outputChannel.show();

// 清空
outputChannel.clear();

// 销毁
outputChannel.dispose();
```

---

## 10. 最佳实践

### 10.1 资源管理

```typescript
// ✅ 好的做法
export async function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('cmd', handler);
    context.subscriptions.push(disposable);
    
    const service = new MyService();
    context.subscriptions.push(service);  // 如果 service 实现了 dispose
}

// ❌ 避免内存泄漏
let disposable = vscode.commands.registerCommand('cmd', handler);
// 没有添加到 subscriptions，无法自动清理
```

### 10.2 异步处理

```typescript
// ✅ 使用 async/await
export async function activate(context: vscode.ExtensionContext) {
    try {
        const data = await loadData();
        await initialize(data);
    } catch (error) {
        vscode.window.showErrorMessage(`初始化失败: ${error}`);
    }
}

// ❌ 避免未处理的 Promise
export function activate(context: vscode.ExtensionContext) {
    loadData().then(data => {
        // 如果出错，用户看不到错误信息
    });
}
```

### 10.3 错误处理

```typescript
// ✅ 友好的错误提示
try {
    await deleteTodo(id);
    vscode.window.showInformationMessage('✓ 任务已删除');
} catch (error) {
    console.error('Delete failed:', error);
    vscode.window.showErrorMessage(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
}
```

### 10.4 性能优化

```typescript
// ✅ 防抖
import { debounce } from './utils';

const debouncedRefresh = debounce(() => {
    this.refresh();
}, 300);

vscode.workspace.onDidChangeTextDocument(() => {
    debouncedRefresh();
});

// ✅ 延迟加载
getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(this.loadItems());
        }, 0);
    });
}
```

### 10.5 国际化

```typescript
// package.json
{
  "contributes": {
    "commands": [
      {
        "command": "todo.add",
        "title": "%todo.add.title%"
      }
    ]
  }
}

// package.nls.json (英文)
{
  "todo.add.title": "Add TODO"
}

// package.nls.zh-cn.json (中文)
{
  "todo.add.title": "添加待办事项"
}
```

### 10.6 安全性

```typescript
// ✅ HTML 转义
private escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ✅ 敏感信息使用 secrets
await context.secrets.store('apiKey', apiKey);

// ❌ 避免
await context.globalState.update('apiKey', apiKey);  // 不安全
```

### 10.7 测试

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Create todo', async () => {
        const todoService = new TodoService(storageManager);
        const todo = await todoService.createTodo('Test task');
        
        assert.strictEqual(todo.title, 'Test task');
        assert.strictEqual(todo.status, TodoStatus.PENDING);
    });
});
```

---

## 总结

这份文档涵盖了 VSCode 插件开发的核心概念：

1. **插件生命周期** - activate/deactivate 函数
2. **ExtensionContext** - 插件的核心上下文
3. **数据持久化** - globalState, workspaceState, secrets
4. **TreeView** - 树形视图的实现
5. **Webview** - 自定义界面开发
6. **命令系统** - 命令注册和执行
7. **配置管理** - 读取和更新配置
8. **事件系统** - 自定义和内置事件
9. **UI 交互** - 消息、输入框、选择器等
10. **最佳实践** - 资源管理、错误处理、性能优化

建议你：
1. 先阅读每个章节的核心概念
2. 参考你的项目代码理解实际应用
3. 动手修改和扩展你的插件
4. 查阅 [VSCode API 官方文档](https://code.visualstudio.com/api/references/vscode-api) 获取更多细节

祝你开发顺利！🚀

