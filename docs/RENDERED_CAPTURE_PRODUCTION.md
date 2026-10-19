# Captura renderizada em produção

Escrito em 13/10/2026 e revisto em 14/10/2026 e em 19/10/2026.

**Estado em 19/10/2026: ativo em produção.**

- **Fly.io:** o renderizador roda com o teto de 50 h por mês.
- **Vercel:** a produção tem `SKYLINE_RENDERER_URL` e `SKYLINE_RENDERER_SECRET`, e `GET /api/capture` responde `{"detailed":true}`.
- **Critérios:** os de lançamento, de 2 a 9, foram verificados no Fly e em produção (seção 9). O critério 6 foi aceito com 7 de 11 páginas, porque as diferenças são regionais. O critério 10, uma semana de observação, vai até 26/10.

**O que mudou no caminho:**

- **No Fly, o `cordon` automático pelo socket `/.fly/api` foi recusado.** O socket foi trocado por um token restrito.
- **O proxy do Fly ainda ligou uma vez uma máquina que tinha acabado de entrar em `cordon`.** Por isso, no teto, a máquina também retira os IPs públicos do app, uma trava que não depende do proxy.
- **A checagem de disponibilidade passou de 10 s para 30 s.** A partida a frio fica perto de 8 s, e com o limite antigo a opção "Explore in more detail" às vezes não aparecia.

## 1. Arquitetura

```
visitante ──▶ Vercel (app Next.js, como hoje)
               │  POST /api/capture
               │    captura estática (safe-fetch)          ← caminho padrão, sem navegador
               │    só se for casca de SPA, ou "Explore in more detail":
               │       POST /render, assinado por HMAC ──▶ serviço de renderização (contêiner à parte)
               │                                            │  fila, limite por visitante, cache curto
               │                                            │  1 Chromium + 1 proxy de saída por captura
               │                                            ▼
               │                                          página pública (só CONNECT :443, IP validado)
               │    ◀── página montada e medida (HTML + caixas + CSS injetado)
               │    snapshotFromRendered(): o mesmo parser, as mesmas recusas
               ▼
             cidade (unitsOf, composeEnsemble: sem mudança)
```

**O navegador não roda na Vercel.**

| | | Origem |
|---|---|---|
| Plano e configuração do projeto | Hobby, região `iad1`, Fluid ligado, nenhuma variável de ambiente definida | Lido da API da Vercel em 13/10 |
| CPU incluída no Hobby | 4 horas de CPU ativa por mês; passando disso, a função fica indisponível até completar 30 dias. Uma captura renderizada usa segundos de CPU inteira: alguns milhares de capturas parariam o site todo | Documentação da Vercel; a conta é minha |
| Saída de rede | Sem firewall de saída no Hobby; a função carrega os segredos do app | Documentação da Vercel |
| Sandbox e rede interna | O Chromium empacotado para Lambda costuma rodar com `--no-sandbox`, e a função alcança a API de runtime em `127.0.0.1` | Análise do relatório anterior, não testada |

O serviço à parte não guarda nenhum segredo do app, roda o Chromium com o sandbox dele e tem teto físico de recursos. Enquanto o app espera a resposta, a função da Vercel está em espera de rede, que não conta como CPU ativa.

**O serviço devolve a página, não o snapshot.** O contrato antigo (`SKYLINE_RENDERER_URL` respondendo um `DomSnapshot`) nunca teve nada do outro lado. O serviço agora devolve o que `renderPage()` já produzia localmente, e é o app que chama `snapshotFromRendered()`. Com isso há um parser só, o serviço não precisa ser publicado junto a cada mudança do snapshot, e a resposta de um serviço eventualmente comprometido é tratada como qualquer HTML da internet.

### Alternativas avaliadas

| | Complexidade | Custo | Latência | Confiabilidade e segurança | Manutenção |
|---|---|---|---|---|---|
| Chromium numa função da Vercel | Baixa | Disputa as 4 h de CPU do site | Partida a frio com descompactação | Sem sandbox, sem isolamento de rede, segredos no mesmo processo | Pacote do Chromium a cada deploy |
| **Contêiner próprio (escolhida)** | Média: um Dockerfile e duas variáveis | Ver seção 4 | 3 a 12 s medidos; partida a frio depende do host | Sandbox ligado, sem segredos do app, teto de recursos | Reconstruir a imagem para atualizar o Chromium |
| Cloudflare Browser Run | Alta: reescrever a captura para o Puppeteer da Cloudflare, que só devolve valores primitivos de `page.evaluate()` | US$ 5/mês fixos | — | Isolamento por conta deles; todo pedido sai identificado como bot | Outra base de código |
| Browserless (navegador remoto por WebSocket) | Média | Grátis até 1.000 unidades; US$ 35/mês para 20.000 | Cada pedido interceptado cruza a internet | O proxy de saída deixa de valer: a rede do navegador é a deles | Token pago no app |

## 2. Reaproveitado e implementado

**Reaproveitado sem mudança de comportamento:** `render-page.ts` (espera, medição `MEASURE_BOXES`, imagens respondidas da memória, filtro de requisições), `snapshotFromRendered()` e todas as recusas (desafio, login, 403), `unitsOf`, `composeEnsemble`, a decisão de `acquire()` (estática primeiro), `rendererReady()` e a rota `GET /api/capture`, `capture-mode.ts` e toda a interface de "Explore in more detail".

**Implementado:**

| Arquivo | O que é |
|---|---|
| `src/lib/acquisition/egress-proxy.ts` | Proxy de saída da fase 2: só `CONNECT host:443`, política de URL, DNS resolvido no proxy por um resolvedor assíncrono (sem `/etc/hosts`, com prazo e no máximo 8 consultas simultâneas por captura), todos os endereços públicos ou recusa, conexão no endereço validado, tetos de conexões, bytes e ociosidade |
| `src/lib/acquisition/render-page.ts` | O navegador passa a sair só pelo proxy (inclusive na captura local); WebRTC, WebTransport e `window.open` removidos de todo documento antes dos scripts da página; teto de navegações; tamanho do HTML conferido dentro do navegador antes de transferir; download ou resposta vazia viram "não é uma página"; queda do processo da página encerra a captura; cancelamento que não depende do driver; primeiro endereço conferido antes de abrir o navegador |
| `src/lib/acquisition/local-browser.ts` | Lançamento com proxy, sem resolução de nomes própria, sem porta de depuração (`pipe`), heap do V8 limitado, sem variáveis de ambiente com segredos; morte do grupo de processos |
| `src/lib/acquisition/renderer-protocol.ts` | Assinatura HMAC dos pedidos e validação de forma e tamanho da resposta |
| `src/lib/acquisition/rendered-capture.ts` | Cliente remoto: assinatura, prazo, teto de bytes, validação, erros sem detalhes internos, checagem assinada de saúde. Só uma queda de verdade (serviço inalcançável, mudo, resposta inválida, navegador que não inicia) pausa o serviço por 15 s; um erro causado pela página é dito como erro da página |
| `src/lib/acquisition/acquire.ts` | A decisão de `acquire()` num módulo testável (o `index.ts` continua sendo a entrada com `server-only`) |
| `renderer/service.ts`, `renderer/server.ts`, `renderer/Dockerfile`, `renderer/fly.toml` | O serviço: autenticação, fila, limite por visitante, cache, uma captura para pedidos iguais (que não é reaproveitada depois de cancelada), sonda que abre o navegador de verdade, resposta acima do limite recusada como "grande demais", registros só com o host, aviso se o socket da API de máquinas do host estiver acessível, encerramento limpo |
| `src/app/api/capture/route.ts`, `rate-limit.ts` | `maxDuration` 75 s; captura renderizada custa 3 fichas; identificador anônimo do visitante repassado ao serviço; visitantes IPv6 contados por /64 |
| `src/lib/acquisition/errors.ts`, `PixelApp.tsx` | Erro novo `renderer_busy`; texto de "sem navegador disponível"; a opção some depois de uma falha por indisponibilidade |
| `src/lib/snapshot/css-scan.ts` | Leitores lineares de CSS (ver "Achado fora do escopo") |
| `scripts/egress`, `scripts/renderer-service`, `scripts/css-scan` | Testes e a ferramenta `npm run renderer:ask` |

