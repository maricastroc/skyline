# Pixel city: auditoria visual de cenário (art direction, rodada 0)

> Rodada só diagnóstica. A foundation-v1 não foi tocada: `npm run test:foundation` continua
> 14/14 (page model), 42/42 (cidades dia/noite/flat), 98/98 (kits v1–v8). Esta rodada criou só
> capturas, pranchas, este documento e scripts que **leem** o kit
> ([`scripts/art-audit/`](../scripts/art-audit/)).

## Resposta curta

**Sem os nomes, são variações do mesmo cenário.** As cidades trocam o **elenco** (os prédios:
cor, telhado, grão), mas não o **palco**: a grade de ruas, o chão, a vida de rua, o céu e a luz são
os mesmos nas 8. Todos os canais fortes estão nos prédios. Tudo o que fica entre eles está
congelado: ruas, calçadas e praças são **49–68% do plano**, e a névoa ocupa **o quarto superior
de cada quadro City**.

O primeiro controle a implementar é a **hierarquia viária**. Ela muda a estrutura que mais
sobrevive no thumbnail (a treliça de ruas), não move nenhum prédio e consome o sinal mais causal
que a fundação já produz: quem é dono de cada lado de cada rua.

## 1. Prancha

Capturas 1440×900 @2x, dia, seed 7, mesma câmera, kit atual (= kit-v9):

- **City**: a visão padrão.
- **Street**: `focus=0,0`.
- Apoio, não é visão principal:
  - **Overview**: a Street com `zoom=0.55`, que mostra o distrito inteiro;
  - **flat**;
  - **hora própria**: sem `time=`, a hora que a página escolhe.

| prancha | conteúdo |
|---|---|
| [**A-main-board**](screenshots/art-audit/sheets/A-main-board.jpg) | **prancha principal**: as 8 páginas em City e em Street |
| [thumbs-blind](screenshots/art-audit/sheets/thumbs-blind.jpg) · [chave](screenshots/art-audit/sheets/thumbs-key.txt) | thumbnails 240 px, sem nomes, em ordem embaralhada; linhas: City, Street, Overview, City cinza+desfoque, Overview cinza+desfoque |
| [thumbs-labelled](screenshots/art-audit/sheets/thumbs-labelled.jpg) | a mesma, com nomes |
| [C-overview](screenshots/art-audit/sheets/C-overview.jpg) | o distrito inteiro |
| [D-flat](screenshots/art-audit/sheets/D-flat.jpg) | só massing |
| [E-own-time](screenshots/art-audit/sheets/E-own-time.jpg) | hora própria de cada página |
| [F-street-layer](screenshots/art-audit/sheets/F-street-layer.jpg) | o mesmo recorte do cruzamento central nas 8 páginas |
| [G-family](screenshots/art-audit/sheets/G-family.jpg) | Wikipedia × Wikipedia 2 (família) e IKEA × Paul Graham (contraste) |

Capturas individuais: `docs/screenshots/art-audit/{city,street,wide,flat,own}/<página>.png`.
Sinais por página: [`signals.txt`](screenshots/art-audit/signals.txt).

**O que se separa no thumbnail.** Na City colorida dá para separar 5 grupos, todos pelos prédios:

1. Paul Graham e craigslist: cidade velha colorida de telhados de duas águas.
2. IKEA: módulos iguais.
3. Python Docs: azul-escuro denso.
4. Wikipedia: torre do relógio e tijolo.
5. GOV.UK, NASA e Linear: cinza-claro com praças. Os três ficam indistinguíveis entre si.

No thumbnail cinza e desfocado sobram 3 grupos:

- compacto: Paul Graham, craigslist, GOV.UK, Python Docs;
- aberto com praças: NASA, Linear, e a Wikipedia pelo marco;
- módulo repetido: IKEA.

No Overview, as 8 são o mesmo losango de 4×4 quarteirões, com a mesma cruz de ruas saindo para o
mesmo vazio.

A família continua funcionando: Wikipedia × Wikipedia 2 parecem o mesmo bairro (G-family). O
problema não é a falta de diferença entre páginas, e sim a diferença ficar presa nos prédios.

## 2. Canais visuais

