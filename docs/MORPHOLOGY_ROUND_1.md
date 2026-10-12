# Rodada 1 de interpretação: estabilidade, generalização e proposta para a tradução geométrica

Escrito em 11/10/2026 sobre `main`, sem commit. Continua [MORPHOLOGY_STUDY.md](MORPHOLOGY_STUDY.md). Nada foi incorporado ao produto: todas as intervenções continuam atrás de flags desligadas por padrão, e o caminho do produto não passa flag nenhuma.

> **Encerramento, 12/10/2026.** As flags citadas aqui foram consolidadas em três (`reading`, `forum`, `market`) ou removidas. As decisões finais, o mapa de nomes e como reproduzir estes resultados a partir do arquivo estão em [MORPHOLOGY_CLOSING.md](MORPHOLOGY_CLOSING.md). Os links para `morphology/sheets-full/` apontam para pranchas em tamanho original que ficam fora do git.

## Veredito

1. **A recomendação do estudo anterior não passou na validação.** Em 43 páginas que eu nunca tinha visto, a regra `lists` como estava leu 5 de 16 feeds. A validação achou nove defeitos concretos, todos de generalização: a regra funcionava nas páginas em que eu a tinha calibrado.
2. **A versão corrigida generaliza na direção certa, com ganho real e modesto.** Em um segundo conjunto de 43 páginas, capturado depois de congelar o código e olhado uma única vez, a leitura que eu tinha registrado como esperada foi de 19 para 27 páginas, os feeds reconhecidos de 4 para 12 em 17, e os erros grosseiros (metade da cidade sob um tipo que contradiz a página) de 9 para 4. Perdeu 2 páginas que o baseline acertava.
3. **`lists` nunca pode entrar sem `item-form`.** Sozinha, ela piora o tecido dos feeds em páginas novas: de 9 para 7 em 15. Um feed reconhecido é forçado a sobrados pela tabela, inclusive os feeds de texto longo que o baseline já construía como quadras.
4. **A medida que `item-form` usava não generaliza; a nova sim.** Caracteres por item misturam título, metadados e links. Troquei por "o maior trecho de texto do item fora de links", que separa manchetes de posts com uma folga visível e é estável a variações do limiar.
5. **Estabilidade praticamente igual à do baseline.** Nas quatro perturbações do projeto, sobre 135 páginas, a fatia de solo que muda de tecido vai de 2,1% para 2,2% em média, e os saltos grandes (um quarto do solo ou mais) de 4 para 6 em 540 casos. O que sobra é um degrau mais marcado entre uma lista de 8 itens e uma de 7.
6. **A suíte congelada passa: 242 de 243 verificações com o candidato ligado.** A única que falha procura as histórias do lobste.rs pelo rótulo antigo e errado (`faq`); o comportamento que ela protege continua igual.
7. **Tipar diretórios ficou de fora.** A leitura "lista de links é diretório" é instável na fronteira com feed de manchetes, quebra 7 verificações congeladas de composição no craigslist e troca cidades vivas por campos de lâminas. Volta quando o tecido de índice melhorar.
8. **O custo visual do candidato final está em dois lugares, os dois na tradução:** catálogos lidos corretamente viram campo de cubos (Airbnb, books.toscrape, Hiut), e o LessWrong vira praça vazia. Os dois confirmam o diagnóstico: o limite é o tecido, não a leitura.

Recomendação resumida: `transient` e a parte de preço de `coverage` podem entrar agora. O pacote de listas (`lists` revisada, `item-form` revisada, `avatars`, e a parte de FAQ de `coverage`) está validado como interpretação, e recomendo que entre junto com a primeira entrega da rodada de tradução, não antes. O detalhe está nas seções 7 e 9.

Pranchas: [benchmark](morphology/sheets/round-1-benchmark.jpg), [feeds nunca vistos](morphology/sheets/round-2-unseen-feeds.jpg), [custos](morphology/sheets-full/round-3-unseen-costs.jpg), [diretórios](morphology/sheets-full/round-4-unseen-directories.jpg), [a variante com diretórios](morphology/sheets-full/round-5-with-directories.jpg).

## 1. Método

**Baseline congelado.** Com as flags desligadas, a medição das 30 páginas do benchmark é idêntica byte a byte a `baseline.json`, gravado no início do estudo. Conferi depois de cada alteração de código desta rodada.

**Conjuntos de páginas (135 no total).**

| Conjunto | Páginas | Papel |
| --- | --- | --- |
| Benchmark | 30 | onde as regras foram calibradas no estudo |
| Sobras offline | 21 | snapshots que existiam em disco e nunca tinham sido usados |
| Novo A | 43 | capturado nesta rodada; usado para achar e corrigir defeitos |
| Novo B | 43 | capturado depois do congelamento; confirmação |

