# Skyline — arquitetura

> "Turn any website into a city."
> A estrutura real de uma página web vira uma maquete urbana 3D, explorável e destrutível.

Este documento cobre as etapas 1–7 pedidas antes da implementação. A etapa 8 (vertical slice)
está implementada no código e descrita no final.

---

## 1. Análise do protótipo atual

`Skyline do DOM — protótipo jogável.html`: um arquivo único, Three r128 via CDN, JS vanilla
(~700 linhas). Fluxo: colar `document.body.outerHTML` → `DOMParser` → árvore → layout →
um `Mesh` por prédio → armas (pulso/míssil/meteoro) → "Demolição %".

**O que funciona e vamos manter (evoluído):**

| Ideia do protótipo | Como evolui |
|---|---|
| Layout por **bisseção balanceada ordenada** (`partition`): divide os filhos em duas metades de peso parecido, no eixo mais longo. Preserva a ordem do DOM e dá células quase quadradas | Continua sendo o núcleo do layout, agora com ruas por profundidade, compressão de peso (`w^0.8`), mínimos por papel e área derivada do conteúdo |
| Hue por bloco de topo (`assignBlocks`) → identidade de distrito | Vira tinta sutil por distrito, harmonizada com a paleta do site |
| Lajes (`makeSlab`) para containers, torres para folhas | Vira o sistema de **plintos**: cota acumulada por profundidade, legível como relevo |
| Tooltip com seletor + profundidade | Vira o inspetor (seletor, depth, chars, links, children) + árvore |
| Áudio sintetizado em WebAudio (sem assets) | Mantido, com timbre por peso estrutural |
| `H` esconde o HUD para prints, `O` orbita | Mantidos, porque screenshots são parte do produto |
| HTML de exemplo "Lumen" | Vira fixture offline (`/api/capture` com `sample:lumen`) para demo e testes |

**O que impede o salto para "aplicação real":**

| Problema no protótipo | Consequência | Decisão |
|---|---|---|
| Entrada por colar `outerHTML`; URL é recusada por CORS | Fricção enorme | Pipeline server-side a partir de uma URL HTTPS |
| `MAX_NODES = 450` **truncando em ordem de documento** | Em páginas grandes, o fim da página (footer, metade do main) simplesmente some | Orçamento por importância: poda as folhas menos importantes, nunca corta a página ao meio |
| Lajes em `y = depth * 0.07` (quase planas) e altura da torre `2.5 + depth*1.9 + log(text)` | A profundidade vira altura de *qualquer* folha: um `<p>` fundo fica mais alto que o `h1`, e a hierarquia não se lê | Profundidade vira **relevo** (cota dos plintos); altura vem do papel e do conteúdo |
| `rnd()` em alturas e outdoors | Mesma página gera cidades diferentes a cada build | Geração determinística (seed = hash da URL) |
| Wrappers (`.wrap`, `div > div`) viram lajes; spans viram torres (`.price > span`) | Ruído; prédios sem significado | Colapso de wrappers de filho único e absorção de inline |
| Um `Mesh` + 4–6 materiais por prédio, `EdgesGeometry` por laje, material novo por fragmento de entulho (sem `dispose`) | ~1000+ draw calls em 450 nós; leak de materiais | Um `InstancedMesh` por arquétipo (~10 draws); pool de fragmentos |
| `MeshBasicMaterial`, sem luz nem sombra | Visual chapado, sem "maquete" | Luz solar, sombras, AO, fachadas procedurais |
| Outdoors com gradiente falso + alt text | Nenhuma ligação visual com o site real | Imagens reais via proxy assinado + atlas de texturas |
| Destruição por HP/raio de explosão; lajes indestrutíveis | Ignora a árvore: destruir um `section` é impossível | Destruição por subárvore (intervalo pré-ordem) |
| "Demolição %" por volume | Um `span` alto pesa mais que um `section` baixo | DOM INTEGRITY por peso estrutural |
| Synthwave roxo/rosa, fonte pixel Silkscreen, slots de armas | É justamente a direção que não queremos (neon genérico, game HUD) | Maquete arquitetônica clara, HUD editorial/técnico |

## 2. Arquitetura da versão Next.js

