# Consolidação da morfologia: auditoria, decisões e proposta

Escrito em 11/10/2026 sobre `main`, sem commit. Continua [MORPHOLOGY_STUDY.md](MORPHOLOGY_STUDY.md), [MORPHOLOGY_ROUND_1.md](MORPHOLOGY_ROUND_1.md) e [MORPHOLOGY_PROTOTYPES.md](MORPHOLOGY_PROTOTYPES.md). É diagnóstico e proposta técnica. Nada foi incorporado: tudo continua atrás de flags desligadas por padrão, a medição com as flags desligadas é idêntica ao baseline, e o caminho do produto não passa flag nenhuma.

> **Encerramento, 12/10/2026.** As flags citadas aqui foram consolidadas em três (`reading`, `forum`, `market`) ou removidas. As decisões finais, o mapa de nomes e como reproduzir estes resultados a partir do arquivo estão em [MORPHOLOGY_CLOSING.md](MORPHOLOGY_CLOSING.md). Os links para `morphology/sheets-full/` apontam para pranchas em tamanho original que ficam fora do git.

## Veredito

1. **Nenhum dos candidatos é o caminho, e o último não é o melhor por ser o último.** O baseline tem as cidades mais variadas e a pior leitura. O conjunto do estudo lê melhor, generaliza mal e é menos estável. O comb3 estraga cidades boas. A leitura da rodada 1 é a melhor leitura que existe e entrega catálogos e aplicativos aos dois tecidos mais fracos.
2. **O problema central não está nos tecidos. A cidade não conhece quantidades.** A área de um território é a fatia da página, a cidade tem sempre 256 lotes, e cada peça de quadra é composta sozinha, sem saber quantas outras o território tem. O HN tem 30 itens e 422 casas. Em 27 das 135 cidades, mais da metade do solo é construída repetindo itens de lista. Nos sobrados, onde há mais itens por lote há menos unidades por lote (correlação de postos de menos 0,35).
3. **Por isso todo protótipo de tecido vira um campo.** Campo de cubos, de galpões, de claustros e de torres são o mesmo defeito: uma receita por quadra repetida em todas as quadras do território. O ray.so tem 4 grupos de controles e o I-a constrói 56 arcadas. O Airbnb tem 4 carrosséis e o G-c constrói 17 mercados.
4. **O baseline já falha no critério de estabilidade.** Acrescentar ou tirar um único item da lista principal troca construído por vazio em mais de 10% da planta em 61 de 217 casos (28%). O problema se concentra em listas de 6 a 20 itens e nasce na leitura: em 41 dos 61 casos o conjunto de territórios muda.
5. **Decisão sobre os protótipos:** T1, G-a, G-b e I-b saem. T2 não entra como regra. G-c sobrevive só como âncora de catálogo. I-a fica como tipologia, com a regra trocada: uma arcada por grupo e um quiosque por controle, contados no território inteiro.
6. **A proposta é um passo novo e quatro regras, não uma tipologia nova.** O passo é um layout de território entre a alocação e a composição. As regras: âncoras contadas pelos agrupamentos reais; tecido com grão e altura tirados do item; função escolhendo programa e âncora, não o tecido inteiro; extensão menor só para páginas quase vazias, com a câmera acompanhando.
7. **Uma decisão é sua antes de qualquer implementação:** o que a área significa. Mantendo "área é a fatia da página", o HN continua como é e a repetição é assumida como textura. Trocando para "área é a quantidade", cada edifício vira um item e o HN vira um povoado de dois quarteirões. Recomendo a primeira, com contagem exata só para o que é pouco e saliente. O argumento está na seção 6.

Pranchas novas: [auditoria dos candidatos](morphology/sheets/cons-audit-candidates.jpg), [documentação e mídia](morphology/sheets-full/cons-audit-docs-media.jpg), [contagem conservada](morphology/sheets/cons-forum-conserved.jpg), [contagem conservada em páginas não usadas](morphology/sheets-full/cons-forum-unseen.jpg), [escada de grão](morphology/sheets/cons-grain-ladder.jpg).

## 1. O que foi feito nesta rodada

- **Auditoria** em resolução cheia de baseline, conjunto do estudo (a prancha "famílias recomendadas"), comb3 e leitura da rodada 1, nas páginas que você listou.
- **Conservação de contagem** (`conservation.ts`): nas 135 páginas, quantas unidades são construídas por item, por controle e por grupo, em cada tecido.
- **Estabilidade geométrica** (`geometry.ts`): 135 páginas, 6 braços, as quatro perturbações do projeto mais um ou dois itens tirados ou acrescentados. A medida é o raster de alturas que o próprio projeto usa em `scripts/composition/check.ts`, na vista flat, separada em três: qualquer mudança de altura, troca entre construído e vazio, e mudança de dois andares ou mais.
- **Três experimentos isolados**, cada um atrás de uma flag, para responder a hipóteses:
  - `i-c`: o fórum com contagem conservada no território.
  - `i-c` com `extent` e câmera mais próxima: cidade menor para páginas quase vazias.
  - `t2s`: grão pelo tamanho do item, em vez de itens por lote.
