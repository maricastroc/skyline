# Pixel city: art direction C3 · vida urbana

> Segundo experimento da Art Direction Layer. Só a C3: nada de C2 (chão), C4 (atmosfera),
> massing nem assets novos. A foundation-v1 e a C1 não mudaram (§10).
>
> O kit da C1 foi congelado como **kit-v10** (`?v=10`). O resultado da C3 foi congelado como
> **kit-v11** (`?v=11`), próximo baseline da Art Direction Layer; o atual é `?v=12`.
>
> **C3 aprovada e encerrada.** As limitações do §11 ficam registradas e **não serão corrigidas nesta
> fase**, por decisão de projeto:
>
> - Python Docs com muitas frentes comerciais;
> - carros acumulando nos cruzamentos;
> - ritmo uniforme dos postes;
> - pouca variedade de carros e de árvores;
> - pessoas dentro das praças vindas da composição;
> - leitura limitada na City.

## Conclusão

**Sim, com ressalvas de escala.**

1. **O carimbo sumiu.** O mobiliário de calçada era 100% idêntico nas 8 páginas (3.392 peças por
   cidade, todas no mesmo lugar). Agora é 0%. Nos carros, de 3% para 0%. Pessoas e árvores variam de
   18 a 338 e de 249 a 725 por cidade, contra exatamente 269 e 296 em todas antes.
2. **Tudo tem causa.** Cada calçada guarda por que tem a gente, as árvores e o mobiliário que tem
   (`trace.life`, [`street-life/life.txt`](street-life/life.txt)).
3. **A Street ganhou personalidade.** Em tamanho real ela é clara: Wikipedia de calçada cheia e
   cruzamento congestionado; Linear arborizado e quase sem carro; Paul Graham de vielas de pedra sem
   árvore e com pouca gente; IKEA de comércio com bancos e gente na frente das lojas. Nas pranchas
   reduzidas, o que sobrevive é sobretudo a **densidade de carros** e as **fileiras de árvores**:
   pessoas e mobiliário são pequenos demais.
4. **Na City, a diferença é pequena** e aparece só nas cidades abertas: mais copa em NASA, Linear e
   nos bulevares do IKEA, menos carros nos bulevares calmos. Nas densas (Paul Graham, craigslist,
   Python Docs), a oclusão continua escondendo a rua, como na C1.

## 1. Commit da C1

`7636e87` feat(pixel): derive street roles from the territory allocation (art direction C1) ·
`1e9a1e6` test(pixel): anchor kit-v9 to recorded hashes and check the art direction ablation ·
`a378141` docs: add street roles (C1) evaluation and screenshots. Push em `main`. As limitações da
C1 foram registradas como não corrigidas ([PIXEL_STREET_ROLES.md](PIXEL_STREET_ROLES.md)).

## 2. Diagnóstico do carimbo (kit-v10)

| prop | onde | o que decide a posição | depende da página? |
|---|---|---|---|
| árvores de rua | `furniture()`, cada lado de quarteirão | `rand(índice do quarteirão, lado)` + seed: passo 1,05–1,40, árvore com p 0,62 entre postes | **não**: posições idênticas em 8/8 (só a cor da folha muda com a hora) |
| postes | `furniture()` | cadência 3–4 sorteada por lado | **não** |
| hidrante, parquímetro, lixeira, banco | `furniture()`, vagas sem poste nem árvore | limiares de `rand` | **não** |
| pessoas na calçada | `furniture()`, p 0,42 por vaga | `rand` | **não** |
| caixa de correio e bancas | lado 0 se (i+j) par | paridade do quarteirão | **não** |
| balizadores | lado 1 se (i+j) ímpar | paridade | **não** |
| abrigo de ônibus e 3 pessoas | quarteirão (1,2), lado 0 | fixo | **não** (só a cor de destaque) |
| 8 pessoas no cruzamento central | fixas | fixo | **não** |
| sedã, táxi, hatch, ônibus, caminhão "FRESH" | em volta do centro | fixo | só a faixa (C1) |
| carros | toda pista, vaga a cada 1,25 com p 0,5 | `rand(vi)` com `vi` global | só a faixa (C1) e a cor (matiz da página) |
| semáforos | 9 cruzamentos internos | C1: só onde duas ruas com tráfego se cruzam | papel (C1) |
| praças, pátios, mesas de café, varandas | dentro dos quarteirões | composição e superfície | **sim** (fundação congelada; fora da C3) |

