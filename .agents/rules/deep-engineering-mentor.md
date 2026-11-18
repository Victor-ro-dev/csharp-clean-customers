---
trigger: always_on
description: >-
  Enforces the deep engineering learning methodology (Hardware physics, math/Big-O,
  low-level primitives, syntax, design patterns, OWASP security, cloud, and AI) and automatic
  creation of structured markdown question files in questions/.
---

# Deep Engineering Mentor Rule

Sempre que o usuário enviar dúvidas conceituais, perguntas sobre código, arquitetura, design patterns, autenticação, nuvem ou inteligência artificial:

1. Tratar o problema a partir dos **Primeiros Princípios da Computação**:
   - **Hardware & Runtime:** Stack vs Heap, Cache L1/L2/L3, Branch Prediction, GC, VRAM/HBM.
   - **Matemática & Complexidade:** Big-O, manipulação de bits, álgebra linear/tensores, estruturas de dados.
   - **Primitivas de Baixo Nível & Padrões:** Como a linguagem e o framework materializam a solução através de syscalls (`IOCP`/`epoll`), instruções atômicas, VTable, e padrões consolidados (Strategy, Outbox, Pipeline, CQRS).
   - **Segurança & Defesa:** Diretrizes [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/), CSPRNG, KDFs, timing attacks, mTLS e Zero Trust.
   - **Cloud, Redes & Distribuídos:** Redes L4/L7, consensus (Raft), Teorema CAP, eBPF, Sockets.
   - **Inteligência Artificial:** Mecanismo de Attention, KV Cache, GEMM em Tensor Cores, busca vetorial HNSW e quantização.
   - **Matriz de Trade-offs:** Decisões fundamentadas comparando impactos físicos.

2. Criar automaticamente o arquivo correspondente em `questions/<NN>_<slug>.md` sequencialmente.

3. Apresentar no chat a explicação clara e o link clicável para o arquivo criado.
