# 14: Erro 208 do SQL Server ("Invalid object name"), Migrations do EF Core e Protocolo TDS

---

## 1. O Enredo do Exercício (Cenário e Gargalo Físico Real)

- **Cenário & Volumetria de Negócio:**
  Uma API corporativa em ASP.NET Core (.NET 10) utilizando Entity Framework Core 10 e SQL Server (MSSQLLocalDB). Um cliente HTTP dispara uma requisição `POST /api/Customer` com o payload de um novo cliente. O controller delega a requisição via MediatR para o handler, que invoca `CustomerRepository.AddCustomerAsyncByID` e chama `await dbContext.SaveChangesAsync()`.
- **Onde está a dor física e de engenharia?**
  1. **Falha de Resolução de Metadados no Motor Relacional:** O Entity Framework Core enviou com sucesso um pacote de rede via protocolo **TDS (Tabular Data Stream)** contendo um comando SQL DML:
     ```sql
     INSERT INTO [Customers] ([Id], [Name], [Email], [Phone]) VALUES (@p0, @p1, @p2, @p3);
     ```
     O compilador de consultas do SQL Server (Query Processor) interceptou o comando, verificou a árvore sintática e tentou resolver o símbolo `[Customers]` na tabela de sistema do banco (`sys.objects`). Como o identificador não foi encontrado, o motor abortou a transação e retornou o **Erro 208 do SQL Server**:
     $$\text{SqlException (0x80131904): Invalid object name 'Customers'.}$$
  2. **Dessincronia de Estado (Code vs Database Schema):** A migração `20260928002135_FirstMigration.cs` existia nos arquivos C# do projeto, mas **nunca havia sido aplicada** fisicamente nas páginas de disco do banco de dados relacional.
  3. **Risco Crítico de Configuração (Master Database Leak):** A connection string configurada em C# não declarava `Initial Catalog=` ou `Database=`. Sem isso, o SQL Server direciona todas as conexões para o banco padrão do usuário do Windows, que é o banco de dados do sistema **`master`**.

---

## 2. As Variáveis Físicas (Hardware, OS e Infraestrutura)

| Recurso / Componente | Latência / Métrica Física | Impacto no Ciclo de Persistência |
| :--- | :--- | :--- |
| **Páginas de Dados no Disco (MDF/LDF)** | Blocos de 8 KB agrupados em Extents de 64 KB | A tabela `Customers` não existia alocada fisicamente em nenhuma página de dados do arquivo `.mdf`. |
| **Protocolo de Rede TDS (Porta 1433 / Named Pipe)** | ~0.1 a 1 ms (LocalDB: IPC via Shared Memory / Named Pipe) | Envio do pacote binário contendo a query SQL compilada pelo EF Core. |
| **Query Processor do SQL Server** | ~0.2 a 0.8 ms de CPU | Parse lexico/sintático e consulta na tabela interna de alocação de metadados (`sys.tables`). |
| **Change Tracker no Heap (.NET CLR)** | ~100 a 400 ns por entidade rastreada | Alocação da entrada de rastreamento `EntityEntry` no estado `Added`. |

---

## 3. A "Fórmula" e o Algoritmo (A Matemática do EF Core e do SQL Server)

### 3.1. O Algoritmo de Verificação de Migrações do EF Core

O EF Core mantém o histórico de migrações através de uma relação de conjuntos:

$$\Delta = \mathcal{M}_{\text{código}} \setminus \mathcal{M}_{\text{banco}}$$

Onde:
- $\mathcal{M}_{\text{código}}$: Conjunto de migrações compiladas no assembly da aplicação (`AppDbContextModelSnapshot`).
- $\mathcal{M}_{\text{banco}}$: Conjunto de registros lidos da tabela `__EFMigrationsHistory` no banco de dados.

Se:
$$|\Delta| > 0$$
O banco de dados está em **estado obsoleto (Schema Drift)**. Qualquer tentativa de executar comandos DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) em entidades contidas em $\Delta$ gerará o erro de execução:

$$\text{Error 208: } \text{OBJECT\_ID}(N'\text{Customers}') \text{ IS NULL}$$

---

## 4. Primitivas de Baixo Nível + Sintaxe da Linguagem + Design Patterns

### 4.1. A Primitiva de Baixo Nível: O Protocolo TDS e o Erro 208

Quando o EF Core executa `SaveChangesAsync()`, ele não "executa C# no banco". Ele:
1. Traduz o grafo do Change Tracker em comandos T-SQL com parâmetros tipados.
2. Abre uma conexão através do driver `Microsoft.Data.SqlClient`.
3. Envia os bytes através de um **Named Pipe** (`\\.\pipe\LOCALDB#...`) ou **TCP Socket** (porta 1433) em formato de mensagens **TDS (Tabular Data Stream)**.
4. O SQL Server recebe o pacote TDS do tipo `TDS_SQL_BATCH`.
5. Durante a fase de **Binding / Alch (Algebrizer)**, o SQL Server busca `OBJECT_ID('Customers', 'U')`.
6. Como o ID retornado é nulo, o SQL Server gera uma resposta de erro no protocolo TDS:
   - **Number:** `208`
   - **Severity:** `16` (Erro de usuário/programação)
   - **State:** `1`
   - **Message:** `"Invalid object name 'Customers'."`
7. O driver `Microsoft.Data.SqlClient` transforma os bytes da resposta em uma `SqlException`, que o EF Core encapsula na `DbUpdateException`.

### 4.2. O Padrão de Projeto: Migrations as Code

O padrão *Database Migrations* trata o esquema do banco de dados como código versionado linear.
A migração [FirstMigration.cs](file:///c:/Users/xvine/Desktop/C%23_CLEAN/MyApp.Infrastructure/Migrations/20260928002135_FirstMigration.cs) contém o DDL necessário:
```csharp
migrationBuilder.CreateTable(
    name: "Customers",
    columns: table => new
    {
        Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
        Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
        Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
        Phone = table.Column<string>(type: "nvarchar(max)", nullable: false)
    },
    constraints: table =>
    {
        table.PrimaryKey("PK_Customers", x => x.Id);
    });
```
Enquanto o comando `dotnet ef database update` não for executado, esse código C# é apenas texto estático e nunca foi transformado nas páginas de alocação do SQL Server.

### 4.3. Correção de Baixo Nível no Repositório (`Add` vs `AddAsync`)

No arquivo [CustomerRepository.cs](file:///c:/Users/xvine/Desktop/C%23_CLEAN/MyApp.Infrastructure/Repositories/CustomerRepository.cs#L26), o método `AddAsync` estava sendo chamado **sem o operador `await`**:
```csharp
// Incorreto (Disparava warning CS4014 e execução desordenada)
dbContext.Customers.AddAsync(content);
await dbContext.SaveChangesAsync();
```

> **Primeiro Princípio do EF Core:** O método `Add` do EF Core é uma operação puramente em memória (adiciona a entidade ao `ChangeTracker` e gera o estado `EntityState.Added`). O método `AddAsync` só existe para cenários especiais onde o gerador de chaves primárias acessa o banco assincronamente (ex: Hi/Lo sequences). No caso de `Guid`, deve-se usar `await AddAsync(...)` ou diretamente o método síncrono `Add(...)`:

```csharp
// Corrigido determinístico:
content.Id = Guid.NewGuid();
await dbContext.Customers.AddAsync(content);
await dbContext.SaveChangesAsync();
```

---

## 5. Segurança Defensiva, Primitivas Criptográficas & OWASP

### 5.1. OWASP A05:2021 – Security Misconfiguration (Banco `master` e Privilégios Excessivos)

No arquivo [DependencyInjection.cs](file:///c:/Users/xvine/Desktop/C%23_CLEAN/MyApp.Infrastructure/DependencyInjection.cs#L15), a connection string estava gravada no código sem catálogo:
```text
Data Source=(localdb)\MSSQLLocalDB;Integrated Security=True;...
```
1. **Perigo de Escrita no Banco `master`:** Sem a instrução `Initial Catalog=NomeDoBanco;`, a aplicação cria tabelas e grava registros diretamente na base `master` do SQL Server. A base `master` armazena metadados do servidor, logins e configurações globais da instância. Corromper ou sobrecarregar a `master` derruba a instância inteira.
2. **Princípio do Menor Privilégio (PoLP):**
   - Em produção, a aplicação web **nunca** deve rodar com permissões DDL (`CREATE TABLE`, `DROP TABLE`).
   - O usuário da aplicação deve possuir apenas papéis DML (`db_datareader`, `db_datawriter`).
   - As migrações devem ser aplicadas através de pipelines CI/CD com credenciais administrativas dedicadas e isoladas.

---

## 6. Mapeamento de Possibilidades e Trade-offs (Matriz de Decisão)

| Estratégia de Atualização de Banco | Impacto em Inicialização & I/O | Risco em Ambiente de Produção | Confiabilidade de Concorrência | Veredito de Engenharia |
| :--- | :--- | :--- | :--- | :--- |
| **1. Não Rodar o Update (Causa do Erro)** | Zero I/O até a 1ª requisição. | ❌ Falha catastrófica em runtime (`SqlException 208`). | N/A | ❌ **Erro de Operação.** |
| **2. `app.Database.Migrate()` no Startup** | Aumenta o cold-start do servidor web; bloqueia a inicialização. | ⚠️ Alto risco em réplicas múltiplas (race conditions, deadlocks em `__EFMigrationsLock`). | ⚠️ Perigoso em clusters Kubernetes/Docker. | ⚠️ **Aceitável apenas em dev local.** |
| **3. `dotnet ef database update` via CLI** | Executado pontualmente fora do processo da aplicação web. | ✅ Baixo; controlado manualmente pelo desenvolvedor. | ✅ Excelente para desenvolvimento local. | ✅ **Recomendado para Dev.** |
| **4. Idempotent SQL Script (`dotnet ef migrations script -i`)** | Zero overhead de runtime da API; executado pelo DBA ou pipeline CI/CD. | 🔒 Mínimo risco; validação prévia de transações e rollback. | 🛡️ Máxima segurança em ambientes de produção corporativos. | 🚀 **Padrão de Ouro para Produção.** |

---

## Resumo da Solução Aplicada

1. Executamos o comando de migração:
   ```bash
   dotnet ef database update --project MyApp.Infrastructure --startup-project MyApp.Api
   ```
   Ele adquiriu o lock exclusivo de migração, criou a tabela `[Customers]` e registrou a versão na tabela `[__EFMigrationsHistory]`.
2. Corrigimos o [CustomerRepository.cs](file:///c:/Users/xvine/Desktop/C%23_CLEAN/MyApp.Infrastructure/Repositories/CustomerRepository.cs#L26) adicionando o `await` que faltava na chamada `dbContext.Customers.AddAsync(content)`.
