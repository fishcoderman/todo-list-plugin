# TypeScript 源码映射调试指南

## 当前配置说明

你的项目已经配置了完整的 TypeScript sourcemap 调试支持：

### 1. 配置文件

- **tsconfig.json**: 已启用 `sourceMap: true`，配置了正确的输出路径
- **launch.json**: 配置了调试器设置，包括 sourceMaps 支持
- **tasks.json**: 配置了 TypeScript 编译任务

### 2. 如何进行源码级调试

#### 步骤 1: 启动监视模式
```bash
npm run watch
```
或者在 VS Code 中按 `Cmd+Shift+P`，运行 "Tasks: Run Task" → "npm: watch"

#### 步骤 2: 设置断点
1. 在 TypeScript 源文件（`src/` 目录下）中设置断点
2. 不要在编译后的 JS 文件（`out/` 目录下）中设置断点

#### 步骤 3: 启动调试
1. 按 `F5` 或者点击调试按钮
2. 选择 "运行扩展" 配置
3. 新的 VS Code 窗口将打开，加载你的扩展

#### 步骤 4: 触发断点
1. 在新窗口中使用你的扩展功能
2. 调试器将在 TypeScript 源码中停止执行

### 3. 调试配置详解

#### launch.json 关键配置：
- `"sourceMaps": true`: 启用源码映射
- `"smartStep": true`: 智能步进，跳过生成的代码
- `"skipFiles": ["<node_internals>/**"]`: 跳过 Node.js 内部文件
- `"outFiles": ["${workspaceFolder}/out/**/*.js"]`: 指定编译输出文件位置

#### tsconfig.json 关键配置：
- `"sourceMap": true`: 生成 .map 文件
- `"inlineSourceMap": false`: 使用独立的 .map 文件（推荐）
- `"sourceRoot": ""`: 源文件根路径
- `"removeComments": false`: 保留注释，便于调试

### 4. 常见问题解决

#### 问题 1: 断点显示为未绑定（灰色）
**解决方案:**
1. 确保 watch 模式正在运行
2. 检查编译是否成功（无错误）
3. 确认 .map 文件已生成

#### 问题 2: 调试器跳转到 JS 文件而非 TS 文件
**解决方案:**
1. 检查 sourceMaps 配置是否启用
2. 确认 outFiles 路径配置正确
3. 清理并重新编译：`npm run compile`

#### 问题 3: 无法查看变量值
**解决方案:**
1. 确保在正确的作用域内
2. 检查变量是否被优化掉
3. 在 tsconfig.json 中设置 `"removeComments": false`

### 5. 调试技巧

#### 使用调试控制台
- 在断点处，可以在调试控制台中执行表达式
- 查看变量值：直接输入变量名
- 执行函数：`someFunction()`

#### 条件断点
- 右键点击断点，选择"编辑断点"
- 设置条件表达式，只有条件为 true 时才停止

#### 日志点 (Logpoints)
- 右键设置日志点而非断点
- 可以在不停止执行的情况下输出日志

### 6. 性能优化

为了获得最佳调试体验：

1. **启用增量编译**: 使用 `npm run watch` 而不是每次手动编译
2. **合理使用断点**: 避免在高频调用的函数中设置断点
3. **利用条件断点**: 只在特定条件下停止执行

### 7. 验证设置

运行以下命令验证配置：

```bash
# 编译项目
npm run compile

# 检查 sourcemap 文件是否生成
ls -la out/

# 启动 watch 模式
npm run watch
```

你应该能看到 `.js.map` 文件在 `out/` 目录中生成。

## 快速测试

1. 在 `src/extension.ts` 的 `activate` 函数第一行设置断点
2. 按 F5 启动调试
3. 调试器应该在 TypeScript 源码中停止

享受愉快的调试体验！🚀