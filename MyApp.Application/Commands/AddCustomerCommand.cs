using MediatR;
using MyApp.Application.DTOs;
using MyApp.Core.Entities;
using MyApp.Core.Interfaces;

namespace MyApp.Application.Commands
{
    public record AddCustomerCommand(string Name, string Email, string Phone) : IRequest<CustomerResponse>;

    public class AddCustomerCommandHandler(ICustomerRepository customerRepository)
        : IRequestHandler<AddCustomerCommand, CustomerResponse>
    {
        public async Task<CustomerResponse> Handle(AddCustomerCommand request, CancellationToken cancellationToken)
        {
            var entity = new CustomerEntity
            {
                Name = request.Name.Trim(),
                Email = request.Email.Trim(),
                Phone = request.Phone.Trim()
            };

            var created = await customerRepository.AddCustomerAsyncByID(entity, cancellationToken);
            return new CustomerResponse(created.Id, created.Name, created.Email, created.Phone);
        }
    }
}
