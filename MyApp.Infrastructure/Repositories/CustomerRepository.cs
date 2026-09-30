using System;
using MyApp.Core.Entities;
using MyApp.Core.Interfaces;
using System.Collections.Generic;
using System.Text;
using MyApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MyApp.Infrastructure.Repository
{
    public class CustomerRepository(AppDbContext dbContext)  : ICustomerRepository
    {
        public async Task<IEnumerable<CustomerEntity>> GetCustomerEntitiesAsync()
        {
            return await dbContext.Customers.ToListAsync();
        }

        public async Task<CustomerEntity> GetCustomerAsyncByID(Guid ID)
        {
            return await dbContext.Customers.FirstOrDefaultAsync(query=>query.Id == ID);
        }

        public async Task<CustomerEntity> AddCustomerAsyncByID(CustomerEntity content)
        {
            content.Id = Guid.NewGuid();
            await dbContext.Customers.AddAsync(content);
            await dbContext.SaveChangesAsync();
            return content; 
        }

        public async Task<CustomerEntity>
        UpdateCustomerAsyncByID(Guid ID, CustomerEntity content)
        {
            var customer = await dbContext.Customers.FirstOrDefaultAsync(query=>query.Id == ID);

            if (customer is not null)
            {
                customer.Name = content.Name;
                customer.Email = content.Email;
                customer.Phone = content.Phone;

                await dbContext.SaveChangesAsync();

                return customer;
            }

            return content;
        }

        public async Task<bool> DeleteCustomerAsyncByID(Guid ID)
        {
            var customer = await dbContext.Customers.FirstOrDefaultAsync(query => query.Id == ID);

            if (customer is not null)
            {
                dbContext.Customers.Remove(customer);
                return await dbContext.SaveChangesAsync() > 0;
            }

            return false;
        }
    }
}