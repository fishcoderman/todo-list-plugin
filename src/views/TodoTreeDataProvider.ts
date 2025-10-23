import * as vscode from 'vscode';
import { TodoItem, TodoStatus, TodoPriority, GroupBy } from '../models/TodoItem';
import { TodoService } from '../services/TodoService';

/**
 * TreeView 节点类型
 */
export class TodoTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly todoItem?: TodoItem,
        public readonly isGroup: boolean = false
    ) {
        super(label, collapsibleState);

        if (todoItem) {
            this.contextValue = 'todoItem';
            this.tooltip = this.createTooltip(todoItem);
            this.description = this.createDescription(todoItem);
            this.iconPath = this.getIcon(todoItem);
            
            // 设置命令，点击时显示详情
            this.command = {
                command: 'todo.showDetails',
                title: 'Show Details',
                arguments: [todoItem]
            };
        } else {
            this.contextValue = 'group';
        }
    }

    /**
     * 创建工具提示
     */
    private createTooltip(todo: TodoItem): string {
        const parts = [
            `标题: ${todo.title}`,
            `状态: ${this.getStatusLabel(todo.status)}`,
            `优先级: ${this.getPriorityLabel(todo.priority)}`,
            `创建时间: ${this.formatDate(todo.createdAt)}`
        ];

        if (todo.description) {
            parts.push(`描述: ${todo.description}`);
        }

        if (todo.dueDate) {
            parts.push(`截止日期: ${this.formatDate(todo.dueDate)}`);
        }

        if (todo.tags && todo.tags.length > 0) {
            parts.push(`标签: ${todo.tags.join(', ')}`);
        }

        return parts.join('\n');
    }

    /**
     * 创建描述文本
     */
    private createDescription(todo: TodoItem): string {
        const parts: string[] = [];

        // 添加优先级标识
        if (todo.priority === TodoPriority.HIGH) {
            parts.push('!!!');
        } else if (todo.priority === TodoPriority.MEDIUM) {
            parts.push('!!');
        }

        // 添加标签
        if (todo.tags && todo.tags.length > 0) {
            parts.push(`[${todo.tags.join(', ')}]`);
        }

        return parts.join(' ');
    }

    /**
     * 获取图标
     */
    private getIcon(todo: TodoItem): vscode.ThemeIcon {
        // 根据状态选择图标
        switch (todo.status) {
            case TodoStatus.COMPLETED:
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
            case TodoStatus.IN_PROGRESS:
                return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconQueued'));
            case TodoStatus.PENDING:
            default:
                // 根据优先级选择不同颜色
                if (todo.priority === TodoPriority.HIGH) {
                    return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('testing.iconFailed'));
                } else if (todo.priority === TodoPriority.MEDIUM) {
                    return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('testing.iconQueued'));
                } else {
                    return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('testing.iconUnset'));
                }
        }
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
            case TodoPriority.HIGH: return '高';
            case TodoPriority.MEDIUM: return '中';
            case TodoPriority.LOW: return '低';
        }
    }

    private formatDate(timestamp: number): string {
        return new Date(timestamp).toLocaleString('zh-CN');
    }
}

/**
 * TreeView 数据提供者
 */
