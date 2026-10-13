# Prototipação visual: catálogos, territórios interativos e listas

Escrito em 11/10/2026 sobre `main`, sem commit. Continua [MORPHOLOGY_ROUND_1.md](MORPHOLOGY_ROUND_1.md). Sete protótipos atrás de sete flags, todas desligadas por padrão. Com as flags desligadas a medição é idêntica byte a byte ao baseline, e o caminho do produto não passa flag nenhuma.

> **Encerramento, 12/10/2026.** As flags citadas aqui foram consolidadas em três (`reading`, `forum`, `market`) ou removidas. As decisões finais, o mapa de nomes e como reproduzir estes resultados a partir do arquivo estão em [MORPHOLOGY_CLOSING.md](MORPHOLOGY_CLOSING.md). Os links para `morphology/sheets-full/` apontam para pranchas em tamanho original que ficam fora do git.

Este documento não escolhe versão final. Ele mostra o que cada alternativa constrói, o que ela lê do conteúdo, onde funciona e onde falha, e separa o que merece avançar, o que precisa de outra iteração e o que eu descartaria.

## Resumo da avaliação

| Protótipo | O que é | Minha leitura |
| --- | --- | --- |
| **G-a** lojas pela contagem | o grid de hoje com 4, 9 ou 16 células por quadra | **Descartar como alternativa.** Mesma tipologia, outro grão |
| **G-b** rua de comércio | duas barras com arcada, rua pavimentada e bancas | **Outra iteração.** Tipologia nova, mas rala, e se confunde com as lâminas de índice |
| **G-c** mercado coberto | galpão de dente de serra com lojas na frente e bancas | **Merece avançar.** Silhueta nova e quase uma banca por produto. Continua baixo e repetido |
| **I-a** fórum | praça cercada por arcadas, um lado por grupo de controles | **Merece avançar.** Resolve o vazio, tem gradiente de complexidade, é inofensivo em distritos pequenos |
| **I-b** oficina | galpão industrial com chaminé e pátio | **Descartar.** Põe uma fábrica com fumaça em qualquer página que tenha um formulário |
| **T1** a unidade é o item | largura e andares de cada casa vêm do item correspondente | **Outra iteração.** Efeito pequeno na escala da cidade; sem dados nas listas maiores |
| **T2** grão pela contagem | casas por fileira vêm de itens por lote | **Merece avançar para sua decisão.** Diferença visível e derivada do conteúdo; muda HN, lobste.rs e Paul Graham |

Três coisas que a rodada mostrou e que valem mais que qualquer alternativa isolada:

1. **Nenhuma alternativa de catálogo resolve a repetição quando o catálogo domina a cidade.** books.toscrape tem 20 produtos e 201 lotes. Qualquer tecido ali repete a mesma unidade dezenas de vezes. O problema é a área seguir a fatia da página e não a quantidade de itens.
2. **O grão de hoje está invertido.** As páginas com mais itens têm as casas mais largas, e as com menos itens, as mais estreitas (seção 5).
3. **As duas alternativas de catálogo que mudam a tipologia são baixas.** G-b e G-c não passam de 2,6 de altura, contra 3,4 a 3,9 do grid atual e 11 a 12 das torres. Catálogo deixa de ser campo de cubos e vira cidade térrea.

Pranchas: [catálogos, visão geral](morphology/sheets-full/proto-t4-catalogues.jpg), [catálogos, as três alternativas em tamanho maior](morphology/sheets/proto-t4-alternatives.jpg), [interativos](morphology/sheets/proto-t5-interactive.jpg), [interativos em cidades boas](morphology/sheets-full/proto-t5-regressions.jpg), [HN, lobste.rs e Paul Graham](morphology/sheets/proto-t1t2-three.jpg), [outras listas](morphology/sheets-full/proto-t1t2-others.jpg), [listas em outras cidades do benchmark](morphology/sheets-full/proto-t2-regressions.jpg), [silhuetas sem cor](morphology/sheets-full/proto-flat.jpg).

## 1. Método

