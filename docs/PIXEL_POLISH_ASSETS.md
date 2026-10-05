# Pixel city: Visual Polish, rodada 2 (assets que parecem placeholder)

> Rodada em duas partes:
>
> 1. **estudos** (§1–§5): três alternativas para cada asset;
> 2. **implementação das escolhas** (§6–§9): ar-condicionado **A, condensador**, e billboard **C,
>    outdoor estruturado**, este também nas telas **com** conteúdo.
>
> **Nenhum commit** antes da avaliação.
>
> Os estudos rodaram com um seletor temporário, revertido e guardado como patch:
> [`scripts/polish-assets/asset-studies.patch`](../scripts/polish-assets/asset-studies.patch). Para
> vê-los ao vivo, aplique o patch sobre `55d9303` com `git apply`.

## Resposta curta (implementação)

- **O ar-condicionado deixou de ser tanque** em todas as cidades: gabinetes claros com ventiladores
  no topo, sem o duto que lia como canhão, sobre uma base do tamanho das unidades. Mesmo número de
  equipamentos, mesmo lugar.
- **O billboard virou objeto**, com e sem conteúdo: moldura funda, passarela com guarda-corpo e
  refletores que, à noite, lavam o painel de baixo para cima.
  - O texto da página continua o mesmo.
  - Quando não há conteúdo, fica o painel abstrato no accent.
  - Nada é inventado.
- **No Guardian, a repetição não pesa.** O quadro inteiro e o thumbnail ficam praticamente iguais ao
  BEFORE. Por isso não simplifiquei a estrutura.
- **`polishAssets: false` reproduz o kit-v12 byte a byte** (56/56). Com o polish ligado, todas as
  decisões da cidade são as do kit-v12 (`test:polish`, 8 checagens), e todas as outras suítes passam.

## Resposta curta (estudos)

- **Ar-condicionado: recomendo A, condensador.** Gabinete claro com um ou dois ventiladores no topo.
  Lê de cara como equipamento de cobertura, na City e na Street, de qualquer lado. Não cria ruído e
  ocupa o mesmo lugar de hoje.
- **Tela sem conteúdo: recomendo C, outdoor estruturado.** Moldura com profundidade, passarela com
  guarda-corpo e três refletores embaixo. Vira um objeto físico de dia, na sombra e à noite (quando
  os refletores lavam o painel de baixo para cima), sem inventar nada.
- **Ressalva honesta sobre a C:** o painel continua uma cor só. A melhora vem do contexto, e na City
  ela é modesta.

Nada muda em onde, quantos ou por que esses elementos aparecem.

## 1. Auditoria dos dois assets atuais

### Ar-condicionado de cobertura (`buildings.ts`, `roofZones`, case `hvac`)

**Por que parece um tanque de guerra:**

| peça atual | o que o olho lê |
|---|---|
| um duto longo e fino (0,08 × 0,08) **flutuando** acima e atrás das unidades, sem apoio | o **canhão** — o maior culpado |
| um disco escuro (o ventilador, padrão `GRILLE`) no topo de uma caixa baixa | a **escotilha** da torre |
| uma base escura mais larga que as unidades | o **casco / esteiras** |
| unidades achatadas (0,62 × 0,30 × 0,50) em aço escuro (`walls.tech[2]`, ainda mais escuro no cel-shading) | cinza militar |
| ripas laterais a cada 0,07 | textura de esteira na Street, ruído na City |

**Escala:**

- City: um cluster de uma unidade ocupa uns 15 × 15 px CSS, ou ~10 × 10 pixels de arte. É um
  sprite de poucos pixels, e o que conta ali é a **silhueta**.
- Street com zoom 2,6: um cluster de duas unidades ocupa ~180 × 110 px CSS.

**Frequência** (volumes com `hvac`): IKEA 118, Paul Graham 79, Guardian 73, GOV.UK 71, Wikipedia 32,
HN 26, NASA 22, Linear 17. Está em quase todo telhado plano.

**Restrições preservadas nos estudos:**

- a mesma base, no mesmo lugar e com a mesma largura (`cx0`, `cw`, `cz`);
- o mesmo número de unidades (área do telhado e o sorteio já existente `rand(P.seed, 302)`);
- o mesmo lado e a mesma casa de máquinas (`bulkhead`);
- nenhum sorteio novo;
- a decisão da Surface Grammar (`service: "hvac"`) intacta;
- altura de até ~0,5.

