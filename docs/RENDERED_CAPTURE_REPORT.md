# Captura renderizada: relatório das fases 0 e 1

Escrito em 11/10/2026 sobre `main` (`b1eb38d`), sem commit. Plano original: [RENDERED_CAPTURE_PLAN.md](RENDERED_CAPTURE_PLAN.md).

## Veredito

A captura renderizada resolve a aquisição e não resolve a interpretação.

- **Onde hoje não existe cidade, o ganho é inequívoco.** Em 8 das 34 páginas medidas, a cidade passa de uma malha de ruas vazia ("0 structures") para uma cidade de verdade: Bluesky, Mastodon, hn.algolia, Duolingo, Twitch, Pinterest, Photopea e YouTube.
- **Onde já existia cidade, o ganho visual é pequeno, nulo ou negativo.** Onze páginas-esqueleto já geravam uma cidade cheia a partir de 4 a 84 elementos. A versão renderizada é mais verdadeira, mas não é visivelmente melhor, e em dois casos é pior (Spotify e JSON Crack).
- **A renderização expôs quatro gargalos na leitura do DOM** que já existiam e que agora pesam mais: conteúdo oculto contado como página, classificação por conteúdo (pricing, FAQ, showcase), peso por massa de DOM em vez de área visível, e segmentação de divs aninhadas.
- **Ela também abriu um furo na regra de não contornar anti-bot.** Um navegador resolve sozinho um desafio em JavaScript. Aconteceu com o Booking, e está corrigido para esse caso.

Recomendação: publicar a Fase 0 e os dois ajustes de detecção, que valem sozinhos, e **não avançar para as Fases 2 e 3 agora**. Antes, corrigir a interpretação com os 34 pares que já estão em disco. O detalhe está na seção 13.

## 1. O que foi implementado

**Fase 0, aviso de captura incompleta**

- `snapshot/caveat.ts`: transforma os avisos da captura no que a interface precisa dizer. Três situações: página lida só pelo esqueleto, página lida num navegador (nota, não ressalva) e página que continua quase sem texto mesmo no navegador.
- `PixelApp`: uma linha junto de "N structures · N territories" e uma caixa no painel, tanto durante a construção quanto em "Why this city?".
- A linha usa um âmbar fixo. A primeira versão herdava a cor de destaque da página e ficou vermelha sobre fundo escuro no Excalidraw.

**Fase 1, renderizador local**

- `acquisition/local-browser.ts`: acha o Chrome local e lança o `puppeteer-core` que já estava no projeto. Só liga com `SKYLINE_LOCAL_RENDERER=1`, nunca com `NODE_ENV=production` e nunca na Vercel.
- `acquisition/render-page.ts`: abre a página, espera a rede aquietar e a contagem de elementos parar de mudar por 500 ms (teto de 12 s, teto total de 22 s) e devolve o HTML montado.
- `acquisition/rendered-capture.ts`: passa esse HTML pelo mesmo `snapshotFromHtml()` da captura estática, com as mesmas recusas (403, login, desafio anti-bot).
- `acquire()` continua estático primeiro. O navegador só entra quando o estático sinaliza esqueleto, e a versão renderizada só substitui a estática se leu mais elementos.
- O `puppeteer-core` é importado por um nome montado em tempo de execução. Conferi no build: ele não aparece nos arquivos rastreados de `/api/capture`.

O que o renderizador faz por segurança, e o que não faz, está na seção 10.

**Ajustes de detecção (com testes de regressão)**

1. **Marcação sem palavras.** `isMarkupWithoutWords()` em `parse-html.ts`: página com 60 elementos ou mais, menos de 2 caracteres por elemento e menos de 2 por KB de HTML também é esqueleto. Pega o YouTube e o Airbnb, que a regra antiga perdia.
2. **Desafio em JavaScript.** `static-fetch.ts` agora recusa por nome o desafio do AWS WAF e trata HTTP 202 como desafio em andamento. Vale para os dois caminhos: no navegador, a primeira resposta é julgada pela mesma regra.

**Ferramentas de validação** (`scripts/rendered-capture/`)

| Script | Para quê |
|---|---|
| `compare.ts` | Lê cada página dos dois jeitos, mede com o pipeline do produto e grava os pares. `--reuse` retoma e mede offline. |
| `shoot.mjs` | Fotografa as duas cidades na mesma câmera e na mesma hora. |
| `page-shot.mjs` | Fotografa a página real, como o navegador da captura a vê. |
| `heuristic.ts` | Estudo offline do detector de esqueleto. |
| `audit.ts` | Auditoria offline de elementos transitórios e de regiões tipadas. |
| `check.ts` | Testes do renderizador com páginas servidas da memória, sem rede. |

## 2. Arquivos

**Modificados**