- **Generalização:** as medições rodam nas 135 páginas, das quais 113 não orientaram o desenho de nenhum protótipo. O fórum foi fotografado em quatro páginas interativas que eu não tinha visto com ele.

O comb3 não se reproduz mais exatamente: duas regras dele foram substituídas depois (a primeira `item-form`, que mandava cartões para o grid, e a primeira `decorative`). As imagens e a medição gravada são as originais; estabilidade e generalização foram medidas na reprodução mais próxima.

## 2. Auditoria dos candidatos

### Pelos oito critérios

| Critério | Baseline | Conjunto do estudo | comb3 | Leitura da rodada 1 |
| --- | --- | --- | --- | --- |
| 1. Qualidade visual | a mais vistosa; parte vem de erro de leitura | boa em feeds; cubos em catálogos | pior: gramados no primeiro plano, praças vazias | como a do estudo, sem diretórios |
| 2. Fidelidade (leitura esperada, páginas novas) | 11 de 43 e 19 de 43 | 17 e 22 | 17 e 22 | 23 e 27 |
| 3. Diversidade (tecido dominante, 30 páginas) | sobrados 11, torres 9, quadras 7, grid 3 | 12, 7, 8, 2 e lâminas 1 | 11, 6, 6, 3, praça 2, rodapé 1, lâminas 1 | 12, 7, 9, 2 |
| 4. Repetição (cidades com uma família em 60% dos edifícios) | 3 | 3 | 5 | 2 |
| 5. Escala e densidade (solo aberto, mediana e máximo) | 2% e 9% | 3% e 9% | 3% e 13% | 2% e 9% |
| 6. Preserva o que o baseline tem de bom | referência | sim, 13 de 30 idênticas | não: HN, lobste.rs, SaaS | sim, 13 de 30 idênticas |
| 7. Estabilidade (solo que muda de tecido; saltos de um quarto) | 2,1%; 4 | 3,1%; 15 | 3,1%; 15 | 2,2%; 6 |
| 8. Generalização (tecido esperado, páginas novas) | 7 de 28 e 13 de 27 | 13 e 12 | 13 e 12 | 16 e 15 |

Leitura por candidato:

- **Baseline.** A variedade é real e em parte acidental: 34% do solo do benchmark está sob três rótulos de evidência fina. Das 9 cidades de torres, pelo menos três vêm de erro de leitura: Bluesky pelos avatares, Excalidraw pelos ícones, Airbnb por ser um catálogo com preço.
- **Conjunto do estudo.** Corrige os casos conhecidos e falha fora deles: em páginas novas lê 5 de 16 feeds, é, com o comb3, o menos estável dos quatro (15 saltos grandes contra 4) e piora o tecido esperado no segundo conjunto (12 contra 13 do baseline). Não deve ser retomado.
- **comb3.** Soma ao conjunto do estudo quatro coisas que não se sustentam: gramados de `extent` no primeiro plano, praça vazia no ray.so por `wrappers`, perda das torres do SaaS pela primeira `decorative`, e a primeira `item-form` com cubos (Bluesky 55% grid). Estraga o HN, que os outros três preservam. É o pior dos quatro.
- **Leitura da rodada 1.** A melhor em fidelidade e a única validada em páginas não vistas. Na planta é tão estável quanto o baseline em troca de construído por vazio (por exemplo, 8,2% contra 8,2% com um item a mais ou a menos) e muda um pouco mais as alturas. O custo visual é o que a rodada 1 já registrou: catálogos em cubos e o LessWrong em praça.

### As páginas que você pediu para investigar

