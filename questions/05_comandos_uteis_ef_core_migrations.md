# Comandos Úteis do Entity Framework Core (EF Core Migrations)

Este guia reúne os principais comandos para gerenciar migrações e o banco de dados utilizando a ferramenta de linha de comando do EF Core (`dotnet ef`).

> **Nota:** Estes comandos assumem a estrutura do Clean Architecture atual, onde:
>
> - O projeto de infraestrutura (`MyApp.Infrastructure`) contém o `DbContext` e as migrações.
> - O projeto de API (`MyApp.Api`) é o projeto de inicialização (startup) que contém a connection string.

---

## 1. Gerenciamento de Migrações (Migrations)

### Criar uma nova Migration

Gera uma nova migração com base nas alterações feitas nas entidades do EF Core.

```bash
dotnet ef migrations add NomeDaMigration --project MyApp.Infrastructure --startup-project MyApp.Api
```

### Remover a última Migration (Rollback de código)

Remove a última migração gerada (desde que ela ainda não tenha sido aplicada no banco de dados).

```bash
dotnet ef migrations remove --project MyApp.Infrastructure --startup-project MyApp.Api
```

### Listar todas as Migrations existentes

Exibe todas as migrações criadas no projeto.

```bash
dotnet ef migrations list --project MyApp.Infrastructure --startup-project MyApp.Api
```

### Gerar Script SQL a partir das Migrations

Gera um script SQL consolidado contendo os comandos que seriam executados (útil para ambientes de produção ou homologação).

```bash
dotnet ef migrations script --project MyApp.Infrastructure --startup-project MyApp.Api
```

---

## 2. Gerenciamento do Banco de Dados (Database Update)

### Aplicar todas as Migrations pendentes

Cria o banco de dados (caso não exista) e aplica todas as migrações que ainda não foram enviadas para o banco.

```bash
dotnet ef database update --project MyApp.Infrastructure --startup-project MyApp.Api
```

### Reverter para uma Migration específica

Desfaz migrações aplicadas no banco até retornar ao estado de uma migration específica.

```bash
dotnet ef database update NomeDaMigrationAnterior --project MyApp.Infrastructure --startup-project MyApp.Api
```

### Deletar o Banco de Dados

Remove completamente o banco de dados associado à connection string.

```bash
dotnet ef database drop --project MyApp.Infrastructure --startup-project MyApp.Api
```
