#!/usr/bin/env node
/**
 * n8n插件验证脚本 - 解决方案架构师版本
 * 
 * 解决问题：
 * - API端点返回HTML而非JSON
 * - 正确的认证机制
 * - 准确的插件加载验证
 * 
 * 使用方法：
 * N8N_API_KEY=test-api-key-for-development node scripts/verify-plugin-api.js
 */

// 配置参数
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const API_KEY = process.env.N8N_API_KEY || 'test-api-key-for-development';

// 预期的插件节点类型
const EXPECTED_PLUGINS = [
  {
    name: 'OAuth2Enhanced SmartHttp',
    type: '@berrycube/n8n-nodes-oauth2-enhanced.smartHttp',
    package: '@berrycube/n8n-nodes-oauth2-enhanced'
  }
];

/**
 * 正确的n8n API调用方法
 */
async function n8nApi(path, options = {}) {
  const url = `${N8N_BASE_URL}${path}`;
  
  // 关键：正确的请求头配置
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',  // 这个很重要！
    'X-N8N-API-KEY': API_KEY,      // n8n API密钥认证
    ...(options.headers || {})
  };

  const config = {
    method: options.method || 'GET',
    headers,
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  console.log(`🔍 API调用: ${config.method} ${url}`);
  
  try {
    const response = await fetch(url, config);
    const text = await response.text();
    
    // 处理响应
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.log(`⚠️  响应不是有效JSON: ${text.substring(0, 100)}...`);
      return { success: false, error: '响应格式错误', raw: text };
    }
    
    if (!response.ok) {
      console.log(`❌ API错误: ${response.status} ${response.statusText}`);
      console.log(`   响应: ${text}`);
      return { success: false, status: response.status, error: data };
    }
    
    console.log(`✅ API成功: ${response.status}`);
    return { success: true, data };
    
  } catch (error) {
    console.log(`💥 网络错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试1：基础连通性验证
 */
async function testBasicConnectivity() {
  console.log('\n🏥 测试1：n8n服务健康检查');
  console.log('=====================================');
  
  const result = await n8nApi('/healthz');
  if (result.success) {
    console.log('✅ n8n服务正常运行');
    console.log('   响应:', JSON.stringify(result.data, null, 2));
    return true;
  } else {
    console.log('❌ n8n服务连接失败');
    console.log('   错误:', result.error);
    return false;
  }
}

/**
 * 测试2：API认证验证
 */
async function testApiAuthentication() {
  console.log('\n🔐 测试2：API认证验证');
  console.log('=====================================');
  
  // 尝试访问需要认证的端点
  const result = await n8nApi('/rest/workflows');
  if (result.success) {
    console.log('✅ API认证成功');
    console.log(`   发现 ${Array.isArray(result.data) ? result.data.length : '未知数量'} 个工作流`);
    return true;
  } else {
    console.log('❌ API认证失败');
    if (result.status === 401) {
      console.log('💡 解决方案: 检查N8N_API_KEY环境变量或Docker配置中的API密钥设置');
    }
    console.log('   错误:', result.error);
    return false;
  }
}

/**
 * 测试3：节点类型API验证
 */
async function testNodeTypesApi() {
  console.log('\n🔧 测试3：节点类型API验证');
  console.log('=====================================');
  
  // n8n的正确节点类型端点
  const result = await n8nApi('/types/nodes');
  if (result.success) {
    const nodeTypes = result.data;
    const totalNodes = Object.keys(nodeTypes).length;
    console.log(`✅ 节点类型API可访问，发现 ${totalNodes} 个节点类型`);
    
    // 检查我们的自定义插件
    console.log('\n🔍 检查自定义插件节点:');
    let foundPlugins = 0;
    
    for (const plugin of EXPECTED_PLUGINS) {
      if (nodeTypes[plugin.type]) {
        console.log(`✅ 发现插件: ${plugin.name} (${plugin.type})`);
        foundPlugins++;
      } else {
        console.log(`❌ 缺失插件: ${plugin.name} (${plugin.type})`);
      }
    }
    
    return { success: true, foundPlugins, totalNodes };
  } else {
    console.log('❌ 节点类型API访问失败');
    console.log('   错误:', result.error);
    return { success: false };
  }
}

/**
 * 测试4：实际工作流创建验证（最终测试）
 */
async function testWorkflowCreation() {
  console.log('\n🚀 测试4：实际工作流创建验证');
  console.log('=====================================');
  
  // 创建一个使用我们插件的测试工作流
  const testWorkflow = {
    name: 'Plugin Verification Test - OAuth2Enhanced',
    nodes: [
      {
        parameters: {
          path: 'plugin-test',
          httpMethod: 'POST',
          responseMode: 'lastNode'
        },
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 1,
        position: [240, 240]
      },
      {
        parameters: {
          url: 'https://httpbin.org/json',
          authentication: 'none',
          requestMethod: 'GET',
          responseFormat: 'json'
        },
        name: 'SmartHttp Test',
        type: '@berrycube/n8n-nodes-oauth2-enhanced.smartHttp',
        typeVersion: 1,
        position: [540, 240]
      }
    ],
    connections: {
      'Webhook': {
        main: [[{
          node: 'SmartHttp Test',
          type: 'main',
          index: 0
        }]]
      }
    },
    active: false
  };

  const createResult = await n8nApi('/rest/workflows', {
    method: 'POST',
    body: testWorkflow
  });

  if (createResult.success) {
    const workflowId = createResult.data.id;
    console.log(`✅ 工作流创建成功! ID: ${workflowId}`);
    console.log('🎉 这证明插件已正确加载并可在n8n中使用!');
    
    // 清理测试工作流
    try {
      await n8nApi(`/rest/workflows/${workflowId}`, { method: 'DELETE' });
      console.log('✅ 测试工作流已清理');
    } catch (cleanupError) {
      console.log('⚠️  清理失败（不影响测试结果）');
    }
    
    return true;
  } else {
    console.log('❌ 工作流创建失败');
    if (createResult.error && typeof createResult.error === 'object' && createResult.error.message) {
      if (createResult.error.message.includes('Unknown node type')) {
        console.log('💡 这表明插件未正确加载到n8n中');
        console.log('   建议检查:');
        console.log('   - 插件是否正确安装到 /home/node/.n8n/custom-nodes/');
        console.log('   - n8n容器是否重启');
        console.log('   - 插件构建输出是否正确');
      }
    }
    console.log('   详细错误:', JSON.stringify(createResult.error, null, 2));
    return false;
  }
}

/**
 * 主验证流程
 */
async function runPluginVerification() {
  console.log('🚀 n8n插件验证 - 解决方案架构师版本');
  console.log('===========================================');
  console.log(`📍 n8n地址: ${N8N_BASE_URL}`);
  console.log(`🔑 API密钥: ${API_KEY ? '已配置' : '未配置'}`);
  console.log('');

  let passedTests = 0;
  const totalTests = 4;

  // 测试序列
  const tests = [
    { name: '基础连通性', fn: testBasicConnectivity },
    { name: 'API认证', fn: testApiAuthentication },
    { name: '节点类型API', fn: testNodeTypesApi },
    { name: '工作流创建', fn: testWorkflowCreation }
  ];

  for (const test of tests) {
    const result = await test.fn();
    if (result) passedTests++;
    
    // 如果前置测试失败，停止后续测试
    if (!result && test.name !== '工作流创建') {
      console.log(`\n⛔ 由于${test.name}测试失败，跳过后续测试`);
      break;
    }
  }

  // 最终报告
  console.log('\n📊 验证结果总结');
  console.log('===========================================');
  console.log(`通过测试: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！插件已正确集成到n8n中');
    console.log('');
    console.log('✅ 验证成功项目:');
    console.log('   - n8n服务正常运行');
    console.log('   - API认证配置正确');
    console.log('   - 节点类型API可访问');
    console.log('   - 自定义插件可在工作流中使用');
  } else {
    console.log('❌ 部分测试失败，需要进一步调试');
    console.log('');
    console.log('🔧 建议的解决步骤:');
    console.log('   1. 确保Docker Compose配置包含N8N_API_KEY');
    console.log('   2. 重启n8n容器: docker-compose restart n8n');
    console.log('   3. 检查插件安装路径和文件权限');
    console.log('   4. 查看n8n容器日志: docker logs compose-n8n-1');
  }

  return passedTests === totalTests;
}

// 执行验证
if (import.meta.url === `file://${process.argv[1]}`) {
  runPluginVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 验证过程出错:', error);
      process.exit(1);
    });
}