- **Baseline preservado.** Coluna "hoje" em toda prancha. Conferi a identidade com `baseline.json` depois de cada alteração.
- **Base de comparação.** Catálogo só existe como catálogo com a leitura validada na rodada 1. Por isso cada protótipo é comparado sobre essa leitura (coluna "leitura nova"), que continua sendo uma flag e não comportamento padrão. Para os interativos a base inclui `wrappers`, porque sem ela o ray.so não chega a ser um território interativo único.
- **Mesmas condições.** Mesma rota, câmera, hora (dia), semente e viewport (1440×900) das rodadas anteriores. Silhuetas em `?flat=1`.
- **Isolamento.** Nas 135 páginas, cada protótipo muda só o tecido alvo: zero páginas em que outro tecido muda.
- **Sem exceção por site.** Cada protótipo lê contagens do território: itens, tamanhos dos itens, controles e grupos de controles.
- **Sem geometria nova.** Só famílias que o kit já tinha: `slab`, `kiosk`, `shed`, `walkup`, `rows`. O `shed` ganhou uma variante de mercado (sem chaminé, com lojas no lugar das docas), ligada por um campo que só os protótipos preenchem.

O que os protótipos leem, calculado no plano só quando alguma das flags está ligada (`censusOf` em `plan.ts`):

| Sinal | Como é medido |
| --- | --- |
| Itens | os itens da lista do território, contando os agrupados |
| Tamanhos | caracteres mais 150 por imagem de cada item, relativos à mediana |
| Controles | botões e campos dentro do território |
| Grupos | controles reunidos pelo ancestral mais próximo que tenha 3 ou mais |

## 2. Catálogos (T4)

Páginas: Airbnb, books.toscrape, Hiut, GOG, Oxylabs e IKEA.

### O que cada alternativa constrói

- **G-a.** Células por quadra = raiz dos itens por quadra, entre 2×2 e 4×4. Poucos itens viram quatro lojas grandes por quadra, um andar mais altas. Muitos viram 16 bancas.
- **G-b.** Por quadra, duas barras de dois andares com arcada, viradas para uma rua interna pavimentada com bancas no eixo. Bancas por quadra = itens por quadra, de 2 a 6.
- **G-c.** Por quadra, um galpão de dente de serra com uma faixa de lojas na frente, sobre uma praça pavimentada, e bancas na borda. Mesma contagem de bancas.

### O que foi medido

| Página | Itens | Grid atual, com a leitura nova | G-a | G-b | G-c |
| --- | --- | --- | --- | --- | --- |
| Airbnb | 32 em 4 fileiras | 109 cubos | 42 lojas | 23 barras, 33 bancas | 17 galpões, 22 bancas |
| books.toscrape | 20 | 118 | 52 | 25, 25 | 14, 24 |
| Hiut | 20 | 85 | 38 | 18, 18 | 10, 17 |
| GOG | 48 | 51 | 51 (sem mudança) | 10, 28 | 6, 26 |
| Oxylabs | 32 | 128 | 56 | 28, 28 | 15, 27 |
| IKEA | 5 seções | 115 | 50 | 25, 25 | 14, 23 |

| | Grid atual | G-a | G-b | G-c |
| --- | --- | --- | --- | --- |
| Solo ocupado por construção | 56 a 58% | 57 a 64% | 37 a 43% | 47 a 57% |
| Topo dos edifícios (q90) | 3,4 a 3,9 | 3,9 a 4,4 | 2,6 | 2,4 |

### Avaliação

**Fidelidade estrutural.**

- G-b e G-c chegam perto de "uma banca por produto": 33 bancas para 32 anúncios no Airbnb, 25 para 20 livros, 28 para 32 produtos na Oxylabs, 18 para 20 no Hiut. Falha nos extremos: o GOG tem 48 jogos e 28 bancas (teto de 6 por quadra), e o IKEA tem 5 seções e 25 bancas (piso de 2 por quadra).
- G-a só é fiel quando há 4 itens ou mais por quadra. books.toscrape tem 20 livros e 52 lojas.
- Nenhuma lê preço, e nenhuma lê agrupamento além do que já vem separado em territórios. No Airbnb as quatro fileiras são quatro territórios e ganham quatro cores. Em books.toscrape não há grupo nenhum para ler.

**Identidade morfológica.**

