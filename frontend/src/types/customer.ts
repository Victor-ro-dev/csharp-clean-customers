export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface UpsertCustomerPayload {
  name: string;
  email: string;
  phone: string;
}

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}
