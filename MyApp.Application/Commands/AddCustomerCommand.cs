using MediatR;
using MyApp.Core.Entities;
using MyApp.Core.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace MyApp.Application.Commands
{
    
    public record AddCustomerCommand(CustomerEntity Customer) : IRequest<CustomerEntity>;

    public class AddCustomerCommandHandler(ICustomerRepository customerRepository) : IRequestHandler<AddCustomerCommand, CustomerEntity>
    {
        public async Task<CustomerEntity> Handle(AddCustomerCommand request, CancellationToken cancellationToken)
        {
            return await customerRepository.AddCustomerAsyncByID(request.Customer);
        }
    }
}