### Achado fora do escopo, corrigido porque bloqueava a entrega

O leitor de CSS do snapshot, que já está em produção no caminho estático, tinha expressões regulares de custo quadrático.

- **Em páginas reais:** o parser levava 45 s no Pinterest renderizado, 14,9 s na home do GitHub e 4,4 s no Guardian. Agora leva 172, 98 e 176 ms.
- **Como abuso:** 60 KB de texto sem chaves dentro de um `<style>` custavam cerca de 25 s de CPU por pedido, em qualquer captura, estática inclusive.

A correção troca seis expressões por varredores lineares e limita a expansão de `var()`. O resultado é o mesmo: 150.000 entradas aleatórias comparadas com as expressões originais, e 31 páginas reais (8,6 MB de CSS) com snapshot idêntico byte a byte entre o código antigo e o novo. A única mudança de leitura é deliberada: num atributo `style` com mais de 8 KB, a imagem de fundo só é procurada nos primeiros 8 KB.

## 3. Configuração para produção

O host é o Fly.io, com um teto de **R$ 20 por mês** para essa infraestrutura. A configuração está em [`renderer/fly.toml`](../renderer/fly.toml). O que já existe no Fly e o que foi medido lá está na seção 9.

**A máquina:** uma só, `performance-1x` (1 vCPU dedicada, 2 GB), em `iad`, a mesma região das funções da Vercel. Ela fica parada até chegar um pedido, liga sozinha e para sozinha:

- `auto_stop_machines = "stop"`, `min_machines_running = 0` e nenhuma máquina de reserva (`--ha=false`).
- O próprio serviço sai quando fica parado: 60 s depois da última captura, 20 s depois da última checagem de saúde e 30 s depois de ligar se nenhum pedido assinado chegar. Ao sair com código 0, a máquina para e só liga de novo no próximo pedido (`restart = on-failure`). O desligamento automático do Fly, que leva "alguns minutos", fica como segunda camada.
- As checagens de saúde do Fly (`/healthz`) não mantêm a máquina ligada (a equipe do Fly diz que só pedidos de fora, pelo proxy, contam) e não contam como atividade para o serviço.

Por que `performance-1x` e não `shared-cpu-2x`, que custa menos da metade:

- **A CPU compartilhada do Fly tem cota.** Na documentação: 5 ms a cada 80 ms por vCPU, somados entre as vCPUs (12,5% de um núcleo numa `shared-cpu-2x`), mais um crédito de rajada que começa em 5 s por vCPU.
- **Uma captura gasta 1,4 a 6,3 s de CPU.** Média de 3,4 s, medida no contêiner em 12 páginas reais.
- **Com o crédito esgotado, nada passa.** Com a cota reproduzida no Docker, Hacker News, Books to Scrape e Guardian estouraram os 22 s. Com uma CPU inteira, as cinco páginas testadas passaram em 3,4 a 11,9 s.

**Por que `stop` e não `suspend`:** `stop` devolve o sistema de arquivos limpo a cada partida. Depois de um `suspend`, o relógio pode ficar alguns segundos atrás, e a assinatura dos pedidos tem janela de 90 s. Parada, a máquina custa o mesmo nos dois modos.

**Um volume de 1 GB** (`/data`) guarda o registro de uso do mês, para que os tetos da seção 4 sobrevivam a cada desligamento. Sem ele, a máquina volta limpa a cada partida e nenhum limite global seria possível. Ele custa cerca de R$ 0,83/mês.

**O contêiner começa como root só para três coisas:**

- dar o volume ao usuário do serviço;
- fechar o socket da API de máquinas do Fly (`/.fly/api`) para esse usuário;
- quando o teto do mês acaba, retirar os IPs públicos do app e tirar a própria máquina do roteamento.

O Node e o Chromium rodam sem privilégios (`setpriv`). Os dois tokens do Fly são retirados do ambiente antes de o Node iniciar, então só os processos root os têm.

**Serviço de renderização**

| Variável | Valor |
|---|---|
| `SKYLINE_RENDERER_SECRET` | Obrigatória, 32 caracteres ou mais (`openssl rand -hex 32`), definida com `fly secrets set`. É o segredo que o app e o serviço compartilham |
| `SKYLINE_RENDERER_IPS_TOKEN` | Segredo do Fly com o token que só libera IPs deste app (seção 7). Só o root o lê. Sem ele, o serviço ainda para no teto, mas os IPs ficam |
| `SKYLINE_RENDERER_CORDON_TOKEN` | Segredo do Fly com o token restrito do `cordon` (seção 7). Só o root o lê. Sem ele, o serviço ainda para no teto, mas não sai do roteamento |
| `SKYLINE_RENDERER_MONTHLY_HOURS` | 50: horas ligada por mês antes de parar de vez (seção 4). Com 0, o renderizador fica desligado: assim que liga, pausa, retira os IPs e faz `cordon` |
| `SKYLINE_RENDERER_DAILY_CAPTURES` | 100: capturas novas por dia (UTC) antes de pausar até o dia seguinte |
| `SKYLINE_RENDERER_IDLE_EXIT_SECONDS` | 60: segundos sem captura antes de sair |
| `SKYLINE_RENDERER_USAGE_FILE` | `/data/usage.json`, no volume |
| `SKYLINE_RENDERER_BOOT_SECONDS` | 5: segundos somados a cada partida, pelo tempo de ligar e desligar a máquina |
| `PORT`, `SKYLINE_RENDERER_CONCURRENCY`, `SKYLINE_RENDERER_QUEUE` | 8080, 2 capturas simultâneas, 4 em espera |
| `SKYLINE_RENDERER_NO_SANDBOX` | Não definir |