**Expectativa registrada antes.** Para cada página nova escrevi, antes de capturar, que estrutura eu esperava: feed de manchetes, feed de posts, posts com mídia, cartões, catálogo, galeria, diretório, capa mista ou nenhuma lista. Foram 53 páginas em A e 54 em B. Nove de cada conjunto foram recusadas por anti-bot ou login, e respeitei a recusa; três capturas vieram inúteis (menos de 60 elementos). Não editei nenhuma expectativa depois de ver o resultado. Onde hoje acho que minha expectativa estava errada, a página continua contando como erro e está dito abaixo.

**Critérios, fixados antes de olhar B.**

- Leitura: o tipo de lista esperado ocupa 30% do solo ou mais. Para "nenhuma lista", todos os tipos de lista juntos ficam abaixo de 30%.
- Tecido: o tecido dominante da cidade é o esperado para aquela estrutura (manchetes: sobrados; posts: quadras; catálogo: grid; galeria: telões; diretório: lâminas).
- Erro grosseiro: metade do solo ou mais sob um tipo de lista que contradiz a expectativa. Este eu defini depois de ver A, e está marcado como tal.

**Ordem dos fatos, porque importa para o que B prova.** A foi capturado e usado para corrigir as regras. Congelei `lists` e `item-form` revisadas e só então capturei e li B. Depois de B fiz três mudanças: acrescentei `avatars` ao conjunto (a flag já existia), corrigi a lista que ocupa a página inteira, e tirei a tipagem de diretórios por causa da suíte congelada. Dou os números de B para a versão congelada e para a final.

**Estabilidade.** As quatro perturbações que o projeto já usa (texto ±10%, um link em cada dez removido, uma seção secundária removida), mais 19 edições maiores, em 135 páginas e 8 braços. A medida é a fatia do solo que muda de tecido, calculada no plano, sem gerar geometria.

**Visual.** Mesma rota, câmera, hora, semente e viewport do estudo. Fotografei o candidato nas 30 do benchmark e, com baseline e candidato, nas 45 páginas novas em que ele muda um décimo do solo ou mais.

**Suíte congelada com o candidato ligado.** `scripts/morphology/with.ts` liga as flags no processo e roda um script de verificação do projeto sem alterá-lo.

## 2. O que a validação achou na primeira versão

Defeitos de `lists` e `item-form`, cada um visto em páginas reais do conjunto A (o oitavo em B):

| # | Defeito | Onde apareceu |
| --- | --- | --- |
| 1 | Médias por item ignoravam o agrupamento de repetições: lista com mais de 20 itens tinha links e caracteres inflados e virava feed | Gutenberg (100 itens: 4,8 links por item em vez de 1,0), CNN lite, MDN |
| 2 | Teto de 900 caracteres por item rejeitava feeds de posts longos | Slashdot, Schneier, Kottke |
| 3 | Três parágrafos dentro de um item contavam como "lista interna", e o post virava seção | Schneier |
| 4 | Uma lista interna de links curtos não contava, e grupos de links viravam itens de feed | lista de linguagens da Wikipedia |
| 5 | Regras de evidência fina ainda pegavam o ancestral quando a lista era menos de 60% dele | GOG (59%) |
| 6 | A guarda do título da página desligava a regra inteira quando o título estava dentro da lista | Tildes (um `h1` por tópico), dev.to |
| 7 | Seções de um documento eram lidas como itens de um feed | artigo da Wikipedia com 20 seções |
| 8 | Lista que é mais de 97% da página era pulada por uma guarda antiga | tilde.news, mesmo motor do lobste.rs |
| 9 | `item-form` media o item de dois jeitos que discordavam, e caracteres por item não separam manchete de post | hn.algolia (149 ou 305), Tildes, dev.to |

Correções, todas gerais: contar os itens dentro do agrupamento; tirar o teto; só `li`, `tr`, `article`, `div` e `a` contam como item (um `section` é parte de um documento, que é o que o HTML diz); um item contém uma lista quando contém algo que a própria regra chamaria de lista; um ancestral que contém uma lista não recebe tipo por evidência fina; o título dentro da lista não impede a lista, e o plano o emite ao lado dela.

A validação também achou defeitos que **não são das candidatas** e existem no baseline. Registro porque limitam qualquer leitura:

- um `<form>` que envolve a página inteira vira praça em 99% do solo (Steam);
- um `role=contentinfo` num contêiner externo engole a página como rodapé (arXiv);
- menus ocultos pesam como conteúdo: a lista de 846 linguagens do GitHub Trending é 58% da página;
- páginas sem marcação de item (LWN, Daring Fireball, jvns) não têm lista para achar;
- listas de 6 ou 7 itens ficam fora (página de catálogo com 6 produtos).