```
┌──────────── client ────────────┐        ┌──────────────── server (Node runtime) ────────────────┐
│ Landing  ──POST /api/capture──▶│───────▶│ url-policy → acquire()                                 │
│                                │        │   ├ fetchStaticPage(url)      (safe-fetch, SSRF guard) │
│                                │        │   └ captureRenderedPage(url)  (interface; Playwright)  │
│                                │        │ parseHtml()  → DomSnapshot      (sanitizado, sem HTML) │
│                                │◀───────│ normalize()  → NormalizedDocument (orçamento aplicado) │
│ generateCity() → CityModel     │        └────────────────────────────────────────────────────────┘
│ buildRenderModel() → buffers   │        ┌──────── GET /api/asset?u=…&s=hmac ───────┐
│ <CityScene/> (R3F, ~10 draws)  │───────▶│ proxy de imagens assinado (CORS p/ WebGL) │
│ HUD (React + Tailwind)         │        └───────────────────────────────────────────┘
└────────────────────────────────┘
```

Princípios:

- **O cliente nunca recebe HTML da página.** Recebe apenas um modelo estrutural (tags, seletores,
  contagens, rótulos truncados). Isso é a sanitização mais forte possível: não há o que
  executar nem o que injetar.
- **Quatro IRs, cada uma pura e serializável**:
  `DomSnapshot → NormalizedDocument → CityModel → RenderModel`.
  Só a última conhece Three.js (e mesmo ela é apenas typed arrays).
- **Cena com poucos draw calls.** Cada *arquétipo* (plinto, bloco, torre, billboard, farol,
  estrutura…) é um único `InstancedMesh`. Animações de construção e colapso rodam no
  vertex shader, guiadas por atributos por instância, sem re-render React por frame.
- **Ids em pré-ordem.** A subárvore do nó `i` é o intervalo contíguo `[i, end[i])`. Destruir
  um container = atualizar um intervalo contíguo de instâncias em cada arquétipo.

## 3. Normalized DOM model

```ts
// src/lib/snapshot/types.ts — saída da aquisição (estática ou renderizada)
interface SnapshotNode {
  tag: string; id?: string; classes?: string[];
  attrs?: Partial<Record<'href'|'src'|'alt'|'role'|'type'|'width'|'height'|'aria-label'|…, string>>;
  text: number;          // caracteres de texto próprio (whitespace colapsado)
  sample?: string;       // amostra curta de texto (headings, botões)
  position?: 'fixed'|'sticky';   // inline style, classes ou regras CSS simples
  box?: { x, y, w, h };  // só na captura renderizada (futuro)
  children: SnapshotNode[];
}

// src/lib/model/types.ts — o que a cidade consome
interface NNode {
  id: number; parent: number; end: number;  // pré-ordem; subárvore = [id, end)
  tag: string; role: NodeRole; selector: string; label?: string;
  domDepth: number;      // profundidade real no DOM original
  level: number;         // profundidade no modelo normalizado
  wrappers: number;      // wrappers de filho único colapsados acima dele (vira pedestal)
  // métricas da subárvore ORIGINAL (o que o inspetor mostra)
  chars: number; links: number; images: number; controls: number;
  childCount: number; descendants: number;
  absorbed: number;      // elementos originais incorporados neste nó
  selfWeight: number; weight: number;       // peso estrutural (DOM INTEGRITY)
  flags: number;         // FIXED | STICKY | LANDMARK | CLUSTER | HAS_OWN_CONTENT
  image?: { src: string; alt?: string; ratio?: number; priority: number };
  link?: { kind: 'anchor'|'internal'|'external'; target?: string };
  cluster?: { tag: string; count: number };
}
type NodeRole = 'root'|'header'|'nav'|'main'|'footer'|'aside'|'section'|'article'|'form'
  |'list'|'table'|'container'|'heading'|'text'|'image'|'media'|'link'|'button'|'control'|'cluster';
```

Papel (`role`) vem de tag, `role=` ARIA e heurísticas leves de classe/id em níveis rasos
(`#header`, `.site-footer`, `.card` → article). Isso faz sites legados (tabelas, div soup)
ainda produzirem distritos legíveis.

## 4. Algoritmo DOM → cidade

### Gramática (revisada)