- Imagem: `renderer/Dockerfile` (Debian 13, Chromium do repositório de segurança). O contexto de build é a raiz do repositório, e o build é local (`--local-only`), o que evita qualquer cobrança de builder. No `fly.toml`, o `dockerfile` é relativo ao próprio `fly.toml`.
- O Fly verifica `GET /healthz` (5 s depois de ligar, depois a cada 15 s), que responde só "ok" e não abre o navegador.
- O nome do app deve ser difícil de adivinhar (por exemplo `skyline-renderer-` seguido de 8 letras aleatórias): a URL do serviço nunca vai para o navegador do visitante, e um nome secreto reduz quem consegue acordar a máquina.

**App na Vercel**

| Variável | Valor |
|---|---|
| `SKYLINE_RENDERER_URL` | `https://<app>.fly.dev`, sem caminho |
| `SKYLINE_RENDERER_SECRET` | O mesmo segredo |

Sem as duas, ou com o serviço fora do ar ou pausado, o app se comporta como hoje para a captura padrão.

**Desligar na hora, sem afetar a captura estática:**

- Para cortar todo acesso de fora: `fly ips list` e `fly ips release <ip>` para cada IP. Sem IP, nenhum pedido da internet chega ao app.
- `fly machine stop <id>` e depois `fly machine cordon <id>`. A máquina sai do roteamento: no Fly, os pedidos ficam cerca de 38 s no proxy e voltam com 503. A exceção é um `cordon` feito com a máquina ligada, depois do qual o proxy ainda a ligou uma vez (seção 9).
- Para voltar: `fly ips allocate-v6`, `fly ips allocate-v4 --shared` e `fly machine uncordon <id>`. Os caches de DNS podem levar alguns minutos para pegar os IPs novos.
- `fly scale count 0` também serve, mas apaga a máquina (o volume fica).

### Desligamento e retomada

| Passo | Tempo que o app espera |
|---|---|
| Checagem de saúde (`GET /api/capture`) | Até 30 s. Só é feita quando uma cidade padrão está na tela, e uma resposta "pronto" vale 2 horas por instância da Vercel. Com a máquina parada, a resposta inclui ligá-la e abrir o Chromium: cerca de 8 s medidos no Fly. Na primeira partida depois de um deploy, a máquina ainda baixa a imagem (19 s no primeiro deploy). Com o limite antigo, de 10 s, a resposta chegava perto do limite, e a opção "Explore in more detail" deixava de aparecer naquela cidade. A checagem roda em segundo plano: um limite maior só faz a opção aparecer mais tarde |
| Captura renderizada | até 40 s: partida a frio, fila de até 8 s, captura de até 22 s, encerramento |
| Rota `/api/capture` | `maxDuration` de 75 s |
| Serviço pausado | O app não o chama de novo por 30 minutos |
| Falha | Pausa de 15 s nas cascas de SPA |

Simulei o proxy do Fly localmente: contêiner parado, com uma CPU, que só liga quando chega o primeiro pedido. A checagem de saúde saindo do zero respondeu em 0,64 s, e uma captura em 4,9 a 5,2 s. A confirmação no Fly está nos critérios de lançamento.

## 4. Custos e proteção do orçamento

### Premissas verificáveis

| | Valor | Fonte |
|---|---|---|
| Dólar | R$ 5,0096 (PTAX venda de 13/10/2026) | API de dados do Banco Central, série PTAX |
| IOF em compra internacional no cartão | 3,5% | Decreto 12.499/2025, segundo guias de 2026 (o texto do decreto não foi aberto) |
| Spread do banco sobre a PTAX | 6% (suposição; varia por emissor) | Estimativa |
| Dólar efetivo na fatura | **R$ 5,50** (5,0096 × 1,035 × 1,06) | Cálculo |
| `performance-1x` ligada | US$ 0,00001273/s = US$ 0,0458/h = **R$ 0,252/h** | Página de preços do Fly |
| Máquina parada | US$ 0,15 por GB de disco por mês | Página de preços do Fly |
| Volume | US$ 0,15 por GB por mês, cobrado ligado ou não | Página de preços do Fly |
| Snapshots do volume | 10 GB grátis por mês | Página de preços do Fly |
| Saída de dados | US$ 0,02/GB; entrada grátis | Página de preços do Fly |
| IPv4 compartilhado e IPv6 | Grátis | Página de preços do Fly |

### Custos fixos por mês

| Item | Estimativa |
|---|---|
| Volume de 1 GB | US$ 0,15 = R$ 0,83 |
| Disco da máquina parada (imagem de cerca de 1,7 GB) | US$ 0,26 = R$ 1,40 |
| Snapshots (o registro tem menos de 1 KB) | R$ 0 |
| Tráfego de saída (8 a 134 KB por captura) | menos de R$ 0,10 |
| IP, certificado (`*.fly.dev`), builder (build local) | R$ 0 |
| **Total** | **cerca de R$ 2,30** |

### Quanto tempo ligada cabe em R$ 20

- **Sem nenhuma margem:** (R$ 20 − R$ 2,30) ÷ R$ 0,252/h = cerca de 70 h.
- **Com o teto escolhido:** **50 h por mês**, que custam R$ 12,60. Somados aos fixos, dão **R$ 14,90 no pior mês normal**.
- **Margem:** sobram R$ 5,10 (25%) para variação do câmbio, um spread maior e cobranças que o Fly não detalha.

### Projeção por volume de uso

Uma visita que pede uma captura deixa a máquina ligada cerca de 75 s: 5 s para ligar, a captura, e 60 s até ela sair sozinha. Uma checagem de saúde que acorda a máquina custa cerca de 25 s.

| Uso por dia | Horas ligada no mês | Custo estimado no mês |
|---|---|---|
| 5 visitas com captura, 10 checagens | cerca de 5 h | R$ 3,60 |
| 20 visitas com captura, 40 checagens | cerca de 21 h | R$ 7,50 |
| 50 visitas com captura, 60 checagens | cerca de 44 h | R$ 13,30 |
| Mais que isso | 50 h, e a renderização para até o mês seguinte | R$ 14,90 |

### Proteções e o que cada uma garante