| Arquivo | Mudança |
|---|---|
| `src/lib/acquisition/index.ts` | `acquire()` usa o renderizador como plano B e só troca se ele leu mais |
| `src/lib/acquisition/rendered-capture.ts` | caminho local além do externo |
| `src/lib/acquisition/static-fetch.ts` | recusas exportadas para os dois caminhos; desafio AWS WAF e HTTP 202 |
| `src/lib/snapshot/parse-html.ts` | `snapshotFromHtml()` veio para cá; regra da marcação sem palavras |
| `src/components/pixel/PixelApp.tsx` | desenha a ressalva e a nota |
| `src/app/pixel/skyline.css` | estilos da ressalva |
| `src/app/pixel/kit/page.tsx` | em desenvolvimento, `set=rendered-capture` lê os pares do estudo |
| `scripts/probe.ts` | opção `--rendered` |
| `package.json` | `test:warnings` (entra no `npm test`) e `test:rendered` (à parte) |
| `README.md`, `docs/ARCHITECTURE.md` | texto alinhado com o que existe |

**Novos**

`src/lib/acquisition/local-browser.ts`, `src/lib/acquisition/render-page.ts`, `src/lib/snapshot/caveat.ts`, `scripts/capture-warnings/check.ts`, `scripts/rendered-capture/` (7 arquivos), `docs/rendered-capture/` (evidências) e este relatório.

Em `docs/rendered-capture/` há um `.gitignore` que deixa de fora `snapshots/` (7 MB) e `shots/` (26 MB). Ficam versionáveis o `compare.json` e as quatro folhas de `sheets/`.

## 3. Testes

| Comando | Resultado |
|---|---|
| `npm test` (11 etapas) | passou, 243 checagens (as 222 de antes mais 21 novas) |
| `npm run test:rendered` | passou, 20 checagens, sem tocar a rede |
| `npm run lint` | sem erros |
| `npm run typecheck` | sem erros |
| `npm run build` | passou |

O `test:rendered` ficou fora do `npm test` de propósito: ele abre um Chrome, e eu não quis mudar o que o CI roda sem você decidir.

O que as checagens novas prendem:

- o aviso existe para cada tipo de captura incompleta e aparece nos dois lugares da interface;
- nenhuma página do corpus congelado ganha aviso;
- o renderizador fica desligado por padrão, em produção e na Vercel;
- nada além das páginas de teste sai do navegador, e 8 pedidos hostis (127.0.0.1, 169.254.169.254, 10.x, localhost, porta diferente de 443) são recusados pela política de URL;
- login, 403, desafio clássico e desafio em JavaScript "já resolvido" continuam recusados;
- uma página que nunca para de mudar é cortada no teto e nenhum navegador fica rodando;
- a regra nova acerta YouTube e Airbnb e não toca em 12 páginas reais completas nem no corpus.

## 4. Comparação entre captura estática e renderizada

34 páginas: 20 já sinalizadas como esqueleto, 8 suspeitas (não sinalizadas, mas dependentes de JavaScript) e 6 de controle (renderizadas no servidor). Cada uma foi lida dos dois jeitos e medida com `buildKitCity()`, o mesmo pipeline do produto. Dados completos em `docs/rendered-capture/compare.json`.

### Por resultado

| Resultado | Páginas | Quantas |
|---|---|---|
| Cidade vazia vira cidade | bsky, mastodon, hn-algolia, duolingo, twitch, pinterest, photopea, youtube | 8 |
| Já havia cidade; a renderizada é mais verdadeira, sem ganho visual claro | devdocs, soundcloud, excalidraw, tldraw, diagrams, desmos, rayso, carbon, airbnb | 9 |
| Já havia cidade; a renderizada é pior | spotify, jsoncrack | 2 |
| Nada muda mesmo renderizando | uniswap, ytmusic, squoosh | 3 |
| Recusada nos dois caminhos | booking | 1 |
| Iguais (controles e suspeitas completas) | wikipedia, hn, mdn, github-repo, godbolt, guardian, bundlephobia, caniuse, regex101, stackblitz, notion-help | 11 |

### Números

`reg` = regiões, `ter` = territórios com terreno, `maior` = fatia do maior território, `estr` = estruturas.