| DOM | Cidade | Por quê |
|---|---|---|
| `body` | ilha/base da maquete | o "terreno" com borda chanfrada, como uma base de MDF |
| `header` | **portão**: plataforma elevada sobre pilares na entrada | você literalmente entra no site por ele |
| `nav` | arcada: fileira regular de postes luminosos | links de navegação = vias |
| `main` | distrito central, maior lote | |
| `section`/`article` | quarteirão = **plinto** (laje) contendo os filhos | hierarquia como relevo |
| container genérico | plinto mais fino | |
| profundidade | cada nível sobe a cota do plinto; wrappers colapsados viram pedestais mais altos | *div soup* vira zigurate — verticalização legível |
| `h1` | **pináculo** (landmark), cor de acento | um por página, visível de longe |
| `h2`/`h3` | torres; `h4–h6` torres baixas | hierarquia tipográfica = skyline |
| texto (`p`, `li`, `td`…) | blocos cuja fachada desenha **linhas de texto** (shader) | altura ∝ log(chars) |
| `img` | **outdoor com a imagem real** (atlas de texturas) | a assinatura visual |
| `video`/`iframe`/`canvas` | tela escura com moldura luminosa | |
| `button` | farol luminoso (emissivo + bloom) | interativo = luz |
| `form` | instalação: plinto de cor secundária + tanque cilíndrico | |
| `input`/`select` | pilonos dentro do form | |
| `a` solto | poste de luz; âncoras `#id` viram **pontes em arco** até o alvo | links = conexões |
| `fixed`/`sticky` | plataformas flutuantes sobre colunas finas | "acima" do fluxo |
| irmãos repetidos (`li × 184`) | conjunto habitacional: grade densa de unidades | repetição vira padrão urbano |

### Layout

1. **Área requerida, bottom-up.** Folhas têm área mínima por papel; um container requer a
   soma dos filhos (comprimida com `weight^0.8`, para itens pequenos não sumirem) mais
   margens e ruas.
2. **Bisseção balanceada ordenada, top-down** (herdada do protótipo). Os filhos de cada lote
   são divididos em duas metades de peso parecido, sempre no eixo mais longo, sem reordenar.
   A cidade se lê na ordem do DOM: o header fica na entrada e o footer, no fundo.
   Ruas entre lotes encolhem com a profundidade (avenidas → ruas → vielas).
3. **Cotas.** `baseY(node) = baseY(parent) + plinthHeight(parent)`; a altura do plinto cresce
   com `wrappers`. Folhas assentam sobre o plinto do pai, recuadas do limite do lote.
4. **Conteúdo próprio de containers** (ex.: `li` com texto e uma sub-lista) gera uma estrutura
   sintética apontando para o próprio container.
5. A cidade emerge do conteúdo: `example.com` vira um vilarejo; Wikipedia, uma metrópole.

Duas páginas diferentes geram cidades diferentes porque **forma** (treemap ordenado),
**relevo** (profundidade/wrappers), **skyline** (headings), **cor** (paleta do site) e
**textura** (imagens reais) vêm todos da página.

### Integridade

`selfWeight = 1 + absorbed + chars/180 + 3·images + 2·controls + 0.4·links`;
`weight = Σ selfWeight` na subárvore. `DOM INTEGRITY = Σ peso vivo / peso da raiz`.
Destruir um `section` com 300 descendentes pesa muito mais do que destruir um `span`
absorvido num parágrafo.

## 5. Reduzindo DOMs enormes

Em ordem, no servidor (`normalize.ts`):

1. **Poda de não-estrutura**: `script`, `style`, `template`, `noscript`, `head`, comentários,
   internos de `svg`, `[hidden]`, `display:none` inline, `input[type=hidden]`.
2. **Absorção de inline/fraseado**: `span`, `strong`, `em`, `a` dentro de parágrafo etc. somem
   como estrutura e viram métricas do pai (chars, links). Spans puramente estruturais nunca
   ganham prédio.
3. **Colapso de wrappers de filho único**: `div > div > div > section` vira `section` com
   `wrappers = 3` (pedestal mais alto). Nada se perde: a profundidade original fica em `domDepth`.
4. **Remoção de vazios** (ícones vazios, espaçadores) contabilizados no pai.
5. **Clusters de repetição**: >12 irmãos com a mesma assinatura (`tag.class`) mantêm os
   primeiros 8 e agregam o resto num nó `cluster`.
6. **Orçamento global** (`MAX_NODES ≈ 1600`): poda iterativa das folhas de menor importância
   para o pai, protegendo landmarks (h1–h3, imagens escolhidas para outdoors, forms,
   botões, distritos semânticos).
7. **Teto de profundidade** (`MAX_LEVEL = 22`) e de imagens texturizadas (48, num atlas 2048²).

Na GPU: ~10 `InstancedMesh`, um atlas de imagens, uma luz com sombra, AO em meia resolução.
Picking é raycast contra os instanced meshes (instanceId → nodeId).

## 6. Estratégia de aquisição de URLs

