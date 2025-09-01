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
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const method = this.getNodeParameter('method', i) as IHttpRequestMethods;
      const url = this.getNodeParameter('url', i) as string;

      try {
        // Get OAuth2 Enhanced credentials
        const credentials = await this.getCredentials('oAuth2ApiEnhanced');
        const autoRefresh = credentials.autoRefresh as boolean;
        
        // Parameter validation with safe boundaries
        const retryAttempts = autoRefresh ? 
          Math.max(0, Math.min(10, (credentials.retryAttempts as number) || 3)) : 0;
        const retryDelay = Math.max(100, Math.min(30000, (credentials.retryDelay as number) || 1000));

        const requestOptions = {
          method,
          url,
          headers: {
            'Content-Type': 'application/json',
          },
          json: true,
        };

        let lastError: Error | null = null;
        let response = null;
        const startTime = Date.now();
        const maxExecutionTime = 300000; // 5 minutes maximum execution time

        // Improved authentication error detection
        const isAuthenticationError = (error: any): boolean => {
          // Check HTTP status code (most reliable)
          if (error.response?.status === 401 || error.status === 401) {
            return true;
          }
          
          // Check error codes
          if (error.code === 'OAUTH_TOKEN_EXPIRED' || 
              error.code === 'UNAUTHORIZED' ||
              error.name === 'AuthenticationError') {
            return true;
          }
          
          // Fallback to message content (least reliable)
          const errorMessage = (error.message || '').toLowerCase();
          return errorMessage.includes('unauthorized') || 
                 errorMessage.includes('authentication') ||
                 errorMessage.includes('token expired') ||
                 errorMessage.includes('invalid token');
        };

        // Main retry loop
        for (let attempt = 0; attempt <= retryAttempts; attempt++) {
          try {
            // Check execution timeout
            if (Date.now() - startTime > maxExecutionTime) {
              throw new Error('OAuth2Enhanced execution timeout exceeded');
            }

            // Use requestOAuth2 for automatic token handling
            response = await this.helpers.requestOAuth2.call(
              this,
              'oAuth2ApiEnhanced',
              requestOptions,
              {
                tokenType: 'Bearer',
              }
            );
            
            // Success - break out of retry loop
            lastError = null;
            break;
            
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            
            // If this is the last attempt, don't retry
            if (attempt >= retryAttempts) {
              break;
            }
            
            // Only retry on authentication errors
            if (!isAuthenticationError(error)) {
              break;
            }
            
            // Wait before retry (with timeout check)
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

        // If we have an error after all retries, handle it
        if (lastError) {
          throw lastError;
        }
        
        returnData.push({
          json: {
            statusCode: response?.statusCode || 200,
            body: response?.body || response,
            headers: response?.headers || {},
          },
        });
        
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : 'Unknown error',
              item: i,
            },
          });
        } else {
          throw new NodeOperationError(
            this.getNode(),
            error instanceof Error ? error : new Error('Unknown error'),
            { itemIndex: i }
          );
        }
      }
    }

    return [returnData];
  }
}