| Página | Sua observação | O que a evidência diz |
| --- | --- | --- |
| Bluesky | continuidade melhor, risco de repetição | **Confirmado.** De torres sobre praça (leitura errada) para tecido contínuo com três torres. A repetição é medida: 36 posts viram 168 unidades, 4,7 por post. No comb3 vira campo de cubos |
| hn.algolia | idem | **Confirmado.** De campo de cubos para sobrados. 30 itens viram 373 unidades, 12,4 por item |
| Mastodon | perda de identidade na densificação | **Em parte contestado.** As praças do baseline vinham de os posts serem lidos como formulários: têm botões e quase nenhum link, e a regra de conteúdo manda isso para "interativo" (31% do solo). A leitura nova está certa e é a única página com perto de um edifício por item (20 posts, 15 blocos). O que se perdeu foi um vazio acidental. O que falta é o tecido de posts ter vazios próprios |
| Airbnb | perda de variedade, blocos repetidos | **Confirmado.** 32 anúncios viram 109 cubos idênticos, de 3,0 a 3,8 por anúncio, e o topo cai de 11,7 para 4,9. Nasce na geometria e no plano, não na leitura |
| Photopea | transformação grande, precisa de justificativa | **Justificada.** O que a captura vê são 2.683 caracteres em quatro seções com título, marca e rodapé. O campo de cubos do baseline vinha de "Free, free, free" lido como tabela de preços em 81% do solo. Ressalva: o Photopea é um editor em canvas; a cidade representa o texto de boas-vindas |
| Hacker News | preservar o caráter | **Preservado** no baseline, no conjunto do estudo e na leitura da rodada 1 (medição idêntica). Quebrado no comb3 e alterado por T2. Um fato que pesa na proposta: esse caráter é feito de 14 casas por história, variadas por sorteio |
| ray.so, Squoosh, Desmos, regex101 | interativos vazios demais | **Confirmado:** 2 a 3% do solo construído. Três causas somadas, em camadas diferentes: a receita da praça tem no máximo dois quiosques por quadra; a cidade tem tamanho fixo para páginas de 233 a 1.928 caracteres; e no ray.so a segmentação errada escondia o vazio |
| DevDocs, MDN, documentação | preservar hierarquia e legibilidade | **Python docs e Wikipedia: preservados** (idêntico e quase idêntico). **MDN melhora:** o título da página volta a ser marco e a cidade vai de 4 para 9 territórios. **DevDocs: não há hierarquia a preservar.** Antes e depois ele é lido como duas listas observadas e vira 99% de sobrados, indistinguível do HN na forma |
| Pinterest, Twitch, SoundCloud, Spotify | a morfologia representa conteúdo e agrupamentos? | **Pinterest e Spotify: os agrupamentos sim** (o Spotify tem 4 carrosséis e 4 distritos iguais), a tipologia vira campo de torres. **SoundCloud: não.** As capas nunca chegam ao snapshot: há um endereço de imagem na página inteira, porque o renderizador não baixa imagens e as capas são carregadas sob demanda. Três carrosséis de capas viram listas de texto e a mesma cidade do HN. **Twitch: em parte.** Os cartões de transmissão ficam sem imagem de conteúdo e viram manchetes |

Spotify e SoundCloud são páginas do mesmo tipo que geram cidades opostas por um motivo de captura. É o exemplo mais claro de por que a leitura tem que ser separada da geometria.

## 3. Onde nasce cada problema

| Problema | Camada onde nasce | Evidência |
| --- | --- | --- |
| Capas do SoundCloud invisíveis; cartões do Twitch sem imagem | Captura | 1 endereço de imagem no snapshot inteiro |
| Menu oculto vale 58% da página (GitHub Trending); consentimento vale 8% (SoundCloud) | Captura e limpeza | 846 links de um seletor fechado |
| Ícones contados como imagem de conteúdo (Excalidraw) | Extração | 33 SVG de interface |
| `<form>` que envolve a página vira 99% formulário (Steam); `contentinfo` externo vira rodapé de 100% (arXiv) | Extração de regiões | região tipada pelo elemento externo |
| Posts com botões lidos como formulários (Mastodon no baseline); LessWrong 49% interativo; exemplos da documentação do React 38% | Classificação funcional | regra de controles contra links |
| "Free" vira preço; três `<summary>` viram FAQ; teto de 5 links por item | Classificação funcional | rodadas anteriores |
| Um item a mais troca o conjunto de territórios | Classificação funcional | 41 de 61 casos grandes |
| Infixo de CSS Modules lido como seção (ray.so); `entry` lido como artigo (YouTube) | Normalização | papéis por palavra de classe |
| Tamanhos individuais descartados acima de 20 itens; 20 para 21 itens muda o agrupamento | Normalização | T1 sem série; Mastodon muda 40% da planta com um post a mais |
| Lista não tipada conta zero itens: grão invertido | Planejamento | Paul Graham 2 casas por fileira, HN 6 |
| Área é a fatia da página; 256 lotes sempre | Planejamento territorial | 14 casas por história no HN |
| Deslizamento da alocação ao longo da espiral | Planejamento territorial | pendência conhecida do projeto |
| Tabela fixa de tipo para tecido | Seleção de tipologia | catálogo é sempre grid; feed era sempre sobrado |
| Receita por peça, repetida em todas | Composição geométrica | 56 arcadas para 4 grupos; 17 mercados para 4 carrosséis |
| Variação por sorteio dentro do tecido | Composição geométrica | largura e andares de `rows` |
| Altura depende só da fatia do território | Composição geométrica | única fonte de altura é a mídia |
| Solo vago no primeiro plano; câmera fixa | Renderização e enquadramento | protótipo `extent` |

Duas consequências práticas:

- **Não vestir leitura errada com geometria.** Três das oito páginas com um quinto da cidade ou mais em território interativo não são aplicativos (Steam, LessWrong, documentação do React). Qualquer tecido interativo melhor vai deixá-las mais bonitas e continuar errado. Elas precisam de correção na extração e na classificação, e não devem servir de teste para o tecido.
- **Não cobrar da leitura o que é da geometria.** Airbnb, books.toscrape e Hiut estão lidos corretamente. A regra de leitura não deve mudar por causa deles.

## 4. Diagnóstico estrutural

### 4.1 A cidade não conhece quantidades

Medido com a leitura da rodada 1, nas 135 páginas, em territórios de lista com 12 lotes ou mais:

