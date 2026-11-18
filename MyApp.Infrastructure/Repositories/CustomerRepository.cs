using Microsoft.EntityFrameworkCore;
using MyApp.Core.Entities;
using MyApp.Core.Interfaces;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repository
{
    public class CustomerRepository(AppDbContext dbContext) : ICustomerRepository
    {
        public async Task<IEnumerable<CustomerEntity>> GetCustomerEntitiesAsync(CancellationToken cancellationToken = default)
        {
            return await dbContext.Customers
                .AsNoTracking()
                .OrderBy(c => c.Name)
                .ToListAsync(cancellationToken);
        }

        public async Task<CustomerEntity?> GetCustomerAsyncByID(Guid id, CancellationToken cancellationToken = default)
        {
            return await dbContext.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        }

        public async Task<CustomerEntity> AddCustomerAsyncByID(CustomerEntity content, CancellationToken cancellationToken = default)
        {
            content.Id = Guid.NewGuid();
            await dbContext.Customers.AddAsync(content, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
            return content;
        }

        public async Task<CustomerEntity?> UpdateCustomerAsyncByID(Guid id, CustomerEntity content, CancellationToken cancellationToken = default)
        {
            var customer = await dbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

            if (customer is null)
            {
                return null;
            }

            customer.Name = content.Name;
            customer.Email = content.Email;
            customer.Phone = content.Phone;

            await dbContext.SaveChangesAsync(cancellationToken);
            return customer;
        }

        public async Task<bool> DeleteCustomerAsyncByID(Guid id, CancellationToken cancellationToken = default)
        {
            var affectedRows = await dbContext.Customers
                .Where(c => c.Id == id)
                .ExecuteDeleteAsync(cancellationToken);

            return affectedRows > 0;
        }
    }
}
