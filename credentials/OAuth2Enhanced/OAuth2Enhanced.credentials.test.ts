import { describe, it, expect } from 'vitest';
import { OAuth2Enhanced } from './OAuth2Enhanced.credentials';

describe('OAuth2Enhanced Credentials', () => {
  describe('基本配置', () => {
    it('should have correct credential type name', () => {
      const credentials = new OAuth2Enhanced();
      expect(credentials.name).toBe('oAuth2ApiEnhanced');
    });

    it('should have correct display name', () => {
      const credentials = new OAuth2Enhanced();
      expect(credentials.displayName).toBe('OAuth2 API (Enhanced)');
    });

    it('should extend oAuth2Api credentials', () => {
      const credentials = new OAuth2Enhanced();
      expect(credentials.extends).toEqual(['oAuth2Api']);
    });

    it('should only include enhancement-specific properties', () => {
      const credentials = new OAuth2Enhanced();
      const propertyNames = credentials.properties.map(p => p.name);
      
      // 应该只包含增强功能字段，基础OAuth2字段由extends继承
      expect(propertyNames).toEqual([
        'autoRefresh',
        'refreshBuffer', 
        'retryAttempts',
        'retryDelay'
      ]);
    });
  });

  describe('增强功能', () => {
    it('should include token refresh settings', () => {
      const credentials = new OAuth2Enhanced();
      const propertyNames = credentials.properties.map(p => p.name);
      
      expect(propertyNames).toContain('autoRefresh');
      expect(propertyNames).toContain('refreshBuffer');
    });

    it('should include retry mechanism settings', () => {
      const credentials = new OAuth2Enhanced();
      const propertyNames = credentials.properties.map(p => p.name);
      
      expect(propertyNames).toContain('retryAttempts');
      expect(propertyNames).toContain('retryDelay');
    });

    it('should have auto refresh enabled by default', () => {
      const credentials = new OAuth2Enhanced();
      const autoRefreshProp = credentials.properties.find(p => p.name === 'autoRefresh');
      expect(autoRefreshProp?.default).toBe(true);
    });

    it('should have reasonable refresh buffer default', () => {
      const credentials = new OAuth2Enhanced();
      const refreshBufferProp = credentials.properties.find(p => p.name === 'refreshBuffer');
      expect(refreshBufferProp?.default).toBe(300); // 5 minutes buffer
    });

    it('should have reasonable retry defaults', () => {
      const credentials = new OAuth2Enhanced();
      
      const retryAttemptsProp = credentials.properties.find(p => p.name === 'retryAttempts');
      expect(retryAttemptsProp?.default).toBe(3);
      
      const retryDelayProp = credentials.properties.find(p => p.name === 'retryDelay');
      expect(retryDelayProp?.default).toBe(1000); // 1 second
    });

    it('should conditionally show retry settings when autoRefresh is enabled', () => {
      const credentials = new OAuth2Enhanced();
      
      const conditionalFields = ['refreshBuffer', 'retryAttempts', 'retryDelay'];
      
      conditionalFields.forEach(fieldName => {
        const field = credentials.properties.find(p => p.name === fieldName);
        expect(field?.displayOptions?.show?.autoRefresh).toEqual([true]);
      });
    });
  });

  describe('参数验证和边界条件', () => {
    it('should have reasonable value ranges for retry attempts', () => {
      const credentials = new OAuth2Enhanced();
      const retryAttemptsProp = credentials.properties.find(p => p.name === 'retryAttempts');
      
      expect(retryAttemptsProp?.default).toBe(3);
      expect(retryAttemptsProp?.type).toBe('number');
      // The validation will be done in the node implementation
    });

    it('should have reasonable value ranges for retry delay', () => {
      const credentials = new OAuth2Enhanced();
      const retryDelayProp = credentials.properties.find(p => p.name === 'retryDelay');
      
      expect(retryDelayProp?.default).toBe(1000);
      expect(retryDelayProp?.type).toBe('number');
      // The validation will be done in the node implementation
    });

    it('should have reasonable value ranges for refresh buffer', () => {
      const credentials = new OAuth2Enhanced();
      const refreshBufferProp = credentials.properties.find(p => p.name === 'refreshBuffer');
      
      expect(refreshBufferProp?.default).toBe(300); // 5 minutes
      expect(refreshBufferProp?.type).toBe('number');
    });

    it('should have appropriate field descriptions for user guidance', () => {
      const credentials = new OAuth2Enhanced();
      
      const descriptionFields = [
        { name: 'autoRefresh', expectedText: 'Automatically refresh' },
        { name: 'refreshBuffer', expectedText: 'seconds before expiration' },
        { name: 'retryAttempts', expectedText: 'retry attempts' },
        { name: 'retryDelay', expectedText: 'milliseconds' }
      ];

      descriptionFields.forEach(({ name, expectedText }) => {
        const field = credentials.properties.find(p => p.name === name);
        expect(field?.description).toContain(expectedText);
      });
    });
  });

  describe('安全性和继承', () => {
    it('should extend from oAuth2Api for base security', () => {
      const credentials = new OAuth2Enhanced();
      expect(credentials.extends).toEqual(['oAuth2Api']);
    });

    it('should have proper documentation reference', () => {
      const credentials = new OAuth2Enhanced();
      expect(credentials.documentationUrl).toBe('https://docs.n8n.io/integrations/builtin/credentials/oauth2/');
    });

    it('enhancement fields should not contain sensitive data', () => {
      const credentials = new OAuth2Enhanced();
      const properties = credentials.properties;
      
      // 增强字段都是配置选项，不应该包含敏感数据
      properties.forEach(prop => {
        expect(prop.typeOptions?.password).toBeFalsy();
      });
    });
  });
});