- G-a é a mesma tipologia de hoje. Na silhueta sem cor continua sendo um campo de caixas, só maiores. Não é uma alternativa arquitetônica, é um parâmetro.
- G-b e G-c mudam a silhueta de verdade ([prancha sem cor](morphology/sheets-full/proto-flat.jpg)).
- **G-b colide com as lâminas de índice e com as arcadas de navegação**: barras longas e baixas em paralelo. Um catálogo em G-b e um diretório em lâminas se distinguem pelo detalhe (colunas, bancas), não pela forma.
- **G-c colide com I-b**, que usa o mesmo galpão. Se os dois avançassem, loja e aplicativo teriam a mesma silhueta.
- G-c é a única das três que não se parece com nenhum tecido que já existe na cidade.

**Qualidade visual.**

- G-a: caixas maiores, mesma monotonia. No Airbnb as quatro cores ajudam; em books.toscrape e Oxylabs é um campo de blocos idênticos.
- G-b: rala. Solo construído cai para 37 a 43%, as barras são finas, e as bancas quase não se leem na escala da cidade. A rua, que deveria ser a protagonista, é um vazio pavimentado.
- G-c: a mais forte. Os telhados listrados dão textura e cor, as lojas e bancas dão escala. Onde o catálogo é um território só (Oxylabs, books.toscrape) vira um campo de galpões iguais: a repetição sobe de escala, não desaparece.
- As três achatam a cidade em relação ao que o Airbnb é hoje, com torres de 11,7: G-a fica em 3,9, G-b em 2,6 e G-c em 2,4.

**Custo.**

| | Suíte congelada com a flag (222 verificações) | Tamanho |
| --- | --- | --- |
| G-a | 222 passam | cerca de 12 linhas em `compose.ts` |
| G-b | 221; falha a ablação de itens em 9 edifícios | cerca de 30 linhas |
| G-c | 221; a mesma, em 6 edifícios | cerca de 30 linhas, mais 4 no `shed` |

A falha de G-b e G-c é a verificação que assume que no grid só o uso do edifício muda quando a anatomia de itens é desligada. Com famílias novas no grid essa premissa precisa ser reescrita.

**Alcance.** Com a leitura nova, 10 das 135 páginas têm território de catálogo.

### O que ficou sem resposta

A repetição. Com 20 itens espalhados em 12 quadras, qualquer composição feita quadra por quadra repete. As saídas que vejo são duas, e nenhuma foi prototipada:

- **Âncora e tecido.** Um ou dois galpões (G-c) no miolo do território, com ruas de bancas em volta. Exige que a composição conheça a posição da peça dentro do território, o que hoje ela não conhece: cada peça é composta sozinha.
- **Área pela contagem.** O território de um catálogo de 20 itens não deveria ter 201 lotes. É a mesma questão da extensão (T7), agora por território.

## 3. Territórios interativos (T5)

Páginas: ray.so, Squoosh, regex101, Desmos, Steam e LessWrong.

### O que cada alternativa constrói

- **I-a, fórum.** Praça com fonte no centro e arcadas de dois andares viradas para dentro. Lados fechados = grupos de controles do território, de 1 a 4. Quiosques na praça = controles por quadra, de 1 a 6.
- **I-b, oficina.** Um galpão industrial por quadra, com docas, chaminé e fumaça, mais um pátio com quiosques. A profundidade do galpão cresce com os controles por quadra.

### O que foi medido

| Página | Controles | Grupos | I-a | Solo construído: hoje → I-a → I-b |
| --- | --- | --- | --- | --- |
| Squoosh | 5 | 2 | 2 lados; 14 arcadas, 12 quiosques | 2% → 29% → 43% |
| regex101 | 27 | 2 | 2 lados; 19, 60 | 3% → 28% → 65% |
| ray.so | 17 | 4 | claustro; 56, 14 | 2% → 56% → 43% |
| Desmos | 68 | 5 | claustro; 56, 90 | 2% → 56% → 68% |
| Steam | 85 | 24 | claustro; 62, 79 | 2% → 59% → 69% |
| LessWrong | 115 | 29 | claustro; 28, 49 | 2% → 55% → 69% |

