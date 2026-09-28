using System;
using System.Collections.Generic;
using MyApp.Core.Entities;


namespace MyApp.Core.Interfaces
{
   public interface ICustomerRepository
    {
        Task<IEnumerable<CustomerEntity>> GetCustomerEntitiesAsync();
        Task<CustomerEntity> GetCustomerAsyncByID(Guid ID);

        Task<CustomerEntity> AddCustomerAsyncByID(CustomerEntity content);

        Task<CustomerEntity> UpdateCustomerAsyncByID(Guid ID, CustomerEntity content);

        Task<bool> DeleteCustomerAsyncByID(Guid ID);
    }
}