| Proteção | Tipo | O que garante |
|---|---|---|
| Teto mensal de 50 h ligada, gravado no volume | Do Skyline, persistente | Conta todo o tempo em que o processo fica de pé, qualquer que seja o motivo, inclusive tráfego de fora; grava a cada 5 s e soma 5 s por partida. Ao passar do teto, o serviço sai, e o processo root retira os IPs públicos do app e tira a máquina do roteamento (`cordon`), cada um com seu token restrito: nenhum pedido da internet chega a ela neste mês. Volta no mês seguinte, à mão, com IPs novos e `fly machine uncordon` |
| Registro ausente, ilegível ou sem gravação | Do Skyline | Sem volume, ou sem conseguir gravar: o serviço pausa, retira os IPs e faz `cordon`. Registro ilegível: é guardado como `usage.json.unreadable-…`, o mês é tratado como gasto e o serviço volta sozinho no mês seguinte |
| Teto diário de 100 capturas novas, gravado no volume | Do Skyline, persistente | Um dia de abuso não gasta o mês inteiro. Conta só capturas que de fato começam: respostas do cache, pedidos iguais em andamento e pedidos recusados por "ocupado" não contam. A contagem é síncrona, então pedidos simultâneos não passam do teto. Ao chegar a 100, o serviço pausa até 0h UTC, sem retirar os IPs nem fazer `cordon` |
| Saída por ociosidade (60/20/30 s) | Do Skyline | Cada acordar custa segundos, não minutos |
| Uma máquina só, sem reserva | Configuração do Fly | O teto físico é uma máquina |
| Limite por visitante | Do Skyline, na memória | Por instância da Vercel e por partida do serviço; dificulta abuso, mas não é global |
| Cache e uma captura para pedidos iguais | Do Skyline, na memória | Evita trabalho repetido enquanto a máquina está ligada |
| Checagem de saúde só com cidade na tela e guardada 2 h; 30 min sem chamar depois de uma pausa | Do Skyline | Evita acordar a máquina por quem só abre a página |
| `fly ips release` e `fly machine cordon` | Manual | Desliga na hora, sem afetar a captura estática |
| Registros e checagem de saúde com o uso do mês | Métrica | `npm run renderer:ask` mostra horas, partidas e capturas do mês e do dia |
| Teto de gasto no Fly | **Não existe** | A documentação do Fly não tem limite de gasto nem alerta |
| Créditos pré-pagos do Fly | Do Fly, não confirmado | Compra mínima de US$ 25 (cerca de R$ 140). A equipe do Fly disse no fórum, há anos, que apps são suspensos quando os créditos acabam, mas outro usuário relata cobrança no cartão depois. Só vale confirmado com billing@fly.io |
| Alertas | **Não existe no Fly** | Recomendo acompanhar pelo `renderer:ask` e pelo painel do Fly; nenhum dos dois para cobranças |

**Grau real de proteção.**

- **Uso que passa pelo Skyline:** o teto mensal limita o gasto a cerca de R$ 15, gravado em disco e independente de reinícios, deploys ou de quantas instâncias da Vercel existam.
- **O teto é contado pelo próprio serviço.** Ele soma 5 s por partida para cobrir o que acontece antes de ele iniciar; a comparação com o painel do Fly está nos critérios.
- **O que já foi visto no Fly** (seção 9):
  - a máquina faz `cordon` sozinha com o token restrito;
  - depois de um `cordon` feito com a máquina ligada, o proxy ainda a liga uma vez, por cerca de 2,3 s, e depois respeita o `cordon`;
  - uma máquina que já estava em `cordon` não é ligada.
- **Por que retirar os IPs:** essa partida única não está documentada pelo Fly e pode mudar. Sem IPs, nenhum pedido de fora chega ao app, qualquer que seja o comportamento do proxy.
- **O que fica descoberto:** a retirada dos IPs feita de dentro da máquina ainda precisa ser vista no Fly.
- **Se as duas travas falharem:** depois do teto, cada pedido ainda liga a máquina por cerca de 2,3 s (ligar, ver que está pausada, sair). Alguém que descubra o endereço e o chame sem parar poderia mantê-la quase sempre ligada, até US$ 33/mês, cerca de R$ 180. A proteção nesse caso é o nome secreto do app e a retirada manual dos IPs.

### Limites de uso

| | |
|---|---|
| Por captura | 22 s, 400 pedidos, 250 conexões, 64 MB trafegados, 4 MB de HTML, 10 navegações, janela de 1440×900, sem rolagem |
| No serviço | 2 capturas simultâneas, 4 em espera por até 8 s, 4 capturas seguidas por visitante (por partida) e depois uma a cada 30 s, cache de 3 minutos para 12 páginas, 100 capturas por dia, 50 h por mês |
| No app | Captura renderizada custa 3 das 8 fichas do visitante (por instância); resposta do serviço limitada a 16 MB; espera de até 40 s |

## 5. Testes e verificações

| Comando | Resultado |
|---|---|
| `npm run lint`, `npm run typecheck`, `npm run build` | Limpos. Nenhum arquivo de navegador entra nas funções do app |
| `npm test` | 333 verificações, 0 falhas (as 321 anteriores e 12 de `test:css`) |
| `npm run test:capture` no macOS (Chrome 155, sandbox ligado) | 154 verificações, 0 falhas: 34 de `test:rendered`, 44 de `test:egress`, 76 de `test:renderer` |
| O mesmo num contêiner Linux (Chromium 155 do Debian, `CI=1`) | 154 verificações, 0 falhas; `test:css` também |

O que cada suíte nova guarda:

- **`test:egress`**: o proxy sozinho (literais privados, nomes internos, nome público que resolve para rede privada, um endereço privado entre públicos, rebinding, portas, HTTP puro, tetos, DNS que não responde, consultas simultâneas) e um Chrome de verdade atrás dele, contra um servidor HTTPS local: `fetch`, frame, script e WebSocket para rede privada, WebSocket para loopback, rebinding entre dois pedidos, redirecionamento de host público para privado, 500 conexões, página em laço infinito, página que esgota memória, página que cresce além do limite, download e resposta vazia, WebRTC e WebTransport (na página, em frames, em popups e em workers, contando pacotes UDP), segredos fora do ambiente do navegador, redirecionamento sem fim, captura cancelada e nenhum processo sobrando.
- **`test:renderer`**: assinatura; serviço sem assinatura, com segredo errado, com assinatura reaproveitada ou velha; política de endereços aplicada pelo próprio serviço; endereços longos depois de codificados; concorrência, fila, limite por visitante, pedidos iguais, cancelamento e novo pedido logo depois; erro da página × queda do serviço; resposta grande demais; registros sem caminho; visitantes IPv6 por /64; cliente contra serviço fora do ar, mudo, com 9 tipos de resposta inválida e ocupado; erros sem caminhos, endereços ou segredos; as decisões de `acquire()`; e a mesma página lida localmente e pelo serviço.
- **`test:css`**: os varredores contra as expressões que substituem, e tempo de leitura de 1 MB de cada formato problemático.

### Verificações reais

**Local × remoto, mesma janela, mesmo código.** Chrome 155 no macOS contra Chromium 155 no contêiner Linux, saindo pelo mesmo IP.

| | |
|---|---|
| Páginas controladas (prateleira de cartões, app montado por script) | Snapshot idêntico, elemento por elemento e caixa por caixa; mesmas unidades; mesma cidade |
| Books to Scrape, Hacker News, itch.io, Guardian, LEGO, Gutenberg, IKEA, Spotify, Paul Graham, Vimeo, Mastodon | Mesma leitura nas 11: largura da página, territórios, estruturas e séries (tipo, itens por fileira, contagem) |
| Bluesky, Pinterest, Airbnb | Leituras diferentes. As três também saem diferentes em duas capturas seguidas com o mesmo navegador local: a página muda entre visitas |

