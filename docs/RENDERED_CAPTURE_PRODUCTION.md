# Captura renderizada em produção

Escrito em 13/10/2026 e revisto em 14/10/2026, na branch `capture/rendered-production`, a partir de `main` (`025b325`). A branch está no GitHub num pull request para `main`. Nada foi criado no Fly.io, nenhum segredo foi configurado e nada foi publicado.

O código está pronto e verificado em desenvolvimento, inclusive com o serviço rodando num contêiner Linux. A publicação depende de uma escolha de hospedagem (seção 7).

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

O host escolhido é o Fly.io. A configuração está em [`renderer/fly.toml`](../renderer/fly.toml); nada foi criado no Fly ainda.

**A máquina:** uma só, `performance-1x` (1 vCPU dedicada, 2 GB), em `iad`, desligando quando ociosa (`auto_stop_machines = "stop"`, `min_machines_running = 0`) e ligando no primeiro pedido.

Por que `performance-1x` e não `shared-cpu-2x`, que custa menos da metade:

- **A CPU compartilhada do Fly tem cota.** Na documentação: 5 ms a cada 80 ms por vCPU, somados entre as vCPUs (12,5% de um núcleo numa `shared-cpu-2x`), mais um crédito de rajada que começa em 5 s por vCPU.
- **Uma captura gasta 1,4 a 6,3 s de CPU.** Média de 3,4 s, medida no contêiner em 12 páginas reais.
- **Com o crédito esgotado, nada passa.** Com a cota reproduzida no Docker, Hacker News, Books to Scrape e Guardian estouraram os 22 s. Com uma CPU inteira, as cinco páginas testadas passaram em 3,4 a 11,9 s.
- **O crédito não dura.** Dá para as primeiras duas ou três capturas depois que a máquina liga, e não se recupera rápido o bastante para uso seguido.

**Por que `stop` e não `suspend`:**

- `stop` devolve o sistema de arquivos limpo a cada partida; `suspend` mantém tudo como estava, inclusive o que uma página hostil possa ter deixado.
- Depois de um `suspend`, o relógio pode ficar alguns segundos atrás até sincronizar, e a assinatura dos pedidos tem janela de 90 s.
- O custo parado é o mesmo nos dois modos: só o disco.

**Serviço de renderização**

| Variável | Valor |
|---|---|
| `SKYLINE_RENDERER_SECRET` | Obrigatória, 32 caracteres ou mais (`openssl rand -hex 32`), definida com `fly secrets set`. É o único segredo do serviço |
| `PORT`, `SKYLINE_RENDERER_CONCURRENCY`, `SKYLINE_RENDERER_QUEUE` | No `fly.toml`: 8080, 2 capturas simultâneas, 4 em espera |
| `SKYLINE_RENDERER_NO_SANDBOX` | Não definir. Só existe para um host que não permita o sandbox, e é uma decisão sua, não um padrão |

- Imagem: `renderer/Dockerfile` (Debian 13, Chromium do repositório de segurança, usuário sem privilégios). O contexto de build é a raiz do repositório.
- O Fly verifica `GET /healthz`, que responde só "ok" e não abre o navegador. O `hard_limit` do Fly (12) fica acima da capacidade do próprio serviço (2 + 4), para que quem diga "ocupado" seja o serviço.
- Comandos previstos para a publicação, ainda não executados:

```
fly apps create skyline-renderer
fly secrets set --app skyline-renderer SKYLINE_RENDERER_SECRET=<segredo>
fly deploy . --config renderer/fly.toml --dockerfile renderer/Dockerfile --ha=false
fly scale count 1 --app skyline-renderer
fly ips list --app skyline-renderer
```

- `--ha=false` e `fly scale count 1`: o primeiro deploy cria duas máquinas por padrão (uma reserva). Com uma só, o teto de custo é o de uma máquina.
- `fly ips list`: deve mostrar IPv4 compartilhado e IPv6. IPv4 dedicado custa US$ 2/mês e não é necessário.
- O nome do app pode ser outro; a URL fica `https://<app>.fly.dev`.

**App na Vercel**

