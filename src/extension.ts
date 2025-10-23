import * as vscode from 'vscode';
import { StorageManager } from './services/StorageManager';
import { TodoService } from './services/TodoService';
import { TodoTreeDataProvider } from './views/TodoTreeDataProvider';
import { TodoWebviewProvider } from './views/TodoWebviewProvider';
import { TodoCommands } from './commands/TodoCommands';

/**
 * 插件激活函数
 * 当插件被激活时调用
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('TODO List Plugin is now active!');

    try {
        // 初始化存储管理器
        const storageManager = new StorageManager(context);
        await storageManager.initialize();

        // 初始化待办事项服务
        const todoService = new TodoService(storageManager);
        await todoService.initialize();

        // 创建 TreeView 数据提供者
        const treeDataProvider = new TodoTreeDataProvider(todoService);
        
        // 注册 TreeView
        const treeView = vscode.window.createTreeView('todoTreeView', {
            treeDataProvider: treeDataProvider,
            showCollapseAll: true
        });
        context.subscriptions.push(treeView);

        // 创建 Webview 提供者
        const webviewProvider = new TodoWebviewProvider(context, todoService);

        // 创建并注册命令处理器
        const commands = new TodoCommands(todoService, treeDataProvider, webviewProvider);
        commands.registerCommands(context);

        // 显示欢迎消息
        const stats = todoService.getStatistics();
        if (stats.total === 0) {
            vscode.window.showInformationMessage(
                '欢迎使用 TODO List 插件！点击 "+" 按钮添加第一个任务。'
            );
        } else {
            console.log(`Loaded ${stats.total} tasks: ${stats.byStatus.pending} pending, ${stats.byStatus.inProgress} in progress, ${stats.byStatus.completed} completed`);
        }

        // 保存服务实例到上下文，供其他命令使用
        (context as any).todoService = todoService;
        (context as any).treeDataProvider = treeDataProvider;

    } catch (error) {
        console.error('Failed to activate TODO List Plugin:', error);
        vscode.window.showErrorMessage(`TODO List 插件激活失败: ${error}`);
    }
}

/**
 * 插件停用函数
 * 当插件被停用时调用
 */
export function deactivate() {
    console.log('TODO List Plugin is now deactivated');
    // 清理资源会由 VSCode 自动处理（subscriptions）
}
