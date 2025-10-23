import * as vscode from 'vscode';
import { TodoItem, TodoStatus, TodoPriority } from '../models/TodoItem';
import { TodoService } from '../services/TodoService';

/**
 * Webview 提供者
 * 显示待办事项的详细信息
 */
export class TodoWebviewProvider {
    private static currentPanel: vscode.WebviewPanel | undefined;
    private static currentTodoId: string | undefined;

    constructor(
        private context: vscode.ExtensionContext,
        private todoService: TodoService
    ) {}

    /**
     * 显示待办事项详情
     */
    public showTodoDetails(todo: TodoItem): void {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (TodoWebviewProvider.currentPanel) {
            // 如果面板已存在，更新内容
            TodoWebviewProvider.currentPanel.reveal(columnToShowIn);
            TodoWebviewProvider.currentTodoId = todo.id;
            TodoWebviewProvider.currentPanel.webview.html = this.getWebviewContent(todo);
        } else {
            // 创建新面板
            TodoWebviewProvider.currentPanel = vscode.window.createWebviewPanel(
                'todoDetails',
                `TODO: ${todo.title}`,
                columnToShowIn || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(this.context.extensionUri, 'resources')
                    ]
                }
            );

            TodoWebviewProvider.currentTodoId = todo.id;
            TodoWebviewProvider.currentPanel.webview.html = this.getWebviewContent(todo);

            // 处理面板关闭事件
            TodoWebviewProvider.currentPanel.onDidDispose(
                () => {
                    TodoWebviewProvider.currentPanel = undefined;
                    TodoWebviewProvider.currentTodoId = undefined;
                },
                null,
                this.context.subscriptions
            );

            // 处理来自 webview 的消息
            TodoWebviewProvider.currentPanel.webview.onDidReceiveMessage(
                message => this.handleMessage(message),
                undefined,
                this.context.subscriptions
            );

