import * as vscode from 'vscode';
import { TodoService } from '../services/TodoService';
import { TodoWebviewProvider } from '../views/TodoWebviewProvider';
import { TodoTreeDataProvider } from '../views/TodoTreeDataProvider';
import { TodoItem, TodoPriority, TodoStatus } from '../models/TodoItem';

/**
 * 待办事项命令处理器
 */
export class TodoCommands {
    constructor(
        private todoService: TodoService,
        private treeDataProvider: TodoTreeDataProvider,
        private webviewProvider: TodoWebviewProvider
    ) {}

    /**
     * 注册所有命令
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('todo.addTodo', () => this.addTodo()),
            vscode.commands.registerCommand('todo.editTodo', (todoId?: string) => this.editTodo(todoId)),
            vscode.commands.registerCommand('todo.deleteTodo', (todoId?: string) => this.deleteTodo(todoId)),
            vscode.commands.registerCommand('todo.toggleStatus', (item?: any) => this.toggleStatus(item)),
            vscode.commands.registerCommand('todo.showDetails', (item?: any) => this.showDetails(item)),
            vscode.commands.registerCommand('todo.refresh', () => this.refresh()),
            vscode.commands.registerCommand('todo.clearCompleted', () => this.clearCompleted())
        );
    }

    /**
     * 添加新待办事项
     */
    private async addTodo(): Promise<void> {
        // 获取标题
        const title = await vscode.window.showInputBox({
            prompt: '请输入任务标题',
            placeHolder: '例如：完成项目文档',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return '标题不能为空';
                }
                if (value.trim().length > 100) {
                    return '标题长度不能超过100个字符';
                }
                return null;
            }
        });

        if (!title) {
            return;
        }

        // 获取优先级
        const config = vscode.workspace.getConfiguration('todo');
        const defaultPriority = config.get<string>('defaultPriority', 'medium') as TodoPriority;

        const priorityItems: vscode.QuickPickItem[] = [
            { label: '高优先级', description: '重要且紧急', picked: defaultPriority === TodoPriority.HIGH },
            { label: '中优先级', description: '一般任务', picked: defaultPriority === TodoPriority.MEDIUM },
            { label: '低优先级', description: '不紧急', picked: defaultPriority === TodoPriority.LOW }
        ];

        const selectedPriority = await vscode.window.showQuickPick(priorityItems, {
            placeHolder: '选择优先级'
        });

        if (!selectedPriority) {
            return;
        }

        let priority: TodoPriority;
        switch (selectedPriority.label) {
            case '高优先级':
                priority = TodoPriority.HIGH;
                break;
            case '低优先级':
                priority = TodoPriority.LOW;
                break;
            default:
                priority = TodoPriority.MEDIUM;
        }

        // 询问是否添加描述
        const addDescription = await vscode.window.showQuickPick(
            ['是', '否'],
            { placeHolder: '是否添加详细描述？' }
        );

        let description: string | undefined;
        if (addDescription === '是') {
            description = await vscode.window.showInputBox({
                prompt: '请输入任务描述',
                placeHolder: '详细说明任务内容...',
                validateInput: (value) => {
                    if (value && value.length > 1000) {
                        return '描述长度不能超过1000个字符';
                    }
                    return null;
                }
            });
        }

        // 创建任务
        try {
            const newTodo = await this.todoService.createTodo(title, priority, description);
            vscode.window.showInformationMessage(`✓ 任务已创建: ${newTodo.title}`);
        } catch (error) {
            vscode.window.showErrorMessage(`创建任务失败: ${error}`);
        }
    }

    /**
     * 编辑待办事项
     */
    private async editTodo(todoId?: string): Promise<void> {
        let todo: TodoItem | undefined;

        if (todoId) {
            todo = this.todoService.getTodoById(todoId);
        } else {
            // 从列表中选择
            todo = await this.selectTodo('选择要编辑的任务');
        }

        if (!todo) {
            vscode.window.showWarningMessage('未找到任务');
            return;
        }

        // 选择要编辑的字段
        const fieldToEdit = await vscode.window.showQuickPick([
            { label: '标题', value: 'title' },
            { label: '描述', value: 'description' },
            { label: '优先级', value: 'priority' },
            { label: '状态', value: 'status' },
            { label: '标签', value: 'tags' }
        ], {
            placeHolder: '选择要编辑的字段'
        });

        if (!fieldToEdit) {
            return;
        }

        try {
            switch (fieldToEdit.value) {
                case 'title':
                    await this.editTitle(todo);
                    break;
                case 'description':
                    await this.editDescription(todo);
                    break;
                case 'priority':
                    await this.editPriority(todo);
                    break;
                case 'status':
                    await this.editStatus(todo);
                    break;
                case 'tags':
                    await this.editTags(todo);
                    break;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`编辑失败: ${error}`);
        }
    }

    private async editTitle(todo: TodoItem): Promise<void> {
        const newTitle = await vscode.window.showInputBox({
            prompt: '修改任务标题',
            value: todo.title,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return '标题不能为空';
                }
                if (value.trim().length > 100) {
                    return '标题长度不能超过100个字符';
                }
                return null;
            }
        });

        if (newTitle && newTitle !== todo.title) {
            await this.todoService.updateTodo(todo.id, { title: newTitle });
            vscode.window.showInformationMessage('✓ 标题已更新');
        }
    }

    private async editDescription(todo: TodoItem): Promise<void> {
        const newDescription = await vscode.window.showInputBox({
            prompt: '修改任务描述',
            value: todo.description || '',
            placeHolder: '输入描述...',
            validateInput: (value) => {
                if (value && value.length > 1000) {
                    return '描述长度不能超过1000个字符';
                }
                return null;
            }
        });

        if (newDescription !== undefined && newDescription !== todo.description) {
            await this.todoService.updateTodo(todo.id, { 
                description: newDescription.trim() || undefined 
            });
            vscode.window.showInformationMessage('✓ 描述已更新');
        }
    }

    private async editPriority(todo: TodoItem): Promise<void> {
        const priorityItems: vscode.QuickPickItem[] = [
            { label: '高优先级', picked: todo.priority === TodoPriority.HIGH },
            { label: '中优先级', picked: todo.priority === TodoPriority.MEDIUM },
            { label: '低优先级', picked: todo.priority === TodoPriority.LOW }
        ];

        const selected = await vscode.window.showQuickPick(priorityItems, {
            placeHolder: '选择优先级'
        });

        if (selected) {
            let priority: TodoPriority;
            switch (selected.label) {
                case '高优先级':
                    priority = TodoPriority.HIGH;
                    break;
                case '低优先级':
                    priority = TodoPriority.LOW;
                    break;
                default:
                    priority = TodoPriority.MEDIUM;
            }

            if (priority !== todo.priority) {
                await this.todoService.updateTodo(todo.id, { priority });
                vscode.window.showInformationMessage('✓ 优先级已更新');
            }
        }
    }

    private async editStatus(todo: TodoItem): Promise<void> {
        const statusItems: vscode.QuickPickItem[] = [
            { label: '待处理', picked: todo.status === TodoStatus.PENDING },
            { label: '进行中', picked: todo.status === TodoStatus.IN_PROGRESS },
            { label: '已完成', picked: todo.status === TodoStatus.COMPLETED }
        ];

        const selected = await vscode.window.showQuickPick(statusItems, {
            placeHolder: '选择状态'
        });

        if (selected) {
            let status: TodoStatus;
            switch (selected.label) {
                case '待处理':
                    status = TodoStatus.PENDING;
                    break;
                case '进行中':
                    status = TodoStatus.IN_PROGRESS;
                    break;
                default:
                    status = TodoStatus.COMPLETED;
            }

            if (status !== todo.status) {
                await this.todoService.updateTodoStatus(todo.id, status);
                vscode.window.showInformationMessage('✓ 状态已更新');
            }
        }
    }

    private async editTags(todo: TodoItem): Promise<void> {
        const tagsInput = await vscode.window.showInputBox({
            prompt: '编辑标签（用逗号分隔）',
            value: todo.tags?.join(', ') || '',
            placeHolder: '例如：bug, frontend, urgent'
        });

        if (tagsInput !== undefined) {
            const tags = tagsInput
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            await this.todoService.updateTodo(todo.id, { 
                tags: tags.length > 0 ? tags : undefined 
            });
            vscode.window.showInformationMessage('✓ 标签已更新');
        }
    }

    /**
     * 删除待办事项
     */
    private async deleteTodo(todoId?: string): Promise<void> {
        let todo: TodoItem | undefined;

        if (todoId) {
            todo = this.todoService.getTodoById(todoId);
        } else {
            // 从列表中选择
            todo = await this.selectTodo('选择要删除的任务');
        }

        if (!todo) {
            vscode.window.showWarningMessage('未找到任务');
            return;
        }

        // 检查是否需要确认
        const config = vscode.workspace.getConfiguration('todo');
        const confirmDelete = config.get<boolean>('confirmDelete', true);

        if (confirmDelete) {
            const confirm = await vscode.window.showWarningMessage(
                `确定要删除任务 "${todo.title}" 吗？`,
                { modal: true },
                '删除',
                '取消'
            );

            if (confirm !== '删除') {
                return;
            }
        }

        try {
            const success = await this.todoService.deleteTodo(todo.id);
            if (success) {
                vscode.window.showInformationMessage(`✓ 任务已删除: ${todo.title}`);
                // 关闭详情面板（如果打开）
                TodoWebviewProvider.closeCurrentPanel();
            } else {
                vscode.window.showErrorMessage('删除任务失败');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`删除任务失败: ${error}`);
        }
    }

    /**
     * 切换任务状态
     */
    private async toggleStatus(item?: any): Promise<void> {
        let todo: TodoItem | undefined;

        if (item?.todoItem) {
            todo = item.todoItem;
        } else if (typeof item === 'string') {
            todo = this.todoService.getTodoById(item);
        } else {
            todo = await this.selectTodo('选择要切换状态的任务');
        }

        if (!todo) {
            vscode.window.showWarningMessage('未找到任务');
            return;
        }

        try {
            const updatedTodo = await this.todoService.toggleTodoStatus(todo.id);
            if (updatedTodo) {
                const statusLabel = updatedTodo.status === TodoStatus.COMPLETED ? '已完成' : '未完成';
                vscode.window.showInformationMessage(`✓ 任务状态已更新: ${statusLabel}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`更新状态失败: ${error}`);
        }
    }

    /**
     * 显示任务详情
     */
    private showDetails(item?: any): void {
        let todo: TodoItem | undefined;

        if (item?.todoItem) {
            todo = item.todoItem;
        } else if (item?.id) {
            todo = item;
        }

        if (!todo) {
            vscode.window.showWarningMessage('未找到任务');
            return;
        }

        this.webviewProvider.showTodoDetails(todo);
    }

    /**
     * 刷新视图
     */
    private refresh(): void {
        this.treeDataProvider.refresh();
        vscode.window.showInformationMessage('✓ 任务列表已刷新');
    }

    /**
     * 清除已完成的任务
     */
    private async clearCompleted(): Promise<void> {
        const completedCount = this.todoService.getTodosByStatus(TodoStatus.COMPLETED).length;

        if (completedCount === 0) {
            vscode.window.showInformationMessage('没有已完成的任务');
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `确定要清除 ${completedCount} 个已完成的任务吗？`,
            { modal: true },
            '清除',
            '取消'
        );

        if (confirm !== '清除') {
            return;
        }

        try {
            const cleared = await this.todoService.clearCompletedTodos();
            vscode.window.showInformationMessage(`✓ 已清除 ${cleared} 个已完成的任务`);
        } catch (error) {
            vscode.window.showErrorMessage(`清除失败: ${error}`);
        }
    }

    /**
     * 从列表中选择任务
     */
    private async selectTodo(placeHolder: string): Promise<TodoItem | undefined> {
        const todos = this.todoService.getTodos();

        if (todos.length === 0) {
            vscode.window.showInformationMessage('没有任务');
            return undefined;
        }

        const items: vscode.QuickPickItem[] = todos.map(todo => ({
            label: todo.title,
            description: this.getStatusLabel(todo.status),
            detail: todo.description,
            todo: todo
        } as any));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder
        });

        return selected ? (selected as any).todo : undefined;
    }

    private getStatusLabel(status: TodoStatus): string {
        switch (status) {
            case TodoStatus.PENDING: return '待处理';
            case TodoStatus.IN_PROGRESS: return '进行中';
            case TodoStatus.COMPLETED: return '已完成';
        }
    }
}

