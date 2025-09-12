<<<<<<< HEAD
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

describe('SmartHttp Node - Business Logic Tests', () => {
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

  describe('HTTP Request Execution', () => {
    it('should make successful GET request with OAuth2 credentials', async () => {
      const mockResponse = {
        statusCode: 200,
        body: { data: 'test response' },
        headers: { 'content-type': 'application/json' }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced') // authentication
        .mockReturnValueOnce('GET') // method
        .mockReturnValueOnce('https://api.example.com/data') // url
        .mockReturnValueOnce(false) // autoRetry
        .mockReturnValueOnce(0); // maxRetries

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-access-token-123'
      });

      mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue(mockResponse);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.statusCode).toBe(200);
      expect(result[0][0].json.body).toEqual({ data: 'test response' });
      expect(result[0][0].json.headers).toEqual({ 'content-type': 'application/json' });

      // Verify the request was made with correct parameters
      const requestCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      const options = requestCall[0]; // Now using single options object
      expect(options.url).toBe('https://api.example.com/data');
      expect(options.method).toBe('GET');
      expect(options.headers['Authorization']).toBe('Bearer test-access-token-123');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.json).toBe(true);
    });

    it('should make successful POST request with request body', async () => {
      const mockResponse = {
        statusCode: 201,
        body: { id: 123, created: true },
        headers: {}
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('POST') // method
        .mockReturnValueOnce('https://api.example.com/create') // url
        .mockReturnValueOnce(false) // autoRetry
        .mockReturnValueOnce(0); // maxRetries

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'post-token-456'
      });

      mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue(mockResponse);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(201);
      expect(result[0][0].json.body).toEqual({ id: 123, created: true });

      // Verify POST method was used
      const requestCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      const options = requestCall[0];
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('Bearer post-token-456');
    });

    it('should handle different HTTP methods correctly', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        mockExecuteFunctions.getNodeParameter
          .mockReturnValueOnce('oAuth2ApiEnhanced')
          .mockReturnValueOnce(method)
          .mockReturnValueOnce(`https://api.example.com/${method.toLowerCase()}`)
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(0);

        mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
          accessToken: `${method.toLowerCase()}-token`
        });

        mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
          statusCode: 200,
          body: `${method} response`
        });

        const result = await smartHttp.execute.call(mockExecuteFunctions);

        expect(result[0][0].json.body).toBe(`${method} response`);

        const requestCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
        const options = requestCall[0];
        expect(options.method).toBe(method);
        expect(options.headers['Authorization']).toBe(`Bearer ${method.toLowerCase()}-token`);

        vi.clearAllMocks();
      }
    });
  });

  describe('OAuth2 Authentication', () => {
    it('should use OAuth2 Enhanced credentials correctly', async () => {
      const testCredentials = {
        accessToken: 'advanced-oauth2-token',
        tokenType: 'Bearer',
        scope: 'read write'
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://secure-api.example.com/protected')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce(testCredentials);

      mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
        statusCode: 200,
        body: { protected: 'data' }
      });

      await smartHttp.execute.call(mockExecuteFunctions);

      // Verify credentials were requested from OAuth2Enhanced
      expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('oAuth2ApiEnhanced');

      // Verify Authorization header contains the access token
      const requestCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      const options = requestCall[0];
      expect(options.headers['Authorization']).toBe('Bearer advanced-oauth2-token');
    });

    it('should handle missing access token gracefully', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/data')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      // Simulate missing accessToken in credentials
      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        clientId: 'test-client',
        clientSecret: 'test-secret' // eslint-disable-line: Test credential only
        // Missing accessToken
      });

      mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
        statusCode: 200,
        body: 'success'
      });

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      // Should still make request but with "Bearer undefined"
      expect(result[0][0].json.statusCode).toBe(200);

      const requestCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      const options = requestCall[0];
      expect(options.headers['Authorization']).toBe('Bearer undefined');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP request errors when continueOnFail is false', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/error')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      const networkError = new Error('Connection failed');
      mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue(networkError);

      // continueOnFail is false by default
      await expect(smartHttp.execute.call(mockExecuteFunctions)).rejects.toThrow('Connection failed');
    });

    it('should handle HTTP request errors when continueOnFail is true', async () => {
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/error')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      const networkError = new Error('Network timeout');
      mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue(networkError);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toBe('Network timeout');
      expect(result[0][0].json.item).toBe(0);
    });

    it('should handle credential retrieval errors', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/data')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockRejectedValue(new Error('Invalid credentials'));

      await expect(smartHttp.execute.call(mockExecuteFunctions)).rejects.toThrow('Invalid credentials');
    });

    it('should handle non-Error objects gracefully', async () => {
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/error')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      // Simulate throwing a non-Error object
      mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue('String error');

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.error).toBe('Unknown error');
    });
  });

  describe('Response Processing', () => {
    it('should handle response without statusCode', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/simple')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      // Response without statusCode (common in some HTTP libs)
      const simpleResponse = { data: 'direct response' };
      mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue(simpleResponse);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(200); // Default fallback
      expect(result[0][0].json.body).toEqual({ data: 'direct response' });
      expect(result[0][0].json.headers).toEqual({}); // Default empty headers
    });

    it('should handle response with body and headers', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/full')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      const fullResponse = {
        statusCode: 202,
        body: { message: 'Accepted' },
        headers: { 
          'x-request-id': '12345',
          'content-type': 'application/json'
        }
      };
      mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue(fullResponse);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(202);
      expect(result[0][0].json.body).toEqual({ message: 'Accepted' });
      expect(result[0][0].json.headers).toEqual({ 
        'x-request-id': '12345',
        'content-type': 'application/json'
      });
    });

    it('should handle multiple input items', async () => {
      // Mock multiple input items
      mockExecuteFunctions.getInputData.mockReturnValue([
        { json: { id: 1 } },
        { json: { id: 2 } }
      ]);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/1')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0) // First item
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/2')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0); // Second item

      mockExecuteFunctions.getCredentials
        .mockResolvedValueOnce({ accessToken: 'token1' })
        .mockResolvedValueOnce({ accessToken: 'token2' });

      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockResolvedValueOnce({ statusCode: 200, body: 'response1' })
        .mockResolvedValueOnce({ statusCode: 200, body: 'response2' });

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json.body).toBe('response1');
      expect(result[0][1].json.body).toBe('response2');
      expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
    });
  });

  describe('OAuth2 Enhanced Auto-Refresh (Real Business Logic)', () => {
    it('should detect expired token and refresh automatically', async () => {
      const currentTime = Date.now();
      const expiredCredentials = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret', // eslint-disable-line: Test credential only
        authUrl: 'https://auth.example.com',
        expiresIn: 3600, // Required for isTokenExpired check
        oauthTokenData: {
          expires_at: new Date(currentTime - 10 * 60 * 1000).toISOString() // 10 minutes ago
        }
      };

      const newTokenResponse = {
        access_token: 'new-fresh-token',
        expires_in: 3600,
        refresh_token: 'new-refresh-token'
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/data')
        .mockReturnValueOnce(true) // autoRetry
        .mockReturnValueOnce(3); // maxRetries

      mockExecuteFunctions.getCredentials.mockResolvedValue(expiredCredentials);
      
      // Mock token refresh request (first call) and actual API call (second call)
      mockExecuteFunctions.helpers.request
        .mockResolvedValueOnce(newTokenResponse) // Token refresh call
      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockResolvedValueOnce({ statusCode: 200, body: 'success', headers: {} }); // Actual API call

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(200);
      expect(result[0][0].json.body).toBe('success');

      // Verify two calls were made
      expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(2);

      // Verify token refresh was called first
      const refreshCall = mockExecuteFunctions.helpers.request.mock.calls[0];
      expect(refreshCall[0].method).toBe('POST');
      expect(refreshCall[0].form.grant_type).toBe('refresh_token');
      expect(refreshCall[0].form.refresh_token).toBe('valid-refresh-token');

      // Verify actual request used new token
      const apiCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      expect(apiCall[0].headers['Authorization']).toBe('Bearer new-fresh-token');
    });

    it('should handle 401 auth errors with automatic retry', async () => {
      const credentials = {
        accessToken: 'invalid-token',
        refreshToken: 'valid-refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret', // eslint-disable-line: Test credential only
        authUrl: 'https://auth.example.com'
      };

      const newTokenResponse = {
        access_token: 'refreshed-token',
        expires_in: 3600
      };

      const authError = new Error('Unauthorized');
      (authError as any).statusCode = 401;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/protected')
        .mockReturnValueOnce(true) // autoRetry
        .mockReturnValueOnce(2); // maxRetries

      mockExecuteFunctions.getCredentials.mockResolvedValue(credentials);

      // Mock: First API call fails with 401, then token refresh, then success
      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockRejectedValueOnce(authError) // First API call fails
      mockExecuteFunctions.helpers.request
        .mockResolvedValueOnce(newTokenResponse) // Token refresh succeeds
      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockResolvedValueOnce({ statusCode: 200, body: 'protected data' }); // Retry succeeds

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(200);
      expect(result[0][0].json.body).toBe('protected data');
      expect(result[0][0].json.retryAttempt).toBe(1); // One retry happened

      // Verify 3 calls: failed API + refresh + successful API
      // 1st failed API + refresh + retry API
      expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
      expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
    });

    it('should implement exponential backoff for retries', async () => {
      const credentials = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        clientId: 'client',
        clientSecret: 'secret', // eslint-disable-line: Test credential only
        authUrl: 'https://auth.example.com'
      };

      const networkError = new Error('Network timeout');
      (networkError as any).statusCode = 500;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/flaky')
        .mockReturnValueOnce(true) // autoRetry
        .mockReturnValueOnce(2); // maxRetries

      mockExecuteFunctions.getCredentials.mockResolvedValue(credentials);

      // Mock: All calls fail with network error (non-auth error)
      mockExecuteFunctions.helpers.requestWithAuthentication
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      // Use fake timers to test delay
      vi.useFakeTimers();
      
      const executePromise = smartHttp.execute.call(mockExecuteFunctions);
      
      // Fast-forward through delays
      await vi.runAllTimersAsync();
      
      const result = await executePromise;
      
      vi.useRealTimers();

      // Should fail after all retries
      expect(result[0][0].json.error).toBe('Network timeout');
      expect(result[0][0].json.attempts).toBe(3); // 1 initial + 2 retries
      expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(3);
    });

    it('should fail when refresh token is missing', async () => {
      const credentialsNoRefresh = {
        accessToken: 'expired-token',
        // No refreshToken - this should trigger immediate error
        expiresIn: 3600,
        oauthTokenData: {
          expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/data')
        .mockReturnValueOnce(false) // Disable autoRetry to avoid delays
        .mockReturnValueOnce(0); // Zero retries for fast execution

      mockExecuteFunctions.getCredentials.mockResolvedValue(credentialsNoRefresh);

      await expect(smartHttp.execute.call(mockExecuteFunctions))
        .rejects.toThrow('No refresh token available for token refresh');
    });

    it('should handle token refresh failure gracefully', async () => {
      const credentials = {
        accessToken: 'expired-token',
        refreshToken: 'invalid-refresh-token',
        clientId: 'test-client',
        clientSecret: 'test-secret', // eslint-disable-line: Test credential only
        authUrl: 'https://auth.example.com',
        expiresIn: 3600,
        oauthTokenData: {
          expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        }
      };

      const refreshError = new Error('Invalid refresh token');
      (refreshError as any).statusCode = 400;

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/data')
        .mockReturnValueOnce(false) // Disable autoRetry for fast execution
        .mockReturnValueOnce(0); // Zero retries

      mockExecuteFunctions.getCredentials.mockResolvedValue(credentials);
      mockExecuteFunctions.helpers.request.mockRejectedValue(refreshError);

      await expect(smartHttp.execute.call(mockExecuteFunctions))
        .rejects.toThrow('Token refresh failed: Invalid refresh token');
    });

    it('should not refresh token when not expired', async () => {
      const validCredentials = {
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        oauthTokenData: {
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes from now
        }
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/data')
        .mockReturnValueOnce(false) // autoRetry disabled
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockResolvedValue(validCredentials);
      mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({ 
        statusCode: 200, 
        body: 'success' 
      });

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(200);
      // Should only call API once (no token refresh)
      expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
      
      const apiCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      expect(apiCall[0].headers['Authorization']).toBe('Bearer valid-token');
    });
  });

  describe('Request Configuration', () => {
    it('should configure request with correct options structure', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('oAuth2ApiEnhanced')
        .mockReturnValueOnce('PUT')
        .mockReturnValueOnce('https://api.example.com/update')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(0);

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'config-test-token'
      });

      mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({
        statusCode: 204
      });

      await smartHttp.execute.call(mockExecuteFunctions);

      const requestCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
      const options = requestCall[0];

      expect(options.method).toBe('PUT');
      expect(options.url).toBe('https://api.example.com/update');
      expect(options.headers['Authorization']).toBe('Bearer config-test-token');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.json).toBe(true);
    });

    it('should maintain consistent request structure across different methods', async () => {
      const methods = ['POST', 'PATCH', 'DELETE'];

      for (const method of methods) {
        mockExecuteFunctions.getNodeParameter
          .mockReturnValueOnce('oAuth2ApiEnhanced')
          .mockReturnValueOnce(method)
          .mockReturnValueOnce('https://api.example.com/endpoint')
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(0);

        mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
          accessToken: 'consistent-token'
        });

        mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({ statusCode: 200 });

        await smartHttp.execute.call(mockExecuteFunctions);

        const requestCall = mockExecuteFunctions.helpers.requestWithAuthentication.mock.calls[0];
        const options = requestCall[0];

        // Verify consistent structure
        expect(options.method).toBe(method);
        expect(options.json).toBe(true);
        expect(options.headers).toHaveProperty('Authorization');
        expect(options.headers).toHaveProperty('Content-Type', 'application/json');

        vi.clearAllMocks();
      }
    });
  });
});
=======
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
>>>>>>> 1649803 (✨ Enhancement: Optimize OAuth2Enhanced architecture and implement smart retry mechanism (#1))