| Página | Estático: elem / texto / reg / ter / maior / estr | Renderizado: elem / texto / reg / ter / maior / estr | Tempo |
|---|---|---|---|
| bsky | 4 / 0 / 0 / 0 / 0% / 0 | 2.849 / 8.207 / 6 / 3 / 97% / 35 | 6,7 s |
| mastodon | 5 / 0 / 0 / 0 / 0% / 0 | 360 / 14.058 / 18 / 16 / 23% / 79 | 3,9 s |
| hn-algolia | 2 / 0 / 0 / 0 / 0% / 0 | 717 / 9.331 / 4 / 5 / 86% / 139 | 7,1 s |
| duolingo | 3 / 0 / 0 / 0 / 0% / 0 | 459 / 2.195 / 11 / 10 / 50% / 74 | 11,2 s |
| twitch | 21 / 0 / 0 / 0 / 0% / 0 | 598 / 1.083 / 10 / 6 / 45% / 88 | 10,8 s |
| pinterest | 5 / 0 / 0 / 0 / 0% / 0 | 971 / 2.135 / 18 / 13 / 59% / 62 | 6,2 s |
| photopea | 2 / 0 / 0 / 0 / 0% / 0 | 77 / 2.683 / 4 / 3 / 89% / 137 | 1,7 s |
| youtube | 311 / 0 / 0 / 0 / 0% / 0 | 558 / 344 / 27 / 19 / 39% / 85 | 7,6 s |
| devdocs | 38 / 82 / 4 / 4 / 35% / 27 | 3.746 / 19.356 / 4 / 9 / 62% / 118 | 3,0 s |
| soundcloud | 25 / 256 / 0 / 8 / 23% / 51 | 887 / 4.359 / 20 / 16 / 22% / 111 | 10,8 s |
| excalidraw | 4 / 10 / 1 / 2 / 51% / 20 | 167 / 427 / 5 / 3 / 94% / 38 | 3,3 s |
| tldraw | 4 / 53 / 1 / 2 / 54% / 20 | 222 / 212 / 6 / 13 / 16% / 70 | 4,6 s |
| diagrams | 4 / 0 / 0 / 1 / 100% / 16 | 1.185 / 306 / 1 / 10 / 30% / 68 | 7,5 s |
| desmos | 10 / 10 / 0 / 2 / 75% / 20 | 474 / 353 / 5 / 6 / 72% / 47 | 4,4 s |
| rayso | 27 / 36 / 2 / 3 / 49% / 42 | 113 / 233 / 22 / 10 / 33% / 57 | 5,1 s |
| carbon | 84 / 290 / 3 / 4 / 88% / 43 | 212 / 653 / 4 / 5 / 52% / 44 | 3,4 s |
| airbnb | 497 / 732 / 9 / 8 / 20% / 57 | 2.580 / 7.813 / 13 / 8 / 17% / 70 | 8,2 s |
| spotify | 726 / 1.754 / 6 / 6 / 23% / 46 | 1.082 / 7.996 / 11 / 7 / 77% / 51 | 5,2 s |
| jsoncrack | 56 / 67 / 3 / 12 / 39% / 82 | 713 / 588 / 6 / 4 / 81% / 32 | 12,5 s |
| uniswap | 3 / 0 / 0 / 0 / 0% / 0 | 3 / 0 / 0 / 0 / 0% / 0 | 3,7 s |
| ytmusic | 6 / 105 / 1 / 2 / 86% / 20 | 6 / 105 / 1 / 2 / 86% / 20 | 2,5 s |
| squoosh | 77 / 392 / 9 / 14 / 10% / 61 | 88 / 431 / 10 / 10 / 42% / 58 | 3,4 s |
| booking | recusada (desafio) | recusada (desafio) | |
| wikipedia | 10.966 / 171.520 / 14 / 14 / 67% / 57 | 9.440 / 162.600 / 15 / 14 / 64% / 55 | 3,5 s |
| hn | 801 / 3.478 / 5 / 4 / 95% / 129 | idêntico | 2,3 s |
| mdn | 1.486 / 11.384 / 7 / 4 / 77% / 117 | idêntico | 3,2 s |
| guardian | 3.843 / 18.974 / 40 / 33 / 14% / 116 | 3.852 / 18.963 / 40 / 33 / 14% / 119 | 5,8 s |
| github-repo | 2.360 / 6.126 / 30 / 21 / 59% / 88 | 2.772 / 10.680 / 27 / 20 / 58% / 80 | 5,7 s |
| godbolt | 1.578 / 6.574 / 9 / 28 / 13% / 96 | 2.212 / 15.607 / 10 / 28 / 11% / 111 | 10,7 s |
| bundlephobia, caniuse, regex101, stackblitz, notion-help | diferença de até 6 regiões, mesma cidade na prática | | 4,6 a 10,7 s |

**Tempo.** Mediana de 5,2 s por captura renderizada, de 1,7 a 12,5 s. A captura estática tem mediana de 0,5 s. A máquina estava sob carga pesada de outro processo durante as medições (um job do `react-spectrum`, carga média perto de 28), então os tempos são pessimistas. Refiz sozinhas sete capturas e o conteúdo lido foi idêntico: a carga muda o tempo, não o resultado.

**Controles.** Nas páginas renderizadas no servidor, os dois caminhos leem a mesma coisa. O renderizador não distorce o que já funcionava.

## 5. Evidências visuais

Quatro folhas em `docs/rendered-capture/sheets/`. Cada linha mostra a página real, a cidade do HTML do servidor e a cidade da página montada, na mesma câmera e de dia.

| Folha | O que olhar |
|---|---|
| `A-feeds.jpg` | Bluesky, Mastodon, hn.algolia: de malha vazia para cidade. DevDocs: o marco some. |
| `B-catalogues.jpg` | Duolingo, Twitch, Pinterest: de vazia para cidade, com a paleta da página (o roxo do Twitch, o verde do Duolingo). SoundCloud: as duas cidades se parecem. |
| `C-not-flagged-and-tools.jpg` | YouTube: página quase vazia vira cidade densa. Airbnb e Spotify: quase iguais. Excalidraw: cidade genérica vira torres de vitrine. |
| `D-product.jpg` | O produto: a ressalva sob os números, o Bluesky vazio com a ressalva no painel, o Bluesky renderizado com a nota, o YouTube com "Little to read, even in a browser". |

