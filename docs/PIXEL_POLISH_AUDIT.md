# Pixel city: auditoria de Visual Polish (rodada 0)

> Rodada só diagnóstica. **Nada foi implementado.** O código-fonte está como no commit `debceb0`
> (art direction v1 congelada). Os estudos da seção 7 rodaram como uma troca temporária no shader
> de pós-processamento, foram revertidos com `git checkout` e ficaram guardados como patch
> ([`scripts/polish-audit/haze-studies.patch`](../scripts/polish-audit/haze-studies.patch)). Nenhum
> estudo mexe no objeto cidade, então os hashes de Foundation v1 e Art Direction v1 não mudam.

## Resposta curta

O que mais denuncia "protótipo procedural" nas imagens atuais é **a névoa da City**. Ela não é
desenhada como ar: é uma retícula Bayer de 4 degraus que mistura cada pixel com o céu. O resultado é
uma tela pontilhada sobre os 30–45% de cima do quadro. Os prédios de trás ficam translúcidos, como
fantasmas, e o marco (o ponto focal) fica justamente dentro dessa faixa.

É a mudança de maior salto imediato:

- aparece em 8/8 cidades;
- ocupa a maior área contínua do quadro;
- vive só no render, sem tocar o objeto cidade, a C4 ou a Foundation;
- é de complexidade baixa.

O ganho é **grande** nas cidades densas e de texto (HN, Paul Graham, Wikipedia) e **pequeno** nas
abertas (Linear, NASA), onde a C4 já deu ar aberto e a faixa é estreita.

O segundo problema é a **camada miúda em confete**: árvores-pirulito idênticas, covas escuras, postes
quase pretos e gente em pontinhos. Isso vira um padrão de bolinhas sobre as praças. É o maior problema
das cidades abertas, mas é limitado: as posições pertencem à C3 e à composição, e a arrumação das
praças mora em `massing.ts` (arquivo da Foundation).

Recomendo, para a primeira rodada, a direção **B (névoa baixa)** da seção 7.

## 1. Capturas atuais

Kit atual (= kit-v12), seed 7, 1440×900 @2x, sem overlays de debug. Capturas:
[`scripts/polish-audit/shoot.mjs`](../scripts/polish-audit/shoot.mjs). Pranchas:
[`scripts/polish-audit/sheets.py`](../scripts/polish-audit/sheets.py).

| prancha | conteúdo |
|---|---|
| [**A-city**](screenshots/polish-audit/sheets/A-city.jpg) | **principal**: as 8 cidades em City, dia |
| [B-street](screenshots/polish-audit/sheets/B-street.jpg) | Street (`focus=0,0`), dia |
| [C-night](screenshots/polish-audit/sheets/C-night.jpg) | City, noite |
| [D-wide](screenshots/polish-audit/sheets/D-wide.jpg) | Wide (Street com `zoom=0.55`): o distrito inteiro e o que há fora dele |
| [E-thumbs](screenshots/polish-audit/sheets/E-thumbs.jpg) | thumbnails de 300 px: em cor, e em cinza com desfoque |

Capturas individuais: `docs/screenshots/polish-audit/{city,street,night,wide}/<página>.png`.

| página | id do snapshot | observação |
|---|---|---|
| Hacker News | `hn` | **novo e não versionado**: o snapshot congelado do "forum" é o Lobsters. Capturei `news.ycombinator.com` só para esta fase: [`docs/real-pages/snapshots/hn.json`](real-pages/snapshots/hn.json). Fica fora do `DATASET`, então nenhum teste o lê |
| Wikipedia | `reference` | Suspension bridge |
| Linear | `saas` | |
| Guardian | `news` | |
| IKEA | `shop` | |
| Paul Graham | `oldweb` | |
| NASA | `media` | |
| GOV.UK | `institution` | |

> O Hacker News **não** gera uma cidade vazia: ele vira uma cidade velha densa, de lotes estreitos,
> como o Paul Graham. O vazio de verdade está nas praças de Linear, NASA e Guardian. Ali a pergunta é
> "como deixar esse vazio bonito", e não "como preenchê-lo".

## 2. Os 5 gargalos, em ordem de impacto

