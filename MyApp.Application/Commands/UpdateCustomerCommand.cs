using MediatR;
using MyApp.Application.DTOs;
using MyApp.Core.Entities;
using MyApp.Core.Interfaces;

namespace MyApp.Application.Commands
{
    public record UpdateCustomerCommand(Guid Id, string Name, string Email, string Phone) : IRequest<CustomerResponse?>;

    public class UpdateCustomerCommandHandler(ICustomerRepository customerRepository)
        : IRequestHandler<UpdateCustomerCommand, CustomerResponse?>
    {
        public async Task<CustomerResponse?> Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
        {
            var entity = new CustomerEntity
            {
                Name = request.Name.Trim(),
                Email = request.Email.Trim(),
                Phone = request.Phone.Trim()
            };

            var updated = await customerRepository.UpdateCustomerAsyncByID(request.Id, entity, cancellationToken);
            return updated is null
                ? null
                : new CustomerResponse(updated.Id, updated.Name, updated.Email, updated.Phone);
        }
    }
}
