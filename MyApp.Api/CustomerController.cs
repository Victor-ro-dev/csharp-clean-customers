using MediatR;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Commands;
using MyApp.Application.DTOs;
using MyApp.Application.Queries;

namespace MyApp.Api;

[ApiController]
[Route("api/[controller]")]
public class CustomerController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CustomerResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllAsync(CancellationToken cancellationToken)
    {
        var customers = await sender.Send(new GetAllCustomersQuery(), cancellationToken);
        return Ok(customers);
    }

    [HttpGet("{id:guid}", Name = "GetCustomerById")]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var customer = await sender.Send(new GetCustomerByIdQuery(id), cancellationToken);
        return customer is null ? NotFound() : Ok(customer);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddCustomerAsync(
        [FromBody] UpsertCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var created = await sender.Send(
            new AddCustomerCommand(request.Name, request.Email, request.Phone),
            cancellationToken);

        return CreatedAtRoute("GetCustomerById", new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateCustomerAsync(
        Guid id,
        [FromBody] UpsertCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await sender.Send(
            new UpdateCustomerCommand(id, request.Name, request.Email, request.Phone),
            cancellationToken);

        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCustomerAsync(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await sender.Send(new DeleteCustomerCommand(id), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
