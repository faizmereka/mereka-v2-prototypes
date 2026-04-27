import type { TestSchema } from '../shared';

export interface ApiContract {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  request: RequestContract;
  response: ResponseContract;
  errorCases: ErrorCaseContract[];
}

export interface RequestContract {
  headers?: Record<string, string>;
  body?: TestSchema;
  query?: Record<string, string>;
  pathParams?: Record<string, string>;
}

export interface ResponseContract {
  success: {
    status: number;
    schema: TestSchema;
  };
  errors: ErrorResponseContract[];
}

export interface ErrorResponseContract {
  status: number;
  code: string;
  message: string;
}

export interface ErrorCaseContract {
  name: string;
  status: number;
  requestOverride?: Partial<RequestContract>;
  expected: ErrorResponseContract;
}
