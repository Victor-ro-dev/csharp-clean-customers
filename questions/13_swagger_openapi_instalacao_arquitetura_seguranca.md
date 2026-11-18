# 13: Swagger / OpenAPI no ASP.NET Core: Arquitetura, Reflection, Pipeline e Segurança

---

## 1. O Enredo do Exercício (Cenário e Gargalo Físico Real)

- **Cenário & Volumetria de Negócio:**
  Uma API empresarial em ASP.NET Core (.NET 10) sob Clean Architecture e CQRS, expondo endpoints de negócio (ex: `POST /api/Customer`) para equipes de frontend, mobile e parceiros integradores. A equipe precisa de documentação interativa com Swagger UI para testes manuais e geração de clientes de API (OpenAPI Specification - OAS 3.0/3.1).
- **Onde está a dor física e de engenharia?**
  1. **CPU & Latência de Inicialização (Reflection Overhead):** Na inicialização do servidor (cold start), a geração tradicional do documento OpenAPI percorre via Reflection (`System.Reflection`) todos os Controllers, Actions, Tipos de Retorno e Atributos. Em APIs com centenas de endpoints, isso pode custar dezenas de megabytes no Heap e centenas de milissegundos de CPU pura na primeira chamada.
  2. **Pipeline HTTP & Middleware Sincronizado:** O Swagger UI injeta recursos estáticos (HTML, CSS, JavaScript empacotados no assembly) no pipeline HTTP (`app.UseSwaggerUI()`). Sem a correta ordenação no pipeline de Middlewares (Chain of Responsibility), requisições para a interface gráfica podem bypassar autenticação ou colidir com roteamento de controllers.
  3. **Roteamento Fantasma (Gargalo de Configuração):** Criar classes herdando de `ControllerBase` com atributos `[ApiController]` não é suficiente se o motor de rotas MVC não registrar os controllers (`AddControllers()` no DI e `MapControllers()` no pipeline). O Swagger não encontrará nenhum endpoint, e chamadas HTTP externas resultarão em `404 Not Found`.

---

## 2. As Variáveis Físicas (Hardware, OS e Infraestrutura)

| Recurso / Componente | Latência / Métrica Física | Impacto no Runtime e no Swagger |
| :--- | :--- | :--- |
| **CPU (Reflection & Metadata Scanning)** | ~50 a 300 ms de clock na 1ª requisição | Inspeção de `MethodInfo`, atributos e schemas de tipos em tempo de execução via `Type.GetProperties()`. |
| **RAM (Heap / Gen 1 & Gen 2)** | ~5 MB a 50 MB alocados | Geração da árvore de nós da especificação OpenAPI (`OpenApiDocument`) e cache de serialização JSON. |
| **Banda de Rede & Serialização JSON** | ~50 KB a 5 MB por documento | Transferência do arquivo `swagger.json` ou `/openapi/v1.json` para o navegador do cliente. |
| **Page Cache / Socket I/O** | ~10 a 50 µs via IOCP | Streaming dos assets estáticos embutidos (HTML/JS do Swagger UI) direto para o socket TCP da requisição. |

---

## 3. A "Fórmula" e o Algoritmo (A Matemática e Complexidade da Geração de Schema)

### 3.1. Complexidade Assintótica de Varredura de Metadados

A geração do documento OpenAPI comporta-se como uma travessia em grafo direcionado acíclico (DAG) de dependências de tipos:

$$\mathcal{O}(E \times P \times D)$$

Onde:
- $E$: Quantidade de Endpoints / Actions mapeadas na API.
- $P$: Média de parâmetros e propriedades por DTO/Entidade.
- $D$: Profundidade de recursão de propriedades aninhadas no grafo de objetos.

O algoritmo executa detecção de ciclos para evitar loops infinitos em entidades com relacionamentos bidirecionais (ex: `Customer.Orders` $\leftrightarrow$ `Order.Customer`).

### 3.2. Serialização em Buffer Contíguo (System.Text.Json)

O documento final em memória é serializado via `Utf8JsonWriter` diretamente para buffers de `ArrayPool<byte>`, minimizando pressão no Garbage Collector (Gen 0/1):

$$\text{Taxa de Alocação} \approx 0 \quad (\text{após o warmup da primeira requisição com cache ativado})$$

---

## 4. Primitivas de Baixo Nível + Sintaxe da Linguagem + Design Patterns

### 4.1. Como o Swagger Funciona por Baixo dos Panos

1. **`Swashbuckle.AspNetCore.SwaggerGen`:** Utiliza `ApiExplorer` nativo do ASP.NET Core (`IApiDescriptionGroupCollectionProvider`) para extrair rotas, métodos HTTP e tipos de entrada/saída.
2. **`Swashbuckle.AspNetCore.Swagger`:** Registra um middleware que intercepta requisições no path `/swagger/v1/swagger.json` e serializa o objeto `OpenApiDocument` compilado em memória.
3. **`Swashbuckle.AspNetCore.SwaggerUI`:** Middleware que intercepta a rota `/swagger` e devolve um Single Page Application (SPA) em HTML5/JavaScript embutido como `Embedded Resource` na DLL.

### 4.2. A Mudança do .NET 9 e .NET 10

No .NET moderno (.NET 9 e 10), a Microsoft introduziu a biblioteca oficial:
```xml
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.x" />
```
Ela gera o JSON nativo do OpenAPI na rota `/openapi/v1.json` via `app.MapOpenApi()`. Para ter a interface gráfica interativa clássica, utiliza-se o pacote `Swashbuckle.AspNetCore` configurado para expor a UI.

