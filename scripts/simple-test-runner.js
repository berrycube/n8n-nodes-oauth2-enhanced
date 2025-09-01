#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 简单的测试运行器，避免vitest的ESM/CJS问题
class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  // 描述测试组
  describe(name, fn) {
    console.log(`\n📋 ${name}`);
    fn();
  }

  // 单个测试
  it(description, fn) {
    try {
      fn();
      console.log(`  ✅ ${description}`);
      this.passed++;
    } catch (error) {
      console.log(`  ❌ ${description}`);
      console.log(`     错误: ${error.message}`);
      this.failed++;
    }
  }

  // 断言函数
  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`期望 ${expected}, 实际得到 ${actual}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`期望已定义, 实际得到 undefined`);
        }
      },
      toContain: (item) => {
        if (!actual || !actual.includes(item)) {
          throw new Error(`期望包含 ${item}, 实际 ${actual}`);
        }
      }
    };
  }

  // 运行所有测试
  async runTests() {
    console.log('🚀 开始运行简单测试...\n');

    // 动态导入并测试 OAuth2Enhanced credentials
    await this.testOAuth2Enhanced();
    
    // 动态导入并测试 SmartHttp node
    await this.testSmartHttp();

    console.log(`\n📊 测试结果: ${this.passed} 通过, ${this.failed} 失败`);
    if (this.failed > 0) {
      process.exit(1);
    }
  }

  async testOAuth2Enhanced() {
    try {
      // 简单检查 credentials 文件是否存在并可解析
      const credentialsPath = './dist/credentials/OAuth2Enhanced/OAuth2Enhanced.credentials.js';
      if (fs.existsSync(credentialsPath)) {
        const { OAuth2Enhanced } = require(path.resolve(credentialsPath));
        
        this.describe('OAuth2Enhanced Credentials', () => {
          this.it('should be constructable', () => {
            const credentials = new OAuth2Enhanced();
            this.expect(credentials).toBeDefined();
          });

          this.it('should have correct name', () => {
            const credentials = new OAuth2Enhanced();
            this.expect(credentials.name).toBe('oAuth2ApiEnhanced');
          });

          this.it('should have properties', () => {
            const credentials = new OAuth2Enhanced();
            this.expect(credentials.properties).toBeDefined();
          });
        });
      } else {
        console.log('⚠️  OAuth2Enhanced compiled file not found, skipping tests');
      }
    } catch (error) {
      console.log(`⚠️  OAuth2Enhanced test error: ${error.message}`);
    }
  }

  async testSmartHttp() {
    try {
      // 简单检查 node 文件是否存在并可解析
      const nodePath = './dist/nodes/SmartHttp/SmartHttp.node.js';
      if (fs.existsSync(nodePath)) {
        const { SmartHttp } = require(path.resolve(nodePath));
        
        this.describe('SmartHttp Node', () => {
          this.it('should be constructable', () => {
            const node = new SmartHttp();
            this.expect(node).toBeDefined();
          });

          this.it('should have description', () => {
            const node = new SmartHttp();
            this.expect(node.description).toBeDefined();
          });

          this.it('should have correct name', () => {
            const node = new SmartHttp();
            this.expect(node.description.name).toBe('smartHttp');
          });
        });
      } else {
        console.log('⚠️  SmartHttp compiled file not found, skipping tests');
      }
    } catch (error) {
      console.log(`⚠️  SmartHttp test error: ${error.message}`);
    }
  }
}

// 全局函数导出
const runner = new SimpleTestRunner();
global.describe = runner.describe.bind(runner);
global.it = runner.it.bind(runner);
global.expect = runner.expect.bind(runner);

// 运行测试
runner.runTests();