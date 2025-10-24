import * as vscode from 'vscode';
import { TodoService } from '../services/TodoService';
import { TodoItem, TodoStatus } from '../models/TodoItem';

/**
 * 自定义 WebviewView 提供者
 * 支持搜索框和自定义 UI
 */
export class TodoWebviewViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private todoService: TodoService
    ) {
        // 监听数据变化，自动更新视图
        this.todoService.onDidChangeTodos(() => {
            this.updateView();
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 处理来自 Webview 的消息
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'search':
                    this.handleSearch(data.query);
                    break;
                case 'addTodo':
                    this.handleAddTodo(data.title);
                    break;
                case 'toggleStatus':
                    this.handleToggleStatus(data.id);
                    break;
                case 'showDetails':
                    this.handleShowDetails(data.id);
                    break;
            }
        });
    }

    /**
     * 更新视图
     */
    private updateView() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    /**
     * 处理搜索
     */
    private handleSearch(query: string) {
        const todos = query 
            ? this.todoService.searchTodos(query)
            : this.todoService.getTodos();

        // 发送搜索结果到 Webview
        this._view?.webview.postMessage({
            type: 'searchResults',
            todos: todos
        });
    }

    /**
     * 处理添加任务
     */
    private async handleAddTodo(title: string) {
        if (title.trim()) {
            await vscode.commands.executeCommand('todo.addTodo');
        }
    }

    /**
     * 处理切换状态
     */
    private async handleToggleStatus(id: string) {
        await this.todoService.toggleTodoStatus(id);
    }

    /**
     * 处理显示详情
     */
    private async handleShowDetails(id: string) {
        const todo = this.todoService.getTodoById(id);
        if (todo) {
            await vscode.commands.executeCommand('todo.showDetails', todo);
        }
    }

    /**
     * 生成 HTML 内容
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        const todos = this.todoService.getTodos();

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>TODO List</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 0;
            margin: 0;
        }

        /* 搜索框容器 */
        .search-container {
            position: sticky;
            top: 0;
            background-color: var(--vscode-sideBar-background);
            padding: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            z-index: 100;
        }

        /* 搜索框 */
        .search-box {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }

        .search-input {
            flex: 1;
            padding: 6px 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-size: 13px;
        }

        .search-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }

        .search-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }

        /* 提交按钮 */
        .submit-button {
            padding: 6px 16px;
            background-color: #2ea043;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }

        .submit-button:hover {
            background-color: #2c974b;
        }

        .submit-button:active {
            background-color: #298e46;
        }

        /* 任务列表 */
        .todo-list {
            padding: 8px 0;
        }

        .todo-group {
            margin-bottom: 16px;
        }

        .group-title {
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
        }

        .todo-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            cursor: pointer;
            transition: background-color 0.1s;
        }

        .todo-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .todo-checkbox {
            width: 16px;
            height: 16px;
            margin-right: 8px;
            cursor: pointer;
        }

        .todo-title {
            flex: 1;
            font-size: 13px;
        }

        .todo-completed .todo-title {
            text-decoration: line-through;
            opacity: 0.6;
        }

        .todo-priority {
            font-size: 11px;
            margin-left: 8px;
        }

        .priority-high {
            color: #f85149;
        }

        .priority-medium {
            color: #f0883e;
        }

        .priority-low {
            color: #7ee787;
        }

        .empty-state {
            padding: 40px 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <!-- 搜索框和提交按钮 -->
    <div class="search-container">
        <div class="search-box">
            <input 
                type="text" 
                class="search-input" 
                id="searchInput"
                placeholder="搜索任务..."
                oninput="handleSearch()"
                onkeypress="handleSearchKeyPress(event)"
            />
            <button class="submit-button" onclick="handleSubmit()">✓ 提交</button>
        </div>
    </div>

    <!-- 任务列表 -->
    <div class="todo-list" id="todoList">
        ${this.generateTodoListHtml(todos)}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // 处理搜索
        function handleSearch() {
            const input = document.getElementById('searchInput');
            vscode.postMessage({
                type: 'search',
                query: input.value
            });
        }

        // 处理回车键
        function handleSearchKeyPress(event) {
            if (event.key === 'Enter') {
                const input = document.getElementById('searchInput');
                const value = input.value.trim();
                
                if (value) {
                    // 如果有内容，按 Shift+Enter 搜索，直接 Enter 添加任务
                    if (event.shiftKey) {
                        handleSearch();
                    } else {
                        handleSubmit();
                    }
                } else {
                    // 如果为空，显示所有任务
                    handleSearch();
                }
            }
        }

        // 处理提交
        function handleSubmit() {
            const input = document.getElementById('searchInput');
            const value = input.value.trim();
            
            if (value) {
                vscode.postMessage({
                    type: 'addTodo',
                    title: value
                });
                input.value = '';
            }
        }

        // 切换任务状态
        function toggleTodo(id) {
            vscode.postMessage({
                type: 'toggleStatus',
                id: id
            });
        }

        // 显示详情
        function showDetails(id) {
            vscode.postMessage({
                type: 'showDetails',
                id: id
            });
        }

        // 监听消息
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'searchResults':
                    updateTodoList(message.todos);
                    break;
            }
        });

        // 更新任务列表
        function updateTodoList(todos) {
            const listElement = document.getElementById('todoList');
            if (todos.length === 0) {
                listElement.innerHTML = '<div class="empty-state">没有找到任务</div>';
            } else {
                // 这里可以根据需要重新生成列表
                listElement.innerHTML = generateTodoListHtml(todos);
            }
        }
    </script>
</body>
</html>`;
    }

    /**
     * 生成任务列表 HTML
     */
    private generateTodoListHtml(todos: TodoItem[]): string {
        if (todos.length === 0) {
            return '<div class="empty-state">暂无任务，点击提交按钮添加第一个任务</div>';
        }

        const groups = {
            inProgress: todos.filter(t => t.status === TodoStatus.IN_PROGRESS),
            pending: todos.filter(t => t.status === TodoStatus.PENDING),
            completed: todos.filter(t => t.status === TodoStatus.COMPLETED)
        };

        let html = '';

        if (groups.inProgress.length > 0) {
            html += this.generateGroupHtml('进行中', groups.inProgress);
        }

        if (groups.pending.length > 0) {
            html += this.generateGroupHtml('待处理', groups.pending);
        }

        if (groups.completed.length > 0) {
            html += this.generateGroupHtml('已完成', groups.completed);
        }

        return html;
    }

    /**
     * 生成分组 HTML
     */
    private generateGroupHtml(title: string, todos: TodoItem[]): string {
        const items = todos.map(todo => {
            const priorityClass = `priority-${todo.priority}`;
            const completedClass = todo.status === TodoStatus.COMPLETED ? 'todo-completed' : '';
            const checked = todo.status === TodoStatus.COMPLETED ? 'checked' : '';

            return `
                <div class="todo-item ${completedClass}" onclick="showDetails('${todo.id}')">
                    <input 
                        type="checkbox" 
                        class="todo-checkbox" 
                        ${checked}
                        onclick="event.stopPropagation(); toggleTodo('${todo.id}')"
                    />
                    <span class="todo-title">${this.escapeHtml(todo.title)}</span>
                    <span class="todo-priority ${priorityClass}">${this.getPriorityLabel(todo.priority)}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="todo-group">
                <div class="group-title">${title}</div>
                ${items}
            </div>
        `;
    }

    private getPriorityLabel(priority: string): string {
        switch (priority) {
            case 'high': return '!!!';
            case 'medium': return '!!';
            case 'low': return '!';
            default: return '';
        }
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