### Tela de fachada sem conteúdo (`buildings.ts`, `screen()`, quando a página não dá `brand` nem `label`)

**Por que parece uma div colorida:**

| peça atual | o que o olho lê |
|---|---|
| um retângulo emissivo de **cor chapada** (o accent da página clareado), igual de dia e de noite | uma div / uma textura que não carregou |
| uma moldura preta de 0,05, quase coplanar | a borda da div |
| nenhuma estrutura, apoio, profundidade ou material | um adesivo, não um objeto |
| à noite, um retângulo pastel aceso | "tela de debug" |

**Escala:**

- City: ~37 × 52 px CSS, ou ~25 × 35 pixels de arte (a tela do Guardian).
- Street com zoom 2,2: ~92 × 130 px CSS.

**Frequência:** o estado sem conteúdo é raro. Só **Linear (5 prédios)** e **Guardian (8)** têm telas
sem texto, e ela só é desenhada em prédios de 3+ andares. As telas **com** texto são muito mais
comuns (Guardian 70, NASA 26, Portfolio 20…) e **não foram tocadas**.

**Restrições preservadas nos estudos:**

- o mesmo retângulo (`u0…u1`, `y0…y1`) na mesma fachada;
- a mesma regra de quando aparece;
- só a cor accent da página;
- **nenhum** texto, logo ou imagem inventados;
- nenhum sorteio.

## 2. Como os estudos foram feitos

Casos reais onde o defeito aparece, com o kit atual, seed 7, 1440×900 @2x e sem overlays. O BEFORE
("atual") é capturado do mesmo código, sem o seletor. Capturas:
[`scripts/polish-assets/shoot-study.mjs`](../scripts/polish-assets/shoot-study.mjs). Pranchas:
[`scripts/polish-assets/sheets-study.py`](../scripts/polish-assets/sheets-study.py).

| asset | casos |
|---|---|
| ar-condicionado | Paul Graham, HN, IKEA e GOV.UK na City (dia); HN Street com zoom 2,6 (um prédio de frente para a câmera e um de frente oposta); Paul Graham Street; Paul Graham City à noite |
| tela | Guardian e Linear na City (dia e noite); Guardian Street com zoom 2,2, enquadrado nas duas telas (dia e noite); Linear Street (uma fachada na sombra e outro prédio ao sol) |

| prancha | conteúdo |
|---|---|
| [**P1-hvac-city**](screenshots/polish-assets/sheets/P1-hvac-city.jpg) | ar-condicionado, City, recortes 1:1 |
| [P2-hvac-street](screenshots/polish-assets/sheets/P2-hvac-street.jpg) | ar-condicionado, Street, 1:1 |
| [P3-hvac-night](screenshots/polish-assets/sheets/P3-hvac-night.jpg) | ar-condicionado, noite |
| [P4-hvac-thumbs](screenshots/polish-assets/sheets/P4-hvac-thumbs.jpg) | thumbnails, em cor e em cinza |
| [**Q1-screen-street**](screenshots/polish-assets/sheets/Q1-screen-street.jpg) | tela, Street, 1:1, dia e noite |
| [Q2-screen-city](screenshots/polish-assets/sheets/Q2-screen-city.jpg) | tela, City, 1:1, dia e noite |
| [Q3-screen-thumbs](screenshots/polish-assets/sheets/Q3-screen-thumbs.jpg) | thumbnails |
| [**R1-recommended-hvac**](screenshots/polish-assets/sheets/R1-recommended-hvac.jpg) · [**R2-recommended-screen**](screenshots/polish-assets/sheets/R2-recommended-screen.jpg) | as duas recomendações × o atual |

As capturas brutas dos estudos não foram versionadas: as pranchas P1–P4, Q1–Q3 e R1–R2 as
preservam, e o patch permite refazê-las (`shoot-study.mjs`, sobre `55d9303`).

## 3. Ar-condicionado: três alternativas

Nenhuma tem o duto flutuante. Todas usam aço galvanizado claro (o aço do kit clareado), poucas peças
e a base no lugar de sempre.

### A. Condensador (recomendada)

**Desenho:** gabinete claro (0,32 de altura), painel de veneziana mais escuro do lado da rua, um ou
dois ventiladores rentes no topo (dois quando a unidade é larga), base clara um pouco maior que as
unidades. São 3–4 peças por unidade.

**Na imagem:**

