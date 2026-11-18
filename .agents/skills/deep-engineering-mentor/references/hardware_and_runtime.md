# Referência Técnica: Hardware, Runtime e Primitivas de Baixo Nível

Este documento serve como referência rápida para mapear conceitos de software ao hardware subjacente e às primitivas do sistema operacional.

---

## 1. Escala de Latências Físicas (A Hierarquia de Memória)

Para entender por que um padrão é rápido ou lento, considere a escala de tempo do hardware:

| Componente | Tempo Real Aproximado | Equivalente Humano (1 ciclo = 1 s) |
| :--- | :--- | :--- |
| **1 Ciclo de CPU (3 GHz)** | ~0.3 ns | 1 segundo |
| **Cache L1 de CPU** | ~0.5 - 1.5 ns | ~3 segundos |
| **Branch Mispredict (CPU pipeline flush)** | ~3 - 5 ns | ~10 segundos |
| **Cache L2 de CPU** | ~3 - 5 ns | ~12 segundos |
| **Cache L3 de CPU (compartilhado)** | ~10 - 20 ns | ~40 segundos |
| **RAM (Stack / Acesso Direto)** | ~50 - 100 ns | ~3 a 5 minutos |
| **Alocação no Heap + GC Gen 0** | ~100 - 500 ns | ~10 a 15 minutos |
| **GC Gen 2 (Stop-the-World Collection)** | ~1 - 50 ms | ~1 mês a 5 anos |
| **SSD NVMe (Leitura de bloco 4KB)** | ~10 - 50 µs | ~8 a 15 horas |
| **HD Mecânico (Seek time magnético)** | ~5 - 15 ms | ~6 meses |
| **Chamada de Rede LAN (Mesmo Data Center)** | ~0.5 - 2 ms | ~2 a 4 semanas |
| **Chamada de Rede WAN / Internet (TLS Handshake)** | ~50 - 200 ms | ~5 a 20 anos |

---

## 2. Stack vs Heap & Garbage Collection (.NET / C#)

### Stack (Pilha de Execução)
- **Localização:** Região contígua de memória alocada por thread (normalmente 1 MB por thread no Windows x64).
- **Mecanismo:** Ponteiro de pilha (`RSP` em x86-64) avança e retrocede. Alocação e desalocação custam literalmente 1 instrução assembly (`sub rsp, X` e `add rsp, X`).
- **Conteúdo:** Primitivos (`int`, `bool`, `double`), `struct`, `readonly struct`, `ref struct` (`Span<T>`), e referências/ponteiros (8 bytes em 64 bits) apontando para a Heap.
- **Vida útil:** Determinística. Ocorre pop imediato ao retornar da função. Zero custo para o Garbage Collector.

### Heap (Montículo Dinâmico)
- **Localização:** Memória virtual gerenciada pelo runtime (.NET CLR).
- **Gerações do GC:**
  - **Gen 0:** Objetos de vida curta (DTOs temporários, strings intermediárias). Coleta muito rápida (milissegundos ou microssegundos).
  - **Gen 1:** Buffer entre Gen 0 e Gen 2.
  - **Gen 2:** Objetos de vida longa (Singletons, Caches, Conexões). Coleta cara, pode pausar threads da aplicação (*Stop-the-World*).
  - **LOH (Large Object Heap):** Objetos com mais de 85.000 bytes (arrays grandes, streams bufferizados). Não é compactado por padrão na Gen 2 normal, gerando fragmentação de memória.

---

## 3. CPU, Threads e I/O Assíncrono

### Bloqueio Síncrono (Thread Starvation)
- Quando uma thread executa `File.ReadAllText()` ou `task.Result` / `task.Wait()`:
  - A thread do ThreadPool entra em estado de espera no kernel (`WAIT_STATE`).
  - O sistema operacional precisa fazer **Context Switch** (salvar registradores de CPU, ponteiro de instrução e stack frame) para colocar outra thread em execução. Custo: centenas a milhares de ciclos de clock perdidos.
  - Se 500 requisições simultâneas bloquearem threads, o ThreadPool esgota as threads disponíveis e a API congela (*Thread Pool Starvation*).

### I/O Assíncrono Real (`async` / `await` e IOCP)
- Quando usamos chamadas assíncronas do .NET com cancelamento (`await context.SaveChangesAsync(cancellationToken)`):
  - O runtime despacha a requisição de I/O para o driver de rede ou disco do Windows usando **Overlapped I/O**.
  - A thread do ThreadPool é **imediatamente liberada** para atender outros clientes HTTP.
  - Nenhuma thread fica esperando.
  - Quando a placa de rede ou SSD conclui o envio/recebimento de bytes, o controlador de hardware gera uma **Interrupção de Hardware (IRQ)**.
  - O kernel do Windows enfileira um pacote na porta de conclusão de I/O (**IOCP - I/O Completion Port**).
  - Uma thread livre do ThreadPool acorda, pega o pacote e retoma a máquina de estados gerada pelo compilador (`IAsyncStateMachine`) exatamente de onde o `await` parou.

---

## 4. Despacho Virtual e VTable (Interfaces e Polimorfismo)

- **Interfaces e Métodos Virtuais:**
  - Toda classe com métodos virtuais ou implementações de interface possui um ponteiro oculto para uma tabela de métodos virtuais (**VTable** / Interface Dispatch Table).
  - Chamada direta não virtual: `call MethodAddress` (resolvida em tempo de compilação ou JIT).
  - Chamada de interface: Ponteiro do objeto $\rightarrow$ MethodTable $\rightarrow$ Interface Map $\rightarrow$ Salto para código real.
  - O JIT do .NET utiliza **Tiered Compilation** e **Guarded Devirtualization** para transformar chamadas de interface frequentes em saltos diretos monomórficos, habilitando inline pelo processador.