| canal | classe | evidência |
|---|---|---|
| silhouette / skyline | **WEAK** | só o marco sai do "tapete". O marco está sempre no mesmo quarteirão. IKEA e Linear têm o mesmo `podiumTower` no mesmo lugar. 3/8 páginas não têm marco (D-flat) |
| distribuição de alturas | **WEAK** | mediana de 2,8–5,4 tiles, p90 de 3,8–8,6: tudo entre 3 e 6 andares. Invisível no thumbnail |
| densidade construída | **STRONG** | ocupação dos quarteirões de 57% (NASA, Linear) a 92% (Python Docs). É o principal sinal estrutural que sobrevive no thumbnail cinza |
| tamanho aparente dos quarteirões | **NEARLY FROZEN** | 16 quarteirões de 14×14 em todas as cidades. A treliça diagonal é a estrutura mais legível do thumbnail e é idêntica |
| largura e hierarquia das ruas | **NEARLY FROZEN** | toda rua tem 2,6 de leito e 1,1 de calçada, a mesma pintura, faixa de pedestres e semáforo em todo cruzamento. `grammar.avenue` é calculado e não é usado |
| quantidade e distribuição de espaço vazio | **STRONG** | NASA, Linear e Wikipedia têm praças grandes; Paul Graham e Python Docs, quase nenhuma |
| relação prédio ↔ rua | **WEAK** | sempre o mesmo anel de calçada. Só muda entre bloco perimetral (Wikipedia, Python Docs) e pavilhões soltos (IKEA, NASA) |
| continuidade / fragmentação das fachadas | **WEAK** | visível na Street (perímetro contínuo × módulos), quase some na City |
| setbacks | **NEARLY FROZEN** | nenhum recuo frontal, jardim frontal ou galeria: todo prédio encosta na mesma calçada |
| praças / pátios / espaços públicos | **WEAK** | a presença varia muito, mas toda praça é o mesmo piso bege com a mesma grade de árvores, postes e bancos, e uma fonte. NASA, Linear e Wikipedia têm a mesma praça |
| roofscape | **STRONG** | duas águas coloridas (Paul Graham, craigslist), planos cinza com HVAC (IKEA, GOV.UK), verdes (Linear), azuis e escuros (Python Docs). É o diferenciador nº 1 na City |
| ritmo urbano | **NEARLY FROZEN** | um cruzamento a cada 18,8 tiles em todas. O único ritmo interno que chega à City é o módulo repetido do IKEA |
| escala dos edifícios | **WEAK** | os footprints variam (lâminas da Wikipedia, módulos do IKEA, lotes estreitos do Paul Graham), a altura não. No thumbnail, a escala parece a mesma |
| landmarks | **STRONG** quando existem | a posição está congelada: sempre o quarteirão atrás do cruzamento central. Por isso 5/8 Streets têm a mesma composição (cruzamento no centro, praça e marco no alto) |
| vegetação | **NEARLY FROZEN** | árvores de rua idênticas em 8/8 (mesma posição, espécie e espaçamento). Gramado só nos pátios. `grammar.trees` e `grammar.parks` são calculados e não são usados |
| materiais / paleta: prédios | **STRONG** | retro (Paul Graham) e classic (craigslist, Wikipedia) se separam. Mas 5/8 páginas têm estilo primário *modern* (IKEA, GOV.UK, NASA, Linear, Python Docs), e as paredes convergem. Só o Python Docs escapa, pelo secundário *tech* e pelos telhados no matiz da marca |
| materiais / paleta: chão | **NEARLY FROZEN** | asfalto, calçada, piso de praça e grama têm as mesmas cores em todas (`palette.ts`: só variam com a hora) |
| atividade no térreo | **WEAK** | toldos, quiosques e telas (Linear, NASA) aparecem na Street e somem na City |
| mobiliário urbano, carros, pessoas | **NEARLY FROZEN** | F-street-layer: o cruzamento central é o mesmo em 8/8 (mesma árvore, poste, banca, pedestres e carros); só a cor dos carros muda. `grammar.traffic` (0,08 no Python Docs … 1,0 no craigslist) é calculado e não é usado |
| iluminação | **NEARLY FROZEN** | nas mesmas condições: mesmo sol, mesma direção, mesmas sombras. Na hora própria (E) vira um interruptor global de 3 estados (IKEA dourado; Linear e Python Docs à noite): forte, mas grosso |
| atmosfera | **NEARLY FROZEN** | mesma faixa de névoa azul no quarto superior de toda City, mesmo céu, mesmo dither |

Resumo:

- **STRONG (5)**: densidade, quantidade de vazio, roofscape, marco, paleta dos prédios. Todos são
  canais **dos prédios**.
- **NEARLY FROZEN (9)**: quarteirões, ruas, setbacks, ritmo, vegetação, chão, mobiliário,
  iluminação, atmosfera. Todos são **do palco**.