export class TodoTreeDataProvider implements vscode.TreeDataProvider<TodoTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TodoTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<TodoTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TodoTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private groupBy: GroupBy = GroupBy.STATUS;

    constructor(private todoService: TodoService) {
        // 监听 TodoService 的变化
        this.todoService.onDidChangeTodos(() => {
            this.refresh();
        });

        // 监听配置变化
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('todo.groupBy')) {
                this.updateGroupBy();
                this.refresh();
            }
        });

        this.updateGroupBy();
    }

    /**
     * 刷新视图
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * 获取树节点
     */
    getTreeItem(element: TodoTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * 获取子节点
     */
    getChildren(element?: TodoTreeItem): Thenable<TodoTreeItem[]> {
        if (!element) {
            // 根节点
            return Promise.resolve(this.getRootNodes());
        }

        // 组节点的子节点
        if (element.isGroup) {
            return Promise.resolve(this.getGroupChildren(element.label));
        }

        return Promise.resolve([]);
    }

    /**
     * 获取根节点
     */
    private getRootNodes(): TodoTreeItem[] {
        const config = vscode.workspace.getConfiguration('todo');
        const showCompleted = config.get<boolean>('showCompletedTasks', true);

        let todos = this.todoService.getTodos();

        // 过滤已完成的任务（如果配置为不显示）
        if (!showCompleted) {
            todos = todos.filter(todo => todo.status !== TodoStatus.COMPLETED);
        }

        if (this.groupBy === GroupBy.NONE) {
            // 不分组，直接返回所有任务
            return todos.map(todo => new TodoTreeItem(
                todo.title,
                vscode.TreeItemCollapsibleState.None,
                todo,
                false
            ));
        }

        // 返回分组节点
        return this.createGroupNodes();
    }

    /**
     * 创建分组节点
     */
    private createGroupNodes(): TodoTreeItem[] {
        if (this.groupBy === GroupBy.STATUS) {
            return [
                new TodoTreeItem('进行中', vscode.TreeItemCollapsibleState.Expanded, undefined, true),
                new TodoTreeItem('待处理', vscode.TreeItemCollapsibleState.Expanded, undefined, true),
                new TodoTreeItem('已完成', vscode.TreeItemCollapsibleState.Collapsed, undefined, true)
            ];
        } else if (this.groupBy === GroupBy.PRIORITY) {
            return [
                new TodoTreeItem('高优先级', vscode.TreeItemCollapsibleState.Expanded, undefined, true),
                new TodoTreeItem('中优先级', vscode.TreeItemCollapsibleState.Expanded, undefined, true),
                new TodoTreeItem('低优先级', vscode.TreeItemCollapsibleState.Collapsed, undefined, true)
            ];
        }

        return [];
    }

    /**
     * 获取组的子节点
     */
    private getGroupChildren(groupLabel: string): TodoTreeItem[] {
        const config = vscode.workspace.getConfiguration('todo');
        const showCompleted = config.get<boolean>('showCompletedTasks', true);

        let todos: TodoItem[] = [];

        if (this.groupBy === GroupBy.STATUS) {
            switch (groupLabel) {
                case '进行中':
                    todos = this.todoService.getTodosByStatus(TodoStatus.IN_PROGRESS);
                    break;
                case '待处理':
                    todos = this.todoService.getTodosByStatus(TodoStatus.PENDING);
                    break;
                case '已完成':
                    if (showCompleted) {
                        todos = this.todoService.getTodosByStatus(TodoStatus.COMPLETED);
                    }
                    break;
            }
        } else if (this.groupBy === GroupBy.PRIORITY) {
            switch (groupLabel) {
                case '高优先级':
                    todos = this.todoService.getTodosByPriority(TodoPriority.HIGH);
                    break;
                case '中优先级':
                    todos = this.todoService.getTodosByPriority(TodoPriority.MEDIUM);
                    break;
                case '低优先级':
                    todos = this.todoService.getTodosByPriority(TodoPriority.LOW);
                    break;
            }

            // 在按优先级分组时，也要考虑是否显示已完成
            if (!showCompleted) {
                todos = todos.filter(todo => todo.status !== TodoStatus.COMPLETED);
            }
        }

        return todos.map(todo => new TodoTreeItem(
            todo.title,
            vscode.TreeItemCollapsibleState.None,
            todo,
            false
        ));
    }

    /**
     * 更新分组方式
     */
    private updateGroupBy(): void {
        const config = vscode.workspace.getConfiguration('todo');
        const groupByConfig = config.get<string>('groupBy', 'status');
        
        switch (groupByConfig) {
            case 'status':
                this.groupBy = GroupBy.STATUS;
                break;
            case 'priority':
                this.groupBy = GroupBy.PRIORITY;
                break;
            case 'none':
                this.groupBy = GroupBy.NONE;
                break;
            default:
                this.groupBy = GroupBy.STATUS;
        }
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
