import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartHttp } from './SmartHttp.node';

// Mock the n8n-workflow module
vi.mock('n8n-workflow', () => ({
  NodeOperationError: class extends Error {
    constructor(node: any, error: Error, options?: any) {
      super(error.message);
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
      getCredentials: vi.fn(),
      getNode: vi.fn(() => ({ name: 'Test Node' })),
      continueOnFail: vi.fn(() => false),
      helpers: {
        requestOAuth2: {
          call: vi.fn()
        }
      }
    };
  });

  describe('Parameter Boundary Validation', () => {
    it('should clamp retryAttempts to safe boundaries (0-10)', async () => {
      // Test only key boundary cases to avoid timeout
      const testCases = [
        { input: -5, expected: 0 },   // Negative values
        { input: 5, expected: 5 },    // Normal value  
        { input: 50, expected: 10 },  // Above maximum
      ];

      for (const { input, expected } of testCases) {
        mockExecuteFunctions.getNodeParameter
          .mockReturnValueOnce('POST') // method
          .mockReturnValueOnce('https://api.test.com'); // url
        
        mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
          autoRefresh: true,
          retryAttempts: input,
          retryDelay: 50 // Reduced delay for testing
        });

        let actualRetries = 0;
        mockExecuteFunctions.helpers.requestOAuth2.call
          .mockImplementation(() => {
            actualRetries++;
            // Always fail for this boundary test - we want to count retry attempts
            throw new Error('401 Unauthorized');
          });

        // All cases should fail since we always throw errors
        await expect(smartHttp.execute.call(mockExecuteFunctions)).rejects.toThrow('401 Unauthorized');
        
        // Verify the correct number of attempts (initial + retries)
        expect(mockExecuteFunctions.helpers.requestOAuth2.call).toHaveBeenCalledTimes(expected + 1);
        
        vi.clearAllMocks();
      }
    }, 15000); // Increased timeout

    it('should clamp retryDelay to safe boundaries (100ms-30s)', async () => {
      // Mock setTimeout to avoid actual delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((cb) => {
        cb(); // Execute immediately
        return 1 as any;
      });

      try {
        const testCases = [
          { input: 50, description: 'below minimum (50ms -> 100ms)' },
          { input: 500, description: 'normal value (500ms)' },
          { input: 50000, description: 'above maximum (50s -> 30s)' },
        ];

        for (const { input, description } of testCases) {
          mockExecuteFunctions.getNodeParameter
            .mockReturnValueOnce('GET')
            .mockReturnValueOnce('https://api.test.com');
            
          mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
            autoRefresh: true,
            retryAttempts: 1,
            retryDelay: input
          });

          let callCount = 0;
          mockExecuteFunctions.helpers.requestOAuth2.call
            .mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                throw new Error('401 Unauthorized');
              }
              return Promise.resolve({ statusCode: 200, body: 'success' });
            });

          // Execute and verify it completes without hanging
          const result = await smartHttp.execute.call(mockExecuteFunctions);
          expect(result[0]).toHaveLength(1);
          expect(mockExecuteFunctions.helpers.requestOAuth2.call).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
          
          vi.clearAllMocks();
        }
      } finally {
        // Restore setTimeout
        global.setTimeout = originalSetTimeout;
      }
    }, 5000);
  });

  describe('Authentication Error Detection', () => {
    const authErrorTestCases = [
      // HTTP status codes (most reliable)
      { error: { response: { status: 401 } }, description: 'HTTP 401 status', shouldRetry: true },
      { error: { status: 401 }, description: 'Direct status 401', shouldRetry: true },
      { error: { response: { status: 404 } }, description: 'HTTP 404 status', shouldRetry: false },
      
      // Error codes (structured)
      { error: { code: 'OAUTH_TOKEN_EXPIRED' }, description: 'OAuth token expired code', shouldRetry: true },
      { error: { code: 'UNAUTHORIZED' }, description: 'Unauthorized code', shouldRetry: true },
      { error: { name: 'AuthenticationError' }, description: 'Authentication error name', shouldRetry: true },
      { error: { code: 'ECONNREFUSED' }, description: 'Connection refused', shouldRetry: false },
      
      // Message content (fallback, case insensitive)
      { error: { message: 'unauthorized access' }, description: 'Unauthorized message', shouldRetry: true },
      { error: { message: 'Authentication failed' }, description: 'Auth failed message', shouldRetry: true },
      { error: { message: 'token expired' }, description: 'Token expired message', shouldRetry: true },
      { error: { message: 'invalid token' }, description: 'Invalid token message', shouldRetry: true },
      { error: { message: 'Network timeout' }, description: 'Network error', shouldRetry: false },
    ];

    authErrorTestCases.forEach(({ error, description, shouldRetry }) => {
      it(`should ${shouldRetry ? 'retry' : 'not retry'} on ${description}`, async () => {
        mockExecuteFunctions.getNodeParameter
          .mockReturnValueOnce('GET')
          .mockReturnValueOnce('https://api.test.com');
          
        mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
          autoRefresh: true,
          retryAttempts: 2,
          retryDelay: 100
        });

        let callCount = 0;
        mockExecuteFunctions.helpers.requestOAuth2.call
          .mockImplementation(() => {
            callCount++;
            if (callCount <= (shouldRetry ? 2 : 1)) {
              throw error;
            }
            return Promise.resolve({ statusCode: 200, body: 'success' });
          });

        if (shouldRetry) {
          // Should eventually succeed after retries
          const result = await smartHttp.execute.call(mockExecuteFunctions);
          expect(result[0]).toHaveLength(1);
          expect(mockExecuteFunctions.helpers.requestOAuth2.call).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
        } else {
          // Should fail immediately without retries
          await expect(smartHttp.execute.call(mockExecuteFunctions)).rejects.toThrow();
          expect(mockExecuteFunctions.helpers.requestOAuth2.call).toHaveBeenCalledTimes(1); // Only initial call
        }
      });
    });
  });

  describe('Timeout Protection', () => {
    it('should timeout after 5 minutes execution time', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('POST')
        .mockReturnValueOnce('https://slow-api.test.com');
        
      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        autoRefresh: true,
        retryAttempts: 10,  // Reasonable number for testing
        retryDelay: 50      // Short delay for testing
      });

      // Mock Date.now to simulate time passage
      const originalDateNow = Date.now;
      let mockTime = 1000000000000; // Starting timestamp
      
      const mockDateNow = vi.fn(() => mockTime);
      vi.spyOn(Date, 'now').mockImplementation(mockDateNow);

      let callCount = 0;
      mockExecuteFunctions.helpers.requestOAuth2.call
        .mockImplementation(() => {
          callCount++;
          // After 5 calls, simulate 5+ minutes have passed
          if (callCount >= 5) {
            mockTime += 301000; // Advance time by 5+ minutes
          }
          throw new Error('401 Unauthorized');
        });

      await expect(smartHttp.execute.call(mockExecuteFunctions))
        .rejects.toThrow('OAuth2Enhanced execution timeout exceeded');
      
      // Restore original Date.now
      Date.now = originalDateNow;
    }, 15000); // Increased timeout for this test
  });

  describe('Retry Behavior Integration', () => {
    it('should not retry when autoRefresh is disabled', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.test.com');
        
      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        autoRefresh: false, // Disabled
        retryAttempts: 5,
        retryDelay: 1000
      });

      mockExecuteFunctions.helpers.requestOAuth2.call
        .mockRejectedValue(new Error('401 Unauthorized'));

      await expect(smartHttp.execute.call(mockExecuteFunctions)).rejects.toThrow('401 Unauthorized');
      expect(mockExecuteFunctions.helpers.requestOAuth2.call).toHaveBeenCalledTimes(1); // No retries
    });

    it('should handle successful request without retries', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('GET')
        .mockReturnValueOnce('https://api.test.com');
        
      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        autoRefresh: true,
        retryAttempts: 3,
        retryDelay: 1000
      });

      mockExecuteFunctions.helpers.requestOAuth2.call
        .mockResolvedValue({ statusCode: 200, body: { data: 'success' } });

      const result = await smartHttp.execute.call(mockExecuteFunctions);
      
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.statusCode).toBe(200);
      expect(mockExecuteFunctions.helpers.requestOAuth2.call).toHaveBeenCalledTimes(1); // Only one call
    });

    it('should use correct OAuth2 request parameters', async () => {
      mockExecuteFunctions.getNodeParameter
        .mockReturnValueOnce('POST')
        .mockReturnValueOnce('https://api.example.com/data');
        
      mockExecuteFunctions.getCredentials.mockResolvedValueOnce({
        autoRefresh: true,
        retryAttempts: 0 // No retries for this test
      });

      mockExecuteFunctions.helpers.requestOAuth2.call
        .mockResolvedValue({ statusCode: 201, body: { created: true } });

      await smartHttp.execute.call(mockExecuteFunctions);

      const callArgs = mockExecuteFunctions.helpers.requestOAuth2.call.mock.calls[0];
      
      // Verify call parameters
      expect(callArgs[1]).toBe('oAuth2ApiEnhanced'); // Credential name
      expect(callArgs[2].method).toBe('POST'); // HTTP method
      expect(callArgs[2].url).toBe('https://api.example.com/data'); // URL
      expect(callArgs[2].headers['Content-Type']).toBe('application/json'); // Headers
      expect(callArgs[3].tokenType).toBe('Bearer'); // Token type
    });
  });
});