| Variável | Valor |
|---|---|
| `SKYLINE_RENDERER_URL` | `https://<app>.fly.dev`, sem caminho |
| `SKYLINE_RENDERER_SECRET` | O mesmo segredo |

Sem as duas, ou com o serviço fora do ar, o app se comporta como hoje. Para desligar na hora, use `fly scale count 0`, que remove a máquina; um `fly deploy` a recria. Só `fly machine stop` não basta, porque o próximo pedido a liga de novo. As cascas de SPA voltam ao esqueleto estático na primeira falha, e a opção some em até 5 minutos, ou na primeira tentativa que falhar. Remover a variável na Vercel só vale no deploy seguinte.

**Conferir um serviço publicado:** `SKYLINE_RENDERER_URL=… SKYLINE_RENDERER_SECRET=… npm run renderer:ask -- --compare <urls>` mostra a saúde (com `sandbox` e `platformApi`), captura pelas duas vias e compara as leituras.

### Desligamento e retomada

| Passo | Tempo que o app espera |
|---|---|
| Checagem de saúde (`GET /api/capture`, fora do caminho da captura) | até 10 s |
| Captura renderizada | até 40 s: partida a frio, fila de até 8 s, captura de até 22 s, encerramento |
| Rota `/api/capture` | `maxDuration` de 75 s: estática de até 15 s, renderizada de até 40 s, folhas de estilo |
| Resposta positiva da saúde | Guardada 5 minutos por instância da Vercel |
| Falha | Pausa de 15 s antes de tentar de novo nas cascas de SPA |

Simulei o proxy do Fly localmente: contêiner parado, com uma CPU, que só é ligado quando chega o primeiro pedido, e o pedido segura até o serviço responder. Com os prazos acima, em três rodadas:

- a checagem de saúde saindo do zero respondeu "pronto" em 0,64 s;
- uma captura do Hacker News saindo do zero levou 4,9 a 5,2 s;
- saúde e captura juntas, como num link direto `mode=detailed`, levaram 5,7 a 6,2 s.

O Docker liga um contêiner mais rápido que o Fly liga uma máquina (a documentação dele fala em "~2+ s"), e mesmo somando isso a folga é grande. A confirmação no Fly está nos critérios de lançamento.

## 4. Custos e limites

### Preços confirmados na página do Fly (14/10/2026)

| Item | Preço |
|---|---|
| `performance-1x` com 2 GB, ligada | US$ 0,00001273 por segundo: US$ 33,00 por 30 dias ligada o tempo todo |
| Máquina parada | Só o disco: US$ 0,15 por GB por mês |
| Saída de dados para a internet (América do Norte) | US$ 0,02/GB; entrada grátis |
| IPv4 compartilhado e IPv6 | Grátis |
| IPv4 dedicado | US$ 2/mês (não necessário) |
| Certificado de domínio próprio | US$ 0,10/mês, os 10 primeiros grátis (não necessário com `*.fly.dev`) |
| RAM além da incluída | US$ 6/GB/mês (não necessário: o `performance-1x` já tem 2 GB) |
| Camada gratuita | Nenhuma; teste de 2 h de máquina ou 7 dias sem cartão, depois cartão obrigatório |

Para comparar: a `shared-cpu-2x` com 2 GB custa US$ 13,39 por 30 dias, mas não dá conta da carga (seção 3).

### Medido aqui

| | |
|---|---|
| CPU por captura | 1,4 a 6,3 s de CPU, média 3,4 s (12 páginas reais) |
| Captura renderizada, do pedido ao snapshot | 2,6 a 15 s em 14 páginas. As mais lentas foram medidas antes da correção do leitor de CSS; depois dela, Guardian 5,0 s, Pinterest 6,5 s e Hacker News 2,9 s |
| Captura estática, com o serviço configurado | 0,26 a 0,92 s (Guardian, Paul Graham, GitHub, Hacker News) |
| Memória do contêiner | 47 a 86 MiB ocioso; pico de 533 MiB com duas páginas pesadas ao mesmo tempo |
| Página que consome memória sem parar | O processo dela para em cerca de 0,9 GB |
| Imagem | 1,63 GB descompactada |
| Resposta do serviço | 8 a 134 KB compactados por página |