## 3. Resultados nos dois conjuntos

Leitura como esperada:

| Estrutura esperada | A: baseline | A: 1ª versão | A: final | B: baseline | B: 1ª versão | B: final |
| --- | --- | --- | --- | --- | --- | --- |
| Feeds (manchetes, posts, cartões) | 0 de 16 | 5 | 10 | 4 de 17 | 7 | 12 |
| Catálogo | 1 de 6 | 1 | 2 | 2 de 4 | 3 | 3 |
| Galeria | 1 de 2 | 1 | 1 | 0 de 0 | 0 | 0 |
| Diretório | 1 de 7 | 1 | 1 | 2 de 8 | 1 | 1 |
| Capa mista | 2 de 2 | 2 | 2 | 3 de 3 | 3 | 2 |
| Nenhuma lista | 6 de 10 | 6 | 7 | 8 de 11 | 8 | 9 |
| **Total** | **11 de 43** | **16** | **23** | **19 de 43** | **22** | **27** |

| | A: baseline | A: final | B: baseline | B: final |
| --- | --- | --- | --- | --- |
| Tecido dominante como esperado | 7 de 28 | 16 | 13 de 27 | 15 |
| Erros grosseiros | 19 | 6 | 9 | 4 |
| Páginas ganhas / perdidas na leitura | | 12 / 0 | | 10 / 2 |

A versão congelada antes de B (sem `avatars`, sem a correção da página inteira, com diretórios) leu B com 24 de 43 na leitura, 16 de 27 no tecido e 6 erros grosseiros. A final tem 27, 15 e 4.

**O que B diz, sem enfeite.** O ganho existe em páginas nunca vistas e se concentra nos feeds. O nível absoluto é modesto: a leitura esperada sai de 44% para 63% das páginas, e o tecido esperado de 48% para 56%. O conjunto A é mais favorável (26% para 53%) porque foi usado para corrigir, e não deve ser lido como prova.

**As duas páginas perdidas em B.**

- learnxinyminutes: 98 linhas, cada uma um nome e seis links para traduções. O baseline lia como índice; o candidato lê como feed. É a fronteira diretório/feed, tratada na seção 6.
- NPR: eu esperava uma capa em seções. A página são 31 blocos de matéria iguais em sequência, e o candidato a lê como feed (93%). Acho que quem errou foi minha expectativa, mas conta como perda.

**Onde continua falhando em B.** Discourse só é lido certo com `avatars` (sem ela, os avatares de cada linha fazem da lista de tópicos uma galeria de 97% e uma cidade de torres, o mesmo defeito do Bluesky em outro site). RubyGems, ooh.directory e a categoria da Wikipedia caem na fronteira diretório/feed. Hackaday tem 7 posts. scrapethissite tem 250 blocos sem link.

## 4. `item-form`: evidência de que a regra generaliza

A preocupação era justa. Os três parâmetros da versão do estudo tinham sido ajustados olhando três páginas, e a validação mostrou que a própria medida estava errada.

**Caracteres por item não separam manchete de post.** Nos 28 feeds de benchmark, sobras e conjunto A, três páginas de manchetes ficam acima do limiar de 220 (hn.algolia 305, Tildes 316, dev.to 283) e viram quadras, enquanto o Bluesky (217) fica abaixo. O hn.algolia tem itens iguais aos do HN, com a URL e os metadados somando 300 caracteres.

**O que separa é o texto que o item diz fora de links.** Para cada item, o maior bloco de texto que não é link nem está dentro de um; a mediana entre os itens:

| Grupo | Páginas | Maior texto fora de link |
| --- | --- | --- |
| Manchetes | Twitch, GitHub, Pinboard, HN, lobste.rs, hn.algolia, Tildes, dev.to | 0 a 68 |
| Fronteira | The Verge, Bluesky, Simon Willison | 97 a 132 |
| Posts | Kottke, blog da Cloudflare, Techmeme, Schneier, Mastodon, Slashdot | 236 a 2.141 |

O limiar ficou em 100, no meio da folga. **Sensibilidade:** variando o limiar de 70 a 140, nenhuma página com valor até 41 ou a partir de 212 muda de tecido. Só mudam as que ficam entre 61 e 132 (Tildes, dev.to e as três da fronteira), que é onde uma mistura é a resposta honesta.

**Em páginas nunca vistas (B), tecido dos feeds como esperado, em 15:**

| Braço | Acertos |
| --- | --- |
| Baseline | 9 |
| `lists` sozinha | 7 |
| `lists` deixando o `softMix` decidir o tecido do feed | 8 |
| `lists` + `item-form` (final) | 11 |