| Tecido | Territórios | Unidades construídas por item (p10, mediana, p90) | Entre metade e o dobro | Itens por lote contra unidades por lote |
| --- | --- | --- | --- | --- |
| Sobrados | 106 | 0,26 · 1,40 · 9,0 | 35 | menos 0,35 |
| Grid | 14 | 1,06 · 3,63 · 23,0 | 5 | 0,31 |
| Quadras | 101 | 0,20 · 0,60 · 1,3 | 54 | 0,38 |
| Torres | 71 | 0,26 · 0,86 · 1,4 | 56 | 0,56 |

Exemplos:

| Página | Itens | Unidades construídas | Por item |
| --- | --- | --- | --- |
| lobste.rs | 25 | 409 | 16,4 |
| Hacker News | 30 | 422 | 14,1 |
| hn.algolia | 30 | 373 | 12,4 |
| books.toscrape | 20 | 118 | 5,9 |
| Bluesky | 36 | 168 | 4,7 |
| Airbnb, por carrossel | 8 | 24 a 30 | 3,0 a 3,8 |
| Mastodon | 20 | 15 | 0,8 |
| Paul Graham | 215 | 177 | 0,8 |
| Spotify, por carrossel | 20 | 10 a 12 | 0,5 a 0,6 |
| Gutenberg | 600 | 100 | 0,2 |

A fatia do solo construída por repetição de itens tem mediana de 9%, passa de 43% em um quarto das cidades e de 68% em um décimo. Em 27 das 135 passa da metade.

A contagem se perde em dois pontos: na alocação, que só conhece pesos relativos, e na composição, que recebe cada peça sem saber quantas existem.

### 4.2 A composição é peça por peça

`composePiece` recebe a peça, o território, o tecido e uma semente. Não sabe a posição da peça na sequência do território nem o que as outras fizeram. Qualquer coisa que deveria existir uma vez (um mercado, um claustro, uma torre) é construída uma vez por quadra.

O projeto já tem a exceção que prova a regra: `planFrontage` planeja as fileiras de um território de sobrados inteiro antes de compor, distribuindo sublistas com título e passagens. É a única composição que conhece o território.

Para o experimento `i-c` precisei de um acumulador por território (lotes já compostos, arcadas e quiosques já colocados). Foram cerca de 20 linhas. Isso mostra duas coisas: a costura é pequena, e a regra "uma arcada por grupo" não pode ser escrita dentro de uma peça.

### 4.3 A leitura tem degraus

Estabilidade geométrica do baseline, 135 páginas:

| Perturbação | Casos | Construído vira vazio ou o contrário (média) | Casos acima de 10% da planta |
| --- | --- | --- | --- |
| Texto ±10% | 270 | 2,3% | 17 |
| Um link em cada dez removido | 135 | 6,3% | 29 |
| Uma seção secundária removida | 135 | 5,8% | 29 |
| Um item a mais ou a menos | 217 | 8,2% | 61 |
| Dois itens a mais ou a menos | 207 | 11,2% | 79 |

Por tamanho da lista, com um item a mais ou a menos:

| Itens na lista | Casos | Média | Acima de 10% |
| --- | --- | --- | --- |
| 6 a 9 | 51 | 11,0% | 22 |
| 10 a 20 | 88 | 11,1% | 30 |
| 21 a 40 | 42 | 5,2% | 9 |
| 41 ou mais | 30 | 1,0% | 0 |

Origem dos 61 casos grandes: em 41 o número de territórios muda, em 15 a fatia dos tecidos se move 2 pontos ou mais, e em 5 o plano é o mesmo e só a geometria muda. Exemplos: a categoria do IKEA ganha um item em 11 e a cidade ganha 12 territórios; uma página da documentação do PostgreSQL ganha um item em 15 e perde 16; o Mastodon passa de 20 para 21 posts, cruza o limite de agrupamento do normalizador, e 40% da planta troca.

Distinção que proponho usar daqui em diante:

- **Mudança esperada:** tirar uma seção faz o território dela sumir e os vizinhos se ajustarem; dobrar o texto muda proporções.
- **Instabilidade indevida:** um item em dez ou mais troca construído por vazio em mais de 10% da planta; texto ±10% muda o conjunto de territórios.

A leitura da rodada 1 não piora esse quadro de forma relevante (62 casos grandes contra 61 com um item a mais ou a menos) e não o resolve. Toda regra nova que ler contagens herda os degraus.

### 4.4 A tipologia depende de categorias frágeis

Um rótulo decide um território inteiro. Feed, catálogo, galeria e diretório são variações de uma mesma estrutura (uma série de itens parecidos) e hoje recebem quatro receitas sem nada em comum: sobrados, cubos, torres, lâminas. Cruzar um limiar de classificação troca a cidade toda. Foi o que derrubou a tipagem de diretórios na rodada 1 e é o que deixa o Airbnb em cima do degrau de 8 itens.

### 4.5 A hierarquia não chega ao volume

