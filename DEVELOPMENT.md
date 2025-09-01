# 开发环境指南

这个文档介绍如何在OAuth2Enhanced插件上进行本地开发。

## 🚀 快速开始

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
# 启动热重载开发服务器
pnpm run dev

# 或使用传统的watch模式
pnpm run dev:watch
```

### 构建项目
```bash
pnpm run build
```

### 运行测试
```bash
# 简单的JavaScript测试（推荐用于开发）
pnpm run dev:test

# 完整的Vitest测试（可能有依赖问题）
pnpm run test
```

## 📁 项目结构

```
oauth2-enhanced/
├── credentials/
│   └── OAuth2Enhanced/           # OAuth2Enhanced凭据
├── nodes/
│   └── SmartHttp/               # SmartHttp节点
├── scripts/
│   ├── dev-server.js            # 开发服务器
│   └── simple-test-runner.js    # 简单测试运行器
├── .vscode/                     # VS Code配置
├── dist/                        # 构建输出
└── vitest.config.ts             # Vitest配置
```

## 🛠️ 开发工具

### VS Code集成

项目包含完整的VS Code配置：

- **调试配置**: `.vscode/launch.json`
  - Debug Plugin: 调试编译后的插件
  - Attach to Node: 附加到运行中的Node进程
  - Debug Tests: 调试测试

- **任务配置**: `.vscode/tasks.json`
  - Build: 构建项目
  - Dev: 启动开发服务器
  - Test Watch: 监视测试

### 开发服务器

开发服务器提供以下功能：

- 🔥 **热重载**: 文件变更时自动重新构建
- 👀 **文件监听**: 监听 `nodes/` 和 `credentials/` 目录
- 🏗️ **自动构建**: 防抖构建避免频繁重复构建
- 📦 **构建提示**: 清晰的构建状态和错误信息

```bash
# 启动开发服务器
pnpm run dev
```

### 简单测试运行器

为了避免Vitest的ESM/CJS兼容问题，我们提供了简单测试运行器：

```bash
# 运行基础功能测试
pnpm run dev:test
```

测试覆盖：
- OAuth2Enhanced credentials基础功能
- SmartHttp node基础功能  
- 模块加载和实例化

## 🔧 调试

### 本地调试

1. 构建项目:
   ```bash
   pnpm run build
   ```

2. 启动调试模式:
   ```bash
   pnpm run dev:debug
   ```

3. 在VS Code中选择"Attach to Node"配置开始调试

### 环境配置

开发环境变量配置位于`.env.development`:

```bash
NODE_ENV=development
DEBUG=n8n:*
N8N_LOG_LEVEL=debug
N8N_PLUGINS_LOCAL_DEVELOPMENT=true
N8N_PLUGINS_HOT_RELOAD=true
```

## 📋 开发脚本

| 脚本 | 功能 |
|------|------|
| `dev` | 热重载开发服务器 |
| `dev:watch` | 传统watch模式 |
| `dev:test` | 简单测试运行器 |
| `dev:debug` | 调试模式 |
| `build` | 构建项目 |
| `lint` | ESLint检查 |
| `typecheck` | TypeScript类型检查 |

## 🎯 开发工作流

1. **开始开发**:
   ```bash
   pnpm run dev
   ```

2. **编辑代码**: 修改`credentials/`或`nodes/`目录下的文件

3. **自动重建**: 开发服务器会自动检测变更并重新构建

4. **运行测试**:
   ```bash
   pnpm run dev:test
   ```

5. **类型检查**:
   ```bash
   pnpm run typecheck
   ```

6. **代码检查**:
   ```bash
   pnpm run lint
   ```

## 🚧 已知问题

### Vitest ESM/CJS兼容性
n8n-workflow包的导出配置存在问题，导致Vitest无法正确解析。我们提供了简单测试运行器作为替代方案。

### 解决方案
- 使用`pnpm run dev:test`进行基础功能测试
- 完整的单元测试可能需要等待n8n-workflow修复或使用不同的测试框架

## 📝 贡献

开发时请遵循以下规范：

1. **代码风格**: 遵循项目ESLint配置
2. **TypeScript**: 启用严格类型检查
3. **测试**: 确保基础功能测试通过
4. **构建**: 确保项目可以成功构建

## 🔗 相关链接

- [n8n插件开发文档](https://docs.n8n.io/integrations/creating-nodes/)
- [OAuth2 API文档](https://docs.n8n.io/integrations/builtin/credentials/oauth2/)
- [TypeScript配置指南](https://www.typescriptlang.org/tsconfig)