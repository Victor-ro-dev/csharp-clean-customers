# Pergunta: Autenticação Moderna — Primitivas de Baixo Nível, Padrões de Mercado e OWASP

## Dúvida do Usuário

> Como aprender autenticação, arquitetura e engenharia de software entendendo as primitivas de baixo nível (low-level primitives), os padrões de projeto/mercado adotados pelos frameworks e as diretrizes do OWASP Cheat Sheet Series, em vez de apenas decorar as funções de alto nível do framework?

---

## 1. O Enredo do Exercício (O Cenário e o Gargalo Real)

- **A História / Contexto de Negócio:**
  Uma API corporativa (ex: SaaS financeiro ou e-commerce) recebe **10.000 requisições simultâneas de login e validação de sessão por segundo**. O sistema precisa verificar identidade, validar senhas, emitir e inspecionar tokens a cada requisição HTTP sem desmoronar o servidor e sem abrir brechas de vazamento de credenciais.
- **Onde está a dor física real?**
  - **CPU:** Se usarmos um algoritmo de hashing de senha muito pesado em todas as requisições normais (em vez de apenas no login), a CPU satura em 100%. Se a validação do token fizer parse de strings e alocação desnecessária, ciclos preciosos são perdidos.
  - **RAM:** Se cada request autenticada alocar instâncias no Heap para claims e headers, a pressão sobre o Garbage Collector (GC) causará pausas *Stop-the-World*.
  - **Disco & Rede:** Se a cada request o servidor consultar o banco de dados relacional para validar uma sessão, o pool de conexões do PostgreSQL/SQL Server esgota e as portas TCP sofrem saturação.
  - **Ameaça de Segurança:** Se a comparação do hash da senha ou assinatura do token vazar tempo (Timing Attack), um invasor pode inferir dados sensíveis medindo a latência da resposta.

---

## 2. As Variáveis Físicas (Hardware e Sistema Operacional)

Mapeando os recursos físicos envolvidos no pipeline de autenticação:

| Variável de Hardware / OS | Escala de Tempo / Unidade | Comportamento no Pipeline de Autenticação |
| :--- | :--- | :--- |
| **RAM (Stack)** | ~1 - 5 ns | Armazena structs como `ReadOnlySpan<byte>` para inspecionar tokens e hashes sem alocar na Heap. Zero custo de GC. |
| **RAM (Heap & GC)** | ~100 - 500 ns | Alocação de objetos pesados (`ClaimsPrincipal`, listas de permissões). Se não for otimizado, enche a Gen 0 e degrada o throughput. |
| **CPU (Ciclos de Clock & Branching)** | ~0.3 ns por ciclo | O cálculo de hash (PBKDF2/Argon2id) consome propositalmente milhões de ciclos de clock para inviabilizar ataques de força bruta. Comparações criptográficas devem rodar em tempo constante. |
| **Disco / Storage** | ~20 - 50 µs (NVMe) | Leitura do registro do usuário no banco de dados. Deve acontecer apenas no login, nunca a cada requisição de API. |
| **Rede (Sockets / TLS)** | ~1 - 50 ms | Negociação TLS 1.3, tráfego de headers `Authorization: Bearer <token>`. O tamanho do token afeta a saturação de pacotes TCP (MTU de 1500 bytes). |

---

## 3. A "Fórmula" e o Algoritmo (A Matemática do Problema)

### 3.1 Complexidade Assintótica (Big-O)
- **Validação de Token Stateless (JWT):** $O(N)$ em relação ao comprimento do token para verificar a assinatura criptográfica, $O(1)$ em consumo de memória via `Span<byte>`.
- **Validação de Token Stateful (Token Opaco via Cache/Redis):** $O(1)$ de tempo de busca em Hash Table de memória.
- **Verificação de Senha (Key Derivation Function):** $O(I \cdot M)$ onde $I$ é o número de iterações e $M$ o custo de memória (Argon2id/PBKDF2).

### 3.2 Fórmulas Criptográficas Fundamentais
1. **Hash com Salt (Prevenção de Rainbow Tables):**
   $$H = \text{KDF}(\text{Senha}, \text{Salt}, \text{Iterações}, \text{Custo de Memória})$$
   Onde o $\text{Salt} \in \{0,1\}^{128}$ é gerado via entropia física do kernel (CSPRNG).
2. **Comparação em Tempo Constante (Eliminação de Timing Attacks):**
   $$\text{Diff} = \bigvee_{i=0}^{L-1} (A[i] \oplus B[i])$$
   Se $\text{Diff} == 0$, as sequências são idênticas. Todos os $L$ bytes são sempre avaliados, impedindo o retorno antecipado no primeiro byte diferente.

---

## 4. Sintaxe da Linguagem + Design Patterns + Primitivas de Baixo Nível

### A Conexão das Três Camadas:
1. **Sintaxe C# Moderna:** `ReadOnlySpan<byte>`, `ref struct`, `stackalloc`, `record`, e `switch expressions` evitam alocações na Heap e operam diretamente na Stack.
2. **Design Pattern:**
   - **Chain of Responsibility / Middleware Pipeline:** A autenticação intercepta a requisição antes de atingir as Controllers (`AuthenticationMiddleware`).
   - **Strategy Pattern:** Seleção dinâmica do esquema de autenticação (JWT Bearer, Cookie, API Key).
   - **Result Pattern:** Retorno explícito de sucesso/falha de autenticação sem disparar exceções pesadas (`throw new Exception`).
