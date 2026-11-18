using MediatR;
using MyApp.Application.DTOs;
using MyApp.Core.Interfaces;

namespace MyApp.Application.Queries
{
    public record GetCustomerByIdQuery(Guid Id) : IRequest<CustomerResponse?>;

    public class GetCustomerByIdQueryHandler(ICustomerRepository customerRepository)
        : IRequestHandler<GetCustomerByIdQuery, CustomerResponse?>
    {
        public async Task<CustomerResponse?> Handle(GetCustomerByIdQuery request, CancellationToken cancellationToken)
        {
            var customer = await customerRepository.GetCustomerAsyncByID(request.Id, cancellationToken);
            return customer is null
                ? null
                : new CustomerResponse(customer.Id, customer.Name, customer.Email, customer.Phone);
        }
    }
}