O único marco é o título da página. A altura de um território vem da fatia dele. Nível de título, item dominante, primeiro item de um grupo e profundidade não influenciam volume nenhum. Não medi isto além do que as rodadas anteriores mostraram (a mídia é a única fonte de altura); fica como hipótese a testar na etapa 5 do plano.

## 5. Decisão sobre os sete protótipos

| Protótipo | Decisão | Evidência nova desta rodada |
| --- | --- | --- |
| **T1** a unidade é o item | **Descartar** | Além de quase invisível, é instável por construção: amarrar a k-ésima casa ao k-ésimo item faz um item inserido deslocar todas as seguintes. Piora 10 pontos ou mais em 74 de 337 casos, sem melhorar nenhum. E não tem dados acima de 20 itens |
| **T2** grão por itens por lote | **Não incorporar como regra** | Corrige a inversão na estatística (de menos 0,35 para mais 0,47) e é neutro em estabilidade. Na imagem a relação é fraca: numa escada de sete páginas ordenadas por itens por lote, a progressão de grão mal se lê. E troca o caráter do HN (de 6 para 2 casas por fileira) |
| **G-a** lojas pela contagem | **Descartar como tipologia** | É T2 aplicado ao grid: aproxima a contagem (de 3,63 para 1,38 unidades por item) sem mudar a forma. A ideia vai para a abstração comum de grão |
| **G-b** rua de comércio | **Descartar** | Não houve evolução morfológica. O que ele tinha de certo (frente de rua comercial) é o que a proposta faz com o tecido de lista com programa de loja |
| **G-c** mercado coberto | **Não incorporar como tecido; manter como âncora** | As bancas seguem a contagem (12 de 14 territórios entre metade e o dobro). Os galpões não: um por quadra, 17 para os 4 carrosséis do Airbnb. Baixa altura e semelhança com outros galpões continuam |
| **I-a** fórum | **Manter a tipologia, trocar a regra** | Ver abaixo |
| **I-b** oficina | **Descartar** | Nada novo a favor. Fábrica com chaminé ao lado de qualquer formulário, e contraria a regra de uso do projeto |

### T2 em detalhe

Testei uma segunda formulação, `t2s`: a largura da casa vem do tamanho do item (60 caracteres é a casa mais estreita do kit, e a largura cresce com a raiz do tamanho).

| Regra | Casas por fileira: 2 / 3 / 4 / 5 / 6 (88 territórios) | HN | Paul Graham | Gutenberg |
| --- | --- | --- | --- | --- |
| Hoje | 48% / 10% / 13% / 10% / 19% | 6 | 2 | 2 |
| Por itens por lote (T2) | 25% / 26% / 18% / 13% / 18% | 2 | 5 | 6 |
| Por tamanho do item (`t2s`) | 6% / 10% / 10% / 9% / 65% | 6 | 6 | 6 |

- Por itens por lote dá a distribuição mais espalhada e muda o HN. A grandeza depende do tamanho fixo da cidade, que é arbitrário.
- Por tamanho do item preserva o HN e é uma propriedade do conteúdo. Leva dois terços das listas ao grão mais fino, porque a maioria das listas é de itens curtos. HN, Paul Graham e Gutenberg ficam com o mesmo grão.
- Nas duas, a diferença na imagem é pequena ([escada de grão](morphology/sheets/cons-grain-ladder.jpg)). O grão entre 2 e 6 casas por fileira é uma alavanca fraca de identidade.

Conclusão: o grão não merece uma regra própria nem uma mudança no HN. Ele entra como um parâmetro do layout de território (seção 6), pela formulação de tamanho do item, que deixa o HN idêntico. A inversão de hoje é um defeito de planejamento (lista não tipada conta zero) e pode ser corrigida ali.

### I-a em detalhe

- **Saturação.** Dos 47 territórios interativos com 12 lotes ou mais, 14 têm 4 grupos ou mais, 15 têm 2 ou 3 e 18 têm 0 ou 1. Trinta por cento saturam.
- **O defeito real não é a saturação, é a repetição por quadra.** Arcadas construídas por grupo: ray.so 56 para 4, Desmos 44 para 5, Squoosh 14 para 2, Carbon 25 para 6. É o campo de claustros.
- **Experimento `i-c`: contagem conservada.** Arcadas e quiosques são distribuídos pelo território na proporção dos lotes de cada peça, até o total de grupos e de controles.

| Página | Grupos, controles | I-a por quadra | Contagem conservada |
| --- | --- | --- | --- |
| Squoosh | 2, 5 | 14 arcadas, 12 quiosques | 2, 5 |
| ray.so | 4, 17 | 56, 14 | 4, 17 |
| Desmos | 5, 68 | 44, 69 | 5, 68 |
| Steam | 24, 85 | 62, 79 | 24, 85 |
| LessWrong | 29, 115 | 28, 48 | 27, 48 (teto da quadra) |

  Correlação de postos entre grupos e arcadas: de 0,74 para 0,88. Entre controles e quiosques: de 0,70 para 0,88. Com isso 17 e 115 controles deixam de ter a mesma forma: ray.so é praça com quatro arcadas, Desmos é praça cheia de quiosques, Steam tem arcadas em L, LessWrong tem claustros ([prancha](morphology/sheets/cons-forum-conserved.jpg)). Em quatro páginas que não orientaram o protótipo o comportamento é o mesmo ([prancha](morphology/sheets-full/cons-forum-unseen.jpg)).
