# Captura renderizada: plano

Escrito em 11/10/2026, a partir do código em `main` (`b1eb38d`).

> **Estado:** as fases 0 e 1 foram feitas no mesmo dia. Os resultados, as correções a este plano e a recomendação de não avançar ainda para as fases 2 e 3 estão em [RENDERED_CAPTURE_REPORT.md](RENDERED_CAPTURE_REPORT.md). Duas coisas deste plano não se sustentaram: rodar o Chromium na própria Vercel (seção D1) e tratar o proxy local como suficiente (seção D3).

## Objetivo

Hoje uma página que se monta no navegador vira cidade a partir do esqueleto que o servidor manda. O objetivo é construir a cidade a partir da página já montada, sem abrir mão das três garantias que o README faz:

1. o cliente nunca recebe HTML, só estrutura e métricas;
2. o SSRF é fechado no socket;
3. o Skyline não tenta contornar verificação anti-bot nem login.

A segunda é a que dá trabalho. Um navegador de verdade faz dezenas de conexões por conta própria, e hoje nenhuma delas passaria pelo `safe-fetch`.

## O que já existe

| Peça | Onde | Estado |
|---|---|---|
| Escolha da estratégia | `acquisition/index.ts`, `acquire()` | Pronta. Tenta o estático; se vier `spa_shell` e houver renderizador, chama `captureRenderedPage()`; se ele falhar, volta ao estático com o aviso `rendered_unavailable`. |
| Chamada ao renderizador | `acquisition/rendered-capture.ts` | Só o contrato: `POST { url, viewport }` para `SKYLINE_RENDERER_URL`, resposta é um `DomSnapshot`. Não existe serviço do outro lado. |
| Detecção de esqueleto | `snapshot/parse-html.ts:402`, `looksLikeSpaShell()` | Pronta. |
| Texto do aviso | `snapshot/parse-html.ts:238` | Pronto: "This page assembles itself with JavaScript. The city shows only the scaffolding the server sent". |
| Aviso na tela | `components/hud/Hud.tsx:293` | Só na maquete antiga. O `PixelApp` não mostra nenhum aviso. |
| Campos para caixas reais | `snapshot/types.ts`, `SnapshotNode.box` e `.position` | Previstos no tipo, nunca preenchidos. |
| Rota | `app/api/capture/route.ts` | `runtime = "nodejs"`, `maxDuration = 30`, cache de 5 min com chave `estratégia:url`, limite de requisições por cliente. |

O `ARCHITECTURE.md` diz que o aviso `spa_shell` é algo "que a UI explica". No produto isso hoje não é verdade.

## Páginas que são esqueleto hoje

Medido com `npm run probe` em 11/10:

| Página | Elementos lidos | Observação |
|---|---|---|
| bsky.app | 4 | Feed de conteúdo. É o melhor caso de teste. |
| excalidraw.com | 4 | A interface é quase toda `<canvas>`. |
| tldraw.com | 4 | Idem. |
| app.diagrams.net | 4 | Idem. |
| photopea.com | 2 | Idem. |
| music.youtube.com | 6 | Responde "Your browser is deprecated" para o nosso user agent. |
| ray.so | 27 | |
| jsoncrack.com/editor | 56 | |
| squoosh.app | 77 | |
| carbon.now.sh | 84 | |

Já funcionam sem renderizar: regex101.com (415), caniuse.com (187), stackblitz.com (226), godbolt.org (1.578), open.spotify.com (726).

Uma expectativa a ajustar desde já: em ferramentas de desenho (Excalidraw, tldraw, Photopea) a captura renderizada vai enxergar barras de ferramentas e menus, não o desenho, porque o conteúdo está num `<canvas>`. O ganho grande é em sites de conteúdo montados no cliente, como o Bluesky.

## Decisões

### D1. Onde o Chromium roda

**Recomendação:** dentro do próprio app na Vercel, numa rota separada, `/api/render`.

- Rota separada porque o pacote do Chromium é pesado. Dentro de `/api/capture`, toda captura estática (a grande maioria, que hoje leva meio segundo) pagaria a partida lenta.
- `SKYLINE_RENDERER_URL` aponta para essa rota. O contrato que já está escrito continua valendo, e trocar por um serviço externo depois não muda o `acquire()`.
- A rota não pode ser um navegador aberto para a internet. `/api/capture` assina a URL com o mesmo segredo do `signing.ts`, e `/api/render` só atende pedido com assinatura válida.

Base para copiar: `access-check/src/lib/scan/browser.ts` (a classe `ServerlessChromiumExecutor`, que já cuida de fila, fechamento com prazo e processos órfãos) e o `next.config.ts` do Access Check (`serverExternalPackages` e `outputFileTracingIncludes`).

**Decisão sua, D1b: Puppeteer ou Playwright.** O Skyline já tem `puppeteer-core` nas devDependencies e o CI já tem `CHROME_PATH`. O Access Check usa `playwright-core`. Eu iria de `puppeteer-core` (uma dependência a menos, e o `@sparticuz/chromium` funciona com os dois), aproveitando do Access Check só a lógica de ciclo de vida do processo.