A alternativa mais simples, tirar `feed → sobrados` da tabela e deixar a medida que já existe decidir, não basta: o `softMix` volta a dar torre para qualquer feed com imagem e quadra para manchetes com poucos links.

**O que não está provado.** O limiar de 100 e a fatia de 30% de telões foram escolhidos em 28 feeds e conferidos nos feeds de B. A fatia de telões continua sendo um número meu, sem evidência além de "produz uma cidade legível". E `item-form` só atua em território do tipo `feed`: catálogo, galeria e diretório seguem a tabela.

## 5. Estabilidade a perturbação

As quatro perturbações do projeto, 135 páginas, 540 casos por braço:

| Braço | Solo que muda de tecido (média) | Casos com um quarto do solo ou mais | Solo que muda de tipo (média) |
| --- | --- | --- | --- |
| Baseline | 2,1% | 4 | 1,8% |
| Preço exige valor (`amount`) | 2,1% | 4 | 1,8% |
| `transient` | 2,1% | 4 | 1,8% |
| `avatars` | 2,1% | 4 | 1,8% |
| `lists` revisada, sozinha | 2,0% | 6 | 1,7% |
| Primeira versão (a do estudo) | 2,8% | 13 | 2,8% |
| Variante com diretórios | 2,4% | 9 | 2,3% |
| **Final** | **2,2%** | **6** | **1,8%** |

As três intervenções pequenas são neutras: os números são os do baseline. A primeira versão era claramente menos estável que o baseline, mais um motivo para não tê-la incorporado. A final fica a um décimo de ponto do baseline na média, com dois saltos grandes a mais.

Os seis saltos da final: Airbnb (ver abaixo), diagrams.net (igual ao baseline), Techmeme (31%), Boing Boing e APOD (os dois na fronteira entre feed e galeria, em 80 caracteres por imagem) e as estantes do Gutenberg. Os três maiores saltos do baseline (93% no Techmeme, 78% no Pinboard, 95% no itch.io) somem ou, no Techmeme, caem para 31%.

Edições maiores, caso a caso: em 2.813 casos, a final se move pelo menos 10 pontos mais que o baseline em 169 e pelo menos 10 pontos menos em 162. Removendo links e imagens ela é mais estável (9,0% contra 10,9% de média).

**O degrau dos 8 itens.** Cortando a lista principal de cada página:

| Lista cortada para | 12 | 9 | 8 | 7 | 6 |
| --- | --- | --- | --- | --- | --- |
| Baseline: casos com um quarto do solo mudando | 17 de 70 | 21 de 90 | 23 de 94 | 31 de 104 | 34 de 113 |
| Final | 13 | 16 | 17 | 40 | 41 |

Com 8 itens ou mais a final é mais estável que o baseline. Entre 8 e 7 ela tem um degrau mais alto, porque abaixo de 8 a regra de lista não vale e a página cai nas regras antigas, que constroem outra cidade. O baseline tem o mesmo degrau, mais baixo, na regra de feed dele. Não consegui suavizar: baixar o mínimo para 6 não reduz os saltos (continuam 9 na variante testada) e passa a tipar listas pequenas em páginas sem lista.

**O Airbnb está em cima do degrau.** Cada fileira tem exatamente 8 anúncios. Tirar um link em cada dez derruba uma fileira para 7 e a cidade volta de catálogo a vitrine em 67% do solo. A leitura correta do Airbnb é frágil por esse motivo, e não por causa da classificação em si.

**A causa de fundo é a mesma do estudo.** Categorias rígidas na leitura alimentam uma tabela categórica de tecidos, então atravessar um limiar troca a cidade inteira. Enquanto a tradução for uma tabela, qualquer regra de classificação terá degraus desse tamanho.

## 6. Regressões fora dos casos conhecidos

**Benchmark (30 páginas).** A final muda 17 e deixa 13 idênticas na medição. As idênticas: HN, Python docs, DevDocs, craigslist, NASA, Paul Graham, gov.uk, portfólio, os dois SaaS, ray.so, YouTube e Excalidraw. O IKEA entra na conta das que mudam só por uma região a mais; a cidade é a mesma. Nenhuma cidade boa foi destruída ([prancha](morphology/sheets/round-1-benchmark.jpg)).

**135 páginas.** A final muda um décimo do solo ou mais em 43 páginas e deixa 69 idênticas. Das 84 páginas novas, muda 33.

**Leitura visual das 45 páginas novas fotografadas** ([feeds](morphology/sheets/round-2-unseen-feeds.jpg), [custos](morphology/sheets-full/round-3-unseen-costs.jpg), [diretórios](morphology/sheets-full/round-4-unseen-directories.jpg)):