Hoje um território interativo tem de 2 a 4% do solo construído, só quiosques (a coluna "hoje" da tabela é a praça atual sobre a leitura nova). É esse o número por trás de "praça vazia".

### Avaliação

**Fidelidade estrutural.**

- I-a tem um gradiente legível: aplicativo simples (Squoosh, regex101, com 2 grupos) vira praça aberta com uma arcada em L; aplicativo complexo vira claustro. O Squoosh continua mais vazio que o Desmos, e está certo que continue.
- **O gradiente satura cedo.** Com 4 grupos ou mais tudo é claustro. ray.so (17 controles), Desmos (68), Steam (85) e LessWrong (115) ficam com a mesma forma. A quantidade de quiosques acompanha os controles (14, 90, 79, 49), mas quiosque dentro de claustro mal se vê de longe.
- I-b quase não lê nada: um galpão por quadra em todos os casos.
- **Os dois vestem bem uma leitura errada.** O Steam é uma loja cuja página inteira está dentro de um `<form>`, e continua sendo lido como 99% interativo. I-a transforma esse erro numa cidade agradável de claustros. O defeito é de leitura e está registrado na rodada 1; o protótipo não o corrige e o deixa menos visível.

**Identidade morfológica.**

- Os dois são inconfundíveis com a praça atual e entre si ([prancha sem cor](morphology/sheets-full/proto-flat.jpg)).
- I-a lembra a composição de navegação (praça cercada por quatro arcadas). A diferença é a arcada virada para dentro, o anel incompleto e a fonte. Como navegação ocupa pouco solo, o risco é pequeno, mas existe.
- I-b colide com G-c.

**Qualidade visual.**

- I-a é a melhora mais clara da rodada. Desmos, Steam, ray.so e LessWrong saem de um descampado para um tecido com pátios, fontes e cor por quadra.
- I-b preenche bem e conta a história errada. Chaminé com fumaça diz indústria.

**Regressão em cidades boas.** Território interativo não é só aplicativo: 72 das 135 páginas têm algum, quase sempre um formulário de busca ou um chamado para ação. I-a muda 33 páginas e I-b muda 43. Nas cidades do benchmark em que ele é secundário ([prancha](morphology/sheets-full/proto-t5-regressions.jpg)):

- I-a: no Linear, Twitch, NASA e Pinterest aparece uma arcada baixa onde havia uma praça com quiosque. Não chama atenção.
- I-b: no Linear aparece uma fábrica com fumaça ao lado da torre do produto. No Twitch e no Pinterest, galpões listrados com chaminé. É incoerente com as três cidades.

**Custo.**

| | Suíte congelada com a flag | Tamanho |
| --- | --- | --- |
| I-a | 222 passam | cerca de 35 linhas |
| I-b | 221; falha "o uso segue a composição", 13 casos | cerca de 20 linhas |

A falha de I-b é de princípio: a regra do projeto diz que o uso de um edifício vem do tipo de composição, e I-b precisa declarar uso industrial para uma composição interativa.

## 4. Listas: T1 e T2

Páginas: HN, lobste.rs e Paul Graham, tratadas como regressão potencial, mais Pinboard, Gutenberg, craigslist, Tildes, hn.algolia, Bluesky e GitHub.

### O que cada um faz

- **T1.** Em `rows`, os dois sorteios (largura de 0,8 a 1,2 e andares de mais ou menos um) são trocados pela série de itens: a k-ésima casa do território tem largura e altura tiradas do tamanho do k-ésimo item em relação à mediana. Largura entre 0,7 e 1,5; andares entre menos 2 e mais 3.
- **T2.** Casas por fileira = 5 mais o logaritmo de base 2 de itens por lote, entre 2 e 6. Hoje é 2 mais um sexto da contagem de itens da região tipada.

### O grão de hoje está invertido

| Página | Itens | Itens por lote | Casas por fileira: hoje → T2 |
| --- | --- | --- | --- |
| HN | 30 | 0,12 | 6 → 2 |
| lobste.rs | 25 | 0,10 | 6 → 2 |
| hn.algolia | 30 | 0,14 | 6 → 2 |
| Bluesky | 36 | 0,15 | 6 → 2 |
| Tildes | 50 | 0,23 | 6 → 3 |
| Pinboard | 100 | 0,51 | 6 → 4 |
| Paul Graham | 215 | 0,87 | 2 → 5 |
| MDN | 250 | 1,75 | 2 → 6 |
| Gutenberg | 600 | 2,45 | 2 → 6 |
| craigslist | 328 | 2,85 | 2 → 6 |