| # | gargalo | onde mais aparece | City / Street | camada a alterar | risco Foundation / AD | ganho | complexidade | origem |
|---|---|---|---|---|---|---|---|---|
| **G1** | **a névoa desenhada como tela** | HN, Paul Graham, Wikipedia (forte); IKEA, GOV.UK, Guardian (médio); Linear, NASA (leve) | **City** (a Street não tem névoa) | render: pós-processo (`PixelPost.ts`) | Foundation: nenhum. AD: baixo, porque a C4 continua decidindo onde a faixa começa e termina e a cor do ar | **grande** (muito grande nas densas) | **baixa** | E render |
| **G2** | **a camada miúda em confete** | Linear, NASA, Guardian, Wikipedia (forte); IKEA, GOV.UK (médio) | sobretudo City | assets: árvore, poste, semáforo (`street.ts`), arrumação da praça (`massing.ts`), árvores de quintal (`compose.ts`), sombra projetada | **médio**: posições e quantidades são da C3 e da composição e não podem mudar; `massing.ts` é arquivo congelado; os hashes do kit mudam | grande nas abertas, mas **limitado** | média | A asset + B repetição + F integração |
| **G3** | **o chão sem material** | praças: Linear, NASA, Guardian, Wikipedia; grama: GOV.UK, NASA, Linear; vielas: HN, Paul Graham, GOV.UK, IKEA | ambos | material: padrões de superfície no shader (`materials.ts`: `SLABS`, `GRASS`, `SOIL`) e cores de chão (`palette.ts`) | **médio**: não pode virar C2 (nenhum tipo de chão novo por página), e a viela precisa continuar legível (na C1, o papel dela se lê pelo material) | médio-grande | média | C material + F integração |
| **G4** | **assets provisórios**: o ar-condicionado-tanque e as telas chapadas | tanque: Paul Graham, HN, GOV.UK, NASA. Telas: Guardian, Linear, NASA | ambos (o tanque lê melhor na City; a tela, nas duas) | assets: `buildings.ts` (`hvac`, `screen`) | baixo: a decisão de sinalização (Surface Grammar) não muda, só o desenho; os hashes do kit mudam | médio (pouca área, muita atenção) | **baixa** | A asset |
| **G5** | **luz e volume** | sombras: 8/8. Vidro: Guardian, Linear, IKEA. Noite: Guardian, Linear | ambos | render: sombra, materiais (vidro, janelas acesas), bloom | **médio**: o desenho das janelas é Openings (Foundation) | médio | alta | E render |

### G1. A névoa desenhada como tela

[Evidência](screenshots/polish-audit/evidence/G1-haze.jpg) ·
[faixa do céu nas 8](screenshots/polish-audit/sheets/S3-haze-studies-sky-band.jpg) (coluna "atual")

- **O que se vê**: a parte de cima de todo quadro City vira uma retícula pontilhada. Essa é a textura
  de maior contraste e de maior área do quadro.
- **Por que parece transparência**: cada pixel é misturado com o céu, que é um degradê em espaço de
  tela. Por isso os prédios do fundo parecem feitos de vidro: o salão do marco da Wikipedia vira
  vermelho/azul quadriculado, e as fileiras de trás do HN e do Paul Graham parecem decalques.
- **O ponto focal fica dentro dela**: a torre da Wikipedia, a torre "THE PRODUCT" da Linear e a
  torre "TABLES &" do IKEA estão todas na faixa, no alto do centro.
- **Thumbnail**: no cinza com desfoque ([E-thumbs](screenshots/polish-audit/sheets/E-thumbs.jpg)), o
  quarto superior das 8 é uma mancha clara. O skyline some.
- **Faixa medida por página** (fração da altura do quadro onde o chão começa e termina de se dissolver,
  vinda da C4):

  | página | faixa |
  |---|---|
  | HN, Paul Graham | 0,53 → 0,90 |
  | Wikipedia | 0,55 → 0,92 |
  | IKEA | 0,62 → 0,96 |
  | GOV.UK | 0,63 → 0,96 |
  | Guardian | 0,64 → 0,97 |
  | Linear, NASA | 0,69 → 1,00 |

