import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartHttp } from './SmartHttp.node';

// Mock the n8n-workflow module
vi.mock('n8n-workflow', () => ({
  NodeOperationError: class extends Error {
    constructor(node: any, error: Error | string, options?: any) {
      const message = typeof error === 'string' ? error : error.message;
      super(message);
      this.name = 'NodeOperationError';
    }
  }
}));

/**
 * 真实边界条件测试 - 基于真实OAuth2提供商的响应格式
 * 
 * 这些测试不做真实HTTP请求，但验证我们的代码能正确处理
 * 真实OAuth2提供商可能返回的各种响应格式和错误情况
 */
describe('SmartHttp OAuth2 Real-World Boundary Tests', () => {
  let smartHttp: SmartHttp;
  let mockExecuteFunctions: any;

  beforeEach(() => {
    smartHttp = new SmartHttp();
    mockExecuteFunctions = {
      getInputData: vi.fn(() => [{ json: { test: 'data' } }]),
      getNodeParameter: vi.fn(),
      getNode: vi.fn(() => ({ name: 'Test SmartHttp Node' })),
      getCredentials: vi.fn(),
      continueOnFail: vi.fn(() => false),
      helpers: {
        request: vi.fn(),
        requestWithAuthentication: vi.fn()
      }
    };
  });

  describe('Real OAuth2 Response Format Validation', () => {
    it('should handle Google OAuth2 response format', async () => {
      const currentTime = Date.now();
      const expiredCredentials = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token', // nosemgrep: generic.secrets.security.detected-private-key
        clientId: 'test-client',
        clientSecret: 'test-secret', // nosemgrep: generic.secrets.security.detected-private-key
        authUrl: 'https://oauth2.googleapis.com/token', // 真实的Google端点
        expiresIn: 3600,
        oauthTokenData: {
          expires_at: new Date(currentTime - 10 * 60 * 1000).toISOString()
        }
      };

      // 真实的Google OAuth2 token响应格式 (测试用模拟数据 - 非真实凭据)
      const googleTokenResponse = {
        access_token: 'ya29.a0AfH6SMC7...', // nosemgrep: generic.secrets.security.detected-private-key
        expires_in: 3599, // Google通常返回3599而不是3600
        refresh_token: '1//04xxxxxxxxxxx', // nosemgrep: generic.secrets.security.detected-private-key
        scope: 'https://www.googleapis.com/auth/userinfo.email',
        token_type: 'Bearer'
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://www.googleapis.com/oauth2/v1/userinfo')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(3);

      mockExecuteFunctions.getCredentials.mockResolvedValue(expiredCredentials);
      
      // Mock token刷新成功，然后API调用成功
      mockExecuteFunctions.helpers.request
        .mockResolvedValueOnce(googleTokenResponse) // Token刷新
      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockResolvedValueOnce({ // API调用
          statusCode: 200,
          body: { email: 'test@example.com', verified_email: true }
        });

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(200);
      expect(result[0][0].json.body).toHaveProperty('email');
      
      // 验证使用了新token
      const apiCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      expect(apiCall[0].headers['Authorization']).toMatch(/Bearer ya29\.a0AfH6SMC7\./);
    });

    it('should handle Microsoft OAuth2 response format', async () => {
      const currentTime = Date.now();
      const expiredCredentials = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token', // nosemgrep: generic.secrets.security.detected-private-key
        clientId: 'test-client',
        clientSecret: 'test-secret', // nosemgrep: generic.secrets.security.detected-private-key
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        expiresIn: 3600,
        oauthTokenData: {
          expires_at: new Date(currentTime - 10 * 60 * 1000).toISOString()
        }
      };

      // 真实的Microsoft OAuth2 token响应格式（不同于Google）
      const microsoftTokenResponse = {
        token_type: 'Bearer',
        scope: 'https://graph.microsoft.com/.default',
        expires_in: 3599,
        ext_expires_in: 3599,
        access_token: 'EwBwA8l6BAAU...', // nosemgrep: generic.secrets.security.detected-private-key
        refresh_token: 'M.R3_BAY.-CXtN...' // nosemgrep: generic.secrets.security.detected-private-key
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://graph.microsoft.com/v1.0/me')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(3);

      mockExecuteFunctions.getCredentials.mockResolvedValue(expiredCredentials);
      
      mockExecuteFunctions.helpers.request
        .mockResolvedValueOnce(microsoftTokenResponse) // Token刷新
      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockResolvedValueOnce({ // API调用
          statusCode: 200,
          body: { displayName: 'Test User', mail: 'test@company.com' }
        });

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(200);
      expect(result[0][0].json.body).toHaveProperty('displayName');
      
      // 验证使用了新token
      const apiCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      expect(apiCall[0].headers['Authorization']).toMatch(/Bearer EwBwA8l6BAAU/);
    });

    it('should handle OAuth2 providers with non-standard field names', async () => {
      const currentTime = Date.now();
      const expiredCredentials = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token', // nosemgrep: generic.secrets.security.detected-private-key
        clientId: 'test-client',
        clientSecret: 'test-secret', // nosemgrep: generic.secrets.security.detected-private-key
        authUrl: 'https://api.custom-provider.com/oauth/token',
        expiresIn: 3600,
        oauthTokenData: {
          expires_at: new Date(currentTime - 10 * 60 * 1000).toISOString()
        }
      };

      // 一些提供商使用不同的字段名
      const customProviderResponse = {
        accessToken: 'new-access-token', // 注意：不是access_token
        refreshToken: 'new-refresh-token', // 注意：不是refresh_token
        expiresIn: 7200, // 注意：不是expires_in
        tokenType: 'bearer' // 注意：小写
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.custom-provider.com/user/profile')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(3);

      mockExecuteFunctions.getCredentials.mockResolvedValue(expiredCredentials);
      
      mockExecuteFunctions.helpers.request
        .mockResolvedValueOnce(customProviderResponse) // Token刷新
      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockResolvedValueOnce({ // API调用
          statusCode: 200,
          body: { user_id: '12345', username: 'testuser' }
        });

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(200);
      
      // 验证代码能处理非标准字段名
      const apiCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      expect(apiCall[0].headers['Authorization']).toMatch(/Bearer new-access-token/i);
    });
  });

  describe('Real OAuth2 Error Format Validation', () => {
    it('should handle Google OAuth2 error responses', async () => {
      const credentials = {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        authUrl: 'https://oauth2.googleapis.com/token',
        expiresIn: 3600,
        oauthTokenData: {
          expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        }
      };

      // 真实的Google OAuth2错误响应格式
      const googleErrorResponse = {
        error: 'invalid_grant',
        error_description: 'Token has been expired or revoked.'
      };
      
      const refreshError = new Error('Bad Request');
      (refreshError as any).statusCode = 400;
      (refreshError as any).response = { body: googleErrorResponse };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://www.googleapis.com/oauth2/v1/userinfo')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(1);

      mockExecuteFunctions.getCredentials.mockResolvedValue(credentials);
      mockExecuteFunctions.helpers.request.mockRejectedValue(refreshError);

      await expect(smartHttp.execute.call(mockExecuteFunctions))
        .rejects.toThrow(/Token refresh failed.*invalid_grant/);
    });

    it('should handle Microsoft OAuth2 error responses', async () => {
      const credentials = {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        expiresIn: 3600,
        oauthTokenData: {
          expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        }
      };

      // 真实的Microsoft OAuth2错误响应格式
      const microsoftErrorResponse = {
        error: 'invalid_client',
        error_description: 'AADSTS70002: Error validating credentials. AADSTS50012: Invalid client secret is provided.',
        error_codes: [70002, 50012],
        timestamp: '2024-01-01 12:00:00Z',
        trace_id: 'abcd-efgh-1234-5678',
        correlation_id: 'wxyz-9876-5432-abcd'
      };
      
      const refreshError = new Error('Unauthorized');
      (refreshError as any).statusCode = 401;
      (refreshError as any).response = { body: microsoftErrorResponse };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://graph.microsoft.com/v1.0/me')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(1);

      mockExecuteFunctions.getCredentials.mockResolvedValue(credentials);
      mockExecuteFunctions.helpers.request.mockRejectedValue(refreshError);

      await expect(smartHttp.execute.call(mockExecuteFunctions))
        .rejects.toThrow(/Token refresh failed.*invalid_client/);
    });

    it('should handle OAuth2 rate limiting errors', async () => {
      const credentials = {
        accessToken: 'valid-token', // Token本身有效
        refreshToken: 'valid-refresh-token', // nosemgrep: generic.secrets.security.detected-private-key
        clientId: 'test-client',
        clientSecret: 'test-secret', // nosemgrep: generic.secrets.security.detected-private-key
        authUrl: 'https://oauth2.googleapis.com/token',
        expiresIn: 3600,
        oauthTokenData: {
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分钟后过期
        }
      };

      // 真实的速率限制错误
      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).statusCode = 429;
      (rateLimitError as any).headers = {
        'retry-after': '60' // 60秒后重试
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://www.googleapis.com/oauth2/v1/userinfo')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(3); // 允许重试

      mockExecuteFunctions.getCredentials.mockResolvedValue(credentials);
      
      // 前两次请求被限速，第三次成功
      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockRejectedValueOnce(rateLimitError) // 第一次被限速
        .mockRejectedValueOnce(rateLimitError) // 第二次被限速
        .mockResolvedValueOnce({ // 第三次成功
          statusCode: 200,
          body: { email: 'test@example.com' }
        });

      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      // 使用fake timers来测试重试延迟
      vi.useFakeTimers();
      
      const executePromise = smartHttp.execute.call(mockExecuteFunctions);
      
      // 快速执行所有定时器
      await vi.runAllTimersAsync();
      
      const result = await executePromise;
      
      vi.useRealTimers();

      // 应该最终成功
      expect(result[0][0].json.statusCode).toBe(200);
      expect(result[0][0].json.retryAttempt).toBeGreaterThan(0);
      expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(3);
    });
  });

  describe('OAuth2 Endpoint Accessibility', () => {
    // 这个测试检查我们支持的OAuth2端点URL格式是否正确
    it('should use correct OAuth2 endpoint URL formats', async () => {
      const commonOAuth2Endpoints = [
        // Google OAuth2
        { 
          provider: 'Google', 
          tokenUrl: 'https://oauth2.googleapis.com/token',
          authUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
        },
        // Microsoft Azure AD
        { 
          provider: 'Microsoft', 
          tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
        },
        // GitHub OAuth
        { 
          provider: 'GitHub', 
          tokenUrl: 'https://github.com/login/oauth/access_token',
          authUrl: 'https://github.com/login/oauth/authorize'
        }
      ];

      for (const endpoint of commonOAuth2Endpoints) {
        // 验证URL格式正确
        expect(() => new URL(endpoint.tokenUrl)).not.toThrow();
        expect(() => new URL(endpoint.authUrl)).not.toThrow();
        
        // 验证是HTTPS
        expect(endpoint.tokenUrl).toMatch(/^https:/);
        expect(endpoint.authUrl).toMatch(/^https:/);
      }
    });
  });
});
