# Pergunta: Qual database o update-database utiliza?

## Dúvida do Usuário

O usuário executou o comando `dotnet ef database update` e quis saber em qual banco de dados e servidor a tabela foi criada.

## Resposta e Explicação

O Entity Framework Core determina o banco de dados com base na string de conexão configurada no projeto de inicialização (`MyApp.Api/appsettings.json`), utilizando a chave `DefaultConnection`.

No projeto atual, a string de conexão está configurada para o **SQL Server LocalDB**:

```json
"ConnectionStrings": {
  "DefaultConnection": "Data Source=(localdb)\\MSSQLLocalDB;Integrated Security=True;..."
}
```

Portanto, o banco de dados é criado na instância local do SQL Server (`(localdb)\MSSQLLocalDB`).
