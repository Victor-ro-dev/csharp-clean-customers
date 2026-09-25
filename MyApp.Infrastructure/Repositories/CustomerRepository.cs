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
            return await dbContext.Customers.FirstOrDefaultAsync(query=>query.Id ==
            ID);
        }
    }
}