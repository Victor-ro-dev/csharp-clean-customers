using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using MediatR;
using MyApp.Application.Commands;
using MyApp.Core.Entities;

namespace MyApp.Api{

[ApiController]
[Route("api/[controller]")]
public class CustomerController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> AddCustomerAsync(
            [FromBody] CustomerEntity customer)
        {
            var result = await sender.Send(new AddCustomerCommand(customer));
            return Ok(result);
        }
}
}