Diferenças legítimas observadas:

- **Fontes.** A altura da página muda entre macOS e Linux (Hacker News 1249 × 1213 px, Books to Scrape 2569 × 2549, Guardian 20573 × 20395). Largura, itens por fileira e séries não mudaram em nenhuma página.
- **Conteúdo dinâmico.** Feeds e vitrines personalizadas mudam a cada visita (Bluesky de 2.389 a 3.531 elementos).
- **Cache do serviço.** Duas pessoas pedindo a mesma página em menos de 3 minutos recebem a mesma captura.
- **Não exercitado aqui:** conteúdo que varia por país ou por reputação do IP. As duas vias saíram da mesma máquina.

**Sandbox.** No contêiner, como usuário sem privilégios, sem capacidades e com sistema de arquivos somente leitura, os processos de página do Chromium rodam em namespace de usuário próprio e com filtro seccomp ativo, sem `--no-sandbox`. Isso foi num kernel Linux 6.10 dentro do Docker Desktop, não no Fly nem no Cloud Run.

**Endereços hostis contra o serviço em contêiner, com DNS real:** `169.254.169.254`, o gateway do Docker, `host.docker.internal`, `metadata.google.internal`, `[::1]`, um ULA, porta 8443, HTTP puro, e nomes públicos que resolvem para rede privada (`localtest.me`, `169.254.169.254.nip.io`, `10.0.0.1.nip.io`, `127.0.0.1.nip.io`). Todos recusados.

**Carga no contêiner:** oito páginas de uma vez resultaram em duas renderizadas e seis respostas "ocupado"; seis seguidas do mesmo visitante, em quatro renderizadas e duas recusadas por limite. Depois, 64 MiB, nenhum processo do Chromium.

**No produto** (`/pixel` no servidor de desenvolvimento, apontando para o contêiner):

| | |
|---|---|
| Books to Scrape, padrão | 44 estruturas; "Explore in more detail" oferecido |
| Pedir mais detalhes | A cidade padrão fica na tela com o aviso de andamento; chega a de 68 estruturas, com `mode=detailed` na URL |
| "Standard view" | Volta a 44 estruturas, sem o parâmetro |
| Link direto com `mode=detailed` | Abre a cidade detalhada (Books to Scrape, Guardian) |
| Bluesky, modo automático | Chega renderizado ("Read in a browser"), sem a opção. O Pinterest, pela API, também |
| Serviço parado, com uma cidade na tela | "Couldn't explore … There is no browser available right now … This is still the standard city."; a cidade fica, a URL volta e a opção some |
| Serviço parado, link direto detalhado | A falha e "Build the standard city instead"; nenhuma cidade é construída sozinha |
| Serviço parado, casca de SPA | Esqueleto estático com "Scaffolding only" |
| Serviço religado | A API volta a anunciar a opção em até 15 s |

**Não verificado:** nada disso rodou num host de produção, a partir de um IP de datacenter, nem com o app na Vercel. O passo novo do CI só roda no primeiro push.

## 6. Riscos e proteções

| Risco | Proteção | O que resta |
|---|---|---|
| SSRF pelo navegador | Proxy de saída como único caminho, com DNS e validação no próprio proxy; filtro de requisições como segunda camada; primeiro endereço conferido antes de abrir o navegador; WebRTC e WebTransport removidos das páginas | Na revisão final, o WebRTC mandava pacotes STUN e TURN por UDP direto, fora do proxy, apesar da flag que deveria impedir. Agora a API não existe nas páginas, nos frames nem em popups, e o teste confirma zero pacotes. A remoção é feita por script e não pela rede: um caminho ainda não pensado para recuperar a API reabriria o UDP. A camada que fecharia isso no sistema operacional (navegador num namespace de rede só com o proxy) fica como próximo endurecimento |
| Segredo do serviço | O segredo é tirado do ambiente antes de abrir o navegador, e o navegador recebe um ambiente sem variáveis de segredo | Continua no ambiente inicial do processo Node, como acontece com qualquer segredo passado por variável |
| Falha de segurança no Chromium | Sandbox ligado, usuário sem privilégios, serviço sem segredos do app, um navegador por captura | Escape do sandbox dá acesso ao contêiner e à rede dele. A imagem precisa ser reconstruída para receber correções; o Debian publica em 2 a 6 dias depois do Chrome |
| Host sem suporte ao sandbox | O serviço não se declara pronto se o navegador não iniciar com o sandbox | Decisão sua entre trocar de host e aceitar `--no-sandbox` |
| Abuso e custo | Assinatura; teto mensal de horas e diário de capturas gravados no volume; no teto, IPs retirados e `cordon`, ambos automáticos; saída por ociosidade; uma máquina só (`--ha=false`) | O Fly não tem teto de gasto nem alerta. Se as duas travas falharem, alguém que descubra o endereço do serviço pode mantê-lo ligado depois do teto, até cerca de R$ 180/mês (seção 4) |
| CPU compartilhada estrangulada | `performance-1x` em vez de `shared-cpu-2x` | Com uma CPU, duas capturas simultâneas dividem o núcleo; a mais pesada medida levou 11,9 s sozinha |
| Página hostil esgota recursos | Prazo, heap limitado, tetos de pedidos, conexões, bytes e consultas de DNS, HTML medido antes de sair do navegador, memória do contêiner | O limite de heap não cobre `ArrayBuffer` nem WebAssembly: o teto real é a memória da máquina. Duas páginas no limite ao mesmo tempo podem levar a máquina de 2 GB ao limite; o sistema mata o maior processo, que é o da página |
| Serviço indisponível | Captura padrão não depende dele; falha dita na tela; pausa de 15 s | Uma casca de SPA pode esperar até 40 s na primeira falha de um serviço que não responde. Depois de uma queda, a opção pode continuar visível por até 5 minutos numa instância da Vercel; quem clicar vê a falha dita, e a opção some |
| Tokens do Fly dentro da máquina | No Fly, o socket `/.fly/api` só exporta um subconjunto da API e recusou o `cordon` (403). O usuário do serviço não escreve nele (`platformApi:false`, visto no Fly). O root usa dois tokens restritos (seção 9), e o Node e o Chromium não os recebem | Com o token do `cordon`, quem tiver root na máquina pode ligar, parar e tirar o `cordon` dela, nada além. O token dos IPs não aloca nada, mas a API REST do Fly ignora a trava de origem dele: se vazar, quem o tiver pode retirar os IPs do app de qualquer lugar, o que derruba o renderizador sem custar nada. Os dois vencem em 19/10/2027 e o do `cordon` precisa ser trocado se a máquina for recriada |
| Rede privada do Fly | O proxy de saída recusa endereços ULA e nomes `.internal`; o serviço escuta só em IPv4 (`0.0.0.0`), e a rede privada do Fly é IPv6 | Um escape do sandbox alcançaria outros apps da mesma organização no Fly. Recomendo uma organização só para o renderizador |
| Contornar anti-bot | User agent declarado; desafio, 403 e login recusados também depois de renderizar | A recusa de desafios em JavaScript é por nome conhecido. Um desafio fora da lista pode ser resolvido pelo navegador sem que se perceba |
| Resultado diferente do local | Mesmo código e mesmo parser nas duas vias | Fontes, conteúdo dinâmico, país e reputação do IP |
| Esgotar a CPU do app com CSS | Leitores lineares; `test:css` | Outras partes do parser não foram auditadas com o mesmo cuidado |

