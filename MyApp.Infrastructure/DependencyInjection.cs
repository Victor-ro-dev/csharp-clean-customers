using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureDI(this IServiceCollection services)
    {   
        services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(@"Data Source=(localdb)\MSSQLLocalDB;Integrated Security=True;Persist Security Info=False;Pooling=False;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Application Name=""SQL Server Management Studio"";Command Timeout=0");
});
        return services;
    }
}

