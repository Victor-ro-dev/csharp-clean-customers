import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Customer, UpsertCustomerPayload } from '../types/customer';

interface CustomerFormModalProps {
  isOpen: boolean;
  editingCustomer: Customer | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: UpsertCustomerPayload) => Promise<void>;
}

const INITIAL_FORM: UpsertCustomerPayload = { name: '', email: '', phone: '' };

export function CustomerFormModal({
  isOpen,
  editingCustomer,
  isSubmitting,
  onClose,
  onSubmit,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<UpsertCustomerPayload>(INITIAL_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    setForm(
      editingCustomer
        ? {
            name: editingCustomer.name,
            email: editingCustomer.email,
            phone: editingCustomer.phone,
          }
        : INITIAL_FORM,
    );
  }, [isOpen, editingCustomer]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed: UpsertCustomerPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };

    if (trimmed.name.length < 2) {
      setValidationError('Name must be at least 2 characters.');
      return;
    }
    if (!trimmed.email.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (trimmed.phone.length < 5) {
      setValidationError('Phone must be at least 5 characters.');
      return;
    }

    setValidationError(null);
    await onSubmit(trimmed);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <h2 id="modal-title">{editingCustomer ? 'Edit Customer' : 'New Customer'}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          {validationError && <div className="form-error">{validationError}</div>}

          <label>
            <span>Full Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Ada Lovelace"
              autoFocus
              required
            />
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="ada@example.com"
              required
            />
          </label>

          <label>
            <span>Phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+55 15 99999-0000"
              required
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
