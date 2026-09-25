using System;
using System.Collections.Generic;
using MyApp.Core.Entities;


namespace MyApp.Core.Interfaces
{
   public interface ICustomerRepository
    {
        Task<IEnumerable<CustomerEntity>> GetCustomerEntitiesAsync();
        Task<CustomerEntity> GetCustomerAsyncByID(Guid ID);
    }
}