- **Causa técnica**: `PixelPost.ts`, `floor(f * 4 + bayer)` e `mix(cena, céu, ...)`. O dither alterna
  entre duas cores distantes (o tijolo e o céu). Em pixel art, o dither se usa entre valores vizinhos.
- **A noite** quase não sofre: a névoa vai para o céu escuro e as janelas acesas dominam.

### G2. A camada miúda em confete

[Evidência](screenshots/polish-audit/evidence/G2-confetti.jpg)

- **Árvores**: uma árvore só, em duas variantes (redonda 72%, cone 28%), sempre do mesmo tamanho, em
  grade de 2,4. Cada uma tem uma cova escura quadrada e uma sombra redonda.
- **Mobiliário**: postes e semáforos são palitos quase pretos (`[0.2, 0.21, 0.24]`, escurecidos ainda
  mais pelo cel-shading). Gente e carros viram pontinhos de cor.
- **Resultado**: na City, isso forma um padrão de bolinhas escuras sobre o chão claro. No thumbnail
  cinza, é a textura mais forte de Linear, Guardian, NASA e Wikipedia. Na Street, os mesmos assets
  ficam aceitáveis (as árvores têm volume, os carros têm leitura): o problema é de **escala e
  contraste na City**, mais do que do asset isolado.
- **Teste rápido feito**: postes cinza-médio e covas claras, revertidos em seguida.
  [Comparação](screenshots/polish-audit/studies/contender-props.jpg). Ganho pequeno, porque as bolinhas
  vêm sobretudo das copas e sombras repetidas. Resolver de verdade exige redesenhar a silhueta e a
  sombra das árvores.
- **Limite**: o "agrupamento" (copas em maciços, fileiras) mudaria posições, e posições são da C3 e da
  composição. O polish só pode mexer em silhueta, escala, cor e sombra.

### G3. O chão sem material

[Evidência](screenshots/polish-audit/evidence/G3-ground.jpg)

- **Praças**: piso bege chapado, com uma grade de lajotas quase invisível. Não há borda, meio-fio,
  faixa de pedra nem transição para a calçada.
- **Grama**: verde neon com ruído em blocos (estilo Minecraft), fora da família da paleta. Os
  retângulos de grama parecem colados sobre o piso (Linear, GOV.UK, NASA).
- **Vielas**: marrom-terra liso, que lê como lama (HN, Paul Graham, GOV.UK, IKEA).
- **Fora do distrito** (Wide): uma grade bege de tabuleiro, com as ruas morrendo no nada. Na City, a
  névoa esconde isso, e **qualquer mudança no G1 precisa continuar escondendo**.
- **Como deixar o vazio bonito**: piso com desenho (paginação, bordas, faixas de pedra), grama em
  tons da paleta com tufos e bordas, viela de paralelepípedo. **Não** mais coisas.

### G4. Assets provisórios

[Evidência](screenshots/polish-audit/evidence/G4-placeholders.jpg)

- **O ar-condicionado vira um tanque de guerra**: uma caixa sobre um soco, mais um tubo fino
  (`buildings.ts`, case `hvac`), lê na City como torre e canhão. Aparece em quase todo telhado plano do
  Paul Graham e do HN, e também no GOV.UK e na NASA. É o tipo de defeito que fica na memória pelo
  motivo errado.
- **Telas de fachada sem texto**: um retângulo de cor chapada com moldura (`screen()`), e à noite um
  retângulo pastel aceso. Lê como "textura que não carregou". Contraste: os outdoors **com** texto
  ("SUSPENSION", "THE PRODUCT", "TABLES &", "FEATURED", "ARTEMIS II") já parecem assets finais.

### G5. Luz e volume

[Evidência](screenshots/polish-audit/evidence/G5-light.jpg)

- **Sombras**: shadow map com serrilhado de passo irregular. Não tem a diagonal limpa 2:1 do pixel
  art, e denuncia um render 3D.
- **Bases**: nenhum prédio tem sombra de contato no pé, então eles parecem pousados sobre o chão.
- **Iluminação**: o cel-shading de 3 bandas só escurece o valor; não há deslocamento de matiz na
  sombra.