            // 监听任务变化
            this.todoService.onDidChangeTodos(() => {
                if (TodoWebviewProvider.currentPanel && TodoWebviewProvider.currentTodoId) {
                    const updatedTodo = this.todoService.getTodoById(TodoWebviewProvider.currentTodoId);
                    if (updatedTodo) {
                        TodoWebviewProvider.currentPanel.webview.html = this.getWebviewContent(updatedTodo);
                        TodoWebviewProvider.currentPanel.title = `TODO: ${updatedTodo.title}`;
                    } else {
                        // 任务已被删除，关闭面板
                        TodoWebviewProvider.currentPanel.dispose();
                    }
                }
            });
        }
    }

    /**
     * 处理来自 webview 的消息
     */
    private async handleMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'edit':
                await vscode.commands.executeCommand('todo.editTodo', message.todoId);
                break;
            case 'delete':
                await vscode.commands.executeCommand('todo.deleteTodo', message.todoId);
                break;
            case 'toggleStatus':
                await this.todoService.toggleTodoStatus(message.todoId);
                break;
            case 'updateStatus':
                await this.todoService.updateTodoStatus(message.todoId, message.status);
                break;
        }
    }

    /**
     * 生成 Webview HTML 内容
     */
    private getWebviewContent(todo: TodoItem): string {
        const statusOptions = this.getStatusOptions(todo.status);
        const priorityBadge = this.getPriorityBadge(todo.priority);
        const statusBadge = this.getStatusBadge(todo.status);

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>TODO Details</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        
        .title {
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 12px 0;
            color: var(--vscode-editor-foreground);
        }
        
        .badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .badge-status {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        
        .badge-priority-high {
            background-color: rgba(255, 82, 82, 0.2);
            color: #ff5252;
            border: 1px solid #ff5252;
        }
        
        .badge-priority-medium {
            background-color: rgba(255, 171, 0, 0.2);
            color: #ffab00;
            border: 1px solid #ffab00;
        }
        
        .badge-priority-low {
            background-color: rgba(76, 175, 80, 0.2);
            color: #4caf50;
            border: 1px solid #4caf50;
        }
        
        .section {
            margin-bottom: 24px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .section-content {
            padding: 12px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        
        .meta-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .meta-label {
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
        }
        
        .meta-value {
            color: var(--vscode-foreground);
        }
        
        .description {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .tag {
            padding: 4px 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 4px;
            font-size: 12px;
        }
        
        .actions {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 16px 20px;
            background-color: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
        }
        
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: opacity 0.2s;
        }
        
        button:hover {
            opacity: 0.8;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-danger {
            background-color: rgba(255, 82, 82, 0.9);
            color: white;
        }
        
        .status-select {
            padding: 6px 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 13px;
        }
        
        .empty-state {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        
        /* 为底部操作栏留出空间 */
        .content-wrapper {
            padding-bottom: 80px;
        }
    </style>
</head>
<body>
    <div class="content-wrapper">
        <div class="header">
            <h1 class="title">${this.escapeHtml(todo.title)}</h1>
            <div class="badges">
                ${statusBadge}
                ${priorityBadge}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">基本信息</div>
            <div class="meta-info">
                <div class="meta-item">
                    <span class="meta-label">状态:</span>
                    <select class="status-select" id="statusSelect" onchange="updateStatus()">
                        ${statusOptions}
                    </select>
                </div>
                <div class="meta-item">
                    <span class="meta-label">优先级:</span>
                    <span class="meta-value">${this.getPriorityLabel(todo.priority)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">创建时间:</span>
                    <span class="meta-value">${this.formatDate(todo.createdAt)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">更新时间:</span>
                    <span class="meta-value">${this.formatDate(todo.updatedAt)}</span>
                </div>
                ${todo.dueDate ? `
                <div class="meta-item">
                    <span class="meta-label">截止日期:</span>
                    <span class="meta-value">${this.formatDate(todo.dueDate)}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        ${todo.description ? `
        <div class="section">
            <div class="section-title">描述</div>
            <div class="section-content description">${this.escapeHtml(todo.description)}</div>
        </div>
        ` : ''}
        
        ${todo.tags && todo.tags.length > 0 ? `
        <div class="section">
            <div class="section-title">标签</div>
            <div class="tags">
                ${todo.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>
        ` : ''}
    </div>
    
    <div class="actions">
        <button class="btn-primary" onclick="editTodo()">编辑</button>
        <button class="btn-secondary" onclick="toggleStatus()">切换完成状态</button>
        <button class="btn-danger" onclick="deleteTodo()">删除</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const todoId = '${todo.id}';
        
        function editTodo() {
            vscode.postMessage({
                command: 'edit',
                todoId: todoId
            });
        }
        
        function deleteTodo() {
            vscode.postMessage({
                command: 'delete',
                todoId: todoId
            });
        }
        
        function toggleStatus() {
            vscode.postMessage({
                command: 'toggleStatus',
                todoId: todoId
            });
        }
        
        function updateStatus() {
            const select = document.getElementById('statusSelect');
            vscode.postMessage({
                command: 'updateStatus',
                todoId: todoId,
                status: select.value
            });
        }
    </script>
</body>
</html>`;
    }

    private getStatusOptions(currentStatus: TodoStatus): string {
        const statuses = [
            { value: TodoStatus.PENDING, label: '待处理' },
            { value: TodoStatus.IN_PROGRESS, label: '进行中' },
            { value: TodoStatus.COMPLETED, label: '已完成' }
        ];

        return statuses.map(status => 
            `<option value="${status.value}" ${status.value === currentStatus ? 'selected' : ''}>${status.label}</option>`
        ).join('');
    }

    private getStatusBadge(status: TodoStatus): string {
        const label = this.getStatusLabel(status);
        return `<span class="badge badge-status">${label}</span>`;
    }

    private getPriorityBadge(priority: TodoPriority): string {
        const label = this.getPriorityLabel(priority);
        const className = `badge-priority-${priority}`;
        return `<span class="badge ${className}">${label}</span>`;
    }

    private getStatusLabel(status: TodoStatus): string {
        switch (status) {
            case TodoStatus.PENDING: return '待处理';
            case TodoStatus.IN_PROGRESS: return '进行中';
            case TodoStatus.COMPLETED: return '已完成';
        }
    }

    private getPriorityLabel(priority: TodoPriority): string {
        switch (priority) {
            case TodoPriority.HIGH: return '高优先级';
            case TodoPriority.MEDIUM: return '中优先级';
            case TodoPriority.LOW: return '低优先级';
        }
    }

    private formatDate(timestamp: number): string {
        return new Date(timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 关闭当前面板
     */
    public static closeCurrentPanel(): void {
        TodoWebviewProvider.currentPanel?.dispose();
    }
}