## 3. Gargalos (em ordem do que sobrevive no thumbnail)

**G1. O tabuleiro viário é idêntico.** Na linha "Overview cinza" dos thumbnails, a única coisa
nítida é a treliça diagonal de ruas, e ela é a mesma em 8/8.

- Mesma largura, mesmo espaçamento, nenhuma rua mais importante que outra.
- Ruas e calçadas são 44,5% do plano, desenhadas byte a byte iguais (`streetSurfaces`, sem
  nenhuma entrada da página).
- O marco ocupa sempre o mesmo quarteirão. Por isso as Streets repetem a mesma composição.

Canais presos aqui: tamanho dos quarteirões, hierarquia das ruas, ritmo, setbacks.

**G2. O chão é um material só, e o vazio tem um caráter só.** Somando ruas, calçadas e lotes
abertos, o chão ocupa 49% (Python Docs) a 68% (NASA, Linear) do plano. A **quantidade** de vazio
varia e aparece (é STRONG), mas o **tipo** não: uma praça cívica (interactive), o entorno de uma
galeria (media), o pátio de um bloco de texto e o quintal de um índice de links viram todos o mesmo
piso bege com árvores em grade. É por isso que NASA, Linear e GOV.UK parecem o mesmo lugar: o que
os diferencia (o programa) está nos prédios, e o vazio entre eles é igual.

**G3. A camada de vida de rua é carimbada.** Árvores, postes, bancos, hidrantes, carros e pessoas
saem de `kit.rand(seed=7, índice do quarteirão)` e nunca da página: as posições são idênticas em
8/8 (F-street-layer). Na City, isso forma a mesma textura pontilhada ao longo de toda rua. A
"internet velha" compacta do Paul Graham e o campus aberto do Linear têm as mesmas árvores de rua
e o mesmo trânsito.

**G4. Céu, névoa e luz são constantes.** O quarto superior de todo quadro City é a mesma névoa
azul, e o sol, a sombra e o dither são os mesmos. A hora própria é o único eixo que muda isso, e
ela é um interruptor de 3 estados que pinta a cidade inteira por igual (E-own-time).

**G5. Skyline comprimido.** ⛔ Corrigir isso exige mexer na fundação.

- Todo prédio comum fica entre 3 e 6 andares; só o marco rompe o tapete, e sempre no mesmo lugar.
- No thumbnail cinza, nenhuma cidade tem um perfil próprio.
- A causa está em camadas congeladas:
  - massing: `verticality → height` já está no backlog como sinal perdido, `vf` varia só
    0,97–1,20;
  - allocation: a espiral põe o marco no primeiro quarteirão.

A camada nova não pode resolver isso sem mudar o flat dos prédios. **Paro aqui e não proponho
mexer.** Se for prioridade, precisa de uma rodada própria de massing, com freeze, BEFORE × AFTER e
aprovação.

> Fora do top 5, pelo mesmo motivo: 5/8 páginas têm estilo primário *modern*, e GOV.UK, NASA e Linear
> dividem a mesma parede cinza-clara. Isso é mapeamento de estilo, que também está congelado.

## 4. Sinais que a fundação já produz

| gargalo | sinal existente | poderia controlar | estado hoje |
|---|---|---|---|
| G1 ruas | `trace.alloc.owner`: o território de cada lado de cada rua | rua de **fronteira** (entre territórios) × rua **interna** (dentro de um território) | produzido, não consumido |
| G1 | `segments[].comp` dos lotes de frente | o tipo de rua interna: parcelled/archive → viela; grid → rua de serviço; continuous → rua residencial calma; media/interactive → rua de pedestres; navigation → rua comercial | produzido, não consumido |
| G1 | `trace.landmark` | o eixo ou bulevar que leva ao marco | produzido, não consumido |
| G1 | `trace.frontage[].passages` | as passagens entre grupos já existem; poderiam virar becos legíveis | consumido (só como vão) |
| G1 | `grammar.avenue`, `grammar.streetLevels` (fingerprint: airiness, linkDensity, breadth) | largura e níveis de rua | calculado, **não usado** pelo kit; é sinal de identidade, secundário |
| G2 chão | `trace.pieces[].comp` + `parts` (quem é dono de cada lote aberto) | o caráter do vazio: praça cívica, átrio, jardim de pátio, quintal, pátio de serviço | produzido, não consumido |
| G2 | `trace.buildings[].program.use` dos vizinhos | o tratamento da calçada (canteiro residencial, piso largo comercial, pedra institucional) | produzido, não consumido |
| G2 | mistura de composições por terra | a paleta de chão do distrito | produzido, não consumido |
| G3 vida de rua | `grammar.traffic` (de linkDensity) | a densidade de carros | calculado, **não usado** |
| G3 | `grammar.parks`, `grammar.trees` (de whitespace e cobertura) | a densidade e o tipo de árvore | calculado, **não usado** |
| G3 | `program.use` da frente de cada lado de rua | o kit de mobiliário (mesas, bicicletários, floreiras, balizadores, bancos) | produzido, não consumido |
| G3 | parcela `interactive` + `fp.interactivity` | a densidade de pedestres | consumido só no térreo |
| G4 atmosfera | `fp.darkness`, `fp.hues`, `fp.background` | a hora (já), o tom do céu e da névoa de dia, o calor da luz | só a hora (3 estados); o fundo só tinge o céu à noite |
| G5 skyline | `grammar.verticality`, `grammar.towers`, peso do hero | as alturas e o perfil | ⛔ gasto no massing (congelado) |