- **Melhoram com clareza:** Tildes, dev.to, Techmeme, Kottke, The New Stack, G1 e o ensaio da GNU deixam de ser campo de cubos por causa de um "pricing" falso; Discourse deixa de ser cidade de torres por causa de avatares; Slashdot deixa de ser fragmentos.
- **Mudam sem ganho nem perda clara:** NPR, Simon Willison, GitHub Trending, itch.io, Open Library, GOG. Em geral trocam torres ou pátios por um tecido mais denso.
- **Pioram:** LessWrong. O "pricing" falso sai e aparece um território interativo de 49% (115 controles), que vira praça vazia. É o caso do ray.so num site de conteúdo.
- **Custo conhecido do tecido de catálogo:** books.toscrape e Hiut passam de torres a cubos, como o Airbnb.

**Suíte congelada com a final ligada: 242 de 243.**

| Suíte | Resultado |
| --- | --- |
| warnings, allocation, hygiene, surface, openings, composition, streets, life, atmosphere, polish | todas passam |
| program | 38 de 39 |

A que falha: "lobste.rs: the stories stay commercial, as a declared fallback". O teste busca o território pelo tipo `faq`, que é justamente o rótulo errado já listado no backlog. Com a final, as 117 construções das histórias continuam "commercial: fallback", agora sob o tipo `feed`. A verificação precisa trocar a chave, não o que ela protege.

**Por que os diretórios saíram.** Com a tipagem de diretórios ligada, a mesma suíte falhava em 8 verificações e a de programa parava no meio:

- 7 de composição, todas no craigslist: as listas de cidades por país deixavam de pertencer aos territórios cuja estrutura interna (sublistas com título, passagens) a camada de composição foi validada para preservar;
- 1 de higiene, sobre o fallback de página de links simples;
- a de programa parava porque o gov.uk deixava de ter um território `feed`. O teste congelado descreve aqueles itens como "titled items with text", e está certo: são um link com uma frase de descrição.

Fora da suíte, a mesma tipagem dobrava os saltos grandes (9 contra 4) e trocava cidades vivas por campos de lâminas idênticas em CNN lite, text.npr.org, Gutenberg, Debian e RubyGems ([prancha](morphology/sheets-full/round-5-with-directories.jpg)). No conjunto das 135 páginas, as cidades com metade do solo em lâminas iam de 5 para 11.

A fronteira é mal definida de verdade: uma lista de 100 manchetes que são só links (CNN lite), um resultado de busca em que o cartão inteiro é um link com descrição (RubyGems) e uma linha com um nome e seis links (learnxinyminutes) têm a mesma estrutura e eu esperava três leituras diferentes. Enquanto o tecido de índice for três barras iguais por quadra, ler mais páginas como índice piora as cidades sem ganho de fidelidade que se sustente.

Isso é diferente do Airbnb. Lá a classificação é estável na definição (item com preço) e o problema é só o tecido. Aqui a própria classificação oscila.

## 7. Recomendação final por intervenção

| Intervenção | Recomendação | Evidência | Risco que fica |
| --- | --- | --- | --- |
| `transient` (gerenciador de consentimento) | **Entra agora** | Muda 1 de 135 páginas; estabilidade idêntica; suíte passa | A lista de nomes de produtos envelhece |
| `coverage`, parte de preço (`amount`) | **Entra agora** | Muda 6 de 135; cidades dominadas por grid de 16 para 13; estabilidade idêntica | Catálogo com preço sem símbolo de moeda perde o rótulo (GOG) |
| `coverage`, parte de FAQ | Entra **com** `lists` | Sozinha, solta o lobste.rs para a regra antiga de diretório e ele vira lâminas | Nenhum com `lists` ligada |
| `lists` revisada + página inteira + sem diretórios | **Validada; entra com `item-form`**, e recomendo que entre junto com a rodada de tradução | Feeds em B: 4 para 12 de 17; erros grosseiros 9 para 4; suíte 242 de 243 | Degrau em 8 itens; LessWrong; a correção da página inteira foi feita depois de B |
| `item-form` revisada | Entra **com** `lists` | Tecido dos feeds em B: 7 com `lists` sozinha, 11 com as duas | Limiar e fatia de telões vistos em 44 feeds; só atua em `feed` |
| `avatars` | Entra **com** `lists` (deixa de ser opcional) | Decide o Discourse em B; sozinha o transforma em lâminas | Lê só o endereço da imagem |
| Tipar diretórios | Não entra | Seção 6 | |
| `majority`, `nesting`, `image-led`, `cards`, `dialogs`, mínimo de 6 itens, `softMix` para feeds, primeira e segunda versões | Não entram | Estudo anterior e seções 4 e 5 | |
| `wrappers`, `rhythm`, `extent`, `decorative` | Rodada de tradução | Dependem dos tecidos | |

