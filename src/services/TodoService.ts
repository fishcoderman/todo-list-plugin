import { v4 as uuidv4 } from 'uuid';
import { TodoItem, TodoStatus, TodoPriority } from '../models/TodoItem';
import { StorageManager } from './StorageManager';
import * as vscode from 'vscode';

/**
 * 待办事项业务逻辑服务
 * 提供任务的 CRUD 操作和状态管理
 */
export class TodoService {
    private storageManager: StorageManager;
    private todos: TodoItem[] = [];
    
    // 事件发射器，用于通知视图更新
    private _onDidChangeTodos: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeTodos: vscode.Event<void> = this._onDidChangeTodos.event;

    constructor(storageManager: StorageManager) {
        this.storageManager = storageManager;
    }

    /**
     * 初始化服务
     */
    async initialize(): Promise<void> {
        this.todos = await this.storageManager.getTodos();
    }

    /**
     * 获取所有待办事项
     */
    getTodos(): TodoItem[] {
        return [...this.todos];
    }

    /**
     * 根据 ID 获取待办事项
     */
    getTodoById(id: string): TodoItem | undefined {
        return this.todos.find(todo => todo.id === id);
    }

    /**
     * 创建新的待办事项
     */
    async createTodo(
        title: string,
        priority: TodoPriority = TodoPriority.MEDIUM,
        description?: string,
        dueDate?: number,
        tags?: string[]
    ): Promise<TodoItem> {
        const now = Date.now();
        
        const newTodo: TodoItem = {
            id: uuidv4(),
            title: title.trim(),
            description: description?.trim(),
            status: TodoStatus.PENDING,
            priority,
            createdAt: now,
            updatedAt: now,
            dueDate,
            tags
        };

        this.todos.push(newTodo);
        await this.save();
        
        return newTodo;
    }

    /**
     * 更新待办事项
     */
    async updateTodo(
        id: string,
        updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>
    ): Promise<TodoItem | undefined> {
        const index = this.todos.findIndex(todo => todo.id === id);
        
        if (index === -1) {
            return undefined;
        }

        const updatedTodo: TodoItem = {
            ...this.todos[index],
            ...updates,
            updatedAt: Date.now()
        };

        this.todos[index] = updatedTodo;
        await this.save();
        
        return updatedTodo;
    }

    /**
     * 更新任务状态
     */
    async updateTodoStatus(id: string, status: TodoStatus): Promise<TodoItem | undefined> {
        return await this.updateTodo(id, { status });
    }

    /**
     * 切换任务完成状态
     */
    async toggleTodoStatus(id: string): Promise<TodoItem | undefined> {
        const todo = this.getTodoById(id);
        
        if (!todo) {
            return undefined;
        }

        const newStatus = todo.status === TodoStatus.COMPLETED 
            ? TodoStatus.PENDING 
            : TodoStatus.COMPLETED;

        return await this.updateTodoStatus(id, newStatus);
    }

    /**
     * 删除待办事项
     */
    async deleteTodo(id: string): Promise<boolean> {
        const index = this.todos.findIndex(todo => todo.id === id);
        
        if (index === -1) {
            return false;
        }

        this.todos.splice(index, 1);
        await this.save();
        
        return true;
    }

    /**
     * 清除所有已完成的任务
     */
    async clearCompletedTodos(): Promise<number> {
        const initialCount = this.todos.length;
        this.todos = this.todos.filter(todo => todo.status !== TodoStatus.COMPLETED);
        
        const clearedCount = initialCount - this.todos.length;
        
        if (clearedCount > 0) {
            await this.save();
        }
        
        return clearedCount;
    }

    /**
     * 按状态过滤任务
     */
    getTodosByStatus(status: TodoStatus): TodoItem[] {
        return this.todos.filter(todo => todo.status === status);
    }

    /**
     * 按优先级过滤任务
     */
    getTodosByPriority(priority: TodoPriority): TodoItem[] {
        return this.todos.filter(todo => todo.priority === priority);
    }

    /**
     * 按标签过滤任务
     */
    getTodosByTag(tag: string): TodoItem[] {
        return this.todos.filter(todo => todo.tags?.includes(tag) || false);
    }

    /**
     * 获取所有标签
     */
    getAllTags(): string[] {
        const tagSet = new Set<string>();
        
        this.todos.forEach(todo => {
            todo.tags?.forEach(tag => tagSet.add(tag));
        });
        
        return Array.from(tagSet).sort();
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        const total = this.todos.length;
        const pending = this.getTodosByStatus(TodoStatus.PENDING).length;
        const inProgress = this.getTodosByStatus(TodoStatus.IN_PROGRESS).length;
        const completed = this.getTodosByStatus(TodoStatus.COMPLETED).length;
        
        const highPriority = this.getTodosByPriority(TodoPriority.HIGH).length;
        const mediumPriority = this.getTodosByPriority(TodoPriority.MEDIUM).length;
        const lowPriority = this.getTodosByPriority(TodoPriority.LOW).length;

        return {
            total,
            byStatus: {
                pending,
                inProgress,
                completed
            },
            byPriority: {
                high: highPriority,
                medium: mediumPriority,
                low: lowPriority
            }
        };
    }

    /**
     * 搜索任务
     */
    searchTodos(query: string): TodoItem[] {
        const lowerQuery = query.toLowerCase();
        
        return this.todos.filter(todo => {
            return (
                todo.title.toLowerCase().includes(lowerQuery) ||
                todo.description?.toLowerCase().includes(lowerQuery) ||
                todo.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
            );
        });
    }

    /**
     * 保存数据并触发更新事件
     */
    private async save(): Promise<void> {
        await this.storageManager.saveTodos(this.todos);
        this._onDidChangeTodos.fire();
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this._onDidChangeTodos.dispose();
    }
}