Cuidados:

- `fp.imagery` está contaminado (Paul Graham = 1,0 por causa dos GIFs espaçadores; está no
  backlog). Não deve alimentar nada novo (outdoors, `billboards`).
- Os escalares do fingerprint (airiness, linkDensity) são identidade da página (CSS e marcação).
  Para estrutura urbana, prefiro os sinais do plano e do trace, que são os causais.

**Teste a seco do sinal de G1.** Só leitura, sem render. Para cada uma das 24 ruas internas da
grade, verifiquei se ela fica dentro de um território (mesmo dono dos dois lados em ≥ 3 dos 4
lotes) ou se separa dois territórios:

| página | internas | fronteira | o que dá frente para as ruas |
|---|---|---|---|
| Paul Graham | 21 | 3 | parcelled 100% |
| IKEA | 15 | 9 | grid 76%, support 10%, marco 10% |
| craigslist | 11 | 13 | parcelled 87%, navigation 13% |
| Python Docs | 10 | 14 | continuous 82%, parcelled 12% |
| GOV.UK | 9 | 15 | parcelled 44%, continuous 21%, support 17%, media 11% |
| Linear | 6 | 18 | continuous 35%, interactive 23%, media 20%, marco 15% |
| Wikipedia 2 | 6 | 18 | continuous 36%, archive 33%, marco 15% |
| NASA | 5 | 19 | media 40%, interactive 14%, support 14% |
| Wikipedia | 4 | 20 | continuous 40%, archive 22%, structured 11% |

O sinal já está lá e é proporcional à página:

- Paul Graham é um tecido único.
- A Wikipedia é uma colcha de fronteiras.
- As duas Wikipedias caem juntas (4 e 6 internas, mesma mistura de frentes).
- NASA e Linear têm o mesmo número de fronteiras, mas frentes diferentes (media × continuous).

## 5. Proposta: a Art Direction Layer

```
FOUNDATION V1 (FROZEN)          plan · trace (alloc, pieces, buildings + program, landmark, frontage) · grammar
        ↓  só lê
VISUAL / URBAN ART DIRECTION    para cada trecho de rua, lote aberto e lado de rua: uma classe + uma intensidade + o motivo
        ↓
SCENE                           leito e calçadas, mobiliário, tráfego, tratamento do chão, céu
        ↓
PIXELS
```

Regras:

1. **Só lê.** Nunca escreve em plan, trace ou partes de prédio.
2. **Sem hostname.** Toda decisão tem evidência no trace (por exemplo, um `trace.art[]` com o
   motivo, como `program.reason`).
3. **Sorteio só para decoração** dentro de uma classe já decidida, nunca para escolher a classe.
4. **Invariante:** as partes de `trace.buildings` continuam byte a byte iguais ao kit-v9.
   ⚠ **Decisão sua:** o `?flat=1` de hoje desenha também árvores, carros e chão, então qualquer
   controle desta camada move o flat da cidade inteira. Proponho redefinir o teste de regressão
   como "**flat dos prédios**" (as partes de `trace.buildings`). Não faço isso sem aprovação.
5. **Família:** pares próximos caem na mesma distribuição de classes. O teste é
   Wikipedia × Wikipedia 2.

**Controles propostos (4)**, escolhidos a partir dos gargalos G1–G4:

