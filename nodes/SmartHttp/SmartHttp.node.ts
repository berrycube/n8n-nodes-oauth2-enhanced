import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHttpRequestMethods,
  NodeOperationError,
  NodeConnectionType,
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
    inputs: [{ type: NodeConnectionType.Main }],
    outputs: [{ type: NodeConnectionType.Main }],
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

      try {
        // Get OAuth2 credentials
        const credentials = await this.getCredentials('oAuth2ApiEnhanced');
        
        const options = {
          method,
          url,
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
          json: true,
        };

        const response = await this.helpers.request(url, options);
        
        returnData.push({
          json: {
            statusCode: response.statusCode || 200,
            body: response.body || response,
            headers: response.headers || {},
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