# 12: Resolução de Símbolos, Casing no Roslyn e o Padrão Mediator (ISender)

---

## 1. O Enredo do Exercício (Cenário e Gargalo Físico Real)

- **Cenário & Volumetria de Negócio:**
  Uma API corporativa em ASP.NET Core (.NET 10) sob Clean Architecture e CQRS, recebendo 5.000 a 15.000 requisições HTTP/segundo para cadastro e processamento de clientes. O endpoint `POST /api/Customer` delega a execução para o pipeline de aplicação através do MediatR.
- **Onde está a dor física e de engenharia?**
  1. **Falha em Tempo de Compilação (Build-Time Failure):** O compilador C# (Roslyn) interrompe o pipeline de integração contínua (CI/CD) ao falhar na fase de **Semantic Analysis (Type Binding)** com o erro `CS0246: The type or namespace name 'Isender' could not be found`.
  2. **Gargalo de Design & Arquitetura (Vazamento de Entidade de Domínio):** O controller original recebia `CustomerEntity` diretamente no payload (`[FromBody] CustomerEntity customer`). Em termos de hardware e runtime, isso acarreta deserialização descuidada em heap de objetos com identidade de domínio, bypass de encapsulamento, risco de Mass Assignment (OWASP API3:2023) e overhead de serialização de propriedades de navegação ou campos protegidos.
  3. **Threads & I/O:** O controller despacha um comando assíncrono. Se o contrato da interface não for satisfeito com despacho não-bloqueante orientado a IOCP (*I/O Completion Ports*), threads do ThreadPool ficam retidas e entram em starvation sob pico de concorrência.

---

## 2. As Variáveis Físicas (Hardware, OS e Infraestrutura)

| Recurso / Componente | Latência / Métrica Física | Impacto no Ciclo de Vida da Requisição |
| :--- | :--- | :--- |
| **Registradores de CPU / Cache L1** | ~0.5 ns a 1.5 ns (Linha de 64 bytes) | Comparação de identificadores de strings na tabela de símbolos durante o build pelo Roslyn. |
| **RAM (Stack Frame)** | ~1 a 5 ns | Alocação do ponteiro de `ISender` recebido via Primary Constructor no frame do método e ponteiros de interface de 64 bits (`IntPtr`). |
| **RAM (Heap / Gen 0)** | ~100 a 300 ns | Alocação da instância de `AddCustomerCommand` e alocação do Service Provider (`IServiceProvider.GetService`). |
| **Interface Method Table (IMT / VTable)** | ~2 a 10 ns | Resolução dinâmica do método `ISender.Send` no CLR via indireção de ponteiro da interface. |
| **IOCP (I/O Completion Ports - Windows Kernel)** | ~15 a 40 µs | Suspensão da thread durante o `await sender.Send(...)` quando a operação toca o banco de dados sem queimar ciclos de CPU. |

---

## 3. A "Fórmula" e o Algoritmo (A Matemática do Compilador e do Runtime)

### 3.1. A Resolução de Símbolos do Compilador (Roslyn AST & Symbol Binding)

O compilador C# opera como uma função determinística de transdução:

$$\text{Source Code (UTF-8)} \xrightarrow{\text{Lexer}} \text{Syntax Tokens} \xrightarrow{\text{Parser}} \text{AST} \xrightarrow{\text{Binder}} \text{Bound Trees (Metadata)} \xrightarrow{\text{IL Emit}} \text{PE/CLR Assembly}$$

1. **Case-Sensitivity Estrita:** No padrão ECMA-335 (Common Language Infrastructure), o C# é rigorosamente sensível a maiúsculas e minúsculas (*case-sensitive*).
2. **Algoritmo de Busca de Símbolo ($\mathcal{O}(1)$ amortizado via Hash Table):**
   Para cada identificador `Ident` encontrado no nó sintático:
   $$\text{Lookup}(Ident) = \bigcup_{ns \in \text{Usings}} \text{TypeTable}[ns].\text{Find}(Ident)$$
   Quando o código define `Isender`:
   $$\text{Hash}(\text{"Isender"}) \neq \text{Hash}(\text{"ISender"})$$
   Como `MediatR` só exporta a interface `ISender` (com `S` maiúsculo), o Binder do Roslyn não encontra correspondência na tabela de tipos carregada dos metadados e emite o diagnóstico fatal:
   $$\text{Diagnostic}(\text{ErrorCode} = \text{CS0246})$$

### 3.2. Complexidade Assintótica de Dispatching

- **Despacho no Mediator (`Send<T>`):**
  Busca do Handler registrado no DI Container:
  $$\mathcal{O}(1) \quad (\text{Dictionary Lookup por Type: } \text{typeof}(IRequestHandler<TRequest, TResponse>))$$
- **Execução:**
  $$\mathcal{O}(1) \quad \text{em chamadas de delegates/interfaces compilados via VTable/IMT}.$$

---

## 4. Primitivas de Baixo Nível + Sintaxe da Linguagem + Design Patterns

### 4.1. A Primitiva de Baixo Nível: VTable e Interface Dispatching no CLR

No .NET Runtime, quando uma classe implementa uma interface como `ISender`, o CLR cria no MethodTable da classe um vetor de ponteiros chamado **Interface Method Table (IMT)**.
- O tipo real instanciado pelo Dependency Injection é a classe concreta `Mediator`.
- Ao invocar `sender.Send(...)`, a CPU executa uma instrução de chamada indireta:
  ```assembly
  mov rcx, [rbp-8]       ; Carrega endereço do objeto Mediator (this)
  mov rax, [rcx]         ; Carrega o MethodTable Pointer (primeiros 8 bytes do objeto no Heap)
  call [rax + IMT_OFFSET]; Salto indireto para o código compilado por JIT
  ```
