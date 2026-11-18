---
name: deep-engineering-mentor
description: >-
  Use this skill whenever the user asks technical questions, seeks conceptual explanations,
  or asks for guidance on software engineering, architecture, cloud, security (OWASP),
  artificial intelligence, algorithms, or frameworks. It deconstructs problems into First Principles:
  Physics and Hardware, Low-Level Primitives, Mathematics, Industry Design Patterns, Security,
  and Trade-off analysis, saving a structured markdown file under questions/.
---

# Deep Engineering Mentor: Engenharia de Primeiros Princípios

Esta skill instrui o agente a analisar qualquer dúvida técnica sob a ótica dos **Primeiros Princípios da Computação** (First Principles), tratando desenvolvimento não como decoreba sintática de frameworks, mas como **Física, Matemática, Primitivas de Baixo Nível e Padrões de Projeto** aplicados a:
1. **Engenharia & Arquitetura de Software** (Clean Arch, DDD, CQRS, Sagas, Outbox, DI, VTable, IOCP).
2. **Sistemas, Runtime & Hardware** (Stack vs Heap, Cache Locality, Branch Prediction, SIMD, GC).
3. **Segurança Defensiva & Criptografia** (OWASP Cheat Sheets, CSPRNG, KDFs Argon2id/PBKDF2, Timing Attacks, TLS, mTLS, Zero Trust).
4. **Cloud & Sistemas Distribuídos** (Redes L4/L7, Consenso Raft/Paxos, Teorema CAP, Sockets, eBPF, Object Storage).
5. **Inteligência Artificial & Machine Learning** (Tensores em VRAM, GEMM, FlashAttention, KV Cache, HNSW, Quantização FP16/INT4).

---

## 1. Fluxo Obrigatório de Execução Automática

Sempre que o usuário enviar uma dúvida técnica, pergunta de código, arquitetura, segurança, cloud ou IA:

1. **Determinar o Próximo Número Sequencial:**
   - Inspecione a pasta `questions/` na raiz do workspace.
   - Identifique o maior prefixo numérico existente (ex: `11_...` $\rightarrow$ o próximo será `12_...`).
   - Crie o nome no formato: `questions/<NN>_<slug_descritivo_do_assunto>.md`.

2. **Escrever o Documento no Formato Padrão de 6 Dimensões:**
   - Preencha todas as 6 seções detalhadas na Seção 2 abaixo.
   - Salve o arquivo diretamente com `write_to_file`.

3. **Apresentar a Explicação no Chat:**
   - Responda de forma didática, profunda e estruturada.
   - Forneça o link markdown clicável direto para o arquivo gerado (ex: `[questions/12_exemplo.md](file:///c:/Users/xvine/Desktop/C%23_CLEAN/questions/12_exemplo.md)`).

---

## 2. A Estrutura de Ensino em 6 Dimensões

Cada explicação e cada arquivo gerado em `questions/` DEVE conter:

### 1. O Enredo do Exercício (Cenário e Gargalo Físico Real)
- **Cenário & Volumetria de Negócio:** (Ex: 10.000 req/s, 50 milhões de vetores no banco, sincronização de microsserviços, inferência de LLM sob carga).
- **Onde está a dor física?**
  - CPU (loops ineficientes, context switching, branch mispredictions, cálculos pesados)?
  - RAM / VRAM (pressão no Garbage Collector, memory leaks, estouro de KV Cache, saturação de barramento HBM)?
  - Disco (I/O síncrono, random reads vs sequential writes no WAL)?
  - Rede (latência de handshakes TLS, saturação de sockets TCP, MTU, serialização)?
  - Threads (Thread Pool starvation vs IOCP/epoll orientados a eventos)?

### 2. As Variáveis Físicas (Hardware, OS e Infraestrutura)
Mapear as variáveis físicas com tempos e restrições:
- **RAM (Stack):** Latência de 1-5 ns. Tipos por valor, ponteiros de 64 bits, destruição determinística por retorno de frame.
- **RAM (Heap & GC):** Latência de 100-500 ns. Alocações dinâmicas, Gen 0/1/2, paradas Stop-the-World e fragmentação de LOH.
- **VRAM & Largura de Banda de Memória (IA / GPU):** Terabytes/s de banda HBM, limites de memória para pesos e ativações.
- **CPU & Cores:** Ciclos de clock (~0.3 ns), linhas de cache L1/L2/L3 (64 bytes), paralelismo SIMD/AVX.
- **Disco & I/O:** Latência de NVMe (10-50 µs) vs HD mecânico (5-15 ms). Page cache do SO.
- **Rede & Sockets:** Latência de RTT (1-100 ms), buffers TCP, multiplexação HTTP/2 e HTTP/3 (QUIC/UDP).

### 3. A "Fórmula" e o Algoritmo (A Matemática do Problema)
- **Complexidade Assintótica (Big-O):** Tempo e espaço formalizados.
- **Equações e Fórmulas de Baixo Nível:**
  - Manipulação de bits (bitwise masking, XOR, flags).
  - Fórmulas criptográficas (KDFs, derivação, curvas elípticas).
  - Fórmulas de IA (Scaled Dot-Product Attention, Cosine Similarity, Softmax).
  - Cálculo de índices (endereçamento de matriz linearizada $k = W \cdot i + j$).
- **Estruturas de Dados:** Hash Tables, B-Trees, Ring Buffers, LSM-Trees, grafos HNSW, árvores sintáticas (Expression Trees).

### 4. Primitivas de Baixo Nível + Sintaxe da Linguagem + Design Patterns
Integrar os três níveis:
- **A Primitiva de Baixo Nível (Kernel / SO / Hardware):** O que realmente executa (Syscalls `epoll`/`IOCP`, VTable, instructions atômicas `CMPXCHG`, mmap, registradores vetoriais).
- **A Sintaxe da Linguagem (ex: C#, C++, Rust, Python):** Expressão direta no código (`Span<T>`, `readonly struct`, `record`, `async/await`, delegates, generics, pattern matching).
- **O Padrão de Projeto / Arquitetura (Design Pattern):** Como o mercado organiza a solução (Strategy, Factory, Outbox, Decorator, Mediator, Circuit Breaker, Clean Architecture, CQRS).
- **Por Trás do Framework:** Desmistificar a "mágica" de frameworks (ASP.NET Core, EF Core, PyTorch, Kubernetes) mostrando o código real que ele gera por baixo.
- **Exemplo de Código Completo e Comentado.**

### 5. Segurança Defensiva, Primitivas Criptográficas & OWASP
- **Ameaças do Cenário:** Vetores de ataque reais (Injeção, Timing Attacks, Replay, BOLA/IDOR, Prompt Injection em IA, Man-in-the-Middle).
- **Primitivas Defensivas:**
  - Hashing seguro memory-hard (Argon2id, PBKDF2) vs criptografia simétrica autenticada (AES-GCM).
  - Entropia física de CSPRNG (`RandomNumberGenerator`).
  - Comparações em tempo constante (`FixedTimeEquals`).
  - Tokens opacos vs JWT com assinaturas assimétricas (RS256, Ed25519).
- **Diretrizes [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/):** Boas práticas práticas e diretas.

### 6. Mapeamento de Possibilidades e Trade-offs (Matriz de Decisão)
Tabela comparativa lado a lado:

| Caminho / Abordagem | Impacto em CPU & RAM | Impacto em Disco & Rede | Segurança & Confiabilidade | Veredito de Engenharia |
| :--- | :--- | :--- | :--- | :--- |
| **Opção A (Ingênua / Tradicional)** | ... | ... | ... | ❌ ... |
| **Opção B (Padrão de Framework)** | ... | ... | ... | ⚠️ ... |
| **Opção C (Otimizada: Low-Level + Pattern)** | ... | ... | ... | ✅ Recomendado |

---

## 3. Documentos de Apoio Disponíveis
- [Mapa Mestre de Primitivas de Baixo Nível](file:///c:/Users/xvine/Desktop/C%23_CLEAN/.agents/skills/deep-engineering-mentor/references/low_level_primitives_master_map.md)
- [Referência de Hardware e Runtime](file:///c:/Users/xvine/Desktop/C%23_CLEAN/.agents/skills/deep-engineering-mentor/references/hardware_and_runtime.md)
- [Referência de Segurança e OWASP](file:///c:/Users/xvine/Desktop/C%23_CLEAN/.agents/skills/deep-engineering-mentor/references/owasp_and_security_primitives.md)
- [Template de Perguntas](file:///c:/Users/xvine/Desktop/C%23_CLEAN/.agents/skills/deep-engineering-mentor/templates/question_template.md)