**A conferir:** limite de duração e de memória da função no seu plano da Vercel. O Access Check já roda Chromium lá, então memória não deve ser problema. A duração de `/api/capture` precisa subir de 30 s para cobrir estático mais renderizado.

### D2. O que o renderizador devolve

**Recomendação para a primeira versão:** o HTML da página já montada, passado pelo mesmo `parsePage()` e `buildSnapshot()` que a captura estática usa, com `strategy: "rendered"`.

- Não nasce um segundo extrator para manter.
- Regiões, alocação, cidade e as 222 checagens do corpus continuam valendo sem mudança.
- Os limites que já existem (`MAX_HTML_BYTES`, `MAX_ELEMENTS`) se aplicam sozinhos.

Fica para depois (fase 5): preencher `box` e `position` com as caixas reais e incluir o conteúdo de shadow DOM, que o HTML serializado não traz.

### D3. Segurança de rede do navegador

**Recomendação:** um proxy de saída local, dentro da própria função, e o Chromium obrigado a passar por ele.

Como funciona:

1. A função sobe um servidor HTTP mínimo em `127.0.0.1`, numa porta aleatória, que só aceita `CONNECT`.
2. O Chromium é lançado com `--proxy-server=http://127.0.0.1:PORTA` e `--proxy-bypass-list=<-loopback>`.
3. Cada conexão que a página tenta vira um `CONNECT host:443` no proxy. O proxy resolve o nome com o `guardedLookup` do `net-guard.ts` e conecta no endereço que acabou de validar.

Por que proxy, e não só interceptar requisições na página:

- A interceptação valida o nome numa hora e o navegador resolve de novo em outra. Entre as duas dá para trocar o DNS (rebinding). No proxy, a conexão vai para o IP que foi checado, a mesma garantia do `safe-fetch`.
- A interceptação não cobre tudo o que um navegador faz (WebSocket, preconnect, service worker).
- A frase "SSRF fechado no socket" continua verdadeira ao pé da letra.

Regras do proxy:

- só `CONNECT` e só porta 443; HTTP puro é recusado;
- o host passa pelas mesmas regras do `url-policy.ts` (sem IP privado literal, sem host de um rótulo só, sem `.local` e `.internal`);
- teto de conexões por página, de bytes totais e de tempo.

O que o proxy não cobre e precisa ser desligado no lançamento:

| Vazamento | Como fechar |
|---|---|
| QUIC e HTTP/3 (UDP, não passa por proxy HTTP) | `--disable-quic` |
| WebRTC (UDP direto) | `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` |
| Service workers | bloqueados no contexto |
| Downloads | recusados |
| Permissões (câmera, localização, notificação) | negadas |

A interceptação na página entra como segunda camada, para outra função: abortar o que não importa para a estrutura (vídeo, áudio, fontes) e contar requisições.

### D4. Sem evasão

- O user agent continua se declarando: `SkylineDOM/0.1` (o mesmo `USER_AGENT` do `safe-fetch.ts`). Nada de plugin de disfarce.
- Depois de renderizar, o HTML passa pelas mesmas checagens do estático: `CHALLENGE_RE`, `CHALLENGE_MARKERS`, redirecionamento para login e `looksLikeLoginWall()`. Hoje elas são privadas em `static-fetch.ts` e precisam ser extraídas para um módulo comum.
- Um navegador de verdade passa por alguns desafios que o `fetch` não passa. A regra é: se a página final for um desafio ou um login, a resposta é `blocked` ou `auth_required`, como hoje.

Custo dessa honestidade: alguns sites entregam uma página degradada para user agent desconhecido. O music.youtube.com já faz isso. Aceitar e documentar.

### D5. Quando a página está "montada"

1. Navegar e esperar o `DOMContentLoaded`.
2. Esperar a rede aquietar, com teto de 8 s.
3. Esperar o número de elementos parar de crescer por 500 ms.
4. Teto total de 12 s. Estourou, usa o que tiver.

Sem rolagem. Conteúdo que só carrega ao rolar fica de fora, e isso entra nos limites conhecidos.

### D6. Custo e abuso

- A captura renderizada custa umas vinte vezes a estática. No `rate-limit.ts`, ela deve consumir mais fichas que uma captura comum (sugestão: 3).
- Só roda quando o estático detecta esqueleto, que já é o comportamento do `auto`.
- Uma variável de ambiente desliga tudo sem novo deploy (`SKYLINE_RENDERER_URL` vazia já faz isso).
- O navegador é sempre fechado. Se não fechar no prazo, o grupo de processos é morto, como no Access Check.

## Fases

### Fase 0. Dizer a verdade na tela (meio dia, independente do resto)

