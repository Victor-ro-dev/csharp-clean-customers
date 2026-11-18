import { httpRequest } from './httpClient';
import type { Customer, UpsertCustomerPayload } from '../types/customer';

const RESOURCE = '/api/customer';

export const customerService = {
  getAll: (signal?: AbortSignal): Promise<Customer[]> =>
    httpRequest<Customer[]>(RESOURCE, { method: 'GET', signal }),

  getById: (id: string, signal?: AbortSignal): Promise<Customer> =>
    httpRequest<Customer>(`${RESOURCE}/${id}`, { method: 'GET', signal }),

  create: (payload: UpsertCustomerPayload, signal?: AbortSignal): Promise<Customer> =>
    httpRequest<Customer>(RESOURCE, { method: 'POST', body: payload, signal }),

  update: (id: string, payload: UpsertCustomerPayload, signal?: AbortSignal): Promise<Customer> =>
    httpRequest<Customer>(`${RESOURCE}/${id}`, { method: 'PUT', body: payload, signal }),

  remove: (id: string, signal?: AbortSignal): Promise<void> =>
    httpRequest<void>(`${RESOURCE}/${id}`, { method: 'DELETE', signal }),
};
