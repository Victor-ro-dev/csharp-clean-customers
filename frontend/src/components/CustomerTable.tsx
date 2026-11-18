import { memo } from 'react';
import { Pencil, Trash2, Users } from 'lucide-react';
import type { Customer } from '../types/customer';

interface CustomerRowProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  disabled: boolean;
}

const CustomerRow = memo(function CustomerRow({
  customer,
  onEdit,
  onDelete,
  disabled,
}: CustomerRowProps) {
  return (
    <tr>
      <td>
        <div className="customer-name">
          <span className="avatar" aria-hidden="true">
            {customer.name.charAt(0).toUpperCase()}
          </span>
          <span>{customer.name}</span>
        </div>
      </td>
      <td className="muted">{customer.email}</td>
      <td className="mono">{customer.phone}</td>
      <td className="actions-col">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onEdit(customer)}
          disabled={disabled}
          aria-label={`Edit ${customer.name}`}
          title="Edit customer"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={() => onDelete(customer)}
          disabled={disabled}
          aria-label={`Delete ${customer.name}`}
          title="Delete customer"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
});

interface CustomerTableProps {
  customers: Customer[];
  isLoading: boolean;
  isSubmitting: boolean;
  searchTerm: string;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomerTable({
  customers,
  isLoading,
  isSubmitting,
  searchTerm,
  onEdit,
  onDelete,
}: CustomerTableProps) {
  if (isLoading) {
    return (
      <div className="panel table-skeleton" aria-busy="true" aria-label="Loading customers">
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="skeleton-row" />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="panel empty-state">
        <Users size={36} strokeWidth={1.5} />
        <h3>{searchTerm ? 'No matching customers' : 'No customers yet'}</h3>
        <p>
          {searchTerm
            ? 'Try adjusting your search query.'
            : 'Click "New Customer" to register your first record.'}
        </p>
      </div>
    );
  }

  return (
    <div className="panel table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              onEdit={onEdit}
              onDelete={onDelete}
              disabled={isSubmitting}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
