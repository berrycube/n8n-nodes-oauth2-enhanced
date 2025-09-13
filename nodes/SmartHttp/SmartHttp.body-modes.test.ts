import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartHttp } from './SmartHttp.node';

vi.mock('n8n-workflow', () => ({
  NodeOperationError: class extends Error {
    constructor(node: any, error: Error | string) {
      super(typeof error === 'string' ? error : error.message);
      this.name = 'NodeOperationError';
    }
  }
}));

describe('SmartHttp Node - Body Modes', () => {
  let smartHttp: SmartHttp;
  let mockFns: any;

  beforeEach(() => {
    smartHttp = new SmartHttp();
    mockFns = {
      getInputData: vi.fn(() => [{ json: {} }]),
      getNodeParameter: vi.fn(),
      getCredentials: vi.fn(),
      getNode: vi.fn(() => ({ name: 'SmartHttp' })),
      continueOnFail: vi.fn(() => false),
      helpers: {
        requestWithAuthentication: vi.fn(),
      },
    };
  });

  it('raw mode builds body and content-type correctly', async () => {
    // Parameter order in execute:
    mockFns.getNodeParameter
      .mockReturnValueOnce('oAuth2ApiEnhanced') // authentication
      .mockReturnValueOnce('POST') // method
      .mockReturnValueOnce('https://api.example.com/raw') // url
      .mockReturnValueOnce({}) // queryParametersUi
      .mockReturnValueOnce({}) // headersUi
      .mockReturnValueOnce('raw') // bodyMode
      .mockReturnValueOnce(undefined) // bodyJson
      .mockReturnValueOnce('text/csv') // rawContentType
      .mockReturnValueOnce('a,b\n1,2') // rawBody
      .mockReturnValueOnce({}) // formFieldsUi
      .mockReturnValueOnce({}) // multipartFieldsUi
      .mockReturnValueOnce(false) // autoRetry
      .mockReturnValueOnce(0); // maxRetries

    mockFns.getCredentials.mockResolvedValueOnce({});
    mockFns.helpers.requestWithAuthentication.mockResolvedValue({ statusCode: 204 });

    await smartHttp.execute.call(mockFns);

    const opts = mockFns.helpers.requestWithAuthentication.mock.calls[0][2];
    expect(opts.method).toBe('POST');
    expect(opts.url).toBe('https://api.example.com/raw');
    expect(opts.headers['Content-Type']).toBe('text/csv');
    expect(opts.body).toBe('a,b\n1,2');
    expect(opts.json).toBeUndefined();
  });

  it('form-url-encoded mode builds form object', async () => {
    mockFns.getNodeParameter
      .mockReturnValueOnce('oAuth2ApiEnhanced')
      .mockReturnValueOnce('POST')
      .mockReturnValueOnce('https://api.example.com/token')
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce('formUrlEncoded')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('text/plain')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({ parameters: [ { name: 'grant_type', value: 'client_credentials' }, { name: 'scope', value: 'read' } ] })
      .mockReturnValueOnce({})
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(0);

    mockFns.getCredentials.mockResolvedValueOnce({});
    mockFns.helpers.requestWithAuthentication.mockResolvedValue({ statusCode: 200 });

    await smartHttp.execute.call(mockFns);
    const opts = mockFns.helpers.requestWithAuthentication.mock.calls[0][2];
    expect(opts.form).toEqual({ grant_type: 'client_credentials', scope: 'read' });
    expect(opts.json).toBeUndefined();
  });

  it('multipart mode builds formData map', async () => {
    mockFns.getNodeParameter
      .mockReturnValueOnce('oAuth2ApiEnhanced')
      .mockReturnValueOnce('POST')
      .mockReturnValueOnce('https://api.example.com/upload')
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce('multipart')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('text/plain')
      .mockReturnValueOnce('')
      .mockReturnValueOnce({})
      .mockReturnValueOnce({ parameter: [ { name: 'field1', value: 'A' }, { name: 'field2', value: 'B' } ] })
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(0);

    mockFns.getCredentials.mockResolvedValueOnce({});
    mockFns.helpers.requestWithAuthentication.mockResolvedValue({ statusCode: 200 });

    await smartHttp.execute.call(mockFns);
    const opts = mockFns.helpers.requestWithAuthentication.mock.calls[0][2];
    expect(opts.formData).toEqual({ field1: 'A', field2: 'B' });
    expect(opts.json).toBeUndefined();
  });
});

