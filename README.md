# n8n-nodes-oauth2-enhanced

增强的OAuth2凭证 + 智能HTTP，适用于n8n

## 🚀 核心功能

- **自动OAuth2 token刷新**: 智能检测token过期（5分钟buffer），自动刷新避免API调用失败
- **智能HTTP重试机制**: 401认证错误自动重试 + 网络错误指数退避重试（1s→2s→4s→最大10s）  
- **企业级错误处理**: 区分认证错误vs网络错误，实现相应的恢复策略
- **完整的业务逻辑测试**: 28个测试覆盖token刷新、重试机制、边界条件等核心场景

## 📦 安装

```bash
npm install @berrycube/n8n-nodes-oauth2-enhanced
```

## 💡 使用场景

- API集成需要长期运行而不想手动处理token过期
- 网络不稳定环境下的可靠HTTP请求
- 企业级n8n工作流的生产环境部署

> 此仓库准备用作 **GitHub模板**。请在GitHub界面中使用 **Use this template** 按钮。