**Por que não incorporar o pacote de listas já.** Ele está certo como leitura e é praticamente tão estável quanto o baseline. Mas hoje ele entrega as páginas reconhecidas a uma tabela de tecidos em que catálogo é campo de cubos e território de controles é praça vazia. Em páginas novas isso dá ganhos claros onde o baseline tinha um "pricing" falso e custos onde a leitura correta cai num tecido fraco. Entrando junto com o primeiro tecido melhorado, o ganho de leitura aparece como ganho de cidade. Se você preferir fidelidade primeiro, o pacote pode entrar sozinho sem quebrar nada: a suíte passa e nenhuma cidade boa do benchmark se perde.

**O que precisa acontecer na incorporação**, quando você aprovar:

1. trocar a chave `faq` por `feed` na verificação do lobste.rs em `scripts/program/check.ts`;
2. regravar os instantâneos de referência que dependem das 17 páginas do benchmark que mudam;
3. remover do código as flags que não entram, com seus ramos;
4. tirar o rótulo do lobste.rs do backlog do `PIXEL_FOUNDATION_V1`. Craigslist (`features`) e Guardian continuam lá.

## 8. Airbnb: sem exceção

Mantido como você decidiu. No candidato final as quatro fileiras são catálogos com preço e viram grid; nenhuma regra recupera as torres. Duas coisas que a rodada acrescenta:

- não é um caso isolado: books.toscrape, Hiut e o sandbox da Oxylabs têm a mesma leitura e o mesmo resultado, então o tecido de catálogo é um problema de classe, não de página;
- a leitura do Airbnb é frágil pelo degrau dos 8 itens (seção 5). Isso também se resolve na tradução: se a diferença visual entre "catálogo" e "vitrine" deixar de ser total, cair de um lado ou do outro com 7 ou 8 itens deixa de trocar a cidade.

## 9. Proposta para a rodada de tradução geométrica

### 9.1 O que esta rodada mediu sobre o limite

- **Uma cidade é quase sempre um tecido só.** 110 das 135 cidades do baseline têm metade do solo ou mais em um único tecido (quadras 34, torres 30, sobrados 18, grid 16, praça 6, lâminas 5). Com a final são 101 (quadras 40, sobrados 28, torres 17, grid 7, praça 6, lâminas 2).
- **O kit tem famílias que nunca são construídas.** Das 15 famílias de edifício implementadas, 11 aparecem nas 30 cidades do benchmark. `apartments`, `stepped`, `narrowTower` e `shed` não aparecem em nenhuma. Três famílias (`walkup`, `corner`, `rows`) são 75% dos edifícios.
- **A quantidade de edifícios não segue a quantidade de itens.** O território tem o tamanho da fatia da página, não da lista. O HN tem 30 itens em 242 lotes e vira umas 420 casas (estimativa, a 28 unidades por quadra): cada história é construída umas 14 vezes. Uma lista do Gutenberg tem 100 itens em 39 lotes. Itens por lote: mediana 0,25 nos sobrados (de 0,10 a 0,58) e 1,5 nas lâminas. As unidades por fileira saturam em 6 com 21 itens.
- **A variação dentro de um tecido é sorteio.** Em `rows`, a largura de cada casa é sorteada entre 0,8 e 1,2 e os andares em mais ou menos 1,5 (`buildings.ts:589` e `:600`). No grid, nove células idênticas. Nas lâminas, três barras idênticas.
- **O conteúdo tem variação para dar, mas não em todo lugar.** Dispersão do tamanho dos itens de uma lista (desvio sobre a média):

| Tipo de lista | Dispersão | Exemplos |
| --- | --- | --- |
| Feed de posts | 0,44 a 1,17 | Bluesky 0,44; Kottke 0,64; Mastodon 0,79; Schneier 1,17 (de 177 a 12.279 caracteres) |
| Feed de manchetes | 0,14 a 0,52 | lobste.rs 0,14; HN 0,35; Pinboard 0,52 |
| Diretório | 0,17 a 0,28 | Gutenberg, CNN lite |
| Catálogo | 0,01 a 0,08 | Airbnb, books.toscrape, Hiut, GOG |

  Altura tirada do tamanho do item tem sinal forte nos feeds e **nenhum nos catálogos**: cartões de produto são todos iguais. O protótipo `rhythm` do estudo não podia melhorar o grid, e agora sei por quê.
- **Aplicativos têm anatomia, só que não é de itens.** Os 15 territórios interativos medidos têm de 4 a 115 controles (mediana 13) em 0 a 10 grupos. A praça constrói no máximo dois quiosques por quadra, com 7 controles ou com 115.

### 9.2 Alternativas

