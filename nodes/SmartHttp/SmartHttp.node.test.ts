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
    it('should have essential HTTP parameters only', () => {
      const node = new SmartHttp();
      const properties = node.description.properties;
      const propertyNames = properties.map((p: any) => p.name);
      
      // After simplification, should only have method and url
      expect(propertyNames).toEqual(['method', 'url']);
    });

    it('should have HTTP method parameter', () => {
      const node = new SmartHttp();
      const properties = node.description.properties;
      const methodProp = properties.find((p: any) => p.name === 'method');
      
      expect(methodProp).toBeDefined();
      expect(methodProp?.type).toBe('options');
      expect(methodProp?.default).toBe('GET');
      
      // Should have standard HTTP methods
      const optionValues = methodProp?.options.map((opt: any) => opt.value);
      expect(optionValues).toContain('GET');
      expect(optionValues).toContain('POST');
      expect(optionValues).toContain('PUT');
      expect(optionValues).toContain('DELETE');
      expect(optionValues).toContain('PATCH');
    });

    it('should have URL parameter', () => {
      const node = new SmartHttp();
      const properties = node.description.properties;
      const urlProp = properties.find((p: any) => p.name === 'url');
      
      expect(urlProp).toBeDefined();
      expect(urlProp?.type).toBe('string');
      expect(urlProp?.required).toBe(true);
    });

    it('should rely on credentials for retry configuration', () => {
      const node = new SmartHttp();
      const properties = node.description.properties;
      const propertyNames = properties.map((p: any) => p.name);
      
      // Retry configuration should now be in credentials, not node properties
      expect(propertyNames).not.toContain('autoRetry');
      expect(propertyNames).not.toContain('maxRetries');
    });
  });

  describe('执行功能', () => {
    it('should implement execute method', () => {
      const node = new SmartHttp();
      expect(typeof node.execute).toBe('function');
    });
  });
});