### O que de fato custa

O que pesa é o tempo em que a máquina fica ligada, não o número de capturas.

- **O que a acorda:** qualquer pedido. Uma captura, ou a checagem de saúde que o app faz quando alguém abre `/pixel`, no máximo uma vez a cada 5 minutos por instância da Vercel.
- **Quando ela desliga:** depois de "alguns minutos" sem pedidos. O Fly não dá o número exato.
- **Com visitas esparsas:** a máquina passa a maior parte do mês parada.
- **Com `/pixel` aberto o dia inteiro:** ela não para.

| Tempo ligada por mês | Estimativa |
|---|---|
| 10 h | US$ 0,46 + disco US$ 0,25 = cerca de US$ 0,70 |
| 100 h | US$ 4,58 + US$ 0,25 = cerca de US$ 4,85 |
| 300 h | US$ 13,75 + US$ 0,25 = cerca de US$ 14 |
| O mês todo (teto) | US$ 33,00 |

As estimativas somam o preço por segundo e o disco parado, contando 1,7 GB de imagem.

- **Tráfego de saída:** a resposta de cada captura tem 8 a 134 KB compactados. Mesmo 30.000 capturas ficam abaixo de US$ 0,10.
- **Downloads das páginas:** o que o navegador baixa delas é tráfego de entrada, que é grátis.

### Cobranças possíveis além da máquina

| Cobrança | Como evitar ou o que esperar |
|---|---|
| Segunda máquina criada pelo primeiro deploy | `--ha=false` e `fly scale count 1`. Parada, ela custaria cerca de US$ 0,25/mês de disco; ligada por falha de hardware, o preço normal |
| IPv4 dedicado | Não alocar; o compartilhado basta |
| Builder remoto | A página de preços não fala dele. A equipe do Fly diz no fórum que é grátis, mas anunciou cobrança por minuto de build para o builder novo (US$ 0,05/min depois de 300 min), sem confirmação de que começou. Alternativa: `fly deploy --local-only` |
| Imagem guardada no registro do Fly | A página de preços não fala dela. Segundo a equipe no fórum, não é cobrada |
| Logs e métricas | A página de preços não fala deles |
| Cancelamento de fatura pequena | Não documentado; contar com a cobrança integral |
| Impostos | Não verificado |

**Não foi possível confirmar:**

- se o sandbox do Chromium funciona no Fly (não há documento oficial; seção 5);
- se as checagens de saúde do próprio Fly mantêm a máquina ligada (a documentação não diz);
- o tempo de partida desta imagem lá;
- quantas páginas respondem a um IP de datacenter.

### Limites de uso