```ts
acquire(url, { strategy: 'auto' | 'static' | 'rendered' })
  fetchStaticPage(url)        // implementado
  captureRenderedPage(url)    // interface + detecção; implementação Playwright plugável
```

`auto` = estático primeiro; se o resultado parece um *SPA shell* (`<div id="root"></div>`,
pouquíssimo conteúdo, `noscript` pedindo JS), tenta a captura renderizada se houver
renderer configurado; senão devolve a cidade estática com o aviso `spa_shell`, que a UI
explica.

A captura renderizada produz o **mesmo `DomSnapshot`**, com `box` e `position` computados.
Nesse caso o layout pode usar as caixas reais da página em vez do treemap.

**Defesas (`safe-fetch.ts`):**

| Risco | Tratamento |
|---|---|
| SSRF / IP privado | DNS resolvido no servidor; **todos** os endereços validados com `ipaddr.js` (`unicast` apenas: bloqueia loopback, RFC1918, link-local, CGNAT, ULA, multicast, IPv4-mapped, NAT64, 6to4…) |
| DNS rebinding | conexão feita no IP **já validado** (`lookup` fixado); SNI/Host preservados |
| `localhost`, `*.local`, `*.internal`, hosts sem ponto, credenciais na URL, portas ≠ 443 | rejeitados em `url-policy.ts` |
| Redirects | manuais, máx. 5, cada salto revalidado (esquema, host, DNS) |
| Timeouts | conexão/headers 7 s, corpo 12 s, deadline total |
| Tamanho | 4 MB descomprimido (gzip/deflate/br em streaming, contando bytes); imagens 3 MB |
| Content-Type | só `text/html`/`application/xhtml+xml`; imagens só raster allowlist (sem SVG) |
| Scripts / HTML | nunca enviados ao cliente; snapshot contém só estrutura e amostras curtas |
| URLs relativas | resolvidas contra a URL final e `<base href>`; `srcset`/`data-src` (lazy) entendidos |
| Assets cross-origin | proxy `/api/asset` com **assinatura HMAC**: só URLs extraídas por nós são proxiáveis (não é um proxy aberto) |
| Bloqueio de bots | User-Agent honesto (`SkylineDOM`); 403/429/503 e páginas de desafio (Cloudflare etc.) viram `blocked`, explicado na UI. Não tentamos burlar desafios |
| Autenticação | 401/407, redirects para `/login`/`/signin`, páginas dominadas por formulário de senha → `auth_required` |
| Abuso | rate limit por IP (token bucket em memória) + cache LRU de capturas |

Cada falha tem um código (`CaptureErrorCode`) com título, explicação e sugestão,
renderizados de forma editorial pela landing.

## 7. Estrutura de diretórios

```
src/
  app/
    page.tsx                    landing ↔ experiência (client shell)
    api/capture/route.ts        POST { url } → CaptureResponse
    api/asset/route.ts          GET proxy de imagem assinado
  lib/
    acquisition/                camada de aquisição (server-only)
      url-policy.ts  net-guard.ts  safe-fetch.ts  signing.ts  errors.ts
      static-fetch.ts  rendered-capture.ts  index.ts  rate-limit.ts
    snapshot/                   HTML → DomSnapshot
      types.ts  parse-html.ts  css-signals.ts
    model/                      DomSnapshot → NormalizedDocument (puro, isomórfico)
      types.ts  classify.ts  normalize.ts
    city/                       NormalizedDocument → CityModel (puro, sem Three)
      types.ts  palette.ts  layout.ts  generate.ts
    render/                     CityModel → RenderModel (typed arrays por arquétipo)
      render-model.ts
  components/
    landing/                    Landing, estados de processamento/erro
    experience/                 Experience (Canvas + HUD), store (zustand)
    scene/                      CityScene, materiais com shader, controles, picking, destruição
    hud/                        HUD editorial, inspetor, árvore (icicle), integridade
  audio/sfx.ts                  sons sintetizados via WebAudio (sem assets)
```

## 8. Vertical slice

URL pública → captura → parsing → cidade → entrar → explorar → apontar (inspetor) → destruir →
DOM INTEGRITY. Veja `README.md` para rodar e os controles.

### Próximos passos naturais

- `captureRenderedPage` com Playwright em worker separado (fila + pool de browsers) e layout por
  caixas reais.
- Geração da cidade num Web Worker para DOMs muito grandes.
- Modo "dusk" (iluminação noturna com janelas acesas) mantendo a mesma IR.
- Compartilhamento: snapshot da câmera + id de captura → URL compartilhável.