Medição ([`street-life/stamp.txt`](street-life/stamp.txt)): no kit-v10, **100%** do mobiliário de
calçada é idêntico nas 8 páginas. Pessoas e árvores são exatamente **296 e 269 em todas**.

`grammar.traffic`, `grammar.trees` e `grammar.parks` eram calculados e **não usados** pelo kit. Nem o
Program nem o papel da rua (fora a faixa dos carros) chegavam à vida de rua.

## 3. Sinais usados pela C3

| sinal | de onde vem | por que é causal |
|---|---|---|
| **térreo de cada frente** (`Anatomy.ground`: tipo e transparência) | Surface Grammar (congelada), a jusante do Program | uma frente ativa é exatamente um térreo aberto para a rua: vitrine (0,75–0,9), saguão (0,75); casa, cívico e serviço são fechados (0,05–0,3) |
| **chão aberto** (lote sem prédio de composição media / interactive / landmark) | alocação + composição | praça é espaço público: gente e bancos |
| **papel da rua** | C1 | capacidade (carros), caminhabilidade (gente), espaço para árvores |
| **`grammar.traffic`** (← densidade de links) | gramática, já calculada | links são circulação: uma página feita de links movimenta, uma de texto corrido não |
| **`grammar.parks`** (← espaço em branco e cobertura) | gramática, já calculada | a página que respira vira cidade que respira |

Fica de fora `grammar.trees`: ele soma +0,2 quando o estilo é clássico, e estilo não é causa de
árvore. Fica de fora `fp.imagery`: está contaminado (backlog). Nenhum sinal novo foi criado a
montante.

## 4. Gramática

Três intensidades contínuas, cada uma o produto de no máximo três sinais. Mais uma tabela de tipo
de mobiliário.

| eixo | onde | fórmula | papel (C1) |
|---|---|---|---|
| **footfall** (gente) | cada calçada (64) | atividade média das 4 frentes × caminhabilidade do papel | pedestrian 1,3 · lane 1,15 · street 1 · primary 0,85 |
| **canopy** (árvores) | cada calçada | espaço do papel × (½ `parks` + ½ plantabilidade média das frentes) | primary 1 · pedestrian 0,8 · street 0,6 · lane 0 (viela compartilhada não tem canteiro) |
| **traffic** (carros) | cada pista (40) | capacidade do papel × (0,25 + 0,75 `traffic`) | primary 1 · street 0,65 · lane 0,3 · pedestrian 0 |

Expressão, só com o vocabulário que já existia:

- **Gente**: 9 × footfall pessoas por calçada, mais 6 × footfall no leito de um calçadão.
  Nos cruzamentos, 3 × (footfall das duas calçadas da esquina) esperando; numa esquina movimentada
  diante de uma faixa, alguém atravessando.
- **Mobiliário**: 5 × footfall peças por calçada. O tipo segue o lote da frente:
  - vitrine: bancas, lixeira, banco, parquímetro (só onde há carro);
  - saguão: banco, lixeira, balizadores;
  - casa: hidrante, caixa de correio;
  - cívico: balizadores, banco;
  - praça: bancos;
  - serviço: hidrante.
- **Árvores**: 13 × canopy por calçada. No bulevar, fileira regular (alameda); nos outros papéis,
  espaçamento solto. Ficam na linha do meio-fio que a C1 definiu (ou duas fileiras no calçadão).
  Isso corrige a limitação da C1 de árvores no meio da calçada alargada.
