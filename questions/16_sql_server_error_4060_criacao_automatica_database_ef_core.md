# 16: Erro 4060 do SQL Server ("Cannot open database"), Por Que o Banco Não Se Cria Sozinho e o Ciclo do EF Core

---

## 1. O Enredo do Exercício (Cenário e Gargalo Físico Real)

- **Cenário & Volumetria de Negócio:**
  A API ASP.NET Core (.NET 10) teve sua configuração atualizada para ler a connection string do `appsettings.json`, apontando para `Initial Catalog=Customers`. Ao rodar `dotnet run` e enviar uma requisição, o desenvolvedor é surpreendido pela exceção:
  ```text
  Microsoft.Data.SqlClient.SqlException (0x80131904): Cannot open database "Customers" requested by the login. The login failed.
  Login failed for user 'VTXNOTE\xvine'.
  ```
- **Onde está a dor física e de engenharia?**
  1. **A Falha de Autenticação/Handshake (Erro 4060):** Durante a fase de login do protocolo TDS (*Tabular Data Stream*), o cliente solicita conectar-se ao banco `"Customers"`. O motor do SQL Server verifica seu catálogo mestre de bancos (`sys.databases`). Como o banco não existe nas páginas de disco, a engine encerra o socket imediatamente com erro fatal de login.
  2. **O Mito do "Banco se Cria Sozinho":** No Entity Framework Core, o comando `dotnet run` **nunca cria o banco de dados automaticamente**. Por design de arquitetura resiliente, o runtime da aplicação web é isolado de operações DDL (*Data Definition Language*) para evitar race conditions e corrupção de catálogo em ambientes multi-instância (ex: Kubernetes, auto-scaling na nuvem).
  3. **Alocação Física de Arquivos no Sistema Operacional:** Criar um banco de dados relacional (`CREATE DATABASE`) não é criar um objeto em memória C#; envolve syscalls pesadas no kernel do Windows para alocar arquivos `.mdf` (dados) e `.ldf` (transaction log) no disco.

---

## 2. As Variáveis Físicas (Hardware, OS e Infraestrutura)

| Recurso / Operação | Métrica Física / Latência | O que o Sistema Operacional e o SQL Server Realizam |
| :--- | :--- | :--- |
| **Pacote TDS `LOGIN7` (Socket TCP / IPC)** | ~0.5 a 2 ms | O cliente envia o pacote de autenticação com o campo `IBD_DATABASE = "Customers"`. |
| **Syscalls de Criação de Arquivo (`CreateFileW`)** | ~100 a 400 ms | O SQL Server instrui o kernel a alocar os arquivos físicos `Customers.mdf` e `Customers_log.ldf`. |
| **Instant File Initialization (IFI)** | Zera overhead de escrita | Se habilitado no Windows (`SE_MANAGE_VOLUME_NAME`), o SQL Server aloca o arquivo sem preencher bytes com zeros. |
| **Pool de Conexões (ADO.NET)** | ~0.05 ms (em cache) | Ao receber o erro 4060, o pool destrói a conexão defeituosa e propaga o erro de falha transitória/permanente. |

---

## 3. A "Fórmula" e o Algoritmo (O Handshake TDS e o Erro 4060)

### 3.1. O Algoritmo de Handshake do TDS (Tabular Data Stream)

$$\text{Aplicação (.NET)} \xrightarrow{\text{PRELOGIN}} \text{SQL Server (Negociação TLS)}$$
$$\text{Aplicação (.NET)} \xrightarrow{\text{LOGIN7}(\text{User} = \text{"xvine"}, \text{Catalog} = \text{"Customers"})} \text{SQL Server}$$

Na engine interna do SQL Server:
$$\text{DB\_ID} = \text{LookupDatabase}(\text{"Customers"})$$
$$\text{Se } \text{DB\_ID} == \text{NULL} \implies \text{Retornar Token TDS: ERROR (Number = 4060, Severity = 16, State = 1)}$$

O SQL Server não "espera" a query ser executada; ele **rejeita a conexão na porta de entrada**.

---

## 4. Primitivas de Baixo Nível + Sintaxe da Linguagem + Design Patterns

### 4.1. Por Que o EF Core NÃO Cria o Banco Sozinho no `dotnet run`?

Se o EF Core tentasse criar bancos e tabelas silenciosamente a cada `dotnet run`:
1. **Race Conditions Críticas:** Se você subir 4 instâncias da sua API em contêineres Docker simultâneos, as 4 tentariam rodar `CREATE TABLE` ao mesmo tempo, gerando deadlocks no catálogo de metadados do SQL Server.
2. **Violação do Princípio do Menor Privilégio:** Uma aplicação em produção só deve ter permissões DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Para criar um banco, o usuário precisaria da role de servidor `dbcreator` ou `sysadmin`, o que seria uma brecha de segurança gravíssima.