- na City, caixinhas claras com dois pontos escuros: a leitura clássica de condensador de telhado;
- de qualquer lado, porque o ventilador fica em cima.

**Prós:** a silhueta mais clara com o menor número de pixels; sem ruído no thumbnail.

**Contras:** é a mais "literal".

### B. Ventilador frontal

**Desenho:** gabinete vertical mais raso, com a grelha redonda do ventilador numa face (o disco
octogonal do kit, inclinado), sobre dois trilhos escuros.

**Na imagem:** de perto, é a unidade externa de split, muito icônica.

**Contras:**

- **depende da orientação**: num prédio de frente oposta à câmera o ventilador some, e na City vira
  um **cubo branco** (P1, P2 "frente oposta");
- os trilhos escuros sobram como traços.

### C. Cercado técnico

**Desenho:** um cercado de veneziana na cor da platibanda esconde o equipamento; só os ventiladores
aparecem por cima.

**Na imagem:** é a mais arquitetônica e se integra à paleta do prédio (no Paul Graham, cercados menta
e pêssego).

**Contras:**

- acrescenta um retângulo claro maior a cada telhado (mais massa visual);
- as venezianas viram linhas finas na Street;
- em telhados estreitos, a borda do cercado atravessa a platibanda (P2 "frente oposta"). A base de
  hoje faz o mesmo, mas escura e baixa.

### Veredito

**A.**

