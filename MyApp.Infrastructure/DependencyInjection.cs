using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MyApp.Core.Interfaces;
using MyApp.Infrastructure.Data;
using MyApp.Infrastructure.Repository;

namespace MyApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureDI(this IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["DatabaseProvider"] ?? "SqlServer";
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<AppDbContext>(options =>
        {
            if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                var sqliteConn = string.IsNullOrWhiteSpace(connectionString)
                    ? "Data Source=customers.db"
                    : connectionString;
                options.UseSqlite(sqliteConn);
            }
            else
            {
                options.UseSqlServer(connectionString);
            }
        });

        services.AddScoped<ICustomerRepository, CustomerRepository>();
        return services;
    }
}