3. **Primitivas de Baixo Nível & Por Trás do Framework:**
   - O que o `app.UseAuthentication()` do ASP.NET Core faz por baixo dos panos?
   - Ele não faz "mágica": ele registra um delegado no pipeline HTTP do Kestrel, lê os bytes crus do header `Authorization` a partir do `PipeReader` (System.IO.Pipelines), faz o parse Base64Url e valida a assinatura criptográfica com primitivas do sistema operacional (`BCrypt.dll` no Windows ou `libcrypto` do OpenSSL no Linux).

### Código Exemplo: Primitiva Segura de Hash e Verificação em Tempo Constante

```csharp
using System.Security.Cryptography;

namespace MyApp.Core.Security;

/// <summary>
/// Exemplo de primitivas de baixo nível com foco em hardware e segurança defensiva.
/// </summary>
public static class PasswordHasher
{
    private const int SaltSize = 16;      // 128 bits de entropia
    private const int HashSize = 32;      // 256 bits de saída
    private const int Iterations = 350000; // Recomendação OWASP para PBKDF2-HMAC-SHA256

    public static string HashPassword(string password)
    {
        // 1. Variável de Hardware / OS: Entropia física do kernel (CSPRNG)
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);

        // 2. A Fórmula: Derivação de chave com alto custo de CPU para conter ataques de força bruta
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);

        // 3. Montagem do payload seguro com Salt + Hash
        byte[] result = new byte[SaltSize + HashSize];
        Buffer.BlockCopy(salt, 0, result, 0, SaltSize);
        Buffer.BlockCopy(hash, 0, result, SaltSize, HashSize);

        return Convert.ToBase64String(result);
    }

    public static bool VerifyPassword(string password, string storedPayload)
    {
        byte[] payloadBytes = Convert.FromBase64String(storedPayload);
        if (payloadBytes.Length != SaltSize + HashSize) return false;

        // Extrai o Salt da Stack/Buffer
        ReadOnlySpan<byte> salt = payloadBytes.AsSpan(0, SaltSize);
        ReadOnlySpan<byte> expectedHash = payloadBytes.AsSpan(SaltSize, HashSize);

        // Recalcula o Hash usando o mesmo Salt
        byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt.ToArray(),
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);

        // 4. Segurança OWASP: Comparação em Tempo Constante contra Timing Attacks
        // Evita operador '==' ou string.Equals() que expõem nanossegundos na rede
        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
```

---

## 5. Segurança Defensiva, Primitivas Criptográficas & OWASP

Baseado nas recomendações do [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/):

1. **Password Storage Cheat Sheet:**
   - **Regra:** Nunca use SHA-256 simples ou MD5. Senhas exigem algoritmos com fator de trabalho ajustável (**Argon2id** ou **PBKDF2 com > 310.000 iterações**).
   - **Salt Único:** Cada usuário possui um salt exclusivo de pelo menos 16 bytes para anular ataques com rainbow tables.
2. **Authentication Cheat Sheet:**
   - **Timing Attacks:** Use sempre `CryptographicOperations.FixedTimeEquals` ao validar segredos, hashes ou tokens.
   - **Mensagens de Erro Genéricas:** Retornar "Credenciais inválidas" em vez de "Usuário não existe" ou "Senha incorreta", prevenindo enumeração de contas.
3. **JSON Web Token (JWT) Cheat Sheet:**
   - **Algoritmo Explícito:** Bloquear explicitamente o algoritmo `none` e rejeitar tokens assinados com chaves simétricas fracas.
   - **Assinatura Assimétrica:** Em arquiteturas distribuídas, o Identity Provider assina com chave privada (RS256 ou Ed25519) e as APIs consumidoras apenas validam com a chave pública (sem risco de comprometer a chave de assinatura).
   - **Tempo de Vida Curto:** Access Tokens com expiração curta (5 a 15 minutos) e Refresh Tokens rotativos armazenados com segurança.

---

## 6. Mapeamento de Possibilidades e Trade-offs (Matriz de Decisão)

| Abordagem / Escolha | Impacto em CPU & RAM | Impacto em Disco & Rede | Segurança & OWASP | Veredito de Engenharia |
| :--- | :--- | :--- | :--- | :--- |
| **Opção A: Session Stateful em Banco Relacional** | Leve em CPU, mas alta retenção de conexões na RAM | Cada request faz query no banco ($O(N)$ de conexões); gargalo de I/O de disco | Boa revogabilidade, mas suscetível a DoS por esgotamento de conexões | ❌ Não escala para alta volumetria |
| **Opção B: JWT Stateless puro sem expiração/rotação** | Quase zero I/O; CPU valida assinatura via chave pública | Payload viaja nos headers HTTP em cada request (aumenta consumo de banda) | Inseguro: impossível revogar token comprometido antes do vencimento | ❌ Viola diretrizes OWASP |
| **Opção C: Híbrido (JWT de Curta Duração + Refresh Token no Redis)** | CPU faz validação matemática local; RAM do Redis guarda chaves em $O(1)$ | Quase nulo impacto no banco principal; rede leve e escalável | Alta segurança: tokens com expiração rápida, revogação instantânea e comparação em tempo constante | ✅ **Recomendado para produção** |

---

## Conclusão e Princípio Fundamental

A verdadeira engenharia de software não consiste em chamar métodos prontos do framework sem saber o que eles fazem, mas em compreender a física por trás de cada linha: **onde os bytes estão residindo (Stack vs. Heap), quantos ciclos de CPU o algoritmo exige, quais chamadas de hardware são disparadas no SO e quais são os vetores de vulnerabilidade mitigados pelas primitivas criptográficas e pelo OWASP**.
