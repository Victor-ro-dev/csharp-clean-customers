using MediatR;
using MyApp.Application.DTOs;
using MyApp.Core.Interfaces;

namespace MyApp.Application.Queries
{
    public record GetAllCustomersQuery : IRequest<IReadOnlyList<CustomerResponse>>;

    public class GetAllCustomersQueryHandler(ICustomerRepository customerRepository)
        : IRequestHandler<GetAllCustomersQuery, IReadOnlyList<CustomerResponse>>
    {
        public async Task<IReadOnlyList<CustomerResponse>> Handle(GetAllCustomersQuery request, CancellationToken cancellationToken)
        {
            var customers = await customerRepository.GetCustomerEntitiesAsync(cancellationToken);
            return customers
                .Select(c => new CustomerResponse(c.Id, c.Name, c.Email, c.Phone))
                .ToList();
        }
    }
}