Cada uma atrás de uma flag, isolada, sem família nova de geometria.

**T1. A unidade é o item (sobrados).** Trocar os dois sorteios de `rows` pela série de itens: a k-ésima casa tem largura e andares tirados do tamanho do k-ésimo item, relativos à mediana, na mesma amplitude de hoje.

- Efeito esperado: lista de itens iguais vira rua regular; lista desigual vira rua acidentada. O HN (0,35) ganha um ritmo próprio; o lobste.rs (0,14) fica mais regular.
- Onde: `buildings.ts`, caso `rows` (duas linhas); um campo novo em `Program`; `compose.ts` passa a série.
- Custo: pequeno, cerca de 25 linhas. Mexe em massing e composição, que são congeladas.
- Risco: listas uniformes ficam menos "vivas" que com sorteio. É fidelidade, e pode parecer pior.
- Validação: cidades sem lista idênticas em `?flat=1`; correlação entre dispersão dos itens e dispersão das alturas, hoje perto de zero.

**T2. Grão pela contagem.** Unidades por fileira a partir de itens por lote, não da contagem bruta: HN (0,12 por lote) com casas largas, Pinboard (0,5) médias, Gutenberg (2,6) estreitas.

- Onde: `compose.ts:149` e `:227`, mais os lotes do território no contexto.
- Custo: pequeno, cerca de 10 linhas.
- Risco: **muda o HN, o lobste.rs e o Paul Graham**, que são cidades boas. Precisa do seu olho antes de qualquer outra coisa.
- Validação: unidades por fileira monótonas em itens por lote; prancha com HN, Paul Graham, lobste.rs, Pinboard, Gutenberg lado a lado.

**T3. Altura pelo que o item diz (quadras).** Nos feeds de posts, os andares vêm do tamanho mediano do item e não da fatia do território. Schneier e Mastodon ficam mais altos que Bluesky.

- Onde: `compose.ts:215`.
- Custo: pequeno.
- Risco: cria uma segunda fonte de altura além da mídia. É o que faltava para poder mexer no limiar de mídia sem achatar a cidade, e também pode produzir cidades pesadas.
- Validação: q90 das alturas correlacionado com o tamanho mediano do item entre feeds.

**T4. Catálogo (grid).** Como os itens são iguais, a expressão tem que vir de contagem, agrupamento e térreo, não de altura. Três alternativas a prototipar lado a lado:

- G-a, células pela contagem: de 2×2 lojas grandes (8 anúncios em 40 lotes) a 4×4 bancas (48 jogos em 80 lotes). Custo mínimo. Continua sendo uma malha.
- G-b, rua de comércio: a geometria de `rows` com térreo de loja e toldo por unidade, ao redor de uma praça pavimentada no lugar do quintal. Cada fileira de carrossel vira uma rua. Reusa `groupedParcelled`. Risco: confundir-se com feed, se toldo e praça não forem legíveis na escala da cidade.
- G-c, mercado coberto: um `shed` no miolo da quadra com anel de bancas. É a única que muda a silhueta. Risco: `surface.ts` trata `shed` como industrial, e o programa precisa virar comercial.
- Páginas de teste: Airbnb, books.toscrape, Hiut, GOG, Oxylabs, IKEA.
- Custo: 30 a 40 linhas cada.
- Validação: num conjunto de pranchas sem rótulo, dá para separar os catálogos dos feeds? Nenhum grupo de mais de 9 volumes idênticos visível.

**T5. Praça que representa a aplicação (interativo).**

- I-a, praça com arcadas: o vazio central é a superfície de trabalho; cada grupo de controles vira uma arcada num lado, e a quantidade de controles vira quiosques. Reusa o anel de lâminas com arcada que a composição de navegação já constrói.
- I-b, oficina: um `shed` com pátio. Dá identidade de "ferramenta", com menos ligação à anatomia.
- Páginas de teste: ray.so (17 controles, 3 grupos), Squoosh (7, 2), regex101 (29, 1), Desmos (68, 5), Steam (85, 10), LessWrong (115, 3).
- Custo: cerca de 30 linhas para I-a.
- Validação: fatia construída de uma cidade dominada por interativo; número de arcadas igual ao de grupos; ray.so e Desmos distinguíveis.
- Destrava `wrappers`, que ficou de fora do estudo só porque o ray.so corrigido virava praça vazia.

**T6. Lâminas de índice.** Aplicar T1 às barras (altura e comprimento pela série de itens) e usar os títulos como divisão entre blocos. Só depois disso vale reabrir a tipagem de diretórios.

**T7. Extensão.** Refazer com o solo vago em anel no perímetro e só abaixo de um limiar, para não pôr gramado no primeiro plano.

### 9.3 Ordem que recomendo

