import { useCallback, useEffect, useRef, useState } from 'react';
import { customerService } from '../services/customerService';
import type { Customer, UpsertCustomerPayload } from '../types/customer';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeFetchRef = useRef<AbortController | null>(null);

  const fetchCustomers = useCallback(async () => {
    activeFetchRef.current?.abort();
    const controller = new AbortController();
    activeFetchRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const data = await customerService.getAll(controller.signal);
      setCustomers(data);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchCustomers();
    return () => activeFetchRef.current?.abort();
  }, [fetchCustomers]);

  const createCustomer = useCallback(async (payload: UpsertCustomerPayload): Promise<Customer> => {
    setIsSubmitting(true);
    try {
      const created = await customerService.create(payload);
      setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, payload: UpsertCustomerPayload): Promise<Customer> => {
    setIsSubmitting(true);
    try {
      const updated = await customerService.update(id, payload);
      setCustomers((prev) =>
        prev
          .map((item) => (item.id === id ? updated : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      return updated;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      await customerService.remove(id);
      setCustomers((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    customers,
    isLoading,
    isSubmitting,
    error,
    refresh: fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