- **Postes**: ritmo por papel (bulevar 3,4 · rua 4,4 · viela 5,6 · calçadão 3,4), com fase por rua.
- **Carros**: 0,85 × traffic das vagas de cada pista. Vans e caminhões na proporção das frentes de
  serviço e carga.
- **Ônibus**: num bulevar interno, ponto (abrigo, pessoas, ônibus parado) no lado mais movimentado,
  se footfall ≥ 0,45. O ônibus e o abrigo fixos do carimbo saíram.

**Determinismo.** Toda quantidade é função da página. Onde cada coisa fica, dentro da quantidade, é
decoração: vem da seed **e** de um sal tirado das chaves dos territórios ao longo da rua.

Por que o sal: a primeira versão usava só índices de quarteirão. Isso criava um **carimbo em
prefixo**: páginas com intensidades diferentes mostravam mais ou menos itens, mas os primeiros eram
sempre os mesmos (a mesma van escura no mesmo lugar em 6 das 8 cidades). O sal desfaz isso sem
mexer em nenhuma quantidade.

## 5. Distribuição nas 8 páginas

| página | movimento (links) | verde (parks) | footfall | canopy | traffic | pessoas | árvores | carros | ônibus |
|---|---|---|---|---|---|---|---|---|---|
| IKEA | 0,28 | 0,56 | **0,80** | 0,29 | 0,31 | 708 | 204 | 241 | 6 |
| Paul Graham | 0,35 | 0,16 | 0,28 | **0,03** | 0,17 | 249 | **18** | **57** | 0 |
| craigslist | **1,00** | 0,14 | 0,31 | 0,15 | 0,48 | 263 | 101 | 298 | 2 |
| GOV.UK | 0,68 | 0,53 | 0,41 | 0,27 | 0,40 | 363 | 194 | 285 | 1 |
| Wikipedia | 0,86 | 0,19 | 0,54 | 0,23 | **0,56** | 469 | 158 | **387** | 5 |
| NASA | 0,36 | 0,67 | 0,69 | 0,44 | 0,18 | **725** | 317 | 131 | 6 |
| Linear | 0,11 | **0,69** | 0,67 | **0,48** | 0,17 | 655 | **338** | 130 | 7 |
| Python Docs | 0,08 | 0,17 | 0,71 | 0,16 | 0,20 | 606 | 112 | 165 | 1 |
| *Wikipedia 2* | 0,89 | 0,19 | 0,47 | 0,26 | 0,58 | 408 | 186 | 444 | 7 |
| *carimbo (kit-v10), todas* | | | | | | 296 | 269 | 229–490 | 1 |

As personalidades que saem dos sinais:

- **IKEA**: rua comercial (vitrines em 200 de 256 frentes), muita gente, árvores só nos bulevares.
- **Paul Graham**: bairro de vielas com frentes cívicas fechadas, quase sem árvore, pouco carro e
  pouca gente.
- **craigslist**: as mesmas frentes fechadas, mas a página mais "de links": bulevares
  congestionados.
- **Wikipedia**: ruas movimentadas e calçadas cheias.
- **NASA e Linear**: calçadões cheios de gente, arborizados e com pouco carro.
- **Python Docs**: calçadas movimentadas e rua vazia. A Surface Grammar deu vitrine a 223 de 256
  frentes (quarteirões residenciais com comércio no térreo), e a página quase não tem links.

## 6. BEFORE × AFTER

Capturas 1440×900 @2x, dia, seed 7, mesma câmera:

- BEFORE = `?v=10` (C1);
- AFTER = atual.

| prancha | visão |
|---|---|
| [A-before-after-city](screenshots/street-life/sheets/A-before-after-city.jpg) | City |
| [B-before-after-street](screenshots/street-life/sheets/B-before-after-street.jpg) | **Street** (principal desta rodada) |
| [C-before-after-wide](screenshots/street-life/sheets/C-before-after-wide.jpg) | Overview |

- **Street**: as mudanças mais visíveis são a queda de carros em NASA, Linear, Python Docs e Paul
  Graham, as fileiras de árvores nos bulevares e nos calçadões, e o congestionamento nos
  cruzamentos de Wikipedia e craigslist. Gente, bancos e bancas só se leem em tamanho real.