- **Torres de vidro**: caixas cinza ou lilás com grade, sem reflexo nem leitura de material.
- **Noite**: painéis acesos aleatórios que o bloom funde em manchas. Não se leem andares.
- **Risco**: o desenho das janelas é Openings (Foundation). Por isso este gargalo vem por último.

## 3. Avaliação por categoria

| categoria | veredito | o principal problema | origem |
|---|---|---|---|
| 1. terreno | fraco | praça chapada, grama neon, viela de lama, bordas duras, o tabuleiro fora do distrito | C, F |
| 2. vegetação | fraco na City, ok na Street | árvore única carimbada, cova escura, polka dots | A, B |
| 3. prédios | **o melhor do projeto** | silhuetas, cornijas, escadas de incêndio e toldos funcionam. Falta sombra de contato, as torres de vidro são genéricas, há o tanque | A (pontual), E |
| 4. ruas e calçadas | ok | leito e faixas legíveis; a viela marrom lê como terra; os palitos pretos dos semáforos em cada esquina somam ruído | C, F |
| 5. props e vida de rua | médio | carros e pessoas são bons de perto e pontinhos na City; postes e semáforos escuros demais; bancos ok | A, F |
| 6. billboards e mídia | médio | os com texto são bons; as telas sem texto são placeholders; no Guardian, as telas pastel competem com o marco | A |
| 7. água | quase ausente | só existe nas fontes das praças (disco liso com brilho). Nenhuma das 8 tem rio ou orla. Fica fora do top 5 | — |
| 8. iluminação e atmosfera | **pior item** | a névoa em retícula (G1), sombras serrilhadas, noite em manchas nas torres | E |
| 9. composição da City | médio | o ponto focal fica dentro da névoa e às vezes cortado pelo topo; não há separação de planos além da névoa; densas = confete colorido, abertas = bolinhas no bege | D (via E) |
| 10. consistência de pixel art | médio | três linguagens de dither (névoa, céu, grama); cilindros empilhados e caixas genéricas (árvores, carros, tanque); gente-sprite pequena demais na City. A escala relativa (porta, pessoa, carro) é coerente | A, C, E |

## 4. Inventário rápido de assets

| família | o que existe | estado |
|---|---|---|
| árvores | `tree()` (redonda de 3 cilindros ou cone de 3 pirâmides), `streetTree` (+ cova escura), árvore da praça em `massing.ts` (2 cilindros + cova), árvores de quintal em `compose.ts`, arbusto (caixa), floreira | **uma família, sem escala**; o maior gargalo de vegetação |
| veículos | sedan, hatch, táxi, van, caminhão, ônibus (`vehicles.ts`) | bons na Street; na City, caixas coloridas |
| pessoas | atlas de sprites, 48 variantes, poses de andar e parado (`people.ts`) | boas na Street; pontos na City |
| mobiliário | poste, semáforo, hidrante, lixeira, banco, parquímetro, caixa de correio, bancas de jornal, balizadores, abrigo de ônibus, quiosques | coerentes entre si; metal escuro demais |
| telhado | `hvac` (o tanque), caixa d'água, ventiladores, casa de máquinas, terraço, jardim, solar, vazio | o `hvac` é o único que destoa |
| terreno | `GRASS`, `SOIL`, `PAVING`, `SLABS`, `GRID` (a grade fora do distrito); cores fixas em `palette.ts` | o mais provisório de todos |
| rua | asfalto, calçada, paralelepípedo (viela), faixas, zebra (`street.ts`) | ok; a viela lê como terra |
| água | `WATER`, só nas fontes | quase não aparece |
| decorativos | outdoors de telhado com texto, telas de fachada, placas, toldos | os com texto são bons; as telas chapadas não |

## 5. Ordem de execução proposta

1. **G1, a névoa** (render; baixa complexidade). O maior salto imediato, em todas as cidades, sem
   tocar no objeto cidade. As capturas desta auditoria já servem como BEFORE.
2. **G4, os assets provisórios** (baixa complexidade). Ganho rápido e muito perceptível. Serve também
   para definir **como testar rodadas que mudam assets**. O `test:art-direction` hoje exige "atual =
   kit-v12 byte a byte", e qualquer asset muda as partes. Proposta: congelar o kit atual como kit-v13
   e passar a checar "**mesmas decisões, partes diferentes**": plano, trace, papéis viários, vida de rua
   e ambiente iguais ao kit-v12, e só as partes desenhadas mudam. Só com aprovação.
