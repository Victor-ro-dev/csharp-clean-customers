# Referência Técnica: Primitivas de Segurança e Diretrizes OWASP

Este documento consolida os princípios de segurança defensiva baseados no [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) e nas primitivas criptográficas de baixo nível.

---

## 1. As Primitivas de Autenticação e Criptografia

### 1.1 Hash Seguro de Senhas (Password Storage Cheat Sheet)
- **Regra Fundamental:** Senhas NUNCA são criptografadas (reversíveis); senhas sofrem **Hash Criptográfico Lento com Salt**.
- **Algoritmos Rápidos (NUNCA usar para senha):** MD5, SHA-1, SHA-256, SHA-512.
  - *Motivo físico:* GPUs modernas conseguem testar dezenas de bilhões de hashes SHA-256 por segundo via força bruta.
- **Algoritmos Recomendados (OWASP):**
  1. **Argon2id:** Padrão ouro (vencedor da Password Hashing Competition). Configura parâmetros de memória (RAM-hard), iterações (tempo) e threads (paralelismo) para inviabilizar ataques em hardware dedicado (ASICs/GPUs).
  2. **PBKDF2:** Amplamente suportado nativamente pelo .NET (`Rfc2898DeriveBytes`) com SHA-256 ou SHA-512 e alto número de iterações (> 310.000 iterações segundo OWASP).
  3. **BCrypt / SCrypt:** Alternativas consolidadas que forçam custo de CPU e memória.
- **Salt Criptográfico:** Sequência aleatória gerada via CSPRNG de no mínimo 16 bytes (128 bits), única por usuário, armazenada junto ao hash. Impede ataques pré-computados via Rainbow Tables.

### 1.2 Geradores de Números Pseudo-Aleatórios (CSPRNG)
- **Inseguro:** `new Random()` (baseado em semente de tempo; previsível por invasores).
- **Seguro (CSPRNG):** `System.Security.Cryptography.RandomNumberGenerator`. Utiliza entropia física do sistema operacional (ruídos de interrupções de hardware do kernel).

### 1.3 Ataques de Tempo (Timing Attacks) e Comparação em Tempo Constante
- **O Risco:** Ao comparar strings de segredo (como tokens de autenticação ou chaves HMAC) com o operador `==` ou `string.Equals()`, o runtime retorna `false` no **primeiro byte divergente**.
  - O invasor mede a latência em nanossegundos/microssegundos na rede e deduz a senha byte a byte pelo tempo de resposta da API.
- **A Solução Defensiva:** Usar comparação em tempo constante:
  ```csharp
  CryptographicOperations.FixedTimeEquals(computedHashSpan, storedHashSpan);
  ```
  Ele percorre todos os bytes independentemente de onde houver divergência, anulando a vazão de tempo.

---

## 2. Tokens de Autenticação: JWT vs Tokens Opacos

| Característica | JSON Web Token (JWT / Bearer) | Token Opaco (Session ID / DB Reference) |
| :--- | :--- | :--- |
| **Armazenamento de Estado** | Stateless (o payload viaja assinado no token) | Stateful (requer lookup no Redis / Postgres) |
| **Custo de CPU** | Médio/Alto: Validação criptográfica da assinatura a cada request | Baixo: Busca rápida $O(1)$ em memória/cache |
| **Revogação Imediata** | Difícil sem lista de revogação/blacklist em cache | Imediata (basta apagar a chave do Redis) |
| **Risco OWASP Comum** | Algoritmo fraco (`none` ou HMAC com segredo curto), expiração longa, dados sensíveis em base64 | Vazamento de sessões em caso de falha de CSPRNG |
| **Recomendação OWASP** | Usar chaves assimétricas (RS256, EdDSA/Ed25519) com curto tempo de vida (5 a 15 min) + Refresh Token opaco | Ideal para aplicações web monolíticas ou sessões críticas |

---

## 3. Diretrizes Essenciais do OWASP Cheat Sheet

### 3.1 SQL Injection Prevention Cheat Sheet
- **Princípio:** Separação estrita entre o plano de código (instrução SQL) e o plano de dados (parâmetros).
- **Prática:** Consultas com parametrização em comandos SQL puros ou via ORM (EF Core com LINQ compilado em parâmetros `@p0`, `@p1`). Nunca usar concatenação de strings ou interpolação `$""` em consultas cruas.

### 3.2 Cross-Site Scripting (XSS) & Input Validation
- **Validação de Entrada:** Validação sintática e semântica rígida (Allow-list sobre Block-list). Usar bibliotecas robustas (ex: FluentValidation).
- **Encoding de Saída:** Sanitização contextual de saída antes de renderizar qualquer dado não confiável.

### 3.3 Broken Object Level Authorization (BOLA / IDOR)
- **O Risco:** O usuário autenticado altera o `customerId` no endpoint `/customers/{id}` e acessa dados de outro usuário.
- **Defesa:** A autorização deve sempre validar o identificador do usuário autenticado contra a entidade acessada no banco (ex: `Where(c => c.Id == id && c.TenantId == currentUser.TenantId)`).

### 3.4 Rate Limiting & DoS Defense
- Limitação de taxa de requisições por IP ou por usuário autenticado (ASP.NET Core RateLimiter / Token Bucket / Sliding Window) para evitar esgotamento de conexões e exaustão de CPU.