- Mostrar `doc.warnings` no `PixelApp`. O `usePixelCity()` já devolve o `doc`. Lugar natural: uma linha junto de "20 structures · 2 territories" e uma entrada no painel "Why this city?".
- Corrigir a frase do `ARCHITECTURE.md` ("que a UI explica").
- Pronto quando: abrir o Excalidraw em produção mostra o aviso, e uma checagem falha se ele sumir.

Essa fase vale mesmo que o resto nunca seja feito.

### Fase 1. Renderizador mínimo, só local (1 dia)

- `acquisition/browser.ts`: lançar e encerrar o Chromium (local no desenvolvimento, `@sparticuz/chromium` em produção).
- `acquisition/render-page.ts`: `renderPage(url, opções)` devolve `{ html, finalUrl, status, durationMs, redirects }`, seguindo a D5.
- `rendered-capture.ts`: quando não há URL externa, chama `renderPage()` e monta o snapshot com `parsePage()` e `buildSnapshot()`.
- Exportar de `static-fetch.ts` o que será compartilhado: `fetchStylesheets()` e as checagens de desafio e login.
- `npm run probe -- --rendered <url>`, para comparar estático e renderizado lado a lado.
- Pronto quando: o probe do bsky.app sai de 4 elementos para centenas, e uma página que já funcionava (godbolt.org) dá regiões equivalentes nos dois modos.

Nesta fase o navegador ainda sai direto para a rede. Não publicar.

### Fase 2. Proxy de saída e endurecimento (2 a 3 dias)

- `acquisition/egress-proxy.ts`, conforme a D3, recebendo a função de lookup por parâmetro para poder ser testado.
- Flags de lançamento e bloqueios da tabela da D3.
- `npm run test:egress`, com um caso por ataque:

| Caso | Resultado esperado |
|---|---|
| Página faz `fetch` para `https://127.0.0.1` | conexão recusada |
| `<img>` apontando para `169.254.169.254` | recusada |
| Nome público que resolve para `10.0.0.5` | recusada |
| Redirecionamento de host público para host privado | recusado no segundo salto |
| DNS que responde público na 1ª consulta e privado na 2ª | conexão vai para o IP validado |
| `CONNECT` para porta diferente de 443 | recusado |
| WebSocket para host privado | recusado |
| Página que nunca termina de carregar | encerrada no teto, sem processo órfão |
| Página que abre 500 conexões | cortada no teto |

- Pronto quando: todos os casos passam no CI e a tabela de ameaças do `ARCHITECTURE.md` ganha as linhas do navegador.

### Fase 3. Rota e publicação (1 dia)

- `app/api/render/route.ts`: confere a assinatura, renderiza, devolve o `DomSnapshot`.
- `next.config.ts`: `serverExternalPackages` e `outputFileTracingIncludes` para a rota nova.
- Orçamento de tempo: estático 15 s (já é), renderizado 15 s, `maxDuration` de `/api/capture` ajustado.
- Custo maior no `rate-limit.ts`.
- Uma linha de log por captura renderizada: duração, número de requisições, bytes, conexões recusadas.
- Pronto quando: em produção, o bsky.app vira cidade a partir da página montada, e o tempo das capturas estáticas não muda.

### Fase 4. Produto e corpus (1 dia)

- Texto de espera próprio para os 3 a 10 s a mais ("This page builds itself in the browser. Opening it in one.").
- No "Why this city?", uma linha dizendo como a página foi lida: HTML do servidor ou página montada num navegador.
- `scripts/real-pages/fetch.ts --rendered`: guardar de 3 a 5 snapshots renderizados em `docs/real-pages/snapshots`, para as dez etapas de checagem rodarem também sobre eles.
- README e `ARCHITECTURE.md`: trocar o item "SPAs" dos limites conhecidos pelos limites novos (canvas, shadow DOM, conteúdo que só carrega ao rolar, páginas com login).

### Fase 5. Opcional

- Preencher `box` e `position` e deixar o layout usar as caixas reais.
- Conteúdo de shadow DOM.

## Riscos

| Risco | Tratamento |
|---|---|
| Partida lenta e tamanho do pacote | Chromium isolado em `/api/render` |
| `/api/render` usada como navegador aberto | assinatura, limite de requisições, só roda para esqueleto |
| Página hostil consome CPU ou memória | teto de tempo e morte do grupo de processos |
| Custo na Vercel | limite mais caro para renderizado e chave para desligar |
| Ferramentas de canvas rendem pouco | documentar; o caso de teste principal é site de conteúdo |
| Site entrega página degradada para user agent declarado | aceitar e documentar; não disfarçar |

## O que não fazer

- Plugin de disfarce, resolver CAPTCHA, usar cookies ou login.
- Mandar screenshot ou HTML para o cliente.
- Rolagem infinita para "pegar mais conteúdo".

## Estimativa

Cerca de seis dias de trabalho, metade deles na Fase 2. As Fases 0 e 1 cabem num fim de semana e já mostram se o resultado visual compensa o resto.
