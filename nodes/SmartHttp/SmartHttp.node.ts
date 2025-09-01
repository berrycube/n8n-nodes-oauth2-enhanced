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
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const method = this.getNodeParameter('method', i) as IHttpRequestMethods;
      const url = this.getNodeParameter('url', i) as string;
      const autoRetry = this.getNodeParameter('autoRetry', i) as boolean;
      const maxRetries = this.getNodeParameter('maxRetries', i) as number;

      try {
        // Get OAuth2 Enhanced credentials
        const credentials = await this.getCredentials('oAuth2ApiEnhanced');
        const autoRefresh = credentials.autoRefresh as boolean;
        const retryAttempts = (credentials.retryAttempts as number) || 3;
        const retryDelay = (credentials.retryDelay as number) || 1000;

        // Determine actual retry count
        const actualRetries = autoRefresh && autoRetry ? Math.min(maxRetries, retryAttempts) : 0;

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

        // Main retry loop
        for (let attempt = 0; attempt <= actualRetries; attempt++) {
          try {
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
            
            // If not retrying or this is the last attempt, don't delay
            if (attempt >= actualRetries) {
              break;
            }
            
            // Check if this is an authentication error worth retrying
            const isAuthError = lastError.message.includes('401') || 
                              lastError.message.includes('Unauthorized') ||
                              lastError.message.includes('authentication') ||
                              lastError.message.includes('token');
            
            if (!isAuthError) {
              // Not an auth error, don't retry
              break;
            }
            
            // Wait before retry
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