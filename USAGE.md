# VSCode TODO List Plugin - 开发与使用指南

## 🚀 快速开始

### 方式一：直接在 VSCode 中测试

1. 在 VSCode 中打开此项目文件夹
2. 按 `F5` 启动调试
3. 这将打开一个新的 VSCode 扩展开发主机窗口
4. 在新窗口中，点击左侧活动栏的 TODO 图标开始使用

### 方式二：打包并安装

```bash
# 安装打包工具
npm install -g @vscode/vsce

# 打包插件
vsce package

# 这将生成 todo-list-plugin-0.1.0.vsix 文件
# 在 VSCode 中通过 "Extensions: Install from VSIX" 命令安装
```

## 📖 详细使用说明

### 1. 添加任务

有三种方式添加任务：

**方式 A：通过工具栏按钮**
- 点击 TODO 面板顶部的 `+` 按钮
- 按照提示输入任务信息

**方式 B：通过快捷键**
- Windows/Linux: `Ctrl+Shift+T`
- Mac: `Cmd+Shift+T`

**方式 C：通过命令面板**
- 按 `Ctrl+Shift+P` (或 `Cmd+Shift+P`)
- 输入 "Add TODO"
- 回车执行

### 2. 查看任务详情

- 单击任务项即可在 Webview 中查看完整详情
- 详情页面包含：标题、状态、优先级、描述、标签、时间等信息

### 3. 编辑任务

**编辑整个任务：**
- 右键点击任务
- 选择 "编辑"
- 选择要修改的字段（标题、描述、优先级、状态、标签）

**快速更改状态：**
- 在详情页面的下拉菜单中选择新状态

### 4. 删除任务

**单个删除：**
- 右键点击任务
- 选择 "删除"
- 确认删除操作

**批量清除已完成：**
- 点击工具栏的清除按钮（扫帚图标）
- 或使用命令 "Clear Completed"

### 5. 任务分组

在设置中可以更改分组方式：

```json
{
  "todo.groupBy": "status"  // 或 "priority" 或 "none"
}
```

- **按状态分组**：进行中 / 待处理 / 已完成
- **按优先级分组**：高 / 中 / 低
- **不分组**：平铺显示所有任务

## ⚙️ 配置选项详解

打开 VSCode 设置 (File > Preferences > Settings)，搜索 "todo"：

### 默认优先级 (todo.defaultPriority)
- 选项: `low`, `medium`, `high`
- 默认值: `medium`
- 说明: 创建新任务时的默认优先级

### 分组方式 (todo.groupBy)
- 选项: `status`, `priority`, `none`
- 默认值: `status`
- 说明: TreeView 中任务的分组方式

### 自动刷新 (todo.autoRefresh)
- 类型: 布尔值
- 默认值: `true`
- 说明: 数据变化时是否自动刷新视图

### 删除确认 (todo.confirmDelete)
- 类型: 布尔值
- 默认值: `true`
- 说明: 删除任务前是否显示确认对话框

### 显示已完成任务 (todo.showCompletedTasks)
- 类型: 布尔值
- 默认值: `true`
- 说明: 是否在列表中显示已完成的任务

### 日期格式 (todo.dateFormat)
- 类型: 字符串
- 默认值: `YYYY-MM-DD`
- 说明: 日期的显示格式（暂未完全实现）

## 🎯 使用技巧

### 1. 优先级策略

建议的优先级使用策略：

- **高优先级 (!!!)**：紧急且重要的任务
- **中优先级 (!!)**：重要但不紧急的任务
- **低优先级 (!)**：可以稍后处理的任务

### 2. 状态流转

推荐的任务状态流转：

```
待处理 → 进行中 → 已完成
   ↑        ↓
   ←────────┘
   (可以重新激活)
```

### 3. 标签使用

标签可以用于：
- 项目分类：`frontend`, `backend`, `docs`
- 任务类型：`bug`, `feature`, `refactor`
- 紧急程度：`urgent`, `asap`
- 相关人员：`@team`, `@john`

### 4. 描述编写

在描述中可以包含：
- 任务的详细说明
- 实现步骤
- 相关链接或文件路径
- 注意事项

## 🔧 开发者指南

### 项目结构

```
todo-list-plugin/
├── src/
│   ├── models/              # 数据模型
│   │   └── TodoItem.ts      # 任务数据结构和枚举
│   ├── services/            # 业务逻辑
│   │   ├── StorageManager.ts # 数据存储管理
│   │   └── TodoService.ts    # 任务业务逻辑
│   ├── views/               # 视图组件
│   │   ├── TodoTreeDataProvider.ts  # TreeView 数据提供者
│   │   └── TodoWebviewProvider.ts   # Webview 提供者
│   ├── commands/            # 命令处理
│   │   └── TodoCommands.ts  # 所有命令的实现
│   └── extension.ts         # 插件入口点
├── resources/               # 资源文件
│   └── icons/              # 图标
├── out/                    # 编译输出（不提交到仓库）
├── test/                   # 测试文件
├── package.json            # 插件配置
├── tsconfig.json          # TypeScript 配置
└── README.md              # 文档
```

### 架构说明

插件采用分层架构：

1. **数据层 (StorageManager)**
   - 负责数据的持久化
   - 处理备份和恢复
   - 数据验证和迁移

2. **业务逻辑层 (TodoService)**
   - 任务的 CRUD 操作
   - 状态管理和转换
   - 数据过滤和搜索

3. **视图层 (TreeDataProvider, WebviewProvider)**
   - TreeView 树状显示
   - Webview 详情展示
   - 视图更新和刷新

