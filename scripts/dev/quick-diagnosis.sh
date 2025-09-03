#!/bin/bash

# n8n插件快速诊断脚本
# 解决方案架构师版本

echo "🔬 n8n插件快速诊断"
echo "===================="

# 设置API密钥
API_KEY="${N8N_API_KEY:-test-api-key-for-development}"
BASE_URL="${N8N_BASE_URL:-http://localhost:5678}"

echo "📍 配置信息:"
echo "   n8n地址: $BASE_URL"
echo "   API密钥: ${API_KEY:0:10}..."
echo ""

# 测试1: 基础连通性
echo "🔍 测试1: 基础连通性"
echo "-------------------"
if curl -s "$BASE_URL/healthz" > /dev/null 2>&1; then
    echo "✅ n8n服务可访问"
else
    echo "❌ n8n服务不可访问"
    echo "💡 请检查n8n是否正在运行: docker ps | grep n8n"
    exit 1
fi

# 测试2: API认证
echo ""
echo "🔍 测试2: API认证"
echo "-------------------"
response=$(curl -s -H "X-N8N-API-KEY: $API_KEY" -H "Accept: application/json" "$BASE_URL/rest/workflows")

if echo "$response" | grep -q "<!DOCTYPE html>"; then
    echo "❌ API返回HTML页面（认证或端点问题）"
    echo "💡 可能的问题:"
    echo "   - API密钥未设置或错误"
    echo "   - n8n版本不支持此端点"
    echo "   - 需要先完成n8n初始化设置"
else
    echo "✅ API认证成功"
    # 尝试解析JSON
    if echo "$response" | python3 -m json.tool > /dev/null 2>&1; then
        workflow_count=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 'N/A')")
        echo "   发现工作流数量: $workflow_count"
    fi
fi

# 测试3: 节点类型API
echo ""
echo "🔍 测试3: 节点类型API"
echo "-------------------"
node_types_response=$(curl -s -H "X-N8N-API-KEY: $API_KEY" -H "Accept: application/json" "$BASE_URL/types/nodes")

if echo "$node_types_response" | grep -q "<!DOCTYPE html>"; then
    echo "❌ 节点类型API返回HTML"
    echo "💡 这通常表示认证问题或API未启用"
else
    echo "✅ 节点类型API可访问"
    
    # 检查自定义插件
    if echo "$node_types_response" | grep -q "@berrycube/n8n-nodes-oauth2-enhanced"; then
        echo "🎉 发现OAuth2Enhanced插件!"
    else
        echo "⚠️  未发现OAuth2Enhanced插件"
    fi
    
    # 统计节点类型总数
    if command -v python3 > /dev/null 2>&1; then
        total_nodes=$(echo "$node_types_response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data))" 2>/dev/null || echo "解析失败")
        echo "   节点类型总数: $total_nodes"
    fi
fi

echo ""
echo "📋 诊断总结"
echo "============"
echo "如果看到HTML响应而不是JSON:"
echo "1. 检查Docker配置是否包含N8N_API_KEY环境变量"
echo "2. 重启n8n容器: docker-compose restart n8n"
echo "3. 确保n8n已完成初始化设置（访问 $BASE_URL）"
echo "4. 检查n8n版本是否支持REST API"
echo ""
echo "如果API可访问但缺少插件:"
echo "1. 检查插件是否正确安装到容器内"
echo "2. 验证插件构建输出格式"
echo "3. 查看n8n日志: docker logs compose-n8n-1"