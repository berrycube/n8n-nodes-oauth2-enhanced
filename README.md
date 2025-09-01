# n8n-nodes-oauth2-enhanced

Enhanced OAuth2 credential with intelligent retry mechanism for n8n

## 🔐 Features

- **Smart OAuth2 Authentication**: Extends standard n8n OAuth2 with auto-refresh capabilities
- **Intelligent Retry Logic**: Automatically retries on authentication failures with configurable delays
- **Parameter Validation**: Safe boundaries for retry attempts (0-10) and delays (100ms-30s)  
- **Timeout Protection**: 5-minute maximum execution time to prevent workflow hangs
- **Production Ready**: 35 unit tests, TypeScript support, enterprise-grade error handling

## 📦 Installation

This is an n8n community node package. Install it in your n8n instance:

```bash
npm install @berrycube/n8n-nodes-oauth2-enhanced
```

> This repository is prepared to be used as a **GitHub Template**. Use the **Use this template** button in GitHub UI to create your own OAuth2 enhanced node.