- **O preço.** Com a contagem certa, ray.so e Squoosh voltam a ser quase vazios. Esse vazio é legítimo (233 e 431 caracteres) e fica ruim porque a cidade tem tamanho fixo.
- **Experimento com cidade menor.** A extensão por substância só age onde deve: 7 das 135 páginas ficam abaixo de 0,6 (ray.so, YouTube, tldraw, Desmos, JSON Crack, Bundlephobia, Squoosh) e 103 ficam em 0,9 ou mais. Com a câmera de sempre o solo vago vira gramado no primeiro plano. Com a câmera mais próxima a cidade menor se lê como uma praça com seus pavilhões, que é o que a página é. Não está pronto: o enquadramento do produto precisa acompanhar a extensão.
- **Dependência de classificação.** Três das oito páginas com grande território interativo são leitura errada (seção 3). O tecido não deve ser calibrado nelas.

## 6. Proposta de gramática urbana

### A decisão que vem antes: o que a área significa

| | A. Área é a fatia da página (hoje) | B. Área é a quantidade |
| --- | --- | --- |
| Regra | o território ocupa a proporção que tem na página; a cidade está sempre cheia | cada item ocupa o que lhe cabe; a cidade tem o tamanho do conteúdo |
| HN | como hoje | 30 casas: cerca de 2 quarteirões |
| Fidelidade | proporções exatas, quantidades como textura | quantidades exatas |
| Custo | repetição: até 16 unidades por item | cidades minúsculas para a maioria das listas; muda câmera, ruas e vida de rua |
| Risco | campos, se a repetição for de coisas idênticas | perde a identidade de metrópole em pixel art |

Recomendo **A, com contagem exata só para o que é pouco e saliente**. O motivo é perceptivo e está nas pranchas: ninguém conta 422 casas, mas 56 claustros para 4 grupos ou 17 mercados para 4 carrosséis se leem como um campo. A repetição incomoda quando é de objetos grandes e idênticos. No tecido miúdo ela é textura, e o HN é a prova de que funciona.

A opção B fica reservada para o caso em que a própria página é quase vazia, que é onde a extensão por substância age.

### Um passo novo: layout de território

Entre `allocate` e `composePiece`. Recebe as peças do território na ordem do percurso e o censo do território (itens e seus tamanhos, grupos, controles, títulos). Devolve, para cada peça, um encargo: se é âncora, tecido ou vazio, quantas unidades leva e de que tamanho. A composição executa o encargo com as famílias que já existem.

Não cabe só na geometria porque a geometria vê uma peça por vez. Cabe pouco no plano porque depende de como a alocação cortou as peças. `planFrontage` já é esse passo para um tecido; a proposta é generalizá-lo.

### As regras

| Evidência no DOM | Consequência espacial | Hoje | Proposta |
| --- | --- | --- | --- |
| Ordem e peso das regiões | sequência e área dos territórios | assim | mantém |
| Agrupamentos reais: sublistas com título, carrosséis, grupos de controles, seções irmãs | um conjunto por grupo, com uma âncora, e uma passagem ou troca de quadra entre grupos | só passagens, só em sobrados | **R1. Âncoras contadas**, em todo tecido |
| Repetição: quantos itens, de que tamanho | grão do tecido; distribuição de larguras e alturas | grão pela contagem de regiões tipadas; variação por sorteio | **R2. Tecido pelo item:** largura pelo tamanho do item; a distribuição de tamanhos dos edifícios reproduz a dos itens, sem amarrar posição a posição |
| O que o item diz e mostra | altura | altura pela fatia do território | **R2**, com altura pelo que o item diz |
| Hierarquia: nível de título, item dominante, primeiro do grupo | marco, esquina, altura relativa | só o título da página | **R1**: a âncora fica no início do grupo; altura da âncora pelo nível |
| Função: preço, controle, link, mídia | programa do térreo e tipo de âncora | o rótulo escolhe o tecido inteiro | **R3. A função escolhe programa e âncora**, não o tecido |
| Pouco conteúdo de verdade | cidade menor, praça | cidade sempre cheia | **R4. Extensão** para páginas quase vazias, com a câmera acompanhando |

O que cada regra substitui:

