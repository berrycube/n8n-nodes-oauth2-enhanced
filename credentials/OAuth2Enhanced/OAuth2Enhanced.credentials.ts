import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class OAuth2Enhanced implements ICredentialType {
  name = 'oAuth2ApiEnhanced';
  displayName = 'OAuth2 API (Enhanced)';
  documentationUrl = 'https://docs.n8n.io/integrations/builtin/credentials/oauth2/';
  extends = ['oAuth2Api'];
  
  properties: INodeProperties[] = [
    {
      displayName: 'Auto Refresh',
      name: 'autoRefresh',
      type: 'boolean',
      default: true,
      description: 'Automatically refresh access token when it expires',
    },
    {
      displayName: 'Refresh Buffer (seconds)',
      name: 'refreshBuffer',
      type: 'number',
      default: 300,
      description: 'Refresh token this many seconds before expiration',
      displayOptions: {
        show: {
          autoRefresh: [true],
        },
      },
    },
    {
      displayName: 'Retry Attempts',
      name: 'retryAttempts',
      type: 'number',
      default: 3,
      description: 'Maximum number of retry attempts when authentication fails',
      displayOptions: {
        show: {
          autoRefresh: [true],
        },
      },
    },
    {
      displayName: 'Retry Delay (ms)',
      name: 'retryDelay',
      type: 'number',
      default: 1000,
      description: 'Delay between retry attempts in milliseconds',
      displayOptions: {
        show: {
          autoRefresh: [true],
        },
      },
    },
  ];
}