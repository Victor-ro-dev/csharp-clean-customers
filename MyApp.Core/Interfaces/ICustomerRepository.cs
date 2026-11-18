using MyApp.Core.Entities;

namespace MyApp.Core.Interfaces
{
    public interface ICustomerRepository
    {
        Task<IEnumerable<CustomerEntity>> GetCustomerEntitiesAsync(CancellationToken cancellationToken = default);
        Task<CustomerEntity?> GetCustomerAsyncByID(Guid id, CancellationToken cancellationToken = default);
        Task<CustomerEntity> AddCustomerAsyncByID(CustomerEntity content, CancellationToken cancellationToken = default);
        Task<CustomerEntity?> UpdateCustomerAsyncByID(Guid id, CustomerEntity content, CancellationToken cancellationToken = default);
        Task<bool> DeleteCustomerAsyncByID(Guid id, CancellationToken cancellationToken = default);
    }
}
