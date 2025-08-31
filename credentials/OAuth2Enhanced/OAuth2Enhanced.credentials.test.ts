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

    it('should include required OAuth2 properties', () => {
      const credentials = new OAuth2Enhanced();
      const properties = credentials.properties;
      
      // 验证必需的OAuth2字段
      const propertyNames = properties.map(p => p.name);
      expect(propertyNames).toContain('clientId');
      expect(propertyNames).toContain('clientSecret');
      expect(propertyNames).toContain('authUrl');
      expect(propertyNames).toContain('accessTokenUrl');
      expect(propertyNames).toContain('scope');
    });
  });

  describe('增强功能', () => {
    it('should include token refresh settings', () => {
      const credentials = new OAuth2Enhanced();
      const properties = credentials.properties;
      const propertyNames = properties.map(p => p.name);
      
      expect(propertyNames).toContain('autoRefresh');
      expect(propertyNames).toContain('refreshBuffer');
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
  });

  describe('安全性', () => {
    it('should mark sensitive fields as secret', () => {
      const credentials = new OAuth2Enhanced();
      const clientSecretProp = credentials.properties.find(p => p.name === 'clientSecret');
      expect(clientSecretProp?.typeOptions?.password).toBe(true);
    });

    it('should have secure token storage', () => {
      const credentials = new OAuth2Enhanced();
      const properties = credentials.properties;
      
      // 查找存储敏感token的字段
      const tokenFields = ['accessToken', 'refreshToken'];
      tokenFields.forEach(fieldName => {
        const field = properties.find(p => p.name === fieldName);
        if (field) {
          expect(field.typeOptions?.password).toBe(true);
        }
      });
    });
  });
});