### 4.3. Passo a Passo Completo de Instalação e Configuração

#### 1. Instalar o Pacote no Projeto API
No terminal, dentro do diretório do projeto `MyApp.Api`:
```bash
dotnet add package Swashbuckle.AspNetCore
```

#### 2. Configurar o `Program.cs`
O pipeline precisa registrar os serviços de Controller, ApiExplorer, SwaggerGen e os Middlewares de execução:

```csharp
using MyApp.Api;
using MyApp.Application;
using MyApp.Core;
using MyApp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// 1. Registra os Controllers no container de DI (Essencial para o Swagger enxergar as rotas!)
builder.Services.AddControllers();

// 2. Registra o mecanismo de reflexão e o gerador do Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Suporte nativo OpenAPI do .NET 9/10
builder.Services.AddOpenApi();

// Camadas da Clean Architecture
builder.Services
    .AddCoreDI()
    .AddApplicationDI()
    .AddInfrastructureDI()
    .AddApiDI();

var app = builder.Build();

// 3. Configura o pipeline de Middlewares (Apenas em ambiente de Desenvolvimento)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(); // Disponibiliza a interface em /swagger
    app.MapOpenApi();   // Disponibiliza o JSON em /openapi/v1.json
}

app.UseHttpsRedirection();

// 4. Mapeia as rotas dos controllers no pipeline de execução HTTP
app.MapControllers();

app.Run();
```

#### 3. Atenção Crítica ao MediatR na Clean Architecture
Ao registrar o MediatR com Primary Constructors no `DependencyInjection.cs`:
```csharp
// MyApp.Api/DependencyInjection.cs
services.AddMediatR(cfg => cfg.RegisterServicesFromAssemblies(
    Assembly.GetExecutingAssembly(),
    typeof(MyApp.Application.DependencyInjection).Assembly)); // OBRIGATÓRIO para achar Handlers na Application!
```
Se registrar apenas `Assembly.GetExecutingAssembly()`, o MediatR registrará apenas a DLL da API e lançará `InvalidOperationException: Handler was not found` quando o Controller invocar `sender.Send(new AddCustomerCommand(...))`.

---

## 5. Segurança Defensiva, Primitivas Criptográficas & OWASP

### 5.1. OWASP API9:2023 – Improper Inventory Management & Information Disclosure

Deixar o Swagger UI habilitado publicamente em **Produção** é uma das vulnerabilidades mais comuns em APIs modernas:
- **Vetores de Exploração:**
  - Enumeração completa de rotas internas, endpoints de debug e rotas administrativas (`/api/admin/...`).
  - Vazamento de modelos de entidades, tipos de parâmetros e validações esperadas.
  - Aceleração de ataques de força bruta e injeção (SQLi, NoSQLi, Command Injection).
- **Diretriz de Defesa:**
  O Swagger deve ser delimitado estritamente à condição:
  ```csharp
  if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
  {
      app.UseSwagger();
      app.UseSwaggerUI();
  }
  ```
  Se a documentação precisar ser acessada em produção por parceiros, ela **deve** ser protegida por autenticação (mTLS, Basic Auth em middleware dedicado, ou VPN/IP Whitelisting).

### 5.2. OWASP API2:2023 – Broken Authentication (Configurando JWT no Swagger)

Para testar endpoints protegidos diretamente pelo Swagger com Bearer Token JWT, configura-se o SwaggerGen com as definições de segurança:

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Insira o token JWT gerado no formato: Bearer {seu_token}"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
```

---

## 6. Mapeamento de Possibilidades e Trade-offs (Matriz de Decisão)

| Abordagem | Impacto em Inicialização & CPU | Experiência de Uso / UI | Padrão e Suporte | Veredito de Engenharia |
| :--- | :--- | :--- | :--- | :--- |
| **Opção A: Swashbuckle Completo (`UseSwagger` + `UseSwaggerUI`)** | ~100-200 ms no warmup via Reflection em runtime. | UI clássica consolidada no mercado, testada por ferramentas externas. | Pacote mantido pela comunidade (versão 10+ adaptada para .NET moderno). | ✅ **Recomendado para ecossistema corporativo atual.** |
| **Opção B: Microsoft.AspNetCore.OpenApi + Scalar** | Leve e otimizado para Minimal APIs e .NET 9/10 nativo. | Interface moderna e fluida (`MapScalarApiReference`). | Padrão emergente oficial da Microsoft para o novo ecossistema. | ✅ **Excelente alternativa moderna para novas APIs.** |
| **Opção C: Geração de OpenAPI em Tempo de Build (AOT/Static)** | **Zero overhead de CPU em runtime** ($\mathcal{O}(1)$ streaming estático). | Documento gerado estaticamente via MSBuild task. | Ideal para Native AOT e contêineres Serverless com cold start crítico. | 🚀 **Ideal para microsserviços Native AOT.** |
| **Opção D: Swagger Ativo em Produção sem Restrição** | Consome memória pública e conexões desnecessárias. | Acesso livre a qualquer usuário na internet. | Violação das diretrizes OWASP API Security Top 10. | ❌ **Inaceitável em produção.** |

---

## Como Acessar a Interface

1. Pare a execução atual se a porta estiver em uso (`Ctrl + C` no terminal onde está rodando `dotnet run`).
2. Execute o projeto API:
   ```bash
   dotnet run --project MyApp.Api/MyApp.Api.csproj
   ```
3. Abra seu navegador no endereço:
   - `https://localhost:<porta>/swagger` (para a interface gráfica interativa do Swagger UI)
   - `https://localhost:<porta>/openapi/v1.json` (para o documento JSON nativo do .NET 10)