## 7. Etapas e operação

As três etapas foram concluídas, cada uma com a sua aprovação.

1. **Etapa B, recursos:** feita em 18/10. Conta e cartão na org `personal`, que não tem outros apps; um app, uma máquina `performance-1x` e um volume de 1 GB.
2. **Etapa C, deploy controlado:** feita em 18 e 19/10 (seção 9). O teto foi testado com 0 h: a máquina retira os IPs e faz `cordon` sozinha. Depois vieram os testes de lançamento com 50 h, ainda sem nada na Vercel.
3. **Etapa D, ativação:** feita em 19/10.
   - O renderizador foi religado com 50 h, IPs novos e `uncordon`.
   - `SKYLINE_RENDERER_URL` e `SKYLINE_RENDERER_SECRET` foram definidas na produção da Vercel, pela entrada padrão e marcadas como sensíveis.
   - Um novo deploy de produção aplicou as variáveis, e as verificações do critério 9 passaram (seção 9).

### Operação

| Situação | O que fazer |
|---|---|
| Teto diário (100 capturas novas) | Nada. O renderizador volta sozinho à meia-noite UTC (21h em Brasília) |
| Teto mensal (50 h) atingido | A máquina retirou os IPs e fez `cordon`, e o site segue com a captura padrão. No mês seguinte, quando o registro já zerou sozinho: `fly ips allocate-v6 --app <app>`, `fly ips allocate-v4 --shared --app <app>` e `fly machine uncordon <id> --app <app>` |
| Desligar na hora | `fly ips release` para cada IP de `fly ips list`, depois `fly machine stop <id>` e `fly machine cordon <id>`. Para religar, os comandos da linha anterior |
| Atualizar o Chromium | `fly deploy . --config renderer/fly.toml --app <app> --local-only --ha=false --no-public-ips` a partir da `main`. A máquina continua parada, e a primeira partida depois do deploy também baixa a imagem (cerca de 19 s) |
| Trocar o segredo | Gravar o novo valor no Fly (`fly secrets import`) e na produção da Vercel, e fazer um novo deploy de produção. As variáveis da Vercel só valem a partir do deploy seguinte |
| Tokens do Fly | Vencem em 19/10/2027. O do `cordon` vale só para a máquina atual: se ela for recriada, refazer os passos 7 a 9 do checklist |
| Acompanhar o uso | `npm run renderer:ask`, com `SKYLINE_RENDERER_URL` e `SKYLINE_RENDERER_SECRET` no ambiente, mostra as horas e as capturas do mês e do dia. O painel de cobrança do Fly mostra o valor. O Fly não tem teto de gasto nem alerta |

### Checklist do primeiro deploy

1. Instalar o `flyctl` e entrar na conta (`fly auth login`).
2. Criar uma organização só para o renderizador e o app com nome difícil de adivinhar: `fly apps create skyline-renderer-<8 letras aleatórias> --org <org>`. O nome vai em `--app` em cada comando e não entra no repositório, que é público.
3. Gerar o segredo (`openssl rand -hex 32`) e guardá-lo num gerenciador de senhas. Definir com `fly secrets import --app <app> --stage`, lendo `SKYLINE_RENDERER_SECRET=…` da entrada padrão, para o valor não ir para o histórico do shell.
4. Criar só o que é preciso, à mão:
   - `fly ips allocate-v6 --app <app>` e `fly ips allocate-v4 --shared --app <app>`;
   - `fly volumes create renderer_data --size 1 --region iad --snapshot-retention 1 --app <app>`.
5. `fly deploy . --config renderer/fly.toml --app <app> --local-only --ha=false --no-public-ips --env SKYLINE_RENDERER_MONTHLY_HOURS=0`. O build local gera a imagem amd64 no Docker da máquina. Com 0 h, o `flyctl` dá o deploy como falho porque a máquina sai sozinha logo depois de ligar.
6. Conferir que existe uma máquina só (`fly machine list`), um volume de 1 GB (`fly volumes list`) e só os dois IPs (`fly ips list`).
7. Criar o token do `cordon`, que depende do ID da máquina:
   - `fly tokens create deploy --app <app> --name skyline-renderer-cordon-base --expiry 8760h`, com a saída num arquivo 0600, nunca na tela;
   - `fly tokens attenuate` com `[{"type":"Apps","body":{"apps":{"<id numérico do app>":"C"}}},{"type":"Machines","body":{"machines":{"<id da máquina>":"C"}}},{"type":"FromMachineSource","body":{"id":"<id da máquina>"}}]` (o ID numérico do app aparece em `fly tokens debug`);
   - `fly secrets import --app <app> --stage` com `SKYLINE_RENDERER_CORDON_TOKEN=…`, e apagar as cópias locais.
8. Criar o token dos IPs do mesmo jeito, com outro token de deploy (`--name skyline-renderer-ips-base`) atenuado com `[{"type":"Apps","body":{"apps":{"<id numérico do app>":"wcdC"}}},{"type":"Mutations","body":{"mutations":["releaseIpAddress"]}},{"type":"FromMachineSource","body":{"id":"<id da máquina>"}}]`, e gravado como `SKYLINE_RENDERER_IPS_TOKEN`. A liberação de IPs exige `wcdC` no app; o caveat `Mutations` é o que impede todo o resto (seção 9).
9. Aplicar os segredos com um novo deploy em 0 h. Um deploy não liga uma máquina parada, então ligue-a uma vez com `fly machine start <id>`. Ela liga, pausa, retira os IPs e faz `cordon` sozinha: o log mostra `release_ips` com HTTP 204 para cada IP e `cordon` com HTTP 200, `fly ips list` fica vazio e a API mostra `cordoned: true`.
10. Só então voltar a 50 h (`fly deploy` sem `--env`), alocar os IPs de novo e fazer `fly machine uncordon <id>`, e rodar os critérios 2 a 8 da seção 8 com `npm run renderer:ask`, ainda sem nada na Vercel.
11. Só então pedir a ativação na Vercel.

## 8. Critérios de lançamento

1. CI verde na branch, com `test:capture` rodando no Linux do GitHub.
2. Serviço publicado com uma máquina só (`fly scale show`), um volume de 1 GB (`fly volumes list`), IPv4 compartilhado (`fly ips list`). `npm run renderer:ask` deve mostrar `"ok":true`, `"sandbox":true`, `"platformApi":false` e `"usage":{…,"persistent":true}`.
3. **Desligamento e retomada no Fly:**
   - a máquina para sozinha cerca de 60 s depois da última captura (`fly machine list` mostra `stopped`);
   - a primeira checagem de saúde depois disso cabe em 30 s (cerca de 8 s medidos), e a primeira captura em 40 s;
   - o uso do mês no registro sobe a cada partida.