| | |
|---|---|
| Por captura | 22 s, 400 pedidos, 250 conexões, 64 MB trafegados, 4 MB de HTML, 10 navegações, janela de 1440×900, sem rolagem |
| No serviço | 2 capturas simultâneas, 4 em espera por até 8 s, 4 capturas seguidas por visitante e depois uma a cada 30 s, cache de 3 minutos para 12 páginas |
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
| Abuso e custo | Assinatura, limites da seção 4, uma máquina no máximo (`--ha=false`, `fly scale count 1`) | O limite por visitante do app é por instância da Vercel. O do serviço é global, mas confia no identificador que o app envia. O Fly não tem teto de gasto: o teto vem de haver uma máquina só |
| CPU compartilhada estrangulada | `performance-1x` em vez de `shared-cpu-2x` | Com uma CPU, duas capturas simultâneas dividem o núcleo; a mais pesada medida levou 11,9 s sozinha |
| Página hostil esgota recursos | Prazo, heap limitado, tetos de pedidos, conexões, bytes e consultas de DNS, HTML medido antes de sair do navegador, memória do contêiner | O limite de heap não cobre `ArrayBuffer` nem WebAssembly: o teto real é a memória da máquina. Duas páginas no limite ao mesmo tempo podem levar a máquina de 2 GB ao limite; o sistema mata o maior processo, que é o da página |
| Serviço indisponível | Captura padrão não depende dele; falha dita na tela; pausa de 15 s | Uma casca de SPA pode esperar até 40 s na primeira falha de um serviço que não responde. Depois de uma queda, a opção pode continuar visível por até 5 minutos numa instância da Vercel; quem clicar vê a falha dita, e a opção some |
| API de máquinas do Fly acessível de dentro da máquina | Segundo a equipe do Fly, um socket em `/.fly/api` dá acesso à API de máquinas do app sem token. O serviço roda sem privilégios; ao iniciar, verifica se consegue escrever nesse socket, registra um aviso e informa `platformApi` na checagem de saúde | Se o usuário do serviço tiver acesso, um escape do sandbox poderia criar ou apagar máquinas do app. Ainda não verificado no Fly; é um critério de lançamento |
| Rede privada do Fly | O proxy de saída recusa endereços ULA e nomes `.internal`; o serviço escuta só em IPv4 (`0.0.0.0`), e a rede privada do Fly é IPv6 | Um escape do sandbox alcançaria outros apps da mesma organização no Fly. Recomendo uma organização só para o renderizador |
| Contornar anti-bot | User agent declarado; desafio, 403 e login recusados também depois de renderizar | A recusa de desafios em JavaScript é por nome conhecido. Um desafio fora da lista pode ser resolvido pelo navegador sem que se perceba |
| Resultado diferente do local | Mesmo código e mesmo parser nas duas vias | Fontes, conteúdo dinâmico, país e reputação do IP |
| Esgotar a CPU do app com CSS | Leitores lineares; `test:css` | Outras partes do parser não foram auditadas com o mesmo cuidado |

## 7. O que depende da sua aprovação

O host está escolhido (Fly.io, seção 3). Faltam, nesta ordem e com autorização sua em cada passo:

1. Criar a conta e a organização no Fly, com cartão.
2. Gerar o segredo, definir no Fly (`fly secrets set`) e na Vercel (`SKYLINE_RENDERER_URL`, `SKYLINE_RENDERER_SECRET`).
3. Publicar o serviço (`fly deploy … --ha=false`) e depois o app.
4. Se o host não permitir o sandbox, ou se `platformApi` vier `true`: decidir entre endurecer a imagem (iniciar como root só para fechar o socket e então baixar privilégios) e aceitar o risco.
5. Merge do pull request.

## 8. Critérios de lançamento

1. CI verde na branch, com `test:capture` rodando no Linux do GitHub.
2. Serviço publicado com uma máquina só (`fly scale show`), IPv4 compartilhado (`fly ips list`), e `npm run renderer:ask` mostrando `"ok":true,"sandbox":true,"platformApi":false`.
3. Desligamento e retomada no Fly: a máquina para sozinha depois de alguns minutos sem pedidos (`fly machine list`), e a primeira checagem de saúde e a primeira captura depois disso cabem nos prazos da seção 3 (10 s e 40 s).
4. `npm run renderer:ask -- --compare` nas 11 páginas estáveis da seção 5: mesma leitura em pelo menos 10, e cada diferença explicada.
5. Os endereços hostis da seção 5 enviados ao serviço publicado: todos recusados.
6. Taxa de sucesso a partir do datacenter: das páginas da seção 5 que funcionam localmente, registrar quais o serviço publicado consegue ler. Abaixo de 70%, reavaliar antes de anunciar o recurso.
7. Em produção: `GET /api/capture` responde `{"detailed":true}`; a captura padrão do Hacker News continua abaixo de 2 s; `?mode=detailed` funciona em três páginas; o Bluesky chega como "Read in a browser".
8. Ensaio de desligamento: com `fly scale count 0`, a captura padrão segue funcionando, o link detalhado mostra a falha, e a opção some na primeira falha ou em até 5 minutos.
9. Alerta de gasto configurado na conta do Fly, se a conta oferecer.
10. Dois dias de observação dos registros do serviço: menos de 5% de capturas com resultado `internal`, memória abaixo de 1,5 GB, nenhum processo do Chromium sobrando, e o tempo ligada por dia compatível com a estimativa da seção 4.
