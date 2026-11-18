using System.ComponentModel.DataAnnotations;

namespace MyApp.Application.DTOs
{
    public record CustomerResponse(Guid Id, string Name, string Email, string Phone);

    public record UpsertCustomerRequest(
        [Required, StringLength(120, MinimumLength = 2)] string Name,
        [Required, EmailAddress, StringLength(180)] string Email,
        [Required, StringLength(30, MinimumLength = 5)] string Phone
    );
}