Hoje as páginas com centenas de itens têm as casas mais largas (2 por fileira) e as páginas com 25 ou 30 itens têm as mais estreitas (6). A causa: a contagem só existe para regiões tipadas como lista. Uma lista que entra como bloco observado ou resto de seção conta zero e cai no mínimo. Isto é um achado sobre o baseline, independente de adotar T2.

### Avaliação de T2

**Fidelidade.** Direta e monótona: mais itens por lote, casas mais estreitas.

**Identidade.** HN e Paul Graham trocam de caráter um com o outro ([prancha](morphology/sheets/proto-t1t2-three.jpg)). O HN passa a ter casas grandes de empena, e Paul Graham e Gutenberg passam a ter muitas casas estreitas. Com cor a diferença é clara. **Sem cor ela é fraca**: os dois continuam sendo uma massa densa de empenas, com serrilhado mais fino ou mais grosso ([prancha sem cor](morphology/sheets-full/proto-flat.jpg)). T2 muda o grão, não a tipologia, e pelo seu próprio critério isso é variação de densidade. Ele se sustenta porque a variação vem da contagem real e corrige uma inversão, não porque crie arquitetura nova.

**Qualidade visual, nas três páginas de risco.**

- HN: muda de caráter. As casas ficam maiores e os telhados mais legíveis. Na minha leitura continua uma cidade boa e deixa de ser "a cidade de sobradinhos estreitos" que é hoje. É a decisão mais sensível da rodada e é sua.
- lobste.rs: o mesmo, com menos contraste por causa da paleta cinza.
- Paul Graham: fica mais fino e mais movimentado. Não vejo perda.

**Outras cidades** ([prancha](morphology/sheets-full/proto-t2-regressions.jpg)): DevDocs e MDN ficam mais finos; SoundCloud e gov.uk um pouco mais largos. Nenhuma se desfaz.

**Custo.** 221 de 222: falha "craigslist: mudança visível mas limitada da planta", com 16,3% contra o limite de 15%. T2 mexe na mesma estrutura de passagens entre sublistas que a camada de composição valida. Muda 71 das 135 páginas. Três linhas de código e o maior alcance da rodada.

### Avaliação de T1

**Fidelidade.** Por construção, a série de alturas é a série de itens. Onde os itens são parecidos (lobste.rs, dispersão 0,14) a rua fica regular; onde variam (Tildes 0,97, Pinboard 0,52) fica acidentada.

**O limite que apareceu.** O normalizador agrupa repetições acima de 20 itens num nó só, que guarda a contagem e o total e descarta os tamanhos individuais. **Paul Graham (215 itens) e DevDocs não têm série nenhuma**: T1 não tem o que ler e as páginas ficam idênticas. Em Pinboard, Tildes e Bluesky só os primeiros 20 itens têm tamanho. O protótipo falha justamente nas páginas mais "lista".

**Qualidade visual.** Sutil. Em HN e lobste.rs é difícil apontar a diferença sem alternar as imagens. A medida confirma: a dispersão dos topos por edifício vai de 0,07 para 0,06 no HN, de 0,11 para 0,16 no Tildes, de 0,12 para 0,16 no Pinboard. O efeito existe dentro de cada fileira e se perde na escala em que a cidade é vista.

**Custo.** 222 de 222. Muda 77 páginas, quase todas de forma imperceptível. Sozinho, T1 troca um sorteio por um dado sem que o olho perceba: é fidelidade sem ganho de identidade.

## 5. Recomendação crítica

**Merece avançar.**

