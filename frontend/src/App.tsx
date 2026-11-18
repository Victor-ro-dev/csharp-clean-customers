import { useCallback, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, Server } from 'lucide-react';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerTable } from './components/CustomerTable';
import { Toast, type ToastMessage } from './components/Toast';
import { useCustomers } from './hooks/useCustomers';
import { useDebounce } from './hooks/useDebounce';
import type { Customer, UpsertCustomerPayload } from './types/customer';

export function App() {
  const {
    customers,
    isLoading,
    isSubmitting,
    error,
    refresh,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((type: ToastMessage['type'], text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term),
    );
  }, [customers, debouncedSearch]);

  const handleOpenCreate = useCallback(() => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  }, []);

  const handleSubmit = useCallback(
    async (payload: UpsertCustomerPayload) => {
      try {
        if (editingCustomer) {
          await updateCustomer(editingCustomer.id, payload);
          showToast('success', 'Customer updated successfully.');
        } else {
          await createCustomer(payload);
          showToast('success', 'Customer created successfully.');
        }
        handleCloseModal();
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Operation failed.');
      }
    },
    [editingCustomer, updateCustomer, createCustomer, showToast, handleCloseModal],
  );

  const handleDelete = useCallback(
    async (customer: Customer) => {
      if (!window.confirm(`Delete customer "${customer.name}"?`)) return;
      try {
        await deleteCustomer(customer.id);
        showToast('success', 'Customer deleted.');
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to delete customer.');
      }
    },
    [deleteCustomer, showToast],
  );

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <div className="eyebrow">
            <Server size={14} />
            <span>Clean Architecture · .NET 10 + MediatR</span>
          </div>
          <h1>Customer Directory</h1>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void refresh()}
            disabled={isLoading || isSubmitting}
            title="Refresh list"
          >
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>New Customer</span>
          </button>
        </div>
      </header>

      <section className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            aria-label="Search customers"
          />
        </div>
        <div className="counter-pill">
          {filteredCustomers.length} {filteredCustomers.length === 1 ? 'record' : 'records'}
        </div>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      <CustomerTable
        customers={filteredCustomers}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        searchTerm={debouncedSearch}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <CustomerFormModal
        isOpen={isModalOpen}
        editingCustomer={editingCustomer}
        isSubmitting={isSubmitting}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />

      <Toast toast={toast} />
    </div>
  );
}

export default App;