4. **Teto no Fly**, com o teto temporariamente em 0 h:
   - ao atingir o teto, o serviço sai, a própria máquina retira os IPs do app e se põe em `cordon`: `fly ips list` fica vazio, e a API mostra `cordoned: true`;
   - o endereço do app deixa de responder, e a máquina não liga mais;
   - IPs novos, `fly machine uncordon` e o teto de volta a 50 h restauram o serviço.
5. **Acesso privilegiado:** pelo `fly ssh console`, o usuário `renderer` não consegue usar `/.fly/api` nem ler o ambiente de outros processos, e os processos do Chromium aparecem com sandbox (seccomp ativo e namespace de usuário próprio).
6. `npm run renderer:ask -- --compare` nas 11 páginas estáveis da seção 5: mesma leitura em pelo menos 10, e cada diferença explicada.
7. Os endereços hostis da seção 5 enviados ao serviço publicado (literais privados, metadados, nomes que resolvem para rede privada, redirecionamentos, portas): todos recusados. A página com WebRTC, WebTransport e WebSocket do `test:egress` não abre nada fora do proxy.
8. Taxa de sucesso a partir do datacenter: das páginas da seção 5 que funcionam localmente, registrar quais o serviço publicado consegue ler. Abaixo de 70%, reavaliar antes de ativar.
9. **Em produção, depois da ativação:**
   - `GET /api/capture` responde `{"detailed":true}`;
   - a captura padrão do Hacker News continua abaixo de 2 s;
   - `?mode=detailed` funciona em três páginas;
   - o Bluesky chega como "Read in a browser";
   - com a máquina em `cordon`, a captura padrão segue funcionando e o link detalhado mostra a falha.
10. **Uma semana de observação:** as horas ligada contadas pelo serviço ficam próximas das do painel do Fly (diferença abaixo de 10%), e a projeção do mês fica abaixo de R$ 15.

## 9. Primeira implantação no Fly (18 e 19/10/2026)

**Recursos criados na org `personal`, que não tem outros apps:**

- 1 app, cujo nome fica fora do repositório;
- 1 máquina `performance-1x` com 2 GB em `iad`;
- 1 volume de 1 GB, criptografado, com snapshots guardados por 1 dia;
- 2 tokens de deploy, que só existem para originar os tokens restritos abaixo.

O IPv4 compartilhado e o IPv6 foram alocados para os testes e retirados depois. Não foi criado nenhum builder remoto nem peer WireGuard.

**Configuração efetiva, lida da API:** `performance`, 1 vCPU, 2048 MB; `restart` `on-failure` com 3 tentativas; autostart e autostop ligados, com mínimo 0; checagem em `/healthz`; volume em `/data`.

**Tempo ligada:** 9 partidas e cerca de 20,5 s ao todo. O registro do serviço contou 54 s.

### O teto e o `cordon`

| | Resultado |
|---|---|
| Deploy com `--env SKYLINE_RENDERER_MONTHLY_HOURS=0` | O `flyctl` dá o primeiro deploy como falho ("never started or exited immediately"), porque a máquina liga, vê o teto e sai em 2,3 s. Um deploy seguinte atualiza a máquina parada sem ligá-la |
| Teto reconhecido | `"paused":"monthly"` e `"persistent":true`, com saída pelo código 75 |
| `cordon` pelo socket `/.fly/api` | **HTTP 403.** O socket só exporta um subconjunto da API de máquinas, e o `cordon` não faz parte dele |
| `cordon` com o token restrito, de dentro da máquina | **HTTP 200** por `_api.internal:4280`, com o evento de `cordon` registrado enquanto a máquina ainda estava ligada e `cordoned: true` depois |
| `platformApi` | `false`: o usuário do serviço não escreve no socket |
| Registro de uso | Persistiu entre partidas (`boots` de 1 a 9) |
| Checagens de saúde | Nenhuma partida provocada por elas |

**O que o proxy faz com uma máquina em `cordon`.** Os pedidos públicos foram feitos por HTTPS, em IPv4 e IPv6, a `/`, `/healthz`, `/health` e `/render`:

| Situação | Pedidos | Partidas pelo proxy |
|---|---|---|
| `cordon` feito pela CLI com a máquina parada | 14, ao longo de 15 minutos | Nenhuma: todos voltaram com 503 depois de cerca de 38 s ("could not find a good candidate") |
| `cordon` feito entre 4 e 8 minutos antes | 8 | Nenhuma |
| Máquina já em `cordon`, ligada à mão, que sai de novo | 6, 40 s depois | Nenhuma |
| **`cordon` feito com a máquina ligada, logo antes de ela parar** | 6, 40 s depois | **Uma**, em três tentativas, sempre igual: o proxy força a partida (`force://… Starting machine`), um pedido é atendido em cerca de 2 s, a máquina vê o teto e sai em 2,3 s, e os outros pedidos voltam com 503 |
| Logo depois dessa partida | 6 | Nenhuma |

É justamente o caso do teto: a máquina faz `cordon` enquanto está ligada e sai. Pelo que foi visto, isso custa uma partida de cerca de 2,3 s por mês, mas o comportamento não está documentado pelo Fly e pode mudar. Por isso o teto também retira os IPs.

### Os tokens restritos

Os dois saem de tokens de deploy do app, atenuados com `fly tokens attenuate`, e vencem em 19/10/2027. Os testes abaixo foram feitos contra a API real, comparando com o token da conta. Os pedidos eram inválidos, inofensivos ou bloqueados por um lease, e nenhum deles mudou nada.

**Token do `cordon`** (`SKYLINE_RENDERER_CORDON_TOKEN`):

- `Apps`: só este app, só a ação `C`;
- `Machines`: só esta máquina, só a ação `C`;
- `FromMachineSource`: só pedidos feitos de dentro desta máquina.

| Pedido | Token do `cordon`, antes da restrição de origem | Token da conta |
|---|---|---|
| `cordon` | 200 | — |
| Ler a máquina; listar máquinas e volumes | 403 | — |
| Criar máquina, alterar máquina e criar volume, com corpo inválido | 403 | 400: passou da permissão e parou na validação |
| `setSecrets` com nome inválido | "Not authorized to manage this app" | Erro de validação |
| Apagar a máquina, com e sem `force`, com lease ativo | 403 | — |
| Ligar e parar, com lease ativo | 409 do lease: passam da permissão | 409 |

Com `FromMachineSource`, o token é recusado (403) fora da máquina, inclusive para o `cordon`. Dentro dela, ele só liga, para e põe ou tira o `cordon` daquela máquina.

**Token dos IPs** (`SKYLINE_RENDERER_IPS_TOKEN`):

- `Apps`: só este app, com `wcdC`, porque a liberação de IP recusa qualquer conjunto menor;
- `Mutations`: só `releaseIpAddress`;
- `FromMachineSource`: só esta máquina.