3. **G2, a camada miúda** (média). Silhueta e escala das árvores em famílias equivalentes, sombra das
   copas, metal mais claro, covas. Inclui a árvore da praça, que está em `massing.ts`: preciso de
   aprovação explícita para tocar esse arquivo **só no desenho**.
4. **G3, o chão** (média). Desenho do piso, grama dentro da paleta, viela de pedra, bordas e
   meio-fios, e o chão fora do distrito. Fica depois do G2 porque, com as bolinhas ainda lá, um piso
   desenhado só soma ruído.
5. **G5, luz e volume** (alta). Sombra de contato, borda limpa das sombras, vidro, janelas acesas por
   andar. Por último: é o mais caro e encosta em Openings.

## 6. A UMA mudança de maior salto imediato

**Redesenhar a névoa da City como ar, e não como retícula.** Os motivos:

1. **É o que o olho vê primeiro**: maior área contínua, maior contraste, e no alto do quadro.
2. **8/8 cidades**, e a mesma correção serve para todas.
3. **Ataca a composição de graça**: devolve o skyline e o ponto focal sem mexer em câmera,
   alocação ou massing.
4. **Render puro**: o objeto cidade não muda, então Foundation v1 e Art Direction v1 ficam byte a
   byte iguais (`test:foundation` e `test:art-direction` passam sem re-baseline).
5. **Complexidade baixa**: um pass de pós-processo, mais um uniform por frame.

Ressalvas honestas:

- **Na Linear e na NASA o ganho é pequeno**: a faixa é estreita, e o problema delas é o G2.
- **No thumbnail de 300 px, a direção A** quase não se distingue da atual (a retícula some na
  média). As direções B e C mudam o thumbnail.
- **A noite não muda.**

## 7. Três direções para o G1 (estudos visuais)

Todas preservam:

- a faixa decidida pela C4 por página (onde o chão começa e termina de se dissolver);
- as cores do céu;
- o chão distante totalmente dissolvido no céu, para que o tabuleiro de fora continue escondido.

Todas trocam o dither entre cores distantes por 16 níveis entre vizinhas, misturando para uma cor do ar
em vez de alternar pixels de cena e de céu. Patch:
[`scripts/polish-audit/haze-studies.patch`](../scripts/polish-audit/haze-studies.patch). Capturas:
[`scripts/polish-audit/shoot-study.mjs`](../scripts/polish-audit/shoot-study.mjs).

| prancha | conteúdo |
|---|---|
| [**S3: a faixa do céu**](screenshots/polish-audit/sheets/S3-haze-studies-sky-band.jpg) | **a melhor para comparar**: o terço de cima das 8 cidades × atual, A, B, C |
| [S1: HN, Wikipedia, Linear, Guardian](screenshots/polish-audit/sheets/S1-haze-studies-city-1-4.jpg) | quadro inteiro |
| [S2: IKEA, Paul Graham, NASA, GOV.UK](screenshots/polish-audit/sheets/S2-haze-studies-city-5-8.jpg) | quadro inteiro |
| [S4: noite](screenshots/polish-audit/sheets/S4-haze-studies-night.jpg) | HN, Wikipedia, Guardian |
| [detalhe da Wikipedia](screenshots/polish-audit/studies/detail-wikipedia.jpg) · [detalhe do IKEA](screenshots/polish-audit/studies/detail-ikea.jpg) | 1:1, o marco em cada direção |

### A. Véu fino

**Ideia**: a mesma névoa, desenhada direito. A mesma faixa e a mesma força; só o desenho muda.

**Na imagem**:

- a retícula some;
- os prédios do fundo deixam de parecer de vidro e passam a parecer distantes;
- o ar azul fica liso.

**Prós**: é a mais fiel à C4, porque a quantidade de ar por página fica igual.

**Contras**:

- o marco continua dentro do ar;
- num telhado grande, o degradê de profundidade ainda o faz desbotar de frente para trás;
- no thumbnail, quase não muda.

**Risco AD**: mínimo.

