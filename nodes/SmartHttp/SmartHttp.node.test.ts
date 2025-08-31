import { describe, it, expect, vi } from 'vitest';
import { SmartHttp } from './SmartHttp.node';

describe('SmartHttp Node', () => {
  describe('基本配置', () => {
    it('should have correct node type name', () => {
      const node = new SmartHttp();
      expect(node.description.name).toBe('smartHttp');
    });

    it('should have correct display name', () => {
      const node = new SmartHttp();
      expect(node.description.displayName).toBe('Smart HTTP');
    });

    it('should support OAuth2 Enhanced credentials', () => {
      const node = new SmartHttp();
      const credentials = node.description.credentials || [];
      expect(credentials.some((cred: any) => cred.name === 'oAuth2ApiEnhanced')).toBe(true);
    });

    it('should be categorized as transform', () => {
      const node = new SmartHttp();
      expect(node.description.group).toContain('transform');
    });
  });

  describe('节点属性', () => {
    it('should have HTTP method parameter', () => {
      const node = new SmartHttp();
      const properties = node.description.properties;
      const methodProp = properties.find((p: any) => p.name === 'method');
      
      expect(methodProp).toBeDefined();
      expect(methodProp?.type).toBe('options');
      expect(methodProp?.default).toBe('GET');
    });

    it('should have URL parameter', () => {
      const node = new SmartHttp();
      const properties = node.description.properties;
      const urlProp = properties.find((p: any) => p.name === 'url');
      
      expect(urlProp).toBeDefined();
      expect(urlProp?.type).toBe('string');
      expect(urlProp?.required).toBe(true);
    });

    it('should have auto retry parameter', () => {
      const node = new SmartHttp();
      const properties = node.description.properties;
      const autoRetryProp = properties.find((p: any) => p.name === 'autoRetry');
      
      expect(autoRetryProp).toBeDefined();
      expect(autoRetryProp?.type).toBe('boolean');
      expect(autoRetryProp?.default).toBe(true);
    });

    it('should have max retries parameter', () => {
      const node = new SmartHttp();
      const properties = node.description.properties;
      const maxRetriesProp = properties.find((p: any) => p.name === 'maxRetries');
      
      expect(maxRetriesProp).toBeDefined();
      expect(maxRetriesProp?.type).toBe('number');
      expect(maxRetriesProp?.default).toBe(3);
    });
  });

  describe('执行功能', () => {
    it('should implement execute method', () => {
      const node = new SmartHttp();
      expect(typeof node.execute).toBe('function');
    });
  });
});