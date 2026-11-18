# Pergunta: Como baixar o MediatR e para que ele serve?

## Dúvida do Usuário

O usuário tem dúvida sobre como instalar/baixar o **MediatR** em um projeto .NET e qual é a utilidade e o propósito principal dessa biblioteca na arquitetura de software.

## Resposta e Explicação

### Para que serve o MediatR?

O MediatR é uma biblioteca em C# que implementa o **Mediator Pattern (Padrão Mediador)**. O objetivo principal é desacoplar o envio de comandos/consultas (requests) dos manipuladores (handlers) que os executam.

- **Sem MediatR:** Seus controladores ou serviços fazem injeção direta de vários repositórios e serviços de domínio, criando acoplamento alto.
- **Com MediatR:** O controlador apenas despacha uma mensagem (um objeto `Command` ou `Query`), e o MediatR descobre automaticamente qual classe `Handler` deve processar aquela mensagem. Isso promove o princípio de responsabilidade única (SRP) e limpa a camada de aplicação.

### Como baixar / instalar o MediatR?

Como o MediatR é um pacote NuGet, você pode instalá-lo utilizando o terminal na pasta do projeto de aplicação (geralmente `MyApp.Application`) através do comando `dotnet add package`:

```bash
dotnet add package MediatR
```

E para habilitar a injeção de dependência automática dos Handlers:

```bash
dotnet add package MediatR.Extensions.Microsoft.DependencyInjection
```

_(Nota: Nas versões mais recentes do MediatR, o pacote principal já inclui o suporte à injeção de dependências do .NET chamando `builder.Services.AddMediatR(cfg => ...)`)._