- **City**: diferenças pequenas: copa e carros ao longo dos bulevares visíveis. Nas densas, nada.

## 7. O mesmo cruzamento nas 8 páginas

[D-same-crossing](screenshots/street-life/sheets/D-same-crossing.jpg): o recorte que revelou o
carimbo na auditoria, BEFORE em cima e AFTER embaixo.

- **Antes**: a mesma árvore, o mesmo poste, as mesmas bancas, os mesmos pedestres e os mesmos carros
  em todas.
- **Depois**: cada cruzamento tem a vida da sua página.
  - IKEA: van, bancos, gente nas esquinas.
  - Paul Graham: quase vazio.
  - Wikipedia: táxis e muita gente.
  - NASA: carros e gente.
  - Linear: bancos e pouco carro.

  Nada se repete entre páginas. O que continua igual é o que a C1 decide (semáforos) e o que fica
  dentro dos quarteirões (praças, congeladas).

## 8. Thumbnails cegas

- [G-thumbs-blind-after](screenshots/street-life/sheets/G-thumbs-blind-after.jpg): só AFTER, sem
  nomes ([chave](screenshots/street-life/sheets/thumbs-key.txt)). Linhas: City, Street, cruzamento,
  Overview, City em cinza.
- [H-thumbs-before-after](screenshots/street-life/sheets/H-thumbs-before-after.jpg): com nomes.

Em 240 px, a linha **cruzamento** é a que mais separa as páginas (quantidade de carros, gente e
árvores). Street e City separam pouco além do que os prédios já separavam.

## 9. Wikipedia × Wikipedia

[E-wikipedia-family](screenshots/street-life/sheets/E-wikipedia-family.jpg). Mesma vida:
calçadas cheias, tráfego intenso, árvores em fileira nos bulevares.

- Footfall 0,54 / 0,47, canopy 0,23 / 0,26, traffic 0,56 / 0,58.
- Distância 0,087, contra mediana 0,343 entre os pares do corpus e 0,498 para Wikipedia × Paul
  Graham (`test:life`).

[F-seed](screenshots/street-life/sheets/F-seed.jpg): seed 7 × 8 da mesma página. As intensidades e
as contagens são idênticas (14/14); só as posições mudam. Atenção: na prancha, a seed também muda
cores de parede, telhados e o estilo secundário dos prédios. Isso é da fundação, já documentado na
validação ponta a ponta; não é da C3.

## 10. Regressão da fundação e da C1

| verificação | resultado |
|---|---|
| typecheck · lint · build | ok · 0 problemas · ok |
| `test:foundation` (page model, quarteirões e trace = kit-v9; `artDirection: false` = kit-v9; kit-v9 = hashes do freeze; kits antigos) | 14/14 · 42/42 · 42/42 · 42/42 · 98/98 |
| `test:streets` (C1): papéis sem seed e só do plano, corredor, `streetLife: false` → mobiliário = kit-v9, família, estabilidade | 8 ✓ |
| **`test:life`** (novo): `streetLife: false` = kit-v10 byte a byte (dia, noite, flat) | 42/42 |
| `test:life`: papéis da C1 inalterados · quarteirões = kit-v10 | 14/14 · 14/14 |
| `test:life`: intensidades e contagens independentes da seed · a seed ainda move posições | 14/14 · 14/14 |
| `test:life`: sem hostname · carimbo < 10% · nada sobre um quarteirão · nenhum carro em calçadão | ✓ · 0% · 0 · 0 |
| `test:life`: família Wikipedia · pequenas edições mudam as intensidades em média | 0,087 < 0,343 · 0,016 |
| `test:allocation` · `hygiene` · `surface` · `openings` · `composition` · `program` | todos ✓ |