### 4.2. Como o Banco É Criado: As Abordagens Oficiais

#### Abordagem 1: Via CLI com Migrations (Padrão de Mercado)
Executa a migração antes de subir o servidor:
```bash
dotnet ef database update --project MyApp.Infrastructure --startup-project MyApp.Api
```
O comando:
1. Detecta que o banco `Customers` não existe.
2. Executa `CREATE DATABASE [Customers];`.
3. Executa `ALTER DATABASE [Customers] SET READ_COMMITTED_SNAPSHOT ON;`.
4. Adquire o lock exclusivo `__EFMigrationsLock` via `sp_getapplock`.
5. Cria a tabela `Customers` e a tabela de histórico `__EFMigrationsHistory`.

#### Abordagem 2: Automático no Startup (Apenas para Desenvolvimento Local)
Se você deseja que o banco seja criado automaticamente ao iniciar a aplicação localmente, adiciona-se o método `Database.Migrate()` condicionado ao ambiente de desenvolvimento no [Program.cs](file:///c:/Users/xvine/Desktop/C%23_CLEAN/MyApp.Api/Program.cs):

```csharp
// Program.cs
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // Cria um escopo temporário para resolver o DbContext
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    
    // Aplica automaticamente migrations pendentes e cria o banco se não existir
    dbContext.Database.Migrate();

    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();
}
```

> **Atenção:** Nunca use `Database.EnsureCreated()` se você utiliza Migrations! O `EnsureCreated()` cria as tabelas ignorando o mecanismo de migrations e não gera o `__EFMigrationsHistory`, travando qualquer `dotnet ef migrations add` futuro.

---

## 5. Segurança Defensiva, Primitivas Criptográficas & OWASP

### 5.1. OWASP A05:2021 – Security Misconfiguration & Princípio do Menor Privilégio (PoLP)

- **Em Desenvolvimento:** O usuário local do Windows (`VTXNOTE\xvine`) possui privilégios de administrador no LocalDB, permitindo criar e apagar bancos livremente.
- **Em Produção:**
  - O runtime da API deve rodar com uma credencial que **não possui permissão DDL**.
  - As migrações devem ser executadas exclusivamente por uma pipeline de CI/CD (ex: GitHub Actions, Azure DevOps) que possui uma credencial de deploy temporária ou executa scripts SQL idempotentes gerados via:
    ```bash
    dotnet ef migrations script --idempotent --output migrate.sql
    ```

---

## 6. Mapeamento de Possibilidades e Trade-offs (Matriz de Decisão)

| Abordagem | Impacto no Cold-Start da API | Risco de Concorrência / Deadlock | Compatibilidade com CI/CD | Veredito de Engenharia |
| :--- | :--- | :--- | :--- | :--- |
| **1. Esperar criação automática sem comandos (Causa do Erro)** | Zero I/O até a 1ª requisição. | ❌ Falha imediata (`SqlException 4060`). | N/A | ❌ **Comportamento inválido.** |
| **2. `dotnet ef database update` via CLI** | **Zero overhead** no cold-start da API. | ✅ Zero risco (execução serializada pré-deploy). | ✅ Excelente para desenvolvimento e testes locais. | ✅ **Recomendado para Dev.** |
| **3. `dbContext.Database.Migrate()` no Startup** | Aumenta o tempo de subida em ~200-500 ms. | ⚠️ Risco de deadlocks se houver múltiplas réplicas do container. | ⚠️ Desaconselhado para clusters Kubernetes. | ⚠️ **Útil apenas para desenvolvimento solo.** |
| **4. Scripts SQL Idempotentes (`--idempotent`)** | **Zero overhead**. | 🛡️ Controle transacional auditável por DBAs. | 🚀 Padrão da indústria para ambientes de produção. | 🔒 **Padrão Corporativo.** |

---

## Resumo da Ação Executada

Acabamos de rodar o comando:
```bash
dotnet ef database update --project MyApp.Infrastructure --startup-project MyApp.Api
```
O SQL Server executou:
1. `CREATE DATABASE [Customers];`
2. `CREATE TABLE [Customers] (...)`
3. Registrou `FirstMigration` no `__EFMigrationsHistory`.

O banco de dados físico e todas as suas tabelas agora existem na instância do SQL Server!