4. **控制层 (TodoCommands)**
   - 处理用户命令
   - 协调各层交互
   - 用户输入验证

### 添加新功能

要添加新功能，通常需要：

1. 在 `package.json` 中注册命令
2. 在 `TodoCommands.ts` 中实现命令处理
3. 如需新的数据字段，更新 `TodoItem.ts`
4. 如需新的业务逻辑，更新 `TodoService.ts`
5. 更新相关视图以显示新功能

### 调试技巧

#### 在 Mac 上调试插件（详细步骤）

**前置准备：**

1. 确保已安装依赖：
   ```bash
   npm install
   ```

2. 编译项目：
   ```bash
   npm run compile
   ```

**方式一：使用 F5 快速调试（推荐）**

1. 在 VSCode 中打开项目根目录
2. 在源代码中设置断点（点击行号左侧或按 `Cmd+\`）
3. 按 `F5` 启动调试（或点击菜单 Run > Start Debugging）
4. 系统会自动编译并打开一个新的「扩展开发主机」窗口
5. 在新窗口中使用插件功能，触发断点时会自动暂停
6. 使用调试工具栏控制执行：
   - 继续：`F5`
   - 单步跳过：`F10`
   - 单步进入：`F11`
   - 单步跳出：`Shift+F11`
   - 停止调试：`Shift+F5`

**方式二：使用调试面板**

1. 点击左侧活动栏的「运行和调试」图标（或按 `Cmd+Shift+D`）
2. 在顶部下拉菜单选择「运行扩展」
3. 点击绿色播放按钮或按 `F5`
4. 开始调试

**方式三：使用 Watch 模式实时调试**

1. 启动 watch 模式（自动编译）：
   ```bash
   npm run watch
   ```

2. 在另一个终端或 VSCode 的调试面板按 `F5` 启动调试
3. 修改代码后会自动重新编译
4. 在扩展开发主机窗口中按 `Cmd+R` 重新加载扩展

**调试快捷键（Mac）：**
- 开始/继续调试：`F5`
- 单步跳过：`F10`
- 单步进入：`F11`
- 单步跳出：`Shift+F11`
- 停止调试：`Shift+F5`
- 重启调试：`Cmd+Shift+F5`
- 设置/取消断点：`Cmd+\`
- 打开调试控制台：`Cmd+Shift+Y`

**查看日志和输出：**

1. **调试控制台**（推荐）：
   - 按 `Cmd+Shift+Y` 打开调试控制台
   - 查看 `console.log` 输出
   - 可以直接执行 JavaScript 表达式

2. **输出面板**：
   - 菜单：View > Output（或 `Cmd+Shift+U`）
   - 在下拉菜单选择 "Extension Host" 查看扩展日志

3. **开发者工具**（高级调试）：
   - 在扩展开发主机窗口中，按 `Cmd+Option+I` 打开开发者工具
   - 查看控制台错误和网络请求

**常见调试场景：**

1. **调试命令执行：**
   - 在 `TodoCommands.ts` 相应方法中设置断点
   - 在扩展开发主机中执行对应命令
   - 观察变量值和执行流程

2. **调试 TreeView 更新：**
   - 在 `TodoTreeDataProvider.ts` 的 `getChildren()` 方法中设置断点
   - 刷新 TreeView 查看数据加载过程

3. **调试 Webview：**
   - 在 `TodoWebviewProvider.ts` 中设置断点
   - 右键点击 Webview 选择 "Open Webview Developer Tools"
   - 调试 HTML/CSS/JavaScript

4. **调试数据持久化：**
   - 在 `StorageManager.ts` 中设置断点
   - 观察数据的保存和读取过程

**查看存储数据：**
```typescript
// 在调试控制台中执行
await vscode.commands.executeCommand('workbench.action.openGlobalSettings')
// 手动检查 globalState

// 或在代码中添加日志查看数据
console.log('Current todos:', await this.storageManager.getTodos());
```

**调试技巧：**

1. **条件断点**：右键点击断点，选择 "Edit Breakpoint"，设置条件
2. **日志点**：右键点击行号，选择 "Add Logpoint"，输出不会中断执行
3. **监视表达式**：在调试侧边栏添加变量或表达式监视
4. **调用堆栈**：查看函数调用链，了解代码执行路径
5. **变量面板**：查看当前作用域所有变量的值

**遇到问题时：**

1. 清理并重新编译：
   ```bash
   rm -rf out/
   npm run compile
   ```

2. 重启 VSCode 和扩展开发主机窗口

3. 检查 TypeScript 编译错误：
   - 查看 "Problems" 面板（`Cmd+Shift+M`）
   
4. 查看完整的错误堆栈信息：
   - 在调试控制台查看详细错误

## 🐛 常见问题

### Q: 数据存储在哪里？
A: 数据存储在 VSCode 的 globalState 中，位置取决于操作系统：
- Windows: `%APPDATA%\Code\User\globalStorage`
- Mac: `~/Library/Application Support/Code/User/globalStorage`
- Linux: `~/.config/Code/User/globalStorage`

### Q: 如何备份数据？
A: 目前数据会自动备份。未来版本将支持手动导出为 JSON 文件。

### Q: 插件激活失败怎么办？
A: 
1. 检查 VSCode 版本是否 >= 1.75.0
2. 查看开发者工具的控制台错误信息
3. 尝试重新安装插件

### Q: 如何卸载插件？
A: 在扩展面板中找到插件，点击卸载。数据会保留在 globalState 中。

## 📮 反馈与贡献

如有问题或建议，欢迎：
- 提交 Issue
- 发起 Pull Request
- 发送邮件反馈

---

**祝您使用愉快！** ✨
