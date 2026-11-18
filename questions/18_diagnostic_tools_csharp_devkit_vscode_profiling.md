# 18: Diagnostic Tools no C# Dev Kit (VS Code) vs Visual Studio: Como Monitorar Memória, CPU e Eventos

---

## 1. O Enredo do Exercício (Cenário e Gargalo Físico Real)

- **Cenário & Volumetria de Negócio:**
  O desenvolvedor está desenvolvendo no Visual Studio Code (utilizando o **C# Dev Kit**) e deseja inspecionar em tempo real o consumo de memória RAM (Heap, Garbage Collector Gen 0/1/2), uso de CPU, saturação de threads e disparo de eventos/exceções durante a depuração, procurando a clássica janela **"Diagnostic Tools"** que existe no Visual Studio tradicional.
- **Onde está a dor física e de engenharia?**
  1. **Diferença de Ferramental entre IDEs:**
     O Visual Studio Full (Community/Pro/Enterprise) possui uma janela proprietária embutida chamada **Diagnostic Tools** (`Ctrl+Alt+F2`), que renderiza gráficos em tempo real com DirectX/WPF do consumo de memória e coletas de GC. O **C# Dev Kit do VS Code NÃO possui essa janela gráfica nativa idêntica**.
  2. **Acesso aos Dados de Baixo Nível no VS Code:**
     Embora o VS Code não tenha essa janela visual fixa, o .NET possui uma arquitetura de diagnóstico unificada de primeiro nível via **EventPipe** e ferramentas CLI de telemetria em tempo real que fornecem dados muito mais profundos do que a janela visual básica.
  3. **Gargalo Real de Performance:**
     Identificar se uma requisição está sofrendo por:
     - **Memory Leaks / Pressão de GC:** Alocações excessivas no Heap forçando pausas *Stop-the-World* de Gen 2.
     - **ThreadPool Starvation:** Esgotamento de threads síncronas bloqueadas.
     - **Exception Flooding:** Disparo massivo de exceções de primeira chance (*First-chance exceptions*) que degradam o clock da CPU.

---

## 2. As Variáveis Físicas (Hardware, OS e Infraestrutura)

| Métrica / Recurso | O Que a CPU e o Sistema Operacional Medem | Impacto no Diagnóstico |
| :--- | :--- | :--- |
| **Working Set (RAM Física)** | Conjunto de páginas de 4 KB na memória física (RAM real) ocupadas pelo processo `MyApp.Api.exe`. | Medido via syscall do kernel do Windows (`GetProcessMemoryInfo`). |
| **GC Heap (Gen 0, Gen 1, Gen 2, LOH)** | Memória virtual alocada pelo alocador do .NET CLR para instâncias de objetos C#. | Gen 0/1 coletam em microssegundos; Gen 2/LOH causam pausas na aplicação. |
| **EventPipe (Named Pipes / IPC)** | Canal IPC local (`\\.\pipe\dotnet-diagnostic-<PID>`) sem passar pela pilha de rede TCP/IP. | Transmite eventos de telemetria binária em microssegundos com custo de CPU < 1%. |
| **Context Switches (Trocas de Contexto)** | Quantidade de vezes por segundo que o scheduler da CPU alterna entre threads. | Indica se há concorrência excessiva ou bloqueios desnecessários via `.Result` ou `.Wait()`. |

---

## 3. A "Fórmula" e o Algoritmo (Heurísticas de Diagnóstico de Processo)

### 3.1. Taxa de Alocação de Memória

$$\text{Taxa de Alocação (MB/s)} = \frac{\Delta \text{Allocated Bytes}}{\Delta t}$$

Uma API REST de alto desempenho deve ter uma taxa de alocação próxima a zero para consultas em cache ou operações de leitura com `Span<T>` e `Memory<T>`.

### 3.2. A Relação de Eficiência do Garbage Collector

$$\text{Taxa de Sobrevivência} = \frac{\text{Bytes Promovidos para Gen } (N+1)}{\text{Bytes Alocados em Gen } N}$$

Se mais de 10% a 20% dos objetos de curta duração sobrevivem à Gen 0 e chegam à Gen 2, há um problema clássico de retenção indevida de memória (*Memory Leak* por eventos não desinscritos, singletons estáticos ou Change Tracker acumulado).

---

## 4. Primitivas de Baixo Nível + Ferramentas Oficiais no VS Code

No VS Code (com C# Dev Kit), você tem **3 formas poderosas** de visualizar Process Memory, CPU e Eventos:

### Método 1: `dotnet-counters` (O "Diagnostic Tools" em Tempo Real no Terminal)

O `dotnet-counters` é a ferramenta oficial mais próxima da janela de diagnóstico do Visual Studio, rodando direto no terminal com atualização a cada 1 segundo.

#### 1. Instalar globalmente:
```bash
dotnet tool install -g dotnet-counters
```

#### 2. Executar enquanto sua API está rodando:
```bash
dotnet counters monitor --name MyApp.Api
```
*(Ou use o PID do processo com `--process-id <PID>`)*

#### O que você verá na tela em tempo real:
```text
[System.Runtime]
    % Time in GC since last GC (%)                         0
    Allocation Rate (B / 1 sec)                       32,450
    CPU Usage (%)                                          1
    Exception Count (Count / 1 sec)                        0
    GC Fragmentation (%)                                  12
    GC Heap Size (MB)                                     18
    Gen 0 GC Count (Count / 1 sec)                         0
    Gen 1 GC Count (Count / 1 sec)                         0
    Gen 2 GC Count (Count / 1 sec)                         0
    LOH Size (B)                                     124,000
    Number of Active Timers                                2
    Number of Assemblies Loaded                           94
    ThreadPool Completed Work Item Count (Count / 1 sec)   4
    ThreadPool Queue Length                                0
    ThreadPool Thread Count                                6
    Working Set (MB)                                      48
```

---

### Método 2: .NET Aspire Dashboard (A Interface Gráfica Moderna do .NET 8/9/10)

Se você quer uma **interface web gráfica rica** com gráficos, traces de requisição, métricas de memória e logs estruturados em tempo real:
1. O .NET moderno permite rodar o **Aspire Dashboard** como um contêiner Docker leve ou standalone.
2. Ele se conecta via OpenTelemetry e exibe em um painel visual no navegador todo o tráfego da API, latência em percentis (p95, p99) e métricas de memória do processo.

---

### Método 3: Coleta de Dumps e Heap Profiling (`dotnet-gcdump` e `dotnet-dump`)

Para tirar uma "foto" da memória RAM do processo e descobrir quais classes estão consumindo a memória:

```bash
# 1. Instalar ferramenta
dotnet tool install -g dotnet-gcdump

# 2. Tirar um snapshot leve da memória enquanto a API roda
dotnet-gcdump collect --name MyApp.Api

# 3. O arquivo gerado (.gcdump) pode ser aberto no VS Code ou no Visual Studio para inspecionar os objetos no Heap!
```

---

### E no Visual Studio Tradicional (Full)?

Se em algum momento você abrir a solução no Visual Studio Community/Professional:
- A janela fica em: **Debug $\rightarrow$ Windows $\rightarrow$ Show Diagnostic Tools** (ou atalho **`Ctrl + Alt + F2`**).
- Ela abre automaticamente durante o F5 mostrando o gráfico de Process Memory (MB), CPU (%) e os pontos exatos onde o GC rodou.

---

## 5. Segurança Defensiva, Primitivas Criptográficas & OWASP

### 5.1. OWASP A09:2021 – Security Logging and Monitoring Failures

Monitorar métricas de processo é um requisito de segurança operacional:
- **Ataques de DoS/Resource Exhaustion:** Um pico repentino no contador `ThreadPool Queue Length` ou `GC Heap Size` indica ataque de negação de serviço ou processamento de payloads maliciosos descomprimidos (*Zip Bombs* / *XML Entity Expansion*).

### 5.2. Cuidado Crítico com Dumps de Memória (`.dmp`)

- **Vazamento de Segredos:** Ao gerar um dump completo de processo (`dotnet-dump collect`), o arquivo contém uma cópia exata de todos os bytes da memória RAM do processo no momento.
- Isso inclui:
  - Connection strings decodificadas.
  - Chaves privadas de JWT e certificados SSL.
  - Senhas de usuários e dados de clientes em trânsito.
- **Diretriz de Segurança:** Arquivos `.dmp` nunca devem ser enviados por chat, commitados no Git ou armazenados em servidores sem controle de acesso restrito (RBAC).

---

## 6. Mapeamento de Possibilidades e Trade-offs (Matriz de Decisão)

| Ferramenta | Interface | O que monitora | Facilidade de Uso | Veredito de Engenharia |
| :--- | :--- | :--- | :--- | :--- |
| **Janela Diagnostic Tools (Visual Studio Full)** | GUI integrada no editor | CPU, Memória, Eventos, GC, IntelliTrace. | Padrão do Visual Studio (`Ctrl+Alt+F2`). | ⚠️ **Não existe nativamente no VS Code.** |
| **`dotnet-counters` (Recomendado no VS Code)** | Terminal CLI em tempo real | CPU %, Working Set, Heap, Gen 0/1/2, ThreadPool. | Instantâneo (`dotnet-counters monitor`). | 🚀 **Melhor opção rápida para VS Code.** |
| **`dotnet-gcdump`** | Arquivo `.gcdump` inspecionável | Árvore de objetos alocados no Heap e quem os segura. | Leve e seguro para rodar em produção/dev. | ✅ **Ideal para debugar vazamentos de RAM.** |
| **.NET Aspire Dashboard / OpenTelemetry** | Interface Web rica (Navegador) | Traces de requisições, métricas L4/L7, logs e memória. | Padrão moderno da Microsoft para .NET 9/10. | 🌟 **Padrão de Ouro para microsserviços modernos.** |

---

## Resumo e Como Usar Agora

No VS Code, para ver os eventos e a memória do seu processo `MyApp.Api`:
1. Abra um novo terminal.
2. Instale o monitor:
   ```bash
   dotnet tool install -g dotnet-counters
   ```
3. Inicie o monitoramento em tempo real da sua API:
   ```bash
   dotnet counters monitor --name MyApp.Api
   ```
Você terá um painel ao vivo com CPU, memória, coletas do GC e threads atualizado a cada segundo!
