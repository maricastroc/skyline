# Pixel city: Visual Polish, rodada 1 (névoa baixa)

> Primeira rodada de Visual Polish. Implementa **só** a direção B da
> [auditoria](PIXEL_POLISH_AUDIT.md) (gargalo G1): a névoa da City passa a ser desenhada como ar
> rente ao chão, em vez de uma retícula sobre a cidade. **Nenhum commit** antes da avaliação.

## Resposta curta

- **A retícula some.** Os prédios de trás deixam de parecer de vidro e passam a parecer distantes.
- **A névoa fica deitada no chão.** Ruas e bases distantes se dissolvem; telhados, torres e marcos
  sobem para fora dela como skyline.
- **O ganho é grande nas cidades densas e de texto** (HN, Paul Graham, Wikipedia) e nos marcos
  (Wikipedia, IKEA). Nas abertas (Linear, NASA), a mudança é pequena e limpa: a mesma névoa, sem
  retícula. Nenhuma camada nova aparece no chão.
- **A noite praticamente não muda.**
- **Nenhuma decisão da cidade muda**: Foundation, Art Direction e C4 byte a byte iguais.

## 1. O que mudou

Só o render da névoa, em dois arquivos:

| arquivo | mudança |
|---|---|
| [`PixelPost.ts`](../src/components/pixel/PixelPost.ts) | o cálculo da névoa no pass de pós-processo |
| [`PixelScene.tsx`](../src/components/pixel/PixelScene.tsx) | o registro `Fog` passa a levar a profundidade do chão nas linhas de baixo e de cima da tela e o seno da elevação da câmera, já calculados ali para a faixa |

Como a névoa é desenhada agora:

1. **Altura acima do chão.** Para cada pixel, o shader compara a profundidade dele com a do chão na
   mesma linha da tela. A diferença, vezes o seno da elevação, é a altura do ponto acima do chão.
   Não lê geometria nem partes: só a profundidade que o pass já lia.
2. **A névoa afina com a altura.** No nível da rua, ela é igual à de antes (mesma faixa C4, mesma
   curva de profundidade). Ela diminui suavemente até **50%** a partir de **6 unidades** de altura.
   Prédios médios e altos saem dela; ruas e bases distantes não.
3. **Dither só entre níveis vizinhos.** São 24 níveis de mistura, com Bayer só entre um nível e o
   seguinte. Antes eram 4 degraus alternando pixel de cidade com pixel de céu.
4. **Mistura perceptual.** A mistura com a cor do ar é feita em espaço de raiz quadrada, então
   sombras escuras e paredes claras desbotam no mesmo ritmo, sem pontilhado nas sombras.
5. **O chão totalmente enevoado continua sendo céu** (com estrelas à noite). O tabuleiro de fora do
   distrito continua escondido.

**Ajustes a partir do estudo B**, todos pequenos:

| parâmetro | estudo B | final | motivo |
|---|---|---|---|
| níveis | 16 | 24 | o pontilhado do estudo ainda aparecia nas sombras escuras |
| espaço da mistura | linear | perceptual | mesmo motivo; também lava menos o skyline |
| piso da névoa nos prédios | 35% | 50% | com a mistura perceptual, 35% perdia profundidade |
| altura de saída | 4,5 | 6 | transição mais longa nas fachadas, para a base não parecer uma camada de fumaça |

Nada é por página ou por site: os quatro números valem para todas.

## 2. O que não mudou

**A C4.** Ela continua decidindo, por página:

- a faixa da névoa;
- a cor do céu e do ar;
- o sol e a luz ambiente.

Os sinais e os eixos não foram tocados (`test:atmosphere` ✓).

**O resto também ficou intacto:**

- Foundation, Art Direction (C1, C3, C4) e as partes da cidade;
- a câmera: mesmo enquadramento, mesma posição, mesmo zoom;
- os outros quatro gargalos da auditoria;
- a Street, onde a névoa não existe: as capturas são idênticas pixel a pixel (0,00% de pixels
  diferentes no HN e na Wikipedia).

### Kits versionados × renderer

Esta distinção vale para toda a fase de Visual Polish:

- **Os kits versionados congelam as decisões e a estrutura da cidade**: plano, alocação, prédios,
  ruas, vida de rua, ambiente. São esses objetos que os testes de freeze comparam byte a byte.
- **O renderer é compartilhado por todos os kits** e continua evoluindo durante o Visual Polish
  (pós-processo, materiais, luz).
- **Portanto `?v=1` … `?v=12` não são snapshots visuais históricos pixel-perfect.** Eles reproduzem
  as decisões de cada kit, desenhadas pelo renderer de hoje. Desde esta rodada, por exemplo, todos
  usam a névoa baixa.
- **As capturas BEFORE preservadas são a referência visual histórica destas rodadas.** O BEFORE da
  rodada 1 são as capturas da auditoria, `docs/screenshots/polish-audit/{city,night,street,wide}/`,
  feitas do commit `debceb0` antes da mudança.

Não há versionamento do shader ou do render por kit, e não é intenção criar um só para preservar
pixels antigos.

## 3. BEFORE × AFTER

Mesmas condições da auditoria: 1440×900 @2x, seed 7, mesmo enquadramento, sem overlays. Capturas:
[`scripts/polish-haze/shoot.mjs`](../scripts/polish-haze/shoot.mjs). Pranchas:
[`scripts/polish-haze/sheets.py`](../scripts/polish-haze/sheets.py).