| Pedido | Token dos IPs | Token da conta |
|---|---|---|
| Listar os IPs (`GET /ip_assignments`) | 200 | 200 |
| Liberar um IPv6 e um IPv4 compartilhado reais, pela GraphQL e pela REST | Liberados (`releaseIpAddress` e HTTP 204) | — |
| Alocar um IPv6, tipo gratuito, pela REST (`POST /ip_assignments`) | HTTP 500 do Fly, **nada alocado** | 200, IP alocado e liberado em seguida |
| `setSecrets` com nome inválido; `unsetSecrets` de um nome inexistente; alocar IP de saída para uma máquina inválida | "Not authorized to manage this app" | Passaram da permissão: erro de validação ou nada a fazer |
| Criar máquina, alterar máquina, criar volume, `cordon`, ler ou gravar segredos pela REST | 403 | Passaram da permissão (400 com corpo inválido, 200 na leitura) |
| Ligar, desfazer o `cordon` e apagar a máquina, com lease ativo | 403 | 409 |

O caveat `Mutations` funciona como lista branca de toda a GraphQL, até das consultas, e também barra as rotas REST de máquinas, volumes e segredos. Os tipos pagos de IP nunca foram testados; a recusa vale para a operação de alocar, qualquer que seja o tipo.

**Limite do token dos IPs:** a API REST de IPs **ignora a restrição de origem**. De um computador comum, fora da máquina, o token final liberou um IPv6 real (204). Pela GraphQL a restrição vale. Se esse token vazar, quem o tiver pode retirar os IPs do app de qualquer lugar: isso derruba o renderizador, mas não custa nada, porque ele não aloca.

**Isolamento, num contêiner local:** só o `tini` e o `entrypoint`, que rodam como root, têm os dois tokens no ambiente. O Node, que roda como `renderer`, e o Chromium não os têm, e o usuário `renderer` não consegue ler o ambiente do `entrypoint`. Sem rede, o modo de parada registra as duas etapas, primeiro os IPs e depois o `cordon`, com o endereço e o resultado de cada tentativa, sem os tokens.

**A retirada dos IPs no Fly, com 0 h** (19/10, 11:34 UTC). A máquina viu o teto, liberou o IPv6 e o IPv4 compartilhado (HTTP 204) e fez `cordon` (HTTP 200), tudo sozinha. Depois disso:

- `fly ips list` ficou vazio, e a API confirmou nenhum IP;
- o IPv4 antigo passou a ter a conexão TLS cortada pelo Fly.

O endereço interno `_api.internal:4280` não atende a rota de IPs (502 depois de cerca de 8 s), e por isso a liberação passou a tentar `api.machines.dev` primeiro.

O DNS do Fly continuou publicando por algum tempo um IPv6 já liberado, embora a API não mostrasse nenhum. Não foi possível testar esse endereço sem IPv6.

### Testes de lançamento com 50 h (19/10/2026, 11:41 a 11:58 UTC)

O teto voltou a 50 h, os IPs foram realocados e o `cordon` desfeito, ainda sem nada na Vercel.

| Critério | Resultado |
|---|---|
| 2. Serviço publicado | `"ok":true`, `"sandbox":true`, `"platformApi":false`, Chrome 155.0.8059.39 em x86_64, registro `persistent` |
| 3. Desligamento e retomada | O serviço sai sozinho por ociosidade (`idle`) e, quando só a checagem de saúde o acordou, 30 s depois. Numa das vezes, o desligamento automático do Fly agiu antes, cerca de 50 s depois da última captura. A checagem de saúde a frio levou 7,9 s, e a captura a frio 11,2 s de ponta a ponta. O registro subiu a cada partida (`boots` de 11 a 15) |
| 4. Teto com 0 h | Depois de um deploy em 0 h e uma partida, a máquina liberou os dois IPs por `api.machines.dev` (204) e fez `cordon` (200) em 3,4 s. O app passou a ver o serviço como indisponível em 0,5 s |
| 5. Acesso privilegiado | Os processos de página do Chromium têm `Seccomp: 2` e namespaces de usuário e de rede próprios. Tudo roda como `renderer`, com `NoNewPrivs` e o Node sem capacidades. O `/.fly/api` é `srw------- root`, e o usuário do serviço recebe `EACCES`. Ele também não lê o ambiente dos processos root, e o Node não tem nenhum token do Fly |
| 6. Local × serviço | 7 de 11 com a mesma leitura. O itch.io falhou na rede local e foi lido pelo serviço. Guardian, IKEA e Spotify deram a mesma diferença em duas visitas seguidas, provavelmente por país: o serviço sai dos EUA, e a leitura local foi feita no Brasil. **Abaixo da meta de 10** |
| 7. Endereços hostis | 18 de 18 recusados: metadados, DNS interno do Fly, `_api.internal`, loopback, a porta do próprio serviço, rede 10/8, nomes que resolvem para endereço privado, rebinding, HTTP sem TLS, portas, redirecionamentos para endereço privado e `file://`. Numa página, WebRTC e WebTransport não existiam, o WebSocket para o loopback foi bloqueado, e os 7 pedidos a endereços privados foram recusados |
| 8. Sucesso a partir do datacenter | 11 de 11 páginas lidas pelo serviço |
| Limites | 8 páginas de uma vez: 4 renderizadas e 4 recusadas como "ocupado". O mesmo visitante faz 4 capturas e depois recebe 429. Pedido sem assinatura, com segredo errado ou com assinatura de 5 min recebe 401. A página com laço infinito foi encerrada por prazo, e a que esgota memória não derrubou o serviço |
| Erros | Certificado expirado: `tls_error`. Domínio reservado: recusado. Resposta 404, 403 ou 500 sem corpo: `forbidden_host` ("the page navigated away"), o que é impreciso. Uma imagem solta é lida como página |

**Consumo:** cerca de 12 minutos de máquina ligada nas duas fases, em 15 partidas; o registro do serviço contou 13 min. Daqui ao fim de outubro, o custo estimado é de cerca de R$ 0,80, somando volume e disco parado. Enquanto ficar bloqueado, o custo fixo é de cerca de R$ 1,75 por mês.

### Ativação em produção (19/10/2026, 12:34 a 12:42 UTC)

| Critério 9 | Resultado |
|---|---|
| `GET /api/capture` | `{"detailed":true}`, com 8,1 s numa partida a frio |
| Captura padrão do Hacker News | 1,23 s, lida sem navegador |
| `mode=detailed` em três páginas | Books to Scrape (5,3 s), Gutenberg (4,8 s) e Guardian (14,7 s), lidas no navegador. Na interface, o Books to Scrape passa de 44 para 68 estruturas |
| Bluesky no modo automático | Lido no navegador ("Read in a browser") |
| Renderizador em `cordon` | A captura padrão continuou funcionando (0,99 s), e a detalhada respondeu `renderer_unavailable` em 35,7 s. O `cordon` foi desfeito em seguida |

