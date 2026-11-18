# Pergunta: Como configurar a Connection String para criar um banco de dados específico?

## Dúvida do Usuário

O usuário perguntou se precisava criar o banco de dados manualmente ou se a connection string criava sozinha, e em seguida quis saber como organizar a connection string para que o banco seja criado com um nome específico (ex: `Customers`).

## Resposta e Explicação

Não é necessário criar o banco de dados manualmente. O Entity Framework Core cria o banco automaticamente ao executar o comando de migração (`dotnet ef database update`).

Para definir um nome específico para o banco de dados gerado, basta adicionar o parâmetro `Initial Catalog=NomeDoBanco` (ou `Database=NomeDoBanco`) na string de conexão dentro do `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=(localdb)\\MSSQLLocalDB;Initial Catalog=Customers;Integrated Security=True;Encrypt=True;TrustServerCertificate=True;"
  }
}
```