1. **T1 e T2 juntas**, porque dividem a mesma costura e alcançam o tecido mais comum. Começar pela prancha de T2 no HN, que é a decisão de maior risco visual.
2. **T4**, porque é o que tem custo conhecido hoje (Airbnb e os outros catálogos) e o que torna a incorporação do pacote de listas um ganho líquido.
3. **T5**, que resolve LessWrong e ray.so e libera `wrappers`.
4. **T3**, depois que T1 mostrar como a altura por conteúdo se comporta.
5. T6 e T7.

### 9.4 Como validar, pelos três critérios juntos

- **Fidelidade estrutural.** Cada alternativa declara antes o sinal de conteúdo e a grandeza geométrica que ele deve mover, e mede a relação nas 135 páginas. Sem relação medida, é variação arbitrária.
- **Identidade morfológica sem cor.** Avaliar em `?flat=1`, que tira paleta e superfície. Proposta de teste: trincas de cidades (duas da mesma estrutura, uma de outra) em que a diferente tem que ser apontada só pela forma. Hoje HN, MDN e Paul Graham são indistinguíveis no flat.
- **Qualidade visual.** Pranchas fixas com a mesma câmera, julgadas por você. Como guarda: nenhuma cidade boa do benchmark muda sem estar listada; nenhum campo de volumes idênticos maior que o de hoje; solo aberto dentro da faixa atual.
- **Rigor.** Baseline congelado no estado em que a rodada começar; as 135 páginas como conjunto de regressão; um terceiro conjunto de páginas nunca vistas para qualquer limiar novo, capturado depois de congelar; estabilidade com as mesmas quatro perturbações; a suíte congelada rodada com a flag ligada.

Diversidade numérica entre cidades não entra como critério. Nesta rodada ela caiu de novo quando a leitura melhorou (distância média no benchmark de 0,446 para 0,415), enquanto as cidades passaram a se agrupar melhor por estrutura (vizinho mais próximo em outra família: 21 de 30 para 15 de 30).

## 10. Limitações

- As expectativas são minhas, uma por página, e pelo menos três estavam erradas sobre a página (NPR, a categoria do IKEA, a página de notícias do Changelog). Contei todas como erro.
- B não é mais intocado para as três mudanças feitas depois dele. Um terceiro conjunto seria a confirmação limpa da versão final.
- A estabilidade foi medida no plano. Não medi quanto a geometria se move.
- O julgamento visual é meu, numa câmera, numa hora do dia, numa semente.
- Das 107 páginas que tentei capturar, 18 recusaram. O conjunto novo está enviesado para sites que aceitam um leitor sem navegador.
- Não fotografei 39 das 84 páginas novas (as que mudam menos de um décimo do solo).

## Arquivos

Código atrás de flags, tudo desligado por padrão:

- `src/lib/semantics/analyze.ts`: `lists2`, `whole`, `nodir`, `narrow`, `min6`, `amount`.
- `src/lib/pixelcity/kit/plan.ts`: `item-form2`, `item-form3`, `feed-soft`; emissão do hero ao lado de uma lista.
- `src/lib/semantics/experiments.ts`: registro.

Candidato final: `coverage,lists2,whole,nodir,transient,item-form3,avatars`.

Ferramentas novas em `scripts/morphology/`: `holdout-set.ts` (páginas e expectativas), `capture.ts`, `holdout.ts`, `stability.ts`, `perturb.ts`, `prose.ts`, `fabrics.ts`, `why.ts`, `with.ts`.

Evidências em `docs/morphology/`: `final.json`, `stability.json`, `stability.txt`, `holdout/results.json`, `holdout2/results.json`, os registros de captura e as pranchas `round-*.jpg`. Os snapshots e as fotos individuais ficam fora do git.

Para reproduzir:

```bash
npx tsx scripts/morphology/holdout.ts b
```

```bash
npx tsx scripts/morphology/stability.ts quick
```

```bash
npx tsx scripts/morphology/with.ts coverage,lists2,whole,nodir,transient,item-form3,avatars scripts/program/check.ts
```

## Notas de execução

- Removi os comentários que eu tinha adicionado ao código ainda não commitado (156 linhas, das duas etapas anteriores e desta), porque o seu código no repositório não usa comentários.
- Rodei `git stash` seguido de `git stash pop` uma vez, para conferir a formatação de um arquivo no HEAD. Não deveria: a regra é não mexer no git. Conferi que a pilha de stash está vazia, que os 34 arquivos alterados continuam alterados e que o candidato reproduz a mesma medição de antes.
- O servidor de desenvolvimento usado para as fotos foi encerrado e os `AGENTS.md` e `CLAUDE.md` que ele cria na raiz foram apagados.