| controle | o que muda na imagem (precisa sobreviver no thumbnail) | alimentado por |
|---|---|---|
| **C1. Hierarquia viária** | Cada trecho de rua recebe uma classe: **bulevar** (canteiro central arborizado, leito escuro e cheio), **rua**, **viela** (asfalto estreito no centro, ombros de piso, sem faixa) ou **rua de pedestres** (leito no piso da calçada, sem carros). Tudo dentro do corredor que já existe (2,6 + 2 × 1,1): nenhum lote se move. A rua de pedestres apaga a linha escura no thumbnail e funde quarteirões em **superquarteirões**; as vielas afinam a treliça. | `alloc.owner` (fronteira × interna), `comp` das frentes, `trace.landmark` |
| **C2. Caráter do chão** | Cada lote aberto e cada calçada recebe um tratamento: **praça cívica** (pedra, aberta), **átrio** (piso escuro, polido), **jardim** (grama, copas soltas), **quintal** (grama, cercas), **pátio de serviço** (concreto). A paleta de chão do distrito sai da mistura de composições. | `trace.pieces[].comp` + `parts`, `program.use` dos vizinhos |
| **C3. Intensidade de rua** | A densidade e o tipo de árvore, o kit de mobiliário por lado de rua e a densidade de carros e pedestres deixam de ser carimbo. Muitas consequências vêm de C1 (rua de pedestres = sem carros; bulevar = árvores em fila). | `grammar.traffic`, `grammar.trees`/`parks` (já calculados), `program.use` da frente, parcela interactive |
| **C4. Atmosfera** | O tom e a densidade da névoa, o céu de dia e o calor da luz, contínuos em vez de 3 estados. | `fp.background`, `fp.hues`, `fp.darkness` |

Fora da camada:

- **perfil do skyline**: G5 precisa do massing;
- **paleta *modern***: precisa do mapeamento de estilo.

As duas exigem uma rodada da fundação.

Nota sobre C2: hoje `plaza()` e `yard()` desenham o piso e os objetos **dentro** da composição
(`compose.ts`, `massing.ts`, congelados). Fazer C2 sem tocar nesses arquivos exige um passo a
jusante que re-materialize as faixas `trace.pieces[].parts`. A alternativa é um gancho em
`plaza()`/`yard()` que delega o tratamento, o que toca arquivos congelados (sem mudar decisões). É
uma escolha para a rodada própria de C2, e é um dos motivos para C2 não vir primeiro.

## 6. O que eu implementaria primeiro: C1, hierarquia viária

1. **Ataca o invariante nº 1 do thumbnail.** A treliça de ruas é o que sobra quando a imagem vira
   240 px cinza, e é igual em 8/8. Um único controle mexe em três canais congelados: hierarquia das
   ruas, tamanho aparente do quarteirão (superquarteirões) e ritmo.
2. **Cobre 44,5% do plano**, que hoje é 100% idêntico.
3. **Não precisa da fundação.** Vive em `streetSurfaces` (`street.ts`) e em `furniture`,
   `intersections` e `traffic` (`district.ts`), que estão fora da lista congelada. Lotes, prédios e o flat dos prédios ficam
   intactos.
4. **Consome o sinal mais causal que existe**, a alocação: quem é dono de cada lado da rua. Não usa
   escalares de CSS.
5. **É proporcional por construção** (teste a seco acima):

   | página | leitura esperada |
   |---|---|
   | Paul Graham | um bairro de vielas |
   | IKEA | ruas de serviço em volta de um superquarteirão de mercado |
   | NASA | passeios de pedestres ligando praças e átrios |
   | Wikipedia | uma cidade de fronteiras e avenidas |
   | Python Docs | ruas residenciais calmas |

   As duas Wikipedias continuam família.
6. **Puxa C3 junto.** A classe da rua já decide onde há carros, fila de árvores ou mesas, então
   uma parte do carimbo de G3 se desfaz como consequência e não como sorteio.

Riscos que a rodada de C1 precisa medir no BEFORE × AFTER (City e thumbnails):

- se a diferença entre as classes não aparecer em 240 px, vira pele: o que conta é a cor e a
  largura aparente do leito, não pintura nem objetos;
- uma colcha de classes trocando no meio do quarteirão (por isso a regra de maioria por trecho);
- as 16 ruas da borda, que dão para o vazio.

## 7. Arquivos desta rodada

- `docs/PIXEL_ART_DIRECTION_AUDIT.md` (este)
- `docs/screenshots/art-audit/{city,street,wide,flat,own}/` (capturas) · `sheets/` (pranchas) ·
  `signals.txt` (sinais por página e teste a seco)
- `scripts/art-audit/shoot.mjs` (capturas) · `sheets.py` · `thumbs.py` · `signals.ts` (leitura do
  plano e do trace, sem efeito)
