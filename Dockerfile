FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY MyApp.Core/MyApp.Core.csproj MyApp.Core/
COPY MyApp.Application/MyApp.Application.csproj MyApp.Application/
COPY MyApp.Infrastructure/MyApp.Infrastructure.csproj MyApp.Infrastructure/
COPY MyApp.Api/MyApp.Api.csproj MyApp.Api/
RUN dotnet restore MyApp.Api/MyApp.Api.csproj

COPY MyApp.Core/ MyApp.Core/
COPY MyApp.Application/ MyApp.Application/
COPY MyApp.Infrastructure/ MyApp.Infrastructure/
COPY MyApp.Api/ MyApp.Api/
RUN dotnet publish MyApp.Api/MyApp.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} dotnet MyApp.Api.dll"]