| prancha | conteúdo |
|---|---|
| [**H1-city-day-1**](screenshots/polish-haze/sheets/H1-city-day-1.jpg) · [**H1-city-day-2**](screenshots/polish-haze/sheets/H1-city-day-2.jpg) | **as 8 cidades, City dia** |
| [H2-dense-1to1](screenshots/polish-haze/sheets/H2-dense-1to1.jpg) | recortes 1:1 de HN, Paul Graham e Wikipedia, onde o problema era forte |
| [H3-open-pages](screenshots/polish-haze/sheets/H3-open-pages.jpg) · [H3b, faixa de cima 1:1](screenshots/polish-haze/sheets/H3b-open-pages-top-1to1.jpg) | Linear e NASA |
| [H4-night](screenshots/polish-haze/sheets/H4-night.jpg) | noite: Wikipedia, Linear, HN, Guardian |
| [H5-thumbs](screenshots/polish-haze/sheets/H5-thumbs.jpg) | thumbnails, em cor e em cinza com desfoque |
| [**H6-skyline-landmarks**](screenshots/polish-haze/sheets/H6-skyline-landmarks.jpg) | skyline e marcos atravessando a névoa |
| [H7-c4-order](screenshots/polish-haze/sheets/H7-c4-order.jpg) | a faixa de cima das 8, da mais enevoada para a mais aberta |

Capturas: `docs/screenshots/polish-haze/after/{city,night,street}/<página>.png`. BEFORE:
`docs/screenshots/polish-audit/{city,night,street}/<página>.png`.

## 4. Critérios de aprovação

| # | critério | resultado | evidência |
|---|---|---|---|
| 1 | a tela quadriculada deixa de dominar | **sim**: em 1:1, sobra só um pontilhado fino na faixa enevoada, perceptível só olhando de perto | H2, H3b |
| 2 | prédios do fundo não parecem translúcidos | **sim**: as fileiras de trás de HN e Paul Graham e o salão da Wikipedia ficam sólidos. Num telhado muito grande ainda há um leve degradê da frente para trás, mas é desbotamento por distância, não transparência | H2, H6 |
| 3 | skyline e marco mais legíveis | **sim**: a torre da Wikipedia com o salão inteiro, a torre do IKEA sem pontilhado na sombra, as fileiras de trás das densas como silhueta. No Guardian e na Linear o marco já estava fora da névoa: melhora pouco | H6 |
| 4 | ainda existe profundidade | **sim**: as fileiras de trás recuam (azuladas, menos contraste), as ruas distantes se dissolvem, e a borda do quadro continua virando céu | H1, H7 |
| 5 | páginas abertas sem camada artificial no chão | **sim**: Linear e NASA têm a mesma faixa estreita de antes, agora lisa. Nas densas, a base dos prédios altos se perde na névoa (é a intenção); a transição de 6 unidades evita a cara de fumaça | H3, H3b |
| 6 | a C4 continua produzindo diferenças | **sim**: as faixas são os mesmos números de antes (HN e Paul Graham 0,53→0,90 … Linear e NASA 0,69→1,00), e a ordem visual se mantém | H7, `test:atmosphere` |
| 7 | noite coerente | **sim**: quase idêntica, porque a névoa vai para o céu escuro e as janelas acesas dominam | H4 |
| 8 | nenhuma decisão da cidade muda | **sim**: `test:foundation` e `test:art-direction` passam byte a byte | §5 |

**Limites honestos:**

- **No thumbnail de 300 px a melhora é moderada.** A retícula já se perdia na média. O que
  aparece é o topo das densas com mais forma (H5). O salto maior está em tamanho real.
- **Linear e NASA mudam pouco**, como previsto na auditoria: o problema delas é a camada miúda em
  confete (G2), que não foi tocada.
- **Prédios altos distantes agora mostram detalhes antes escondidos pela retícula**, inclusive a
  sombra projetada na fachada (canto superior direito do Paul Graham). Não é artefato, mas é um
  pouco mais de informação no alto do quadro.
- **Hora dourada**: não está nas pranchas. A névoa usa a mesma lógica nas três horas.

## 5. Regressão

| verificação | resultado |
|---|---|
| typecheck · lint (`src/components/pixel`, scripts novos) | ok · 0 problemas |
| `test:foundation` | 14/14 · 42/42 · 42/42 · 42/42 · 98/98 |
| `test:art-direction` (atual = kit-v12; hashes do freeze; cadeia de ablações) | 56/56 · 56/56 · 56/56 |
| `test:atmosphere` (C4) | ✓ |
| Street antes × depois | 0,00% de pixels diferentes (HN, Wikipedia) |
| erros de shader ou console nas 18 capturas | nenhum |

O `next build` não foi rodado: o servidor de dev do projeto está no ar usando o mesmo `.next`.
Typecheck e lint cobrem o TypeScript, e o shader compilou nas 18 capturas.

## 6. Arquivos

| arquivo | estado |
|---|---|
| `src/components/pixel/PixelPost.ts` · `PixelScene.tsx` | modificados (a rodada) |
| `docs/PIXEL_POLISH_HAZE.md` | novo (este documento) |
| `docs/screenshots/polish-haze/` | novo (AFTER e pranchas) |
| `scripts/polish-haze/shoot.mjs` · `sheets.py` | novos |
| auditoria (`docs/PIXEL_POLISH_AUDIT.md`, `docs/screenshots/polish-audit/`, `scripts/polish-audit/`, `docs/real-pages/snapshots/hn.json`) | da rodada anterior, versionados junto com esta |
