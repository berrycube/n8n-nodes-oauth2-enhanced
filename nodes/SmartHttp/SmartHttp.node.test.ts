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
        request: vi.fn()
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
        .mockReturnValueOnce('GET') // method
        .mockReturnValueOnce('https://api.example.com/data'); // url

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-access-token-123'
      });

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.statusCode).toBe(200);
      expect(result[0][0].json.body).toEqual({ data: 'test response' });
      expect(result[0][0].json.headers).toEqual({ 'content-type': 'application/json' });

      // Verify the request was made with correct parameters
      const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0];
      expect(requestCall[0]).toBe('https://api.example.com/data'); // url
      expect(requestCall[1].method).toBe('GET');
      expect(requestCall[1].headers['Authorization']).toBe('Bearer test-access-token-123');
      expect(requestCall[1].headers['Content-Type']).toBe('application/json');
      expect(requestCall[1].json).toBe(true);
    });

    it('should make successful POST request with request body', async () => {
      const mockResponse = {
        statusCode: 201,
        body: { id: 123, created: true },
        headers: {}
      };

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('POST') // method
        .mockReturnValueOnce('https://api.example.com/create'); // url

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'post-token-456'
      });

      mockExecuteFunctions.helpers.request.mockResolvedValue(mockResponse);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(201);
      expect(result[0][0].json.body).toEqual({ id: 123, created: true });

      // Verify POST method was used
      const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0];
      expect(requestCall[1].method).toBe('POST');
      expect(requestCall[1].headers['Authorization']).toBe('Bearer post-token-456');
    });

    it('should handle different HTTP methods correctly', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        mockExecuteFunctions.getNodeParameter
          .mockReturnValueOnce(method)
          .mockReturnValueOnce(`https://api.example.com/${method.toLowerCase()}`);

        mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
          accessToken: `${method.toLowerCase()}-token`
        });

        mockExecuteFunctions.helpers.request.mockResolvedValue({
          statusCode: 200,
          body: `${method} response`
        });

        const result = await smartHttp.execute.call(mockExecuteFunctions);

        expect(result[0][0].json.body).toBe(`${method} response`);

        const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0];
        expect(requestCall[1].method).toBe(method);
        expect(requestCall[1].headers['Authorization']).toBe(`Bearer ${method.toLowerCase()}-token`);

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
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://secure-api.example.com/protected');

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce(testCredentials);

      mockExecuteFunctions.helpers.request.mockResolvedValue({
        statusCode: 200,
        body: { protected: 'data' }
      });

      await smartHttp.execute.call(mockExecuteFunctions);

      // Verify credentials were requested from OAuth2Enhanced
      expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('oAuth2ApiEnhanced');

      // Verify Authorization header contains the access token
      const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0];
      expect(requestCall[1].headers['Authorization']).toBe('Bearer advanced-oauth2-token');
    });

    it('should handle missing access token gracefully', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/data');

      // Simulate missing accessToken in credentials
      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        clientId: 'test-client',
        clientSecret: 'test-secret'
        // Missing accessToken
      });

      mockExecuteFunctions.helpers.request.mockResolvedValue({
        statusCode: 200,
        body: 'success'
      });

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      // Should still make request but with "Bearer undefined"
      expect(result[0][0].json.statusCode).toBe(200);

      const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0];
      expect(requestCall[1].headers['Authorization']).toBe('Bearer undefined');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP request errors when continueOnFail is false', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/error');

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      const networkError = new Error('Connection failed');
      mockExecuteFunctions.helpers.request.mockRejectedValue(networkError);

      // continueOnFail is false by default
      await expect(smartHttp.execute.call(mockExecuteFunctions)).rejects.toThrow('Connection failed');
    });

    it('should handle HTTP request errors when continueOnFail is true', async () => {
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/error');

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      const networkError = new Error('Network timeout');
      mockExecuteFunctions.helpers.request.mockRejectedValue(networkError);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toBe('Network timeout');
      expect(result[0][0].json.item).toBe(0);
    });

    it('should handle credential retrieval errors', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/data');

      mockExecuteFunctions.getCredentials.mockRejectedValue(new Error('Invalid credentials'));

      await expect(smartHttp.execute.call(mockExecuteFunctions)).rejects.toThrow('Invalid credentials');
    });

    it('should handle non-Error objects gracefully', async () => {
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/error');

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      // Simulate throwing a non-Error object
      mockExecuteFunctions.helpers.request.mockRejectedValue('String error');

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.error).toBe('Unknown error');
    });
  });

  describe('Response Processing', () => {
    it('should handle response without statusCode', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/simple');

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'test-token'
      });

      // Response without statusCode (common in some HTTP libs)
      const simpleResponse = { data: 'direct response' };
      mockExecuteFunctions.helpers.request.mockResolvedValue(simpleResponse);

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0][0].json.statusCode).toBe(200); // Default fallback
      expect(result[0][0].json.body).toEqual({ data: 'direct response' });
      expect(result[0][0].json.headers).toEqual({}); // Default empty headers
    });

    it('should handle response with body and headers', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.example.com/full');

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
      mockExecuteFunctions.helpers.request.mockResolvedValue(fullResponse);

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
        .mockReturnValueOnce('GET').mockReturnValueOnce('https://api.example.com/1') // First item
        .mockReturnValueOnce('GET').mockReturnValueOnce('https://api.example.com/2'); // Second item

      mockExecuteFunctions.getCredentials
        .mockResolvedValueOnce({ accessToken: 'token1' })
        .mockResolvedValueOnce({ accessToken: 'token2' });

      mockExecuteFunctions.helpers.request
        .mockResolvedValueOnce({ statusCode: 200, body: 'response1' })
        .mockResolvedValueOnce({ statusCode: 200, body: 'response2' });

      const result = await smartHttp.execute.call(mockExecuteFunctions);

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json.body).toBe('response1');
      expect(result[0][1].json.body).toBe('response2');
      expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Configuration', () => {
    it('should configure request with correct options structure', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('PUT')
        .mockReturnValueOnce('https://api.example.com/update');

      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        accessToken: 'config-test-token'
      });

      mockExecuteFunctions.helpers.request.mockResolvedValue({
        statusCode: 204
      });

      await smartHttp.execute.call(mockExecuteFunctions);

      const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0];
      const [url, options] = requestCall;

      expect(url).toBe('https://api.example.com/update');
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
          .mockReturnValueOnce(method)
          .mockReturnValueOnce('https://api.example.com/endpoint');

        mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
          accessToken: 'consistent-token'
        });

        mockExecuteFunctions.helpers.request.mockResolvedValue({ statusCode: 200 });

        await smartHttp.execute.call(mockExecuteFunctions);

        const requestCall = mockExecuteFunctions.helpers.request.mock.calls[0];
        const options = requestCall[1];

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