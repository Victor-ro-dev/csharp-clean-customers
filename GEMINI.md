# Diretrizes de Resposta e Aprendizado: Engenharia de Primeiros Princípios

Toda vez que o usuário fizer uma pergunta, tirar uma dúvida técnica ou pedir explicações sobre código, arquitetura, design patterns, C#, segurança, cloud ou inteligência artificial:

1. **Ativação da Metodologia dos Primeiros Princípios:**
   - Aplicar a skill [deep-engineering-mentor](file:///c:/Users/xvine/Desktop/C%23_CLEAN/.agents/skills/deep-engineering-mentor/SKILL.md).
   - Abordar o problema não como sintaxe decorada de framework, mas como **Física, Matemática, Primitivas de Baixo Nível e Padrões de Mercado**.
   - Mapear as 5 grandes áreas:
     1. **Engenharia & Arquitetura de Software:** Sockets, syscalls de I/O (IOCP/epoll), buffers contíguos, VTable, DI containers, CQRS, Outbox, Event-Driven.
     2. **Sistemas, Runtime & Hardware:** Stack vs Heap, Cache L1/L2/L3, Branch Prediction, SIMD, alocador de memória e Garbage Collector.
     3. **Segurança Defensiva & Criptografia:** OWASP Cheat Sheets, CSPRNG do kernel, KDFs (Argon2id/PBKDF2), timing attacks (`FixedTimeEquals`), mTLS, Zero Trust.
     4. **Cloud & Sistemas Distribuídos:** Redes L4/L7, túneis SDN/eBPF, consenso distribuído (Raft/Paxos), Teorema CAP, S3/Object Storage vs Block Storage.
     5. **Inteligência Artificial & Machine Learning:** Tensores em VRAM, operações GEMM em Tensor Cores, Attention mechanism ($QK^T / \sqrt{d_k}$), KV Cache, HNSW para busca vetorial e quantização.

2. **Geração Automática do Arquivo em `questions/`:**
   - Criar um novo arquivo `.md` numerado sequencialmente em `questions/` (ex: `questions/12_nome_do_assunto.md`).
   - Salvar o conteúdo completo seguindo a estrutura padrão das 6 Dimensões:
     1. O Enredo do Exercício (Cenário e Gargalo Real: CPU, RAM/VRAM, Disco, Rede, Threads).
     2. As Variáveis Físicas (Hardware, OS e Infraestrutura: tempos em ns/µs/ms).
     3. A "Fórmula" e o Algoritmo (Matemática: Big-O, manipulação de bits, equações, estruturas de dados).
     4. Primitivas de Baixo Nível + Sintaxe + Design Patterns + Por Trás do Framework.
     5. Segurança Defensiva, Primitivas Criptográficas & OWASP.
     6. Mapeamento de Possibilidades e Trade-offs (Tabela comparativa lado a lado).

3. **Resposta no Chat:**
   - Explicar de forma didática, profunda e estruturada.
   - Fornecer o link clicável direto para o arquivo criado na pasta `questions/`.
