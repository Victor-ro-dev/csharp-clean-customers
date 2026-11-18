# Pergunta: Diferenças entre Class, Record, Interface, Static Class e as Vantagens do MediatR

## Dúvida do Usuário

O usuário tem dúvidas sobre:

1. As diferenças entre `public class`, `public record`, `public interface`, `public static class` (e outros modificadores/tipos relevantes em C#).
2. As vantagens reais que o uso do **MediatR** oferece em comparação a não utilizá-lo.

---

## 1. Tipos e Estruturas em C#

### `public class` (Classe)

- **O que é:** O tipo de referência fundamental em Orientação a Objetos (OOP). Pode conter estado (campos/propriedades), comportamento (métodos), construtores e herança completa.
- **Quando usar:** Para entidades de domínio, repositórios, serviços, controladores e classes que possuem ciclo de vida, estado mutável e lógica de negócio compleja.

### `public record` (Registro - C# 9+)

- **O que é:** Um tipo de referência otimizado para **dados imutáveis**. Ele gera automaticamente métodos úteis de igualdade baseada em valores (`value equality`), formatação para string (`ToString`), e suporte a desestruturação (`deconstruct`) e cópia não destrutiva (`with`).
- **Quando usar:** Perfeito para DTOs (Data Transfer Objects), Requests e Responses do MediatR, onde o objetivo é apenas carregar dados que não devem mudar após criados.

### `public interface` (Interface)

- **O que é:** Um "contrato" que define assinaturas de métodos, propriedades e eventos, mas **não implementa lógica** (exceto métodos padrão em versões recentes).
- **Quando usar:** Para definir contratos de repositórios (`ICustomerRepository`), serviços e abstrações que permitem aplicar Injeção de Dependência e facilitar testes unitários (Mocking).

### `public static class` (Classe Estática)

- **O que é:** Uma classe que não pode ser instanciada (você não pode dar `new MinhaClasse()`) e cujos membros devem ser todos estáticos (`static`). Ela não mantém estado por instância.
- **Quando usar:** Para métodos utilitários, funções de extensão (`Extension Methods`) ou classes de configuração/constantes globais.

### Outros tipos comuns em C# (`struct`, `enum`, `abstract class`)

- **`struct`:** Tipo por valor (armazenado na Stack em vez da Heap), ideal para pequenos objetos de dados de alta performance e imutáveis (ex: `DateTime`, `Guid`).
- **`enum`:** Uma lista de constantes nomeadas (ex: `StatusPedido.Ativo`).
- **`abstract class`:** Uma classe base que não pode ser instanciada diretamente e serve como modelo parcial para outras classes herdarem.

---

## 2. Vantagens do MediatR vs. Abordagem Tradicional (Sem MediatR)

| Critério                                   | Sem MediatR (Abordagem Tradicional)                                                                       | Com MediatR (Mediator Pattern)                                                                                                                              |
| :----------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acoplamento**                            | Alto. O Controller injeta diretamente múltiplos serviços, repositórios e validadores.                     | Baixo. O Controller conhece apenas o `IMediator` e despacha uma mensagem abstrata (Request).                                                                |
| **Princípio SRP (Responsabilidade Única)** | Baixo. Controllers ou serviços centralizam muita lógica de roteamento e chamada de dependências.          | Alto. Cada caso de uso (Feature) fica isolado em sua própria classe `Handler` dedicada.                                                                     |
| **Manutenibilidade**                       | Conforme o sistema cresce, classes de serviço ficam gigantescas ("God Services").                         | Fácil de manter. Adicionar uma nova funcionalidade significa criar um novo comando e um novo handler sem tocar nos antigos.                                 |
| **Cross-Cutting Concerns (Pipeline)**      | Difícil de padronizar. Validação, Logging e Transações precisam ser chamados manualmente em cada serviço. | Nativo via **Pipeline Behaviors**. Você pode adicionar validações automáticas, logs e controle de transação para _todas_ as requests de forma centralizada. |
| **Testabilidade**                          | Exige mockar múltiplos serviços dependentes no teste do Controller.                                       | Extremamente fácil. O teste unitário do Handler valida apenas a regra de negócio isolada recebendo a Request.                                               |

---

## 3. O Argumento `CancellationToken`: O que é, para que serve e se é exclusivo do MediatR

### O que é o `CancellationToken`?

O `CancellationToken` é uma estrutura nativa do .NET (do namespace `System.Threading`) utilizada para **coordenar o cancelamento de operações assíncronas**.

Em aplicações modernas (como APIs web), é muito comum que o cliente inicie uma requisição HTTP e, por algum motivo (como fechar o navegador, cancelar a aba ou timeout), desista da resposta antes mesmo de o servidor terminar de processá-la. Sem o cancelamento, o servidor continuaria gastando CPU, memória e acessos ao banco de dados processando algo que ninguém mais quer.

### Para que ele serve?

1. **Economia de Recursos:** Interrompe imediatamente tarefas pesadas (consultas complexas no banco de dados, chamadas a APIs externas, loops longos) assim que o cliente desiste da requisição.
2. **Resiliência e Performance:** Evita o esgotamento de _threads_ e conexões do servidor em requisições abandonadas.
3. **Propagação Limpa:** Permite que o sinal de cancelamento passe por toda a cadeia de execução (Controller $\rightarrow$ MediatR $\rightarrow$ Handler $\rightarrow$ Repositório $\rightarrow$ Banco de Dados).

### O `CancellationToken` é exclusivo do MediatR?

**Não, absolutamente não!**

O `CancellationToken` é um recurso fundamental do **.NET e da Programação Assíncrona (`async/await`)**. Ele existe independentemente do MediatR e é amplamente utilizado em:

- Métodos assíncronos do Entity Framework Core (`SaveChangesAsync(cancellationToken)`, `ToListAsync(cancellationToken)`).
- Requisições HTTP (`HttpClient.GetAsync(url, cancellationToken)`).
- Leituras de arquivos, streams e timers.

### Como ele se integra ao MediatR?

O MediatR abraça totalmente o padrão de cancelamento do .NET. Quando você define um Handler que implementa `IRequestHandler<TRequest, TResponse>`, o método `Handle` recebe obrigatoriamente o `CancellationToken`:

```csharp
public class AddCustomerCommandHandler : IRequestHandler<AddCustomerCommand, int>
{
    private readonly AppDbContext _context;

    public AddCustomerCommandHandler(AppDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(AddCustomerCommand request, CancellationToken cancellationToken)
    {
        var customer = new CustomerEntity { Name = request.Name };

        _context.Customers.Add(customer);

        // Repassando o CancellationToken para o EF Core cancelar a operação no banco se necessário
        await _context.SaveChangesAsync(cancellationToken);

        return customer.Id;
    }
}
```

E no seu Controller, você apenas repassa o token que o ASP.NET Core já injeta automaticamente na Action:

```csharp
[HttpPost]
public async Task<IActionResult> Create([FromBody] AddCustomerCommand command, CancellationToken cancellationToken)
{
    var result = await _mediator.Send(command, cancellationToken);
    return Ok(result);
}
```