- **I-a.** Resolve um problema medido (2% de solo construído), lê uma anatomia real, não quebra nada e é inofensivo onde o território é pequeno. Próxima iteração: enfrentar a saturação em 4 grupos. Possibilidades a testar: usar o tamanho dos grupos para a altura ou o comprimento de cada arcada; reservar o claustro fechado para muitos grupos e muitos controles ao mesmo tempo.
- **G-c**, com duas ressalvas a resolver antes de qualquer decisão: a repetição quando o catálogo domina e a altura. Sem isso ele troca "campo de cubos" por "campo de galpões", que é melhor e ainda é um campo.
- **T2**, como decisão sua sobre o HN. Recomendo decidir olhando a prancha das três páginas em tamanho cheio, e não pelo fato de corrigir a inversão.

**Precisa de outra iteração.**

- **G-b.** A ideia de rua é boa e a execução está fraca. Para valer a pena: barras com vitrine e toldo em vez de arcada, rua mais estreita e duas fileiras de bancas. E precisa se afastar das lâminas de índice.
- **T1.** Só faz sentido depois de duas coisas: o normalizador guardar os tamanhos dos itens agrupados (hoje descarta), e a variação ganhar amplitude ou sair da fileira para o quarteirão. Combinado com T3 (altura das quadras pelo que o item diz) talvez apareça; sozinho não aparece.
- **Âncora e tecido para catálogos** e **área pela contagem**: não são protótipos desta rodada, são o que ela mostrou que falta.

**Descartaria.**

- **G-a** como alternativa. Pode sobreviver como parâmetro de grão dentro de G-b ou G-c.
- **I-b.** A conotação industrial está errada para a maioria dos territórios interativos, que são formulários em sites de conteúdo, e contraria a regra de uso do projeto.

**O que eu não faria agora.** Incorporar qualquer um destes. I-a e T2 são os mais maduros e os dois ainda têm uma pergunta aberta: a saturação em I-a e o caráter do HN em T2.

## 6. Limitações

- O julgamento visual é meu, numa câmera, numa hora do dia e numa semente. A câmera enquadra o centro da cidade.
- As seis páginas de cada grupo são as propostas na rodada 1. Não testei os protótipos em páginas novas, então vale para eles o que valeu para as regras de leitura: funcionar aqui não prova que generalizam.
- Os limiares dos protótipos (2 a 6 bancas por quadra, 1 a 4 lados, 5 mais logaritmo no grão) são meus e não foram calibrados nem validados.
- Não medi estabilidade a perturbação dos protótipos. T2 e I-a dependem de contagens e devem ter degraus (uma lista que cruza um limite de itens por lote troca o número de casas por fileira).
- A definição de "grupo de controles" é uma entre várias possíveis. Steam aparece com 24 grupos e LessWrong com 29, o que diz mais sobre a definição do que sobre as páginas.
- Os protótipos de catálogo foram vistos sobre a leitura nova. Com o baseline de hoje, só IKEA, GOG e Oxylabs têm território de catálogo.

## Arquivos

Código, tudo atrás de flags:

- `src/lib/semantics/experiments.ts`: flags `g-a`, `g-b`, `g-c`, `i-a`, `i-b`, `t1`, `t2`.
- `src/lib/pixelcity/kit/plan.ts`: `censusOf` e o campo `census` do território, calculados só com alguma dessas flags ligada.
- `src/lib/pixelcity/kit/compose.ts`: `marketStreet`, `marketHall`, `forum`, `workshop`, `unitsOf`, `series` e o ramo de células do grid.
- `src/lib/pixelcity/kit/buildings.ts`: `rows` lê a série de itens quando ela vem no programa; `shed` tem a variante de mercado.
- `src/lib/pixelcity/kit/district.ts`: passa os lotes por território para a composição.

Ferramentas: `scripts/morphology/prototypes.ts` (o que cada protótipo constrói e lê), `isolation.ts` (cada um só muda o próprio tecido), `grid.py` (pranchas por página e braço).

Para reproduzir:

```bash
npx tsx scripts/morphology/prototypes.ts catalogue
```

```bash
npx tsx scripts/morphology/prototypes.ts interactive
```

```bash
npx tsx scripts/morphology/isolation.ts
```

```bash
npx tsx scripts/morphology/with.ts i-a scripts/composition/check.ts
```

Para ver um protótipo na rota de depuração, com o servidor de desenvolvimento rodando:

```
/pixel/kit?page=shop&time=day&exp=coverage,lists2,whole,nodir,transient,item-form3,avatars,g-c
```
