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
          { name: 'OAuth2 Enhanced (Recommended)', value: 'oAuth2ApiEnhanced' },
          { name: 'None', value: 'none' },
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
        displayName: 'Query Parameters',
        name: 'queryParametersUi',
        type: 'fixedCollection',
        placeholder: 'Add Parameter',
        default: {},
        options: [
          {
            displayName: 'Parameters',
            name: 'parameters',
            type: 'collection',
            placeholder: 'Add Parameter',
            default: {},
            options: [
              { displayName: 'Name', name: 'name', type: 'string', default: '' },
              { displayName: 'Value', name: 'value', type: 'string', default: '' },
            ],
          },
        ],
        description: 'Query string parameters to append to the URL',
      },
      {
        displayName: 'Headers',
        name: 'headersUi',
        type: 'fixedCollection',
        placeholder: 'Add Header',
        default: {},
        options: [
          {
            displayName: 'Header',
            name: 'parameter',
            type: 'collection',
            placeholder: 'Add Header',
            default: {},
            options: [
              { displayName: 'Name', name: 'name', type: 'string', default: '' },
              { displayName: 'Value', name: 'value', type: 'string', default: '' },
            ],
          },
        ],
        description: 'Additional request headers',
      },
      {
        displayName: 'Body Mode',
        name: 'bodyMode',
        type: 'options',
        options: [
          { name: 'None', value: 'none' },
          { name: 'JSON', value: 'json' },
          { name: 'Raw', value: 'raw' },
          { name: 'Form URL Encoded', value: 'formUrlEncoded' },
          { name: 'Multipart Form Data', value: 'multipart' },
        ],
        default: 'none',
        description: 'How to send the request body',
      },
      {
        displayName: 'JSON Body',
        name: 'bodyJson',
        type: 'json',
        default: '{}',
        displayOptions: { show: { bodyMode: ['json'] } },
        description: 'JSON body to send with the request',
      },
      {
        displayName: 'Raw Content-Type',
        name: 'rawContentType',
        type: 'string',
        default: 'text/plain',
        displayOptions: { show: { bodyMode: ['raw'] } },
        description: 'Content-Type header to use with raw body',
      },
      {
        displayName: 'Raw Body',
        name: 'rawBody',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        displayOptions: { show: { bodyMode: ['raw'] } },
        description: 'Raw body content to send',
      },
      {
        displayName: 'Form Fields',
        name: 'formFieldsUi',
        type: 'fixedCollection',
        placeholder: 'Add Field',
        default: {},
        options: [
          {
            displayName: 'Parameters',
            name: 'parameters',
            type: 'collection',
            placeholder: 'Add Field',
            default: {},
            options: [
              { displayName: 'Name', name: 'name', type: 'string', default: '' },
              { displayName: 'Value', name: 'value', type: 'string', default: '' },
            ],
          },
        ],
        displayOptions: { show: { bodyMode: ['formUrlEncoded'] } },
        description: 'x-www-form-urlencoded fields (name=value)',
      },
      {
        displayName: 'Multipart Fields',
        name: 'multipartFieldsUi',
        type: 'fixedCollection',
        placeholder: 'Add Part',
        default: {},
        options: [
          {
            displayName: 'Part',
            name: 'parameter',
            type: 'collection',
            placeholder: 'Add Part',
            default: {},
            options: [
              { displayName: 'Name', name: 'name', type: 'string', default: '' },
              { displayName: 'Value', name: 'value', type: 'string', default: '' },
            ],
          },
        ],
        displayOptions: { show: { bodyMode: ['multipart'] } },
        description: 'Multipart form fields (text parts only)',
      },
      {
        displayName: 'Auto Retry',
        name: 'autoRetry',
        type: 'boolean',
        default: true,
        description: 'Automatically retry on transient failures',
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: 'number',
        default: 3,
        description: 'Maximum number of retries for failed requests',
        displayOptions: { show: { autoRetry: [true] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const authentication = this.getNodeParameter('authentication', i) as string;
      const method = this.getNodeParameter('method', i) as IHttpRequestMethods;
      const url = this.getNodeParameter('url', i) as string;
      const queryParametersUi = this.getNodeParameter('queryParametersUi', i, {}) as any;
      const headersUi = this.getNodeParameter('headersUi', i, {}) as any;
      const bodyMode = this.getNodeParameter('bodyMode', i) as string;
      const bodyJson = this.getNodeParameter('bodyJson', i, undefined) as any;
      const rawContentType = this.getNodeParameter('rawContentType', i, 'text/plain') as string;
      const rawBody = this.getNodeParameter('rawBody', i, '') as string;
      const formFieldsUi = this.getNodeParameter('formFieldsUi', i, {}) as any;
      const multipartFieldsUi = this.getNodeParameter('multipartFieldsUi', i, {}) as any;
      const autoRetry = this.getNodeParameter('autoRetry', i) as boolean;
      const maxRetries = this.getNodeParameter('maxRetries', i) as number;

      let lastError: any = null;
      let attempt = 0;
      const maxAttempts = autoRetry ? maxRetries + 1 : 1;

      while (attempt < maxAttempts) {
        try {
          // Build URL with query params
          let finalUrl = url;
          const qp = Array.isArray(queryParametersUi?.parameters) ? queryParametersUi.parameters : [];
          if (qp.length > 0) {
            const parsed = new URL(finalUrl, finalUrl.startsWith('http') ? undefined : 'http://local');
            const merged = new URLSearchParams(parsed.search);
            for (const p of qp) {
              if (p?.name) merged.set(String(p.name), p?.value ?? '');
            }
            parsed.search = merged.toString();
            finalUrl = parsed.toString();
          }

          // Base request options
          const options: any = {
            method,
            url: finalUrl,
            headers: {
              'Content-Type': 'application/json',
            },
            json: true, // default for JSON mode
          };

          // Merge custom headers
          const hs = Array.isArray(headersUi?.parameter) ? headersUi.parameter : [];
          for (const h of hs) {
            if (h?.name) options.headers[String(h.name)] = h?.value ?? '';
          }

          // Attach body according to mode
          if (bodyMode === 'json') {
            options.body = bodyJson ?? {};
            options.json = true;
          } else if (bodyMode === 'raw') {
            options.headers['Content-Type'] = rawContentType || 'text/plain';
            options.body = rawBody || '';
            delete options.json;
          } else if (bodyMode === 'formUrlEncoded') {
            const fields = Array.isArray(formFieldsUi?.parameters) ? formFieldsUi.parameters : [];
            const formObj: Record<string, string> = {};
            for (const f of fields) {
              if (f?.name) formObj[String(f.name)] = f?.value ?? '';
            }
            options.form = formObj;
            delete options.json;
          } else if (bodyMode === 'multipart') {
            const parts = Array.isArray(multipartFieldsUi?.parameter) ? multipartFieldsUi.parameter : [];
            const formData: Record<string, any> = {};
            for (const p of parts) {
              if (p?.name) formData[String(p.name)] = p?.value ?? '';
            }
            options.formData = formData;
            delete options.json;
          }

          let response: any;
          if (authentication === 'oAuth2ApiEnhanced') {
            response = await (this.helpers as any).requestWithAuthentication.call(this, 'oAuth2ApiEnhanced', options);
          } else {
            response = await this.helpers.request(options);
          }

          returnData.push({
            json: {
              statusCode: response?.statusCode || 200,
              body: response?.body || response,
              headers: response?.headers || {},
              retryAttempt: attempt,
            },
          });
          break; // success
        } catch (error) {
          lastError = error;
          attempt++;

          if (attempt >= maxAttempts) {
            if (this.continueOnFail()) {
              returnData.push({ json: { error: lastError instanceof Error ? lastError.message : 'Unknown error', item: i, attempts: attempt } });
              break;
            } else {
              throw new NodeOperationError(this.getNode(), lastError instanceof Error ? lastError : new Error('Unknown error'), { itemIndex: i });
            }
          }

          // Retry delay: prefer Retry-After; else exponential backoff + jitter
          let delayMs: number | null = null;
          const status = (lastError as any)?.statusCode || (lastError as any)?.response?.status;
          const retryAfterHeader = (lastError as any)?.headers?.['retry-after'] || (lastError as any)?.response?.headers?.['retry-after'];
          if (status === 429 && retryAfterHeader) {
            const sec = parseInt(Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader, 10);
            if (!Number.isNaN(sec)) delayMs = Math.min(sec * 1000, 30000);
          }
          if (delayMs == null) {
            const base = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            const jitter = Math.floor(Math.random() * 250);
            delayMs = base + jitter;
          }
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    return [returnData];
  }
}

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
>>>>>>> 1649803 (✨ Enhancement: Optimize OAuth2Enhanced architecture and implement smart retry mechanism (#1))
        }
      }
    }

    return [returnData];
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 1649803 (✨ Enhancement: Optimize OAuth2Enhanced architecture and implement smart retry mechanism (#1))