### B. Névoa baixa (recomendada)

**Ideia**: a névoa se deita no chão. A densidade cai com a altura acima do chão, calculada no shader a
partir da profundidade e da elevação da câmera, sem tocar na geometria.

**Na imagem**:

- ruas e quarteirões distantes se dissolvem;
- telhados e torres sobem para fora da névoa como um skyline;
- o marco volta a ser o ponto focal;
- nas densas (HN, Paul Graham), a fileira de trás vira silhueta de cidade em vez de decalque.

**Prós**:

- resolve as três coisas ao mesmo tempo (retícula, fantasmas, marco engolido);
- cria a separação de planos de um cenário de jogo acabado (frente nítida, névoa nas ruas ao fundo,
  skyline).

**Contras**:

- a névoa pesa menos sobre os prédios. A C4 diz que "página compacta = névoa mais baixa e mais
  pesada", e isso continua valendo para o chão, mas fica mais fraco para os prédios;
- nas áreas de sombra escura ainda se vê um pontilhado fino, que é afinável na implementação.

**Risco AD**: baixo-médio. Na implementação, eu checaria que a ordem das faixas entre páginas
continua legível (HN e Paul Graham mais enevoados que Linear e NASA).

### C. Ar limpo

**Ideia**: um véu leve (no máximo ~30%) sobre a faixa, e só a borda distante se dissolve num horizonte
estreito.

**Na imagem**: a cidade mais nítida e legível das três, com cara de maquete; o horizonte é uma faixa
curta no alto.

**Prós**: máxima leitura de prédios e detalhes, e o thumbnail fica nítido.

**Contras**:

- perde profundidade e atmosfera;
- é a que mais **achata a diferença de abertura entre páginas** que a C4 criou, porque todas ficam
  "ar limpo".

**Risco AD**: médio.

### Recomendação

**B.**

- **A** é a correção mínima: limpa, mas não cria imagem nova.
- **C** troca atmosfera por nitidez e encosta na C4.
- **B** é a única que torna a imagem mais memorável sem pedir nada às camadas congeladas.

Para a implementação de B, eu ajustaria:

1. o pontilhado residual nas sombras (dither só onde a diferença entre vizinhos é visível, ou mais
   níveis);
2. a curva de altura (a que altura um prédio "sai" da névoa);
3. a mesma checagem em hora dourada e à noite.

## 8. O que esta rodada não fez

- **Nenhuma mudança de polish** ficou no código: os dois estudos (névoa e props) foram revertidos, e
  `git status` mostra só arquivos novos e não versionados.
- **Nada em extração, Page Model, alocação, território, estrutura, composição, massing, Program,
  Surface Grammar, Openings, C1, C3 ou C4.** O estudo de props tocou temporariamente `street.ts` e
  `massing.ts` (só cores) para medir o ganho e foi revertido no mesmo passo.
- **Nenhum commit.**

## 9. Arquivos novos (não versionados)

| arquivo | o que é |
|---|---|
| `docs/PIXEL_POLISH_AUDIT.md` | este documento |
| `docs/real-pages/snapshots/hn.json` | snapshot do Hacker News (só para esta fase; fora do `DATASET`) |
| `docs/screenshots/polish-audit/` | capturas atuais, estudos, evidências, pranchas |
| `scripts/polish-audit/shoot.mjs` · `shoot-study.mjs` | capturas (atual; estudos com `?hazeStudy=`) |
| `scripts/polish-audit/sheets.py` · `board.py` · `evidence.py` | pranchas e evidências |
| `scripts/polish-audit/haze-studies.patch` | os três estudos de névoa, reaplicáveis com `git apply` **sobre o commit `debceb0`** (o código da névoa mudou na rodada 1) |

As capturas brutas dos estudos (A, B, C e o teste de props) não foram versionadas: as pranchas S1–S4,
os detalhes 1:1 e a comparação de props as preservam. A direção escolhida (B) virou a rodada 1, com
ajustes: ver [PIXEL_POLISH_HAZE.md](PIXEL_POLISH_HAZE.md). Sobre `?v=N` não serem snapshots visuais
históricos, ver a seção "Kits versionados × renderer" do mesmo documento.