**Correção no `test:foundation` (defeito latente do teste, não da cena).** No modo flat, a cidade é
filtrada depois de gerada (sem placas, pessoas e luzes), e o teste fatiava a lista filtrada com os
índices da lista não filtrada. A fatia "dos quarteirões" incluía, sem querer, as primeiras peças de
mobiliário. Enquanto o mobiliário era o do kit-v9, a falha não aparecia. A C3 a expôs (14 casos flat
"diferentes"). O teste agora mapeia os índices para a lista filtrada; os quarteirões são idênticos
(42/42).

Nada a montante foi alterado. A C3 só lê o trace de prédios (anatomia, uso) que a fundação já
produzia; a lista de prédios é coletada sem trace, como registro, e não muda nenhuma parte.

## 11. Limitações

1. **Escala.** Gente, bancos e bancas só são legíveis em Street em tamanho real (ou Close). Na City
   e nos thumbnails, a vida de rua se lê pelos carros e pelas copas.
2. **Oclusão** nas cidades densas: na City, a C3 não aparece em Paul Graham, craigslist e Python
   Docs. É o mesmo limite da C1 (massing).
3. **Python Docs "comercial".** A vida segue os térreos que a Surface Grammar decidiu: 223 vitrines
   em 256 frentes. A leitura "biblioteca silenciosa" que a página sugere não está no térreo. Não é
   um erro da C3, mas é uma pergunta para a Surface Grammar.
4. **Fila nos cruzamentos.** Com tráfego alto, as vagas junto aos cruzamentos ficam ocupadas e os
   carros parecem empilhados (Wikipedia, craigslist). É plausível, mas pesado na Street.
5. **Postes iguais por papel.** O ritmo é o mesmo em todo bulevar (só a fase muda). É intencional
   (infraestrutura), mas é o resto mais "carimbado".
6. **Tipos de carro e de árvore.** Os tipos de carro são sorteados (só vans e caminhões seguem a
   frente de serviço). As árvores têm uma única espécie, sorteada redonda ou cônica. Ainda não
   carregam significado.
7. **Ônibus.** Só existe onde há bulevar movimentado: Paul Graham não tem nenhum, IKEA e Linear têm
   6–7. É fiel à regra, mas pode parecer muito em cidades de bulevares curtos.
8. **Gente nas praças.** Pessoas e bancos das praças e dos pátios continuam os da composição
   (congelada); a C3 não as distribui. Na Street, essa é a maior concentração de gente, e é a mesma
   de antes.

## 12. Conclusão perceptual

**A C3 passa nos critérios 1, 2, 5 e 6 com folga. Passa no 3 em Street em tamanho real, e só
parcialmente no 4 (City).**

- O carimbo desapareceu, e a prancha do mesmo cruzamento mostra isso de imediato.
- Cada calçada tem uma vida explicável pela frente, pela rua e pela página.
- A família se mantém, e a seed só mexe em posições.
- A cidade ficou mais coerente: gente onde há vitrine e praça, árvores onde há casa e verde,
  carros onde a página "circula".

O limite é de escala. O que define a personalidade de rua (gente, mobiliário) é pequeno demais
para a City. O que é grande o bastante (carros, copas) já foi usado, e nas cidades densas a câmera
não vê a rua. Para a City, a próxima alavanca continua sendo o que a câmera vê de cima.

## Arquivos

- Código:
  - `src/lib/pixelcity/kit/street-life.ts` (gramática e expressão);
  - `kit/district.ts` (registro dos prédios, `streetLife`, `trace.life`, semáforos sem o grupo fixo);
  - `src/lib/pixelcity/kit-v10/` (C1 congelado);
  - `page.tsx` e `KitView.tsx` (`?v=10`, atual `?v=11`).
- Testes:
  - `scripts/street-life/check.ts` (`npm run test:life`);
  - `scripts/street-roles/check.ts` (ablação da C3);
  - `scripts/foundation/check.ts` (fatia do flat).
- Capturas e dados:
  - `scripts/street-life/shoot.mjs`, `sheets.py`, `life.ts`, `stamp.ts`;
  - `docs/screenshots/street-life/{before,after,seed8}/` e `sheets/`;
  - `docs/street-life/{life,stamp}.txt`.
