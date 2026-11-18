using MediatR;
using MyApp.Core.Interfaces;

namespace MyApp.Application.Commands
{
    public record DeleteCustomerCommand(Guid Id) : IRequest<bool>;

    public class DeleteCustomerCommandHandler(ICustomerRepository customerRepository)
        : IRequestHandler<DeleteCustomerCommand, bool>
    {
        public Task<bool> Handle(DeleteCustomerCommand request, CancellationToken cancellationToken)
        {
            return customerRepository.DeleteCustomerAsyncByID(request.Id, cancellationToken);
        }
    }
}
