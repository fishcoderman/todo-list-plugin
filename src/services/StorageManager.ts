import * as vscode from 'vscode';
import { TodoData, TodoItem } from '../models/TodoItem';

/**
 * 数据存储管理器
 * 负责待办事项数据的持久化和恢复
 */
export class StorageManager {
    private static readonly STORAGE_KEY = 'todoList.data';
    private static readonly BACKUP_KEY = 'todoList.data.backup';
    private static readonly CURRENT_VERSION = 1;

    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * 初始化存储
     * 加载并验证数据，必要时从备份恢复
     */
    async initialize(): Promise<TodoData> {
        try {
            const data = await this.loadData();
            return data;
        } catch (error) {
            console.error('Failed to load data, attempting to restore from backup:', error);
            return await this.restoreFromBackup();
        }
    }

    /**
     * 获取所有待办事项
     */
    async getTodos(): Promise<TodoItem[]> {
        const data = await this.loadData();
        return data.items;
    }

    /**
     * 保存待办事项列表
     */
    async saveTodos(items: TodoItem[]): Promise<void> {
        try {
            // 保存当前数据作为备份
            const currentData = await this.loadDataRaw();
            if (currentData) {
                await this.context.globalState.update(StorageManager.BACKUP_KEY, currentData);
            }

            // 保存新数据
            const todoData: TodoData = {
                items,
                version: StorageManager.CURRENT_VERSION,
                lastSync: Date.now()
            };

            await this.context.globalState.update(StorageManager.STORAGE_KEY, todoData);
        } catch (error) {
            console.error('Failed to save todos:', error);
            throw new Error('保存任务失败，请重试');
        }
    }

    /**
     * 清除所有数据
     */
    async clearAll(): Promise<void> {
        await this.context.globalState.update(StorageManager.STORAGE_KEY, undefined);
        await this.context.globalState.update(StorageManager.BACKUP_KEY, undefined);
    }

    /**
     * 导出数据为 JSON
     */
    async exportData(): Promise<string> {
        const data = await this.loadData();
        return JSON.stringify(data, null, 2);
    }

    /**
     * 从 JSON 导入数据
     */
    async importData(jsonData: string): Promise<void> {
        try {
            const data = JSON.parse(jsonData) as TodoData;
            
            // 验证数据结构
            if (!this.validateData(data)) {
                throw new Error('Invalid data structure');
            }

            await this.context.globalState.update(StorageManager.STORAGE_KEY, data);
        } catch (error) {
            console.error('Failed to import data:', error);
            throw new Error('导入数据失败，请检查数据格式');
        }
    }

    /**
     * 加载数据（带验证和迁移）
     */
    private async loadData(): Promise<TodoData> {
        const data = await this.loadDataRaw();
        
        if (!data) {
            // 返回空数据结构
            return this.createEmptyData();
        }

        // 验证数据
        if (!this.validateData(data)) {
            console.warn('Data validation failed, creating new data');
            return this.createEmptyData();
        }

        // 数据迁移（如果需要）
        if (data.version < StorageManager.CURRENT_VERSION) {
            return this.migrateData(data);
        }

        return data;
    }

    /**
     * 原始数据加载（不做处理）
     */
    private async loadDataRaw(): Promise<TodoData | undefined> {
        return this.context.globalState.get<TodoData>(StorageManager.STORAGE_KEY);
    }

    /**
     * 从备份恢复数据
     */
    private async restoreFromBackup(): Promise<TodoData> {
        try {
            const backupData = this.context.globalState.get<TodoData>(StorageManager.BACKUP_KEY);
            
            if (backupData && this.validateData(backupData)) {
                console.log('Successfully restored from backup');
                await this.context.globalState.update(StorageManager.STORAGE_KEY, backupData);
                return backupData;
            }
        } catch (error) {
            console.error('Failed to restore from backup:', error);
        }

        // 备份也失败，返回空数据
        console.warn('Backup restore failed, creating empty data');
        return this.createEmptyData();
    }

    /**
     * 创建空数据结构
     */
    private createEmptyData(): TodoData {
        return {
            items: [],
            version: StorageManager.CURRENT_VERSION,
            lastSync: Date.now()
        };
    }

    /**
     * 验证数据结构
     */
    private validateData(data: any): data is TodoData {
        if (!data || typeof data !== 'object') {
            return false;
        }

        if (!Array.isArray(data.items)) {
            return false;
        }

        if (typeof data.version !== 'number') {
            return false;
        }

        // 验证每个任务项
        for (const item of data.items) {
            if (!this.validateTodoItem(item)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 验证单个待办事项
     */
    private validateTodoItem(item: any): item is TodoItem {
        return (
            item &&
            typeof item.id === 'string' &&
            typeof item.title === 'string' &&
            typeof item.status === 'string' &&
            typeof item.priority === 'string' &&
            typeof item.createdAt === 'number' &&
            typeof item.updatedAt === 'number'
        );
    }

    /**
     * 数据迁移
     */
    private migrateData(data: TodoData): TodoData {
        // 未来版本升级时在此处理数据迁移
        console.log(`Migrating data from version ${data.version} to ${StorageManager.CURRENT_VERSION}`);
        
        data.version = StorageManager.CURRENT_VERSION;
        data.lastSync = Date.now();
        
        return data;
    }
}