- **R1** acaba com os campos de objetos grandes. Âncora por função: arcada para grupo de controles, mercado para grupo de itens com preço, torre com telão para grupo de imagens, bloco cívico para grupo de índice. O Spotify teria 4 torres, uma por carrossel; hoje tem de 10 a 12 edifícios de mídia em cada um.
- **R2** substitui os dois sorteios de `rows` e a regra de unidades por fileira. A diferença para T1 é a que evita a instabilidade: a distribuição de tamanhos vem dos itens, a posição não. Um item a mais muda a distribuição um pouco; não desloca a rua inteira.
- **R3** troca quatro receitas por um tecido de lista com parâmetros. Feed, catálogo, galeria e diretório passam a ser o mesmo tecido de frentes de rua, com térreo de porta, loja, tela ou placa, e a âncora correspondente. Um limiar de classificação cruzado troca o térreo e a âncora, não a cidade.
- **R4** é a extensão por substância que já existe como protótipo, com enquadramento.

A unidade de composição passa a depender da escala: item vira unidade (casa, loja, banca); grupo vira conjunto (âncora mais tecido); território vira sequência de conjuntos; página vira extensão.

### O que a proposta não resolve

- **Homogeneidade.** Se toda lista vira frente de rua, a diferença entre um feed e um catálogo passa a ser térreo, âncora e altura. A escada de grão mostrou que largura sozinha não basta. Se R1 e a altura de R2 não derem silhueta distinta, a proposta falha, e isso tem que ser um critério de rejeição.
- **Catálogo que domina a cidade.** Um catálogo de 20 itens em 78% da página teria um mercado, 20 lojas distintas e o resto do território repetindo. Fica melhor que cubos e continua sendo repetição.
- **Leitura errada.** Steam, LessWrong, SoundCloud e os degraus da seção 4.3 não mudam com nada disto.

## 7. Consolidação mínima

O menor conjunto coerente, em quatro blocos. Cada bloco vale sozinho.

1. **Leitura sem risco visual:** `transient` e a parte de preço de `coverage`. Neutras em estabilidade, suíte intacta.
2. **Estabilidade da leitura:** tratar os degraus da seção 4.3. Ainda não há protótipo. É pré-requisito das regras que leem contagens.
3. **Layout de território com R1 e R4**, começando pelo interativo: tipologia do I-a, regra do `i-c`, extensão com enquadramento.
4. **Listas:** o pacote de leitura da rodada 1 junto com R3 e R2 para catálogos e feeds. O G-c entra aqui como âncora de catálogo.

Fora: T1, T2 como regra, G-a, G-b, I-b, a tipagem de diretórios, e tudo que as rodadas anteriores já tinham descartado.

**Sobre as flags.** O registro tem 33. Quando você aprovar a direção, proponho reduzir a 8 e apagar as outras com seus ramos: preço exige valor, FAQ exige respostas, lista (as três de hoje numa só), anatomia do item, consentimento, avatares, CSS Modules, fórum com contagem. `extent` fica até o enquadramento existir. Não apaguei nada agora porque as pranchas e medições das rodadas anteriores dependem delas para serem reproduzidas.

## 8. Priorização

| Mudança | Impacto visual | Fidelidade | Risco de regressão |
| --- | --- | --- | --- |
| `transient` e preço exige valor | baixo (7 de 135 páginas) | médio | muito baixo |
| Degraus da leitura | nenhum em páginas paradas; alto em estabilidade | alto | médio: mexe na classificação |
| Layout de território | nenhum sozinho | habilita R1 e R2 | baixo se as peças não mudarem |
| R1 no interativo, com contagem | alto em 8 páginas, pequeno nas demais com território interativo | alto | baixo: suíte passa, estabilidade neutra |
| R4 extensão com enquadramento | alto em 7 páginas | alto | médio: toca câmera e cenário |
| Pacote de leitura de listas | alto (43 de 135) | alto | médio; já medido |
| R3 e R1 para catálogos | alto em 10 páginas | médio | médio: tecido novo, precisa de páginas novas |
| R2 altura e grão pelo item | médio | médio | alto: alcança 99 páginas, HN incluído |

Ordem que recomendo: a tabela de cima para baixo. O que mais muda a imagem (listas e catálogos) vem depois do que torna a mudança segura (estabilidade e layout).

## 9. Plano incremental

Cada etapa atrás de uma flag até a sua aprovação, com baseline congelado no início da etapa.

**Etapa 1. Leitura sem risco visual.**

- Aceita se: suíte 243 de 243 com a flag ligada; estabilidade de plano igual à do baseline (2,1% e 4 saltos); nenhuma cidade do benchmark troca de tecido dominante além de Photopea.
- Rejeita se: alguma página nova do terceiro conjunto perde uma leitura que o baseline acertava.

**Etapa 2. Degraus da leitura.**

- Aceita se: com um item a mais ou a menos, os casos acima de 10% de troca entre construído e vazio caem de 28% para 10% ou menos; em listas de 6 a 20 itens a média cai de 11% para 5% ou menos; a leitura esperada no segundo conjunto não fica abaixo de 27 de 43.
- Rejeita se: o ganho vier de deixar de ler listas curtas (a leitura esperada cai), ou se alguma cidade do benchmark mudar sem motivo listado.

**Etapa 3. Layout de território, R1 no interativo, R4.**

