# TODO List Manager

一个美观且高效的 VSCode 待办事项管理插件，帮助开发者在编码过程中轻松管理任务。

![TODO List Plugin](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 特性

- 📋 **任务管理**：创建、编辑、删除待办事项
- 🎯 **优先级设置**：支持高、中、低三个优先级
- 📊 **状态跟踪**：待处理、进行中、已完成三种状态
- 🏷️ **标签系统**：为任务添加自定义标签
- 🗂️ **智能分组**：按状态或优先级分组显示
- 💾 **本地存储**：数据安全存储在本地
- 🎨 **美观界面**：遵循 VSCode 设计规范
- ⌨️ **快捷键支持**：提高操作效率

## 📸 截图

### TreeView 侧边栏视图
显示所有任务的树状结构，支持按状态和优先级分组。

### Webview 详情视图
查看任务的完整信息，包括描述、标签、时间等。

## 🚀 快速开始

### 安装

1. 打开 VSCode
2. 按 `Ctrl+P` (Windows/Linux) 或 `Cmd+P` (Mac)
3. 输入 `ext install todo-list-plugin`
4. 点击安装

### 基本使用

1. **打开 TODO 面板**：点击左侧活动栏的 TODO 图标
2. **添加任务**：点击面板顶部的 `+` 按钮
3. **查看详情**：点击任务项查看详细信息
4. **编辑任务**：右键点击任务，选择"编辑"
5. **标记完成**：右键点击任务，选择"切换状态"
6. **删除任务**：右键点击任务，选择"删除"

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+T` (Windows/Linux) | 添加新任务 |
| `Cmd+Shift+T` (Mac) | 添加新任务 |

## 🔧 配置选项

在 VSCode 设置中配置插件：

```json
{
  // 新任务的默认优先级
  "todo.defaultPriority": "medium",
  
  // 任务分组方式：status(状态) / priority(优先级) / none(不分组)
  "todo.groupBy": "status",
  
  // 是否自动刷新任务列表
  "todo.autoRefresh": true,
  
  // 删除任务前是否显示确认对话框
  "todo.confirmDelete": true,
  
  // 是否显示已完成的任务
  "todo.showCompletedTasks": true,
  
  // 日期显示格式
  "todo.dateFormat": "YYYY-MM-DD"
}
```

## 📚 命令列表

在命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`) 中可以使用以下命令：

- `Add TODO` - 添加新的待办事项
- `Edit TODO` - 编辑待办事项
- `Delete TODO` - 删除待办事项
- `Toggle Status` - 切换任务完成状态
- `Show Details` - 显示任务详情
- `Refresh` - 刷新任务列表
- `Clear Completed` - 清除所有已完成任务

## 🎨 界面说明

### 任务状态图标

- 🔵 **进行中** - 蓝色旋转图标
- ⚪ **待处理** - 空心圆圈
- ✅ **已完成** - 绿色对勾

### 优先级标识

- `!!!` 高优先级（红色）
- `!!` 中优先级（橙色）
- `!` 低优先级（绿色）

## 🔒 数据安全

- 所有数据存储在 VSCode 的本地存储中
- 不会上传到云端或第三方服务器
- 自动备份机制，防止数据丢失
- 支持数据导出和导入（未来版本）

## 🛠️ 开发

### 环境要求

- Node.js >= 16.x
- VSCode >= 1.75.0

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/todo-list-plugin.git

# 安装依赖
cd todo-list-plugin
npm install

# 编译
npm run compile

# 运行测试
npm test

# 启动开发模式
# 按 F5 在 VSCode 扩展开发主机中运行
```

### 项目结构

```
todo-list-plugin/
├── src/
│   ├── models/          # 数据模型
│   ├── services/        # 业务逻辑
│   ├── views/           # 视图组件
│   ├── commands/        # 命令处理
│   └── extension.ts     # 插件入口
├── resources/           # 资源文件
│   └── icons/          # 图标
├── test/               # 测试文件
├── package.json        # 插件配置
└── tsconfig.json       # TypeScript 配置
```

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 💬 反馈与支持

- 🐛 [报告 Bug](https://github.com/your-username/todo-list-plugin/issues)
- 💡 [功能建议](https://github.com/your-username/todo-list-plugin/issues)
- 📧 邮箱：your-email@example.com

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

**享受高效的任务管理体验！** ✨