- Para que o compilador monte a chamada IL `callvirt instance class [System.Runtime]System.Threading.Tasks.Task`1<!!0> [MediatR]MediatR.ISender::Send`, o tipo **precisa ter seu identificador idêntico ao metadado do assembly exportador**.

### 4.2. Padrões de Projeto: Interface Segregation Principle (ISP) & Mediator Pattern

O MediatR divide suas operações em duas interfaces principais:
1. `ISender`: Contém apenas o método `Send(...)` (para Commands e Queries com 1 único handler).
2. `IPublisher`: Contém apenas o método `Publish(...)` (para Domain Events / Notificações com 0 a N handlers).
3. `IMediator`: Herda de `ISender` e `IPublisher`.

> **Primeiro Princípio (ISP):** Ao injetar `ISender` no controller em vez de `IMediator`, você reduz a superfície de acoplamento da API, garantindo que o controller apenas **envie** comandos/consultas e não publique notificações acidentalmente.

### 4.3. C# Moderno: Primary Constructors

No .NET 8 / 9 / 10, a sintaxe:
```csharp
public class CustomerController(ISender sender) : ControllerBase
```
gera nos bastidores um campo privado `readonly` gerenciado pelo compilador, capturado para todos os métodos da classe, economizando boilerplate de construtor tradicional sem custo extra de memória ou indireção de heap.

### 4.4. O Código Corrigido e Refatorado

#### Arquivo: `MyApp.Api/CustomerController.cs`
```csharp
using Microsoft.AspNetCore.Mvc;
using MediatR;
using MyApp.Application.Commands;
using MyApp.Core.Entities;

namespace MyApp.Api;

[ApiController]
[Route("api/[controller]")]
public class CustomerController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> AddCustomerAsync([FromBody] CustomerEntity customer)
    {
        // ISender (com 'S' maiúsculo) resolve perfeitamente a chamada tipada
        var result = await sender.Send(new AddCustomerCommand(customer));
        return Ok(result);
    }
}
```

---

## 5. Segurança Defensiva, Primitivas Criptográficas & OWASP

### 5.1. OWASP API3:2023 – Broken Object Property Level Authorization (Mass Assignment)

No código do controller analisado:
```csharp
public async Task<IActionResult> AddCustomerAsync([FromBody] CustomerEntity customer)
```
Receber diretamente `CustomerEntity` (uma entidade de domínio) no endpoint HTTP expõe a API a sérios riscos de segurança:
1. **Mass Assignment / Over-Posting:** Um atacante pode enviar campos sensíveis no JSON (ex: `{"id": "admin", "isSuperUser": true, "saldo": 999999}`) que o deserializador padrão do ASP.NET Core (`System.Text.Json`) mapeia cegamente na entidade se existirem propriedades públicas com setters.
2. **Quebra de Encapsulamento:** Entidades de domínio devem ter invariantes de negócio protegidas (ex: setters privados, construtores validados).

### 5.2. Defesa em Profundidade com DTOs e Command Pattern

Em arquitetura de alta segurança:
- A API recebe um **Request DTO** limpo, estritamente validado com constraints de tamanho, regex e limites numéricos.
- O Command do MediatR transporta apenas os dados primitivos necessários.
- A Entidade é instanciada e validada dentro do Domínio ou no Handler.

```csharp
// DTO de Fronteira Seguro (Imutável, apenas dados necessários)
public sealed record CreateCustomerRequest(
    string Name,
    string Email,
    string DocumentNumber
);
```

---

## 6. Mapeamento de Possibilidades e Trade-offs (Matriz de Decisão)

| Abordagem | Impacto em Compilação & Tipagem | Impacto em CPU & RAM | Segurança & Acoplamento | Veredito de Engenharia |
| :--- | :--- | :--- | :--- | :--- |
| **1. Isender (Erro de Grafia)** | ❌ Erro de compilação `CS0246` emitido pelo Roslyn. | N/A (Não gera assembly IL). | N/A | ❌ **Inválido** (impede o build). |
| **2. Injetar IMediator Completo** | ✅ Compila normalmente. | Leve aumento na VTable (carrega métodos de publish e sender). | ⚠️ Viola o princípio ISP; permite publicar eventos diretamente do controller. | ⚠️ **Subótimo**. |
| **3. Injetar ISender (Recomendado)** | ✅ Compila com tipagem exata e verificação estática. | Resolução mínima via IMT, sem overhead de métodos desnecessários. | ✅ Respeita ISP; isola o controller apenas para envio de requests (1:1). | ✅ **Padrão de Mercado**. |
| **4. Injetar Handler Concreto Diretamente** | ✅ Dispensa o MediatR. | Zero indireção de dispatch ($\mathcal{O}(1)$ estático). | ❌ Alto acoplamento entre Api e handlers específicos; dificulta pipeline behaviors de cross-cutting (logs, validação, transação). | ❌ **Inflexível para Clean Arch**. |

---

## Conclusão da Correção
A falha consistia estritamente no erro de digitação do identificador da interface (`Isender` com `s` minúsculo em vez de `ISender`). Uma vez corrigido para `ISender`, a compilação foi concluída com sucesso com zero erros.