- Aceita se: nenhuma página tem mais arcadas que grupos; correlação entre grupos e arcadas de 0,85 ou mais; suíte 222 de 222; estabilidade geométrica não pior que a da leitura (nenhum caso 10 pontos pior); as 103 páginas com extensão de 0,9 ou mais ficam idênticas; nas 7 páginas quase vazias, o solo vago ocupa menos de 10% do quadro padrão.
- Rejeita se: Linear, Twitch, NASA ou Pinterest mudarem de forma que você note; ou se a extensão exigir gramado no primeiro plano.
- Fora do teste: Steam, LessWrong e a documentação do React, até a leitura delas ser corrigida.

**Etapa 4. Listas: leitura da rodada 1 com R3 e R1 para catálogos.**

- Aceita se: leitura esperada de 27 de 43 ou mais no segundo conjunto e não abaixo do baseline num terceiro conjunto, capturado depois de congelar; em territórios de catálogo, uma âncora por grupo e 80% ou mais com unidades por item entre metade e o dobro; nenhum conjunto visível de mais de 9 volumes idênticos; em trincas sem cor, catálogo distinguível de feed.
- Rejeita se: na vista sem cor não der para separar catálogos de feeds; ou se o q90 de altura de uma cidade dominada por catálogo ficar abaixo do do grid de hoje (3,4).

**Etapa 5. R2: grão e altura pelo item.**

- Aceita se: HN idêntico na vista flat, ou alterado com a sua aprovação explícita olhando a prancha; correlação entre o que o item diz e a altura do tecido, entre feeds, de 0,5 ou mais; estabilidade com um item a mais não pior que antes.
- Rejeita se: o número de cidades altas do benchmark cair; ou se a diferença só aparecer com cor.

Em toda etapa: as mesmas condições de câmera, hora, semente e viewport; as 135 páginas como regressão; um conjunto novo de páginas para qualquer limiar novo; e a decisão visual é sua.

## 10. Limitações

- O julgamento visual é meu, numa câmera, numa hora e numa semente.
- A proposta de gramática tem dois experimentos por trás (contagem conservada e cidade menor) e só no tecido interativo. R2 e R3 são hipóteses sem protótipo.
- A regra de estabilidade da etapa 2 não tem solução prototipada. Sei onde estão os degraus, não ainda como tirá-los.
- A medida de estabilidade geométrica conta células de 25 centímetros na vista flat. Uma mudança de um andar numa cidade inteira aparece em "qualquer mudança" e não em "construído ou vazio"; por isso reportei as duas.
- A definição de grupo de controles é uma entre várias. Steam com 24 grupos e LessWrong com 29 dizem mais sobre a definição que sobre as páginas.
- O terceiro conjunto de páginas, intocado, ainda não foi capturado. Está reservado para as etapas de implementação.
- O comb3 foi auditado nas imagens e na medição originais; estabilidade e generalização vêm de uma reprodução aproximada.

## Pranchas

Novas, só com o que acrescenta evidência:

- [Auditoria dos candidatos](morphology/sheets/cons-audit-candidates.jpg): seis páginas, quatro versões.
- [Documentação e mídia](morphology/sheets-full/cons-audit-docs-media.jpg): baseline contra leitura da rodada 1.
- [Contagem conservada](morphology/sheets/cons-forum-conserved.jpg): I-a por quadra, conservada, com cidade menor, e de perto.
- [Contagem conservada em páginas não usadas](morphology/sheets-full/cons-forum-unseen.jpg).
- [Escada de grão](morphology/sheets/cons-grain-ladder.jpg): sete listas por itens por lote, nas três regras.

Das rodadas anteriores, as que sustentam decisões daqui: [catálogos](morphology/sheets/proto-t4-alternatives.jpg), [interativos em cidades boas](morphology/sheets-full/proto-t5-regressions.jpg), [silhuetas sem cor](morphology/sheets-full/proto-flat.jpg), [HN, lobste.rs e Paul Graham](morphology/sheets/proto-t1t2-three.jpg), [custos em páginas novas](morphology/sheets-full/round-3-unseen-costs.jpg).

## Arquivos

Experimentos desta rodada, atrás de flags:

- `i-c` em `compose.ts` (`conserved`) e `district.ts` (acumulador por território).
- `t2s` em `compose.ts`; `census` (só liga a contagem, sem mexer na geometria) e o campo `size` do censo em `plan.ts`.

Ferramentas novas em `scripts/morphology/`: `conservation.ts`, `geometry.ts`, e `dropItems` e `addItems` em `perturb.ts`.

Para reproduzir:

```bash
npx tsx scripts/morphology/conservation.ts
```

```bash
npx tsx scripts/morphology/geometry.ts run 0/1
```

```bash
npx tsx scripts/morphology/geometry.ts report
```

## Notas de execução

- Duas pranchas da rodada anterior saíram com rótulos quebrados, porque a fonte do gerador de pranchas não tem letras acentuadas. Regerei `proto-t1t2-three.jpg` e `proto-t4-alternatives.jpg` com rótulos sem acento. As imagens são as mesmas.
- O servidor de desenvolvimento usado para as fotos foi encerrado e os arquivos que ele cria na raiz foram apagados.