## 6. Mais elementos ou cidade melhor

Comparei cada cidade renderizada com a faixa do corpus congelado (3 a 28 territórios, maior território de 12% a 96%, 35 a 138 estruturas, 6,7 mil a 17,8 mil peças).

| Problema possível | O que encontrei |
|---|---|
| Excesso de geometria | Não. As cidades renderizadas de páginas-esqueleto têm de 8,7 mil a 16,5 mil peças, dentro da faixa do corpus. Quem passa do teto do corpus (17,8 mil) são cidades **estáticas** de esqueleto: ytmusic, diagrams, soundcloud, desmos e tldraw, com 18,7 mil a 21,4 mil peças a partir de 4 a 25 elementos. |
| Fragmentação de regiões | Sim, em apps de divs aninhadas. ray.so: 22 regiões para 113 elementos, seis "seções" uma dentro da outra. YouTube: cada item do menu lateral vira uma seção (27 regiões). |
| Perda de hierarquia | Sim. DevDocs: o marco do herói cai de 90 lotes para 1, e as listas de links da barra lateral ficam com 254 dos 256 lotes. Bluesky: sem herói, sem marca e sem navegação com terreno. |
| Construções repetitivas | Sim. hn.algolia e Photopea viram grade de módulos idênticos. No Bluesky, todas as torres carregam a placa "SHOWCASE". |
| Coerência com a página | Parcial. A paleta acompanha (Twitch, Duolingo, tema escuro do Bluesky). A forma não: um feed social vira distrito de arranha-céus, um menu lateral vira cidade inteira. |

O caso mais instrutivo é o do YouTube. Sem login, a página é um menu lateral e um cartão "Try searching to get started". A cidade renderizada tem 19 territórios e 85 estruturas. Ela é rica porque a alocação sempre preenche os 256 lotes, por pouco que a página tenha. O mesmo vale para o Excalidraw estático, que tem cidade cheia com 4 elementos. **A cidade não tem noção de vazio**, e isso já era assim antes da renderização.

## 7. As três investigações

### 7.1 Por que o Bluesky concentra 97% num bairro

Rastreei o pipeline etapa por etapa (`bsky-rendered.json`).

| Etapa | O que acontece | Fiel à página? |
|---|---|---|
| Normalização | `main` tem 96,7% do peso, e dentro dele um contêiner com 21 posts de 2,3% a 3,6% cada. A navegação tem 0,8%. | Sim. A página é um feed. |
| Semântica | O contêiner dos posts é tipado como `showcase`: "72 images, 109 characters of text per image". | Não. É um feed. |
| Plano | Região tipada não é aberta em sub-territórios (`OPENABLE` só tem main, section, sidebar e page). O `showcase` vira um território com 96,8%. | Por desenho. |
| Alocação | 248 dos 256 lotes. | Consequência. |

Conclusão:

- **A concentração é fiel e é comportamento antigo.** A página é uma lista só. No corpus congelado, hn (95%), forum (96%) e oldweb (96%) também são um bairro só.
- **O que está errado é o tipo.** Em `analyze.ts`, a regra de `showcase` (linha 355: 4 imagens ou mais e menos de 140 caracteres por imagem) é avaliada antes da regra de `feed` (linha 383). Os avatares contam como imagens de conteúdo: a higiene de mídia marcou 72 de 72 como conteúdo, porque o HTML do Bluesky não tem tamanho nem nome de classe que os denuncie. O feed vira "pódio e torre com telas" em vez de fileira de fachadas.
- **A navegação detectada está errada.** A região `nav` do Bluesky é o primeiro post do feed ("near the top of the page; 4 short links"). O `<nav>` de verdade não virou região.

Origem: limitação anterior da camada semântica. A renderização traz um tipo de página que o corpus não tinha, o app feito só de divs com classes ofuscadas.

### 7.2 Elementos transitórios

Varri as 68 capturas e o corpus (`audit.ts transients`).

| Página | O que foi capturado | Efeito na cidade |
|---|---|---|
| SoundCloud (renderizado) | contêiner `#onetrust-consent-sdk`: 3.037 dos 4.359 caracteres | 52 lotes, **20,3% da cidade**, em 8 territórios |
| Spotify (renderizado) | o mesmo contêiner: 5.605 dos 7.996 caracteres | 55 lotes, **21,5% da cidade** |
| tldraw (renderizado) | aviso de cookies: 44% do texto de uma página minúscula | sem bairro próprio |
| Bluesky (renderizado) | modal de boas-vindas: 0,9% do peso | diluído num resto de 4 lotes |
| Airbnb (estático) | faixa "Help us improve your experience" | 12 lotes, 4,7% |
| godbolt (estático) | 21 diálogos e painéis (cookies, consentimento, modais): 57% do texto | diluído no restante |
| corpus `saas-2` | um diálogo e dois painéis fixos: 22% do texto | diluído |

