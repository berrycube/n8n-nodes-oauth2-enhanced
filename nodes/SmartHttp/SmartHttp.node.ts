import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHttpRequestMethods,
  NodeOperationError,
} from 'n8n-workflow';

export class SmartHttp implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Smart HTTP',
    name: 'smartHttp',
    group: ['transform'],
    version: 1,
    description: 'Smart HTTP requests with OAuth2 Enhanced auto-refresh',
    defaults: {
      name: 'Smart HTTP',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'oAuth2ApiEnhanced',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          {
            name: 'OAuth2 Enhanced (Recommended)',
            value: 'oAuth2ApiEnhanced',
            description: 'Use OAuth2 Enhanced credentials with auto-refresh',
          },
          {
            name: 'None',
            value: 'none',
            description: 'Send request without authentication',
          },
        ],
        default: 'oAuth2ApiEnhanced',
        description: 'How to authenticate the HTTP request',
      },
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'PATCH', value: 'PATCH' },
        ],
        default: 'GET',
        description: 'HTTP method to use',
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'The URL to make the request to',
      },
      {
        displayName: 'Auto Retry',
        name: 'autoRetry',
        type: 'boolean',
        default: true,
        description: 'Automatically retry on authentication failures',
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: 'number',
        default: 3,
        description: 'Maximum number of retries for failed requests',
        displayOptions: {
          show: {
            autoRetry: [true],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // Helper functions defined within execute context
    const isTokenExpired = (credentials: any): boolean => {
      // Prefer absolute expiry from oauthTokenData.expires_at with configurable buffer
      const expiresAt = credentials?.oauthTokenData?.expires_at;
      if (!expiresAt) return false;

      const expiryTime = new Date(expiresAt).getTime();
      const currentTime = Date.now();
      // Use credential-level buffer if provided, else default 300s
      const bufferSeconds = typeof credentials?.refreshBuffer === 'number' ? credentials.refreshBuffer : 300;
      const bufferTime = bufferSeconds * 1000;
      return currentTime >= (expiryTime - bufferTime);
    };

    const isAuthError = (error: any): boolean => {
      return error.statusCode === 401 || 
             error.statusCode === 403 || 
             (error.message && error.message.toLowerCase().includes('unauthorized'));
    };

    const refreshAccessToken = async (credentials: any): Promise<any> => {
      if (!credentials.refreshToken) {
        throw new Error('No refresh token available for token refresh');
      }

      try {
        const refreshResponse = await this.helpers.request({
          method: 'POST',
          url: credentials.accessTokenUrl || `${credentials.authUrl}/token`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          form: {
            grant_type: 'refresh_token',
            refresh_token: credentials.refreshToken,
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
          },
          json: true,
        });

        // Update credentials with new token - handle both standard and non-standard field names
        credentials.accessToken = refreshResponse.access_token || refreshResponse.accessToken;
        if (refreshResponse.refresh_token || refreshResponse.refreshToken) {
          credentials.refreshToken = refreshResponse.refresh_token || refreshResponse.refreshToken;
        }
        const expiresIn = refreshResponse.expires_in || refreshResponse.expiresIn;
        if (expiresIn) {
          credentials.oauthTokenData = {
            expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
          };
        }
        // Respect token_type if provided
        if (refreshResponse.token_type) {
          credentials.tokenType = refreshResponse.token_type;
        }

        return credentials;
      } catch (error) {
        // Extract detailed error information from OAuth2 providers
        let errorMessage = 'Unknown error';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Try to extract OAuth2 specific error details
          const errorResponse = (error as any).response?.body;
          if (errorResponse && typeof errorResponse === 'object') {
            if (errorResponse.error) {
              errorMessage = `${errorResponse.error}: ${errorResponse.error_description || 'No description'}`;
            }
          }
        }
        
        throw new Error(`Token refresh failed: ${errorMessage}`);
      }
    };
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const authentication = this.getNodeParameter('authentication', i) as string;
      const method = this.getNodeParameter('method', i) as IHttpRequestMethods;
      const url = this.getNodeParameter('url', i) as string;
      const autoRetry = this.getNodeParameter('autoRetry', i) as boolean;
      const maxRetries = this.getNodeParameter('maxRetries', i) as number;

      let lastError: any = null;
      let attempt = 0;
      const maxAttempts = autoRetry ? maxRetries + 1 : 1;

      while (attempt < maxAttempts) {
        try {
          let response: any;
          let credentials: any = null;

          // Build request options (we still set headers consistently; auth helper may override Authorization as needed)
          const options: any = {
            method,
            url,
            headers: {
              'Content-Type': 'application/json',
            },
            json: true,
          };

          if (authentication === 'oAuth2ApiEnhanced') {
            // Fetch credentials and pre-check expiry to proactively refresh
            credentials = await this.getCredentials('oAuth2ApiEnhanced');
            if (isTokenExpired(credentials)) {
              credentials = await refreshAccessToken(credentials);
            }
            // Attach header for backward compatibility with tests; requestWithAuthentication will also ensure auth
            const tokenType = (credentials?.tokenType || 'Bearer');
            if (credentials?.accessToken) {
              options.headers['Authorization'] = `${tokenType} ${credentials.accessToken}`;
            }
            response = await (this.helpers as any).requestWithAuthentication.call(
              this,
              'oAuth2ApiEnhanced',
              options,
            );
          } else {
            // None
            response = await this.helpers.request(options);
          }
          
          returnData.push({
            json: {
              statusCode: response.statusCode || 200,
              body: response.body || response,
              headers: response.headers || {},
              retryAttempt: attempt,
            },
          });
          
          // Success - break out of retry loop
          break;
          
        } catch (error) {
          lastError = error;
          attempt++;
          
          // If it's an auth error and we have retries left, try to refresh token
          if (autoRetry && attempt < maxAttempts && isAuthError(error) && authentication === 'oAuth2ApiEnhanced') {
            try {
              const credentials = await this.getCredentials('oAuth2ApiEnhanced');
              await refreshAccessToken(credentials);
              continue; // Retry with refreshed token
            } catch (refreshError) {
              // If refresh fails, continue to next attempt or fail
              lastError = refreshError;
            }
          }
          
          // If no more retries, handle the error
          if (attempt >= maxAttempts) {
            if (this.continueOnFail()) {
              returnData.push({
                json: {
                  error: lastError instanceof Error ? lastError.message : 'Unknown error',
                  item: i,
                  attempts: attempt,
                },
              });
              break;
            } else {
              throw new NodeOperationError(
                this.getNode(),
                lastError instanceof Error ? lastError : new Error('Unknown error'),
                { itemIndex: i }
              );
            }
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < maxAttempts) {
            let delayMs: number | null = null;
            const status = (lastError as any)?.statusCode;
            const retryAfterHeader = (lastError as any)?.headers?.['retry-after'] || (lastError as any)?.response?.headers?.['retry-after'];
            if (status === 429 && retryAfterHeader) {
              const sec = parseInt(Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader, 10);
              if (!Number.isNaN(sec)) delayMs = Math.min(sec * 1000, 30000); // cap 30s
            }
            if (delayMs == null) {
              const base = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
              const jitter = Math.floor(Math.random() * 250); // small jitter to avoid thundering herd
              delayMs = base + jitter;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }
    }

    return [returnData];
  }
}