1. É a única que lê como ar-condicionado **na City**, que é onde o tanque aparecia.
2. Não depende de para onde o prédio está virado.
3. É a silhueta mais simples (uma caixa clara e dois pontos). ⚠ **Correção:** escrevi aqui "menos peças que hoje", e está errado. Ventiladores e venezianas viram peças separadas (no asset antigo eram padrão do shader). Medido na implementação: 3,4 → 8,1 peças por equipamento (§8).
4. Não cria ruído no thumbnail.
5. Usa a mesma linguagem do kit (caixas claras e simples, como a casa de máquinas e a caixa d'água).

## 4. Tela sem conteúdo: três alternativas

### A. Tela apagada

**Desenho:** moldura grafite, vidro escuro com um toque do accent e reflexo em diagonal escalonada
(o reflexo clássico de pixel art). À noite, só o reflexo acende fraco, mais uma luz de standby.

**Na imagem:** de dia, lê como TV desligada.

**Contras:**

- **na City e à noite vira um buraco escuro**, perto demais de "tela quebrada", que você pediu para
  evitar;
- no thumbnail cinza, cria manchas escuras (Linear, Q3).

**Descartada.**

### B. LED modular

**Desenho:** gabinetes de ~0,34 sobre um fundo escuro, com o accent em fileiras que clareiam para
cima. O degradê é fixo, não sorteado.

**Na imagem:** é o único que mexe no **painel** em si. Na Street, lê como parede de LED, e à noite
fica bonito.

**Contras:**

- em telas estreitas, a grade lembra caixilho de janela (Linear, "outro prédio");
- na City, a mudança mal aparece.

### C. Outdoor estruturado (recomendada)

**Desenho:**

- moldura funda cinza-metal;
- painel no accent;
- passarela com guarda-corpo embaixo;
- três refletores sobre ela, que à noite lavam a parte de baixo do painel com luz quente.

**Na imagem:**

- vira um **objeto**, com profundidade, apoio e manutenção;
- lê como um outdoor entre campanhas, sem fingir conteúdo;
- à noite é a mais bonita e crível das três.

**Contras:**

- o painel continua uma cor só: a leitura de "div" diminui pela moldura e pela estrutura, mas não
  some;
- na City, a melhora é modesta (moldura e passarela).

### Veredito

**C.**

- É a única que fica crível nas três condições testadas: sol, fachada na sombra e noite.
- Resolve "retângulo de debug" e "div" pelo caminho mais físico, sem inventar conteúdo e sem
  escurecer a cidade.
- **B** é a segunda opção, se você preferir mexer no painel em vez da estrutura.

### Ajustes feitos durante os estudos (registrados com honestidade)

- **B:** com módulos de 0,62, a tela virava uma "janela 2×2". Reduzi para 0,34.
- **C, luminárias:** em cima, elas projetavam três manchas escuras no painel. Passaram para baixo,
  na passarela.
- **C, painel:** como superfície iluminada, o painel mostrava um pontilhado diagonal quando a fachada
  estava na sombra. É o dither de sombra do renderer com sol rasante (território do G5, fora do
  escopo). O painel ficou emissivo, como a tela atual e a B, que não têm o problema.
- **A, noite:** um brilho sobre o vidro inteiro deixava a tela cor de vinho, com o reflexo invertido.
  Ficou só o reflexo aceso.

## 5. O que a implementação vai precisar decidir

> **Decidido:** as três foram aprovadas e implementadas (§6–§8). As telas com texto ganharam a
> mesma estrutura.

1. **Testes de freeze.** Mudar o desenho desses assets muda as partes dos prédios. Por construção,
   duas checagens quebram:
   - `test:foundation` ("blocos byte a byte = kit-v9");
   - `test:art-direction` ("atual = kit-v12").

   Proposta, no padrão do projeto (como `artDirection: false` → kit-v9):
   - uma ablação `polishAssets: false` que devolve o desenho antigo e é checada byte a byte contra o
     kit-v12;
   - com o polish ligado, a checagem passa a ser de **decisões iguais** (plano, trace, anatomia,
     papéis viários, vida de rua, ambiente), e não de partes iguais.

   Só faço isso com sua aprovação.
2. **Telas com texto.** Se a C for escolhida, as telas **com** texto continuam com a moldura fina de
   hoje. Esta rodada não as tocou. Vale decidir se elas ganham a mesma moldura e passarela, por
   coerência da família.
3. **Base do condensador.** A base clara da A cobre o mesmo retângulo da base atual, que em telhados
   estreitos passa da platibanda. Na implementação, eu encolheria a base às unidades (menos área
   clara, mesma posição).

## 6. Implementação

### O que mudou

| arquivo | mudança |
|---|---|
| [`kit/buildings.ts`](../src/lib/pixelcity/kit/buildings.ts) | `condensers()` (A) e `billboard()` (C). Os dois pontos de chamada (case `hvac` em `roofZones` e `screen()`) escolhem entre o desenho novo e o antigo, que ficou intacto atrás da chave |
| [`kit/core.ts`](../src/lib/pixelcity/kit/core.ts) | `kit.polishAssets` (padrão: ligado) e a instrumentação de teste `kit.assets` (o intervalo de peças de cada asset, só quando há trace) |
| [`kit/district.ts`](../src/lib/pixelcity/kit/district.ts) | a opção `polishAssets` e `trace.assets` |

**Nada mudou em quem decide.** As chamadas acontecem nos mesmos lugares, com os mesmos argumentos
(posição, largura, número de unidades, texto, accent). Nenhuma regra de Surface Grammar, Program,
massing, C1, C3 ou C4 foi tocada. A névoa e o renderer (`src/components/pixel/`) também não.

### Ar-condicionado (A)

- **O desenho:** gabinete galvanizado claro, veneziana escura nas duas faces longas e um ou dois
  ventiladores rentes no topo.
- **Sem duto.** A silhueta de canhão sumiu.
- **Base:** encolhida até o footprint das unidades. Antes ocupava o retângulo da zona de serviço
  inteira, de 0,75 de fundo; agora é o comprimento das unidades com 0,04 de folga, e 0,56 de fundo.
  Não passa mais da platibanda.
- **Ajuste em relação ao estudo:** a veneziana agora está nas **duas** faces longas (no estudo, só
  numa). Assim uma delas sempre olha para a câmera, qualquer que seja a orientação do prédio.
- **O que se manteve:** o mesmo número de unidades, a mesma posição, o mesmo lado, a mesma casa de
  máquinas e nenhum sorteio novo. A leitura depende da silhueta e da cor, não de microdetalhe:
  ventiladores e venezianas aparecem como pontos e uma faixa na City.

### Billboard (C), com e sem conteúdo

O objeto é o mesmo nos dois estados:

- moldura cinza-metal de 0,07 com 0,17 de profundidade;
- passarela com guarda-corpo embaixo;
- três refletores na passarela, que à noite lavam a parte de baixo do painel com luz quente.

O que muda é o painel, sempre emissivo (evita o pontilhado de sombra visto nos estudos):

| estado | painel |
|---|---|
| **com conteúdo** | o mesmo de antes: accent clareado 0,15, mesma intensidade de brilho, e o **mesmo letreiro** (mesmo texto, mesmo tamanho de texel, mesma largura máxima, mesma ordem no atlas). Só vem 3 cm para a frente, para ficar sobre o painel |
| **sem conteúdo** | o painel abstrato do estudo C: accent clareado 0,22 e um pouco menos de brilho (0,45 de dia, 0,5 à noite) |

O retângulo do painel não mudou: mesmo tamanho, mesma altura, mesma orientação. Só avançou 3 cm na
face.

## 7. BEFORE × AFTER

O BEFORE é `?v=12`: o kit-v12, igual byte a byte a `polishAssets: false`, desenhado pelo renderer de
hoje (com a névoa da rodada 1). O AFTER é o kit atual. 1440×900 @2x, seed 7, sem overlays. Capturas:
[`scripts/polish-assets/shoot.mjs`](../scripts/polish-assets/shoot.mjs). Pranchas:
[`scripts/polish-assets/sheets.py`](../scripts/polish-assets/sheets.py).

| prancha | conteúdo |
|---|---|
| [**A1-hvac-city**](screenshots/polish-assets/round/A1-hvac-city.jpg) | ar-condicionado, City, 1:1: Paul Graham, IKEA, Guardian |
| [**A2-hvac-street**](screenshots/polish-assets/round/A2-hvac-street.jpg) | ar-condicionado, Street, 1:1: Paul Graham, IKEA, Guardian |
| [A3-hvac-night](screenshots/polish-assets/round/A3-hvac-night.jpg) | ar-condicionado, noite (Guardian) |
| [**B1-billboard-street-blank**](screenshots/polish-assets/round/B1-billboard-street-blank.jpg) | billboard **sem** conteúdo, Street, 1:1, dia e noite: Guardian, Linear |
| [**B2-billboard-street-text**](screenshots/polish-assets/round/B2-billboard-street-text.jpg) | billboard **com** conteúdo ("RUSSELL T", a fileira "AI AND"), Street, 1:1, dia e noite |
| [B3-billboard-city](screenshots/polish-assets/round/B3-billboard-city.jpg) | billboards na City, 1:1, dia e noite, com e sem conteúdo |
| [**B4-guardian-whole**](screenshots/polish-assets/round/B4-guardian-whole.jpg) | o quadro inteiro do Guardian, dia e noite: repetição? |
| [**C1-thumbs**](screenshots/polish-assets/round/C1-thumbs.jpg) | thumbnails em cor e em cinza: ruído? |

Capturas: `docs/screenshots/polish-assets/{before,after}/<caso>.png`.

**Avaliação:**

- **Ar-condicionado:** o tanque sumiu nas três cidades, nas duas escalas. Na City, são caixinhas
  claras com dois pontos; na Street, condensadores legíveis, de frente e de costas. À noite, o asset
  vira um volume claro discreto.
- **Billboard sem conteúdo:** deixa de ser uma div. Com moldura, passarela e luz, lê como outdoor
  entre campanhas. A Linear, com a fachada na sombra, fica limpa (sem pontilhado).
- **Billboard com conteúdo:** o texto continua o da página e tão legível quanto antes. À noite, os
  refletores dão a leitura de outdoor iluminado.
- **Repetição no Guardian (98 telas desenhadas, 90 com texto):** a maioria fica nas bordas e na
  névoa. No quadro inteiro e no thumbnail, BEFORE e AFTER são praticamente iguais (B4, C1). A
  estrutura só se lê de perto, que é onde deve aparecer. Não simplifiquei.
- **Limite honesto, a fileira "AI AND" da Linear:** são seis billboards lado a lado numa fachada
  clara. Ali, molduras e passarelas formam faixas escuras repetidas. O conteúdo continua dominante,
  mas é o caso mais carregado do corpus (B2). Se incomodar, a simplificação consistente seria uma
  moldura mais clara ou mais rasa no mesmo asset, para todos os billboards.

## 8. Testes

| verificação | resultado |
|---|---|
| typecheck · lint (`src/lib/pixelcity/kit`, suítes alteradas, scripts novos) | ok · 0 problemas |
| **`test:polish`** (nova) | **8/8**: `polishAssets: false` = kit-v12 byte a byte (56/56); com o polish ligado, todas as decisões = kit-v12 (plano, alocação, peças, prédios com Program e anatomia, marco, frontage, papéis viários, vida de rua, ambiente) (56/56); paleta, névoa, cenário e fumaça = kit-v12 (56/56); toda peça fora dos dois assets idêntica à ablação (56/56); mesmos assets na mesma ordem (56/56); cada ar-condicionado dentro do footprint antigo e não mais alto (751 por modo, 42/42 cidades); cada painel com mesmo tamanho, orientação e lugar (223 por modo, 42/42); mesmos letreiros, nenhuma peça `sign` ou `image` nova (56/56) |
| `test:foundation` | 5 ✓ |
| `test:art-direction` | 3 ✓ (atual com polish desligado = kit-v12, 56/56) |
| `test:allocation` · `hygiene` · `surface` · `openings` · `composition` · `program` · `streets` · `life` · `atmosphere` | 13 · 15 · 45 · 28 · 46 · 46 · 8 · 11 · 12 ✓ |
| renderer e névoa (`src/components/pixel/`) | sem alteração (`git diff` vazio) |

**Como os testes foram adaptados, sem enfraquecer nenhuma checagem de decisão:**

- **Seis suítes comparam o kit atual byte a byte com kits congelados:** foundation, openings,
  composition, program, life e atmosphere. Nelas, o kit atual agora roda com `polishAssets: false`,
  no mesmo padrão que já usavam com `artDirection: false` e `streetLife: false`. Cada uma continua
  checando o próprio passo com a força de antes. Nenhum limiar ou campo comparado mudou.
- **Em `test:art-direction`**, a linha "atual = kit-v12" passou a ser "atual com polish desligado =
  kit-v12".
- **As decisões com o polish ligado** ficam em `test:polish`, comparadas diretamente com o trace do
  kit-v12. Só os índices de peça (que contam peças) saem da comparação.

**Peças por asset (corpus, dia), medidas:**

| | antes | depois |
|---|---|---|
| ar-condicionado (751) | 3,4 peças | 8,1 peças |
| billboard (223) | 2,9 peças | 14,9 peças |
| cidade inteira, somando o corpus | 172.872 peças | 179.037 peças (+3,6%) |

O número de **equipamentos** e de **billboards** é exatamente o mesmo; só cresceu o número de peças
de cada um.

> **Custo conhecido da rodada: +3,6% de peças no corpus.** Foi aceito na aprovação e não será
> otimizado agora. O `next build` não foi rodado, porque o servidor de dev usa o mesmo `.next`.

## 9. Confirmações pedidas

| | |
|---|---|
| `polishAssets: false` = kit-v12 byte a byte | ✓ 56/56 (dia, dourado, noite, flat), em `test:polish` e `test:art-direction` |
| mesmas decisões arquitetônicas com o polish ligado | ✓ 56/56, contra o trace do kit-v12 |
| nenhuma alteração na Foundation | ✓ nenhum arquivo de decisão tocado; `test:foundation` 5/5 |
| nenhuma alteração na Art Direction | ✓ `streets`, `life` e `atmosphere` passam; papéis, vida de rua e ambiente = kit-v12 |
| nenhuma alteração na névoa aprovada | ✓ `src/components/pixel/` sem diff; névoa, paleta e cenário = kit-v12 |
| nenhuma mudança de posição ou frequência dos assets | ✓ mesmos assets na mesma ordem; ar-condicionado dentro do footprint antigo; painéis no mesmo retângulo |

## 10. O que esta rodada não fez

- **Nada em:** árvores, vegetação, terreno, ruas, iluminação, névoa, pessoas, carros, massing,
  Foundation, Art Direction, Surface Grammar, Openings, ou frequência e posição de billboards.
- **Nenhum commit.**

## 11. Arquivos

| arquivo | estado |
|---|---|
| `src/lib/pixelcity/kit/buildings.ts` · `core.ts` · `district.ts` | modificados (a implementação) |
| `scripts/{foundation,art-direction,openings,composition,program,street-life,atmosphere}/check.ts` · `package.json` | modificados (o flag nas suítes antigas; `test:polish`) |
| `scripts/polish-assets/check.ts` | novo (`test:polish`) |
| `scripts/polish-assets/shoot.mjs` · `sheets.py` | novos (BEFORE × AFTER) |
| `scripts/polish-assets/shoot-study.mjs` · `sheets-study.py` · `asset-studies.patch` | novos (os estudos) |
| `docs/screenshots/polish-assets/{before,after,round}/` | BEFORE × AFTER e pranchas |
| `docs/screenshots/polish-assets/sheets/` | pranchas dos estudos (capturas brutas não versionadas) |
| `docs/PIXEL_POLISH_ASSETS.md` | este documento |