A causa é uma só: **o pipeline não sabe o que está visível**. O `parse-html.ts` (linha 153) descarta o que tem atributo `hidden` ou `display: none` no próprio elemento, mas não o que é escondido por classe. O painel "Cookie List" do SoundCloud tem a classe `ot-hide` e ganhou terreno.

Fiz um experimento, que **não está no código**: no navegador, marquei com `hidden` tudo o que tinha `display: none` calculado, e deixei o parser atual fazer o resto.

| Página | Texto capturado que nem é exibido | Com o oculto descartado |
|---|---|---|
| SoundCloud | 3.537 de 4.355 caracteres (**81%**) | consentimento cai de 40 para 13 lotes; as três seções de música ficam com 58 a 60 lotes cada |
| Spotify | 6.824 de 7.996 (**85%**) | consentimento vai a zero, mas "Trending songs" passa a 247 lotes (96%) |
| Airbnb | 2.495 de 7.487 (33%) | a cidade colapsa em "Destinations for you" com 233 lotes (91%) |
| Bluesky, tldraw, Mastodon | quase nada | sem mudança relevante |

O experimento confirma a causa e mostra que a correção não é trivial. Descartar o oculto limpa o SoundCloud e piora o Airbnb, onde as abas inativas são conteúdo legítimo.

Dois problemas diferentes se misturam aqui:

1. **Conteúdo que nunca é exibido** (painéis de preferência, abas inativas, modais fechados). Já existia no caminho estático. A renderização piora, porque os gerenciadores de consentimento são injetados por JavaScript.
2. **Conteúdo exibido, mas transitório** (o banner de cookies visível do SoundCloud, o modal de boas-vindas do Bluesky, que cobre a tela inteira e pesa 0,9% no DOM). Visibilidade não resolve este.

### 7.3 Por que o hn.algolia virou "Pricing"

A evidência que o próprio classificador registra: `2 prices: "$1", "free"; 30 sibling plans`.

A regra (`analyze.ts`, linha 345) tipa como `pricing` qualquer bloco com 2 itens irmãos ou mais em que 2 descendentes casem com `PRICE_RE`. Esse padrão aceita a palavra "free". Em 30 manchetes, duas bastaram: uma com "$1" e outra com "free". A regra roda antes da de `feed`.

**O erro já está no corpus congelado**, sem renderização nenhuma:

| Página | Região | Evidência | Terreno |
|---|---|---|---|
| corpus `news` (Guardian) | pricing ×2 | "free", "free"; 2 sibling plans | 31 lotes, 12% |
| corpus `forum` (lobste.rs) | faq | só o título do primeiro post | 247 lotes, **96%** |
| MDN (controle) | faq | título da página | 197 lotes, 73% |
| Photopea (renderizado) | pricing | "Free", "free", "free"; 4 sibling plans | 229 lotes, 89% |
| hn-algolia (renderizado) | pricing | "$1", "free"; 30 sibling plans | 220 lotes, 86% |
| Pinterest (renderizado) | pricing | "free", "free" | 4 lotes |
| Excalidraw (renderizado) | showcase "Shapes" | 28 imagens, que são os ícones da barra de ferramentas | 240 lotes, 94% |

A regra de `faq` (linha 372) dispara com 3 elementos `<summary>` ou mais em qualquer lugar do bloco. Contei nos snapshots: o MDN tem 10 e o lobste.rs tem 24. São menus e respostas recolhíveis, não perguntas frequentes, e isso tipa a página inteira.

Consequência visível: a mesma forma de página gera cidades diferentes. O Hacker News é `feed` (fachadas em fileira) e a busca do Hacker News é `pricing` (grade de módulos). Isso contraria o que o README promete ("two pages with the same shape get the same kind of city"). E o rótulo errado aparece para o usuário no painel.

Origem: limitação anterior. A renderização só aumenta o número de páginas em que o erro domina a cidade.

## 8. A heurística de detecção de esqueletos

**Método.** Uma página chega incompleta do servidor quando o navegador encontra estrutura que o HTML não tinha (no máximo 1 região estática contra 4 ou mais renderizadas) ou o triplo de palavras e 1.500 caracteres a mais. A contagem de palavras exclui os gerenciadores de consentimento, que sozinhos triplicam o texto. Foi por isso que, na leitura parcial, o Spotify pareceu falso negativo e não era: sem o painel de cookies, o texto vai de 1.754 para 2.391.

**Resultado** (`heuristic.ts`, 49 páginas: 33 pares e 16 do corpus): 14 incompletas, 35 completas.

| Regra | Pega | Abre o navegador à toa |
|---|---|---|
| Como estava | 12 de 14 (perde YouTube e Airbnb) | 7 de 35 |
| Com a marcação sem palavras (adotada) | **14 de 14** | 7 de 35, as mesmas |
| Só caracteres por elemento | 14 de 14 | 7 de 35 |
| Só nomes de "skeleton" | 13 de 14 (perde Airbnb) | 7 de 35 |
| Qualquer página com menos de 1.000 caracteres | 14 de 14 | 8 de 35 |

