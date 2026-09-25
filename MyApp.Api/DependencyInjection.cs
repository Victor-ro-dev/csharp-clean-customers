using Microsoft.Extensions.DependencyInjection;
using MyApp.Application;
using MyApp.Infrastructure;

namespace MyApp.Api;

public static class DependencyInjection
{
    public static IServiceCollection AddApiDI(this IServiceCollection services)
    {

        services.AddApplicationDI().AddInfrastructureDI();
        return services;
    }
}

