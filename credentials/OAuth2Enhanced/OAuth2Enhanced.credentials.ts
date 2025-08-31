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
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      default: '',
      required: true,
    },
    {
      displayName: 'Client Secret',
      name: 'clientSecret',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
    },
    {
      displayName: 'Auth URL',
      name: 'authUrl',
      type: 'string',
      default: '',
      required: true,
    },
    {
      displayName: 'Access Token URL',
      name: 'accessTokenUrl',
      type: 'string',
      default: '',
      required: true,
    },
    {
      displayName: 'Scope',
      name: 'scope',
      type: 'string',
      default: '',
    },
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
    },
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
    },
    {
      displayName: 'Refresh Token',
      name: 'refreshToken',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
    },
  ];
}