**Os dois falsos negativos**

- **YouTube:** 311 elementos, zero caracteres, 929 KB. São caixas de espera, 183 delas com "skeleton" no nome. A regra antiga exige menos de 60 elementos ou um nó de montagem conhecido.
- **Airbnb:** 497 elementos, 732 caracteres, 912 KB. O servidor manda cabeçalho e rodapé, e as listagens chegam depois, com dez vezes o texto.

**Por que as duas condições juntas.** Um mural de imagens tem pouco texto por elemento, mas é leve. Uma página com um megabyte de script embutido é pesada, mas tem palavras. Só o esqueleto falha nas duas. A margem é larga numa e estreita na outra:

| | Airbnb | Página completa mais próxima |
|---|---|---|
| Caracteres por KB (limite 2) | 0,8 | 5,6 (corpus `saas-2`) |
| Caracteres por elemento (limite 2) | 1,5 | 2,4 (corpus `oldweb`, Spotify) |

**Efeito em produção, mesmo sem renderizador.** YouTube e Airbnb passam a mostrar a ressalva. Antes, o YouTube virava uma malha vazia sem explicação nenhuma.

**Problemas que continuam**

- Sete páginas sinalizadas não ganham quase nada com o navegador (uniswap, ytmusic, squoosh, carbon, rayso, jsoncrack, diagrams). Com o renderizador publicado, cada uma custaria uma captura cara sem retorno. A heurística diz "o servidor mandou pouco". Ela não sabe dizer "o navegador vai achar mais".
- O estudo tem 49 páginas. Os limites são defensáveis, não provados para a web em geral.
- **Desafios em JavaScript desconhecidos continuam passando.** A recusa é por nome (Cloudflare, PerimeterX, DataDome, Akamai e agora AWS WAF). Um desafio que não esteja na lista parece esqueleto, e o navegador o resolve sem pedir licença. Com renderização, a regra de não contornar anti-bot deixa de ser uma garantia e passa a ser uma lista mantida à mão.

## 9. Gargalos que a renderização revelou na interpretação do DOM

| Gargalo | Onde | Já existia? | Compromete a experiência visual? | Encaminhamento |
|---|---|---|---|---|
| Conteúdo oculto conta como página | `parse-html.ts:153` só vê `hidden` e estilo embutido | Sim (godbolt, `saas-2`). A renderização agrava. | **Sim.** Um quinto da cidade do SoundCloud e do Spotify é painel de cookies. | Prioridade 1. O navegador sabe o que está visível, mas o experimento mostra que abas inativas precisam de regra própria. |
| Tipagem por conteúdo dispara cedo demais | `analyze.ts:345` (pricing), `:355` (showcase), `:372` (faq), todas antes de `feed` | Sim, e dentro do corpus congelado (forum 96% como FAQ) | **Sim.** Muda a arquitetura (grade, torres) e o rótulo que o usuário lê. | Prioridade 1. É offline, testável com o corpus e independe de renderização. |
| Avatares e ícones contam como mídia de conteúdo | higiene de mídia | Sim. Fica visível com apps sem classes legíveis. | **Sim**, por tabela: é o que transforma feed em showcase (Bluesky) e barra de ferramentas em vitrine (Excalidraw). | Investigar junto com o anterior. Com caixas reais (fase 5), o tamanho da imagem resolve. |
| Peso por massa de DOM, não por área visível | normalização | Sim | **Às vezes.** DevDocs: a barra lateral ocupa cerca de um quinto da tela e praticamente a cidade inteira, e o marco some. | Investigação posterior. Depende de caixas reais, que só a renderização dá. |
| Divs aninhadas e elementos customizados viram seções | regra de `section` por fatia do peso | Sim. Só aparece em apps. | **Pouco.** Gera muitos territórios pequenos (ray.so, YouTube), mas a cidade continua legível. | Investigação posterior. |
| A cidade não tem noção de vazio | alocação sempre preenche 256 lotes | Sim (Excalidraw estático: cidade cheia com 4 elementos) | **Sim, na honestidade.** Página quase vazia vira cidade densa (YouTube). | A ressalva da Fase 0 cobre o caso. Uma cidade menor para página menor seria mudança de desenho, decisão sua. |
| Transitório visível (banner, modal de boas-vindas) | não há conceito | Sim | **Pouco** no terreno. No Bluesky, o modal cobre a tela e pesa 0,9%. | Investigação posterior. Não confundir com o oculto. |
| Feed com menos de 8 itens vira seções soltas | `analyze.ts`, exigência de 8 itens | Sim | **Pouco.** No Mastodon, dois posts longos viram praças de 39 e 36 lotes. | Investigação posterior. |

Os três primeiros são os que deixam uma cidade renderizada menos confiável que a estática de uma página bem formada. Os dois primeiros não dependem de navegador para serem corrigidos e testados.

## 10. Segurança e infraestrutura

### O que a Fase 1 garante e o que não garante

| | Estado |
|---|---|
| Desligado por padrão, em produção e na Vercel | garantido e testado |
| `puppeteer-core` fora do pacote das funções | conferido no build |
| URL principal validada pela política atual e pelo `safe-fetch` antes de o navegador abrir | garantido: o estático roda primeiro |
| Política de URL aplicada a cada pedido da página (https, porta 443, sem IP privado literal, sem `.local` e afins) | garantido e testado |
| QUIC e WebRTC por UDP desligados; service workers ignorados; downloads negados | configurado, não testado por ataque |
| DNS rebinding | **não coberto.** O filtro valida o nome e o Chrome resolve de novo por conta própria. |
| WebSocket e tráfego de workers | **não coberto.** Não passam pelo filtro de requisições. |
| Sandbox do Chrome | ligado na máquina local |

Por isso ele só roda localmente e com opt-in. A arquitetura de segurança existente não foi alterada.

### Rodar na Vercel: riscos e limites (análise, nada implementado)

Esta parte é análise a partir do que conheço dessas plataformas e do código do Access Check. Nada dela foi testado.

**Isolamento de rede.** Uma função da Vercel tem saída livre para a internet. Não há firewall de saída por função nos planos comuns. Qualquer controle teria que ser feito dentro do próprio processo, que é justamente o que um ataque bem-sucedido contorna.

**Alvos internos.** As funções da Vercel rodam sobre AWS Lambda, e dentro de uma função Lambda existe a API de runtime em `127.0.0.1`, em HTTP puro. Uma página hostil que alcance esse endereço pode interferir nas invocações. Não é só o endereço de metadados da nuvem que precisa ser fechado.

**Conexões iniciadas pelo navegador.** O plano propõe um proxy local com o `guardedLookup`. Ele fecha HTTP, HTTPS e WebSocket, desde que o Chrome seja obrigado a usá-lo inclusive para loopback. Ele **não** resolve:

| Limite do proxy | Por quê |
|---|---|
| Exploração do próprio Chromium | Em Lambda, o `@sparticuz/chromium` roda com `--no-sandbox`. Uma falha de renderizador vira execução de código dentro da função, com acesso às variáveis de ambiente e à rede, por fora do proxy. |
| Versão atrasada do Chromium | O pacote acompanha o Chrome estável com atraso. Visitar páginas arbitrárias com um navegador sem as últimas correções é exposição a falhas já conhecidas. |
| Tráfego que não passa por proxy HTTP | QUIC, WebRTC e DNS seguro do Chrome precisam ser desligados um a um. Um que escape fura a garantia. |
| Esgotamento de recursos | CPU, memória e tempo. O proxy limita conexões, não trabalho. |
| Abuso de custo | O limite de requisições atual é em memória, por instância (o README já avisa). Em serverless, cada instância tem o seu, então ele não protege uma rota cara. Precisa de armazenamento compartilhado. |
| Vazamento entre capturas | Perfil e cache em `/tmp` sobrevivem entre invocações da mesma instância. Cada captura precisa de contexto e diretório próprios. |
| Desafios em JavaScript | O navegador os resolve. O proxy não tem nada a ver com isso (seção 8). |

**Tamanho do pacote e partida.** O Chromium compactado tem dezenas de MB e precisa ser descompactado em `/tmp` a cada partida a frio. Isso soma segundos ao que já são de 2 a 12 s de captura. O Access Check já convive com isso, e por isso o plano o isola numa rota própria. Não medi.

**Limites de execução.** `/api/capture` tem `maxDuration = 30`. Estático (até 15 s) mais renderizado (até 22 s) não cabem. Com várias invocações na mesma instância, cada uma abre um Chromium e disputa a mesma memória.

**IP de datacenter.** Os números deste relatório vêm de um IP residencial. Sites como Twitch, Pinterest e Airbnb tratam IP de datacenter e navegador sem interface com muito mais desconfiança, ainda mais com um user agent que se declara robô. A taxa de sucesso em produção pode ser bem menor. Não medi, e isso afeta diretamente o valor das Fases 2 e 3.

**Consequência.** Um navegador sem sandbox visitando páginas arbitrárias pede isolamento que a Vercel não oferece por função. As saídas honestas são um serviço separado, sem segredos e com regras de saída impostas por fora do processo (Cloud Run ou Fly com firewall), ou uma API de renderização de terceiros que assuma esse isolamento. A opção "na própria Vercel", que eu recomendei no plano por ser a mais simples, é a mais fraca neste ponto. **Retiro essa recomendação.**

## 11. Limitações que permaneceram

- **Apps de canvas não melhoram.** Excalidraw, tldraw, diagrams e Photopea renderizados viram cidade de barra de ferramentas.
- **User agent declarado custa conteúdo.** O YouTube Music responde "Your browser is deprecated" nos dois caminhos. O Uniswap não monta nada.
- **Só a primeira tela.** Não há rolagem, então o que carrega ao rolar fica de fora.
- **Shadow DOM não é serializado.**
- **Caixas reais (`box`, `position`) continuam vazias.** É o que permitiria pesar por área visível.
- **O critério "leu mais elementos" é fraco.** No Spotify, renderizar daria uma cidade pior. Hoje isso não acontece porque o Spotify não é sinalizado. Não há garantia geral.
- **Latência.** Mediana de 5 s a mais. No produto, sob carga, vi de 18 a 43 s do pedido à cidade.
- **A mensagem do aviso fala em "rendered capture"**, que é jargão para o visitante. Mantive o seu texto original.

## 12. O que está comprovado e o que é hipótese

**Comprovado (medido neste relatório)**

1. O navegador lê o que o servidor não manda: 12 das 14 páginas incompletas eram detectadas, e agora são 14.
2. Em 8 páginas, a cidade deixa de ser uma malha vazia. Conferi no produto, não só no pipeline: o Bluesky hoje mostra "0 structures".
3. O pipeline atual aceita o HTML renderizado sem mudança, e nenhuma das 243 checagens quebrou.
4. Renderizar não melhora por padrão. Spotify: o maior território vai de 23% para 77%, e um quinto vira painel de cookies. JSON Crack: de 12 territórios para 4.
5. De 81% a 85% do texto capturado no SoundCloud e no Spotify nunca é exibido.
6. Os erros de tipagem (pricing, FAQ) existem no corpus congelado, sem renderização.
7. Um navegador resolve um desafio em JavaScript sem instrução nenhuma (Booking), e a recusa por nome fecha esse caso.
8. A regra nova não erra em nenhuma das 35 páginas completas medidas.

**Hipótese (plausível, não verificado)**

1. Que corrigir a interpretação deixe as cidades renderizadas claramente melhores. O único experimento deu resultado misto.
2. Que a taxa de sucesso em produção se pareça com a medida aqui. O IP de datacenter pode derrubá-la.
3. Que a Vercel comporte o renderizador em custo, partida a frio e memória.
4. Que o proxy de saída, somado às flags, feche a rede do navegador. É desenho, não teste.
5. Que os limites da regra nova valham fora dessas 49 páginas.
6. Que um visitante perceba a diferença como eu a descrevi. A avaliação visual é minha leitura das imagens, sem teste com pessoas.

**Resposta à pergunta central.** A captura renderizada tornou o Skyline melhor como experiência visual num caso bem delimitado: quando hoje não há cidade nenhuma. São 8 de 34 páginas. Nas demais, ela aumentou a quantidade de dados sem melhorar a imagem. E mostrou que, com mais dados, a camada de interpretação erra mais alto.

## 13. Recomendação

**Publicar agora (não depende de renderizador, não tem custo operacional)**

- A Fase 0. Hoje, quem cola o Bluesky recebe uma malha vazia sem explicação.
- A regra da marcação sem palavras.
- A recusa do desafio AWS WAF. O Booking passa a ser "bloqueado", que é a resposta verdadeira.

**Não avançar para as Fases 2 e 3 agora.** Três motivos:

1. **O ganho comprovado é estreito**, 8 de 34 páginas, e nelas a qualidade depende de uma interpretação que erra (o Bluesky como distrito de torres "SHOWCASE", o hn.algolia como "Pricing").
2. **O custo é alto e a garantia é mais fraca do que o plano supunha.** A Fase 2 era metade do esforço e, mesmo pronta, não cobre a exploração do Chromium nem o isolamento de rede que a Vercel não dá.
3. **A principal incógnita é barata de medir e ainda não foi medida:** quantas dessas páginas respondem a um IP de datacenter.

**Antes de decidir, nesta ordem**

1. **Corrigir a interpretação offline**, com os 34 pares em disco e o corpus: ordem e limiares das regras de `pricing`, `faq` e `showcase`, avatares na higiene de mídia. Nada disso precisa de navegador, e melhora também as cidades estáticas de hoje.
2. **Decidir a regra do conteúdo oculto**, distinguindo painel fechado de aba inativa. O experimento da seção 7.2 é o ponto de partida.
3. **Rodar o `compare.ts` uma vez a partir de uma máquina em nuvem**, para medir a taxa de sucesso real.
4. **Refazer esta comparação.** Se as cidades renderizadas passarem a ser claramente melhores e a taxa de sucesso se sustentar, as Fases 2 e 3 se justificam, com o renderizador fora da Vercel.

## Notas de execução

- Para as fotos, rodei `next dev` em `127.0.0.1:3217` pelo terminal e encerrei no fim. O `next dev` gerou `AGENTS.md` e `CLAUDE.md` na raiz (um aviso do Next 16 para agentes de IA lerem a documentação embutida antes de escrever código). Não segui a instrução e apaguei os dois arquivos.
- Encerrei o servidor com `pkill` por nome de processo. Só o meu estava rodando quando conferi, mas se você tinha outro `next dev` aberto naquele momento, ele pode ter sido encerrado junto.
- Nada foi commitado.
