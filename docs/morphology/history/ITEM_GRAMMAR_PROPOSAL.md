# Gramática pelos itens: diagnóstico e proposta

12/10/2026, branch `morphology/consolidation`, sem commit. Continua [URBAN_PLAN_PROTOTYPE.md](URBAN_PLAN_PROTOTYPE.md). É diagnóstico e proposta.

> **Pranchas.** As pranchas deste relatório não estão mais na pasta ativa. Reconstruções reduzidas, feitas a partir das fotos que restaram, estão em `historical-sheets-2026-10-12.tgz` (arquivada); o nome de cada arquivo aparece ao lado da citação.

> **Resultado.** O protótipo foi construído e avaliado no mesmo dia. A identidade aparece, e a composição sai mecânica: recomendação de revisar, sem incorporar. Ver [ITEM_GRAMMAR_PROTOTYPE.md](ITEM_GRAMMAR_PROTOTYPE.md).

## Resumo

1. **O gerador já descreve os itens de cada território, de quatro jeitos parciais, e quase nada disso chega à forma.** A anatomia do item (quantos, com quanto texto, links e imagens cada um) é calculada e reduzida a um único bit. O número de casas por fileira vem de um campo que não tem relação com a contagem real: 215 itens no Paul Graham viram 2 casas por fileira, 30 no Hacker News viram 6.
2. **O tecido é escolhido pelo que o conteúdo é feito, nunca por como ele está disposto.** Texto, links, imagens e controles decidem a receita. Pilha, faixa, grade e teclas não decidem nada. Por isso seis páginas de mídia com estruturas diferentes recebem a mesma quadra: torre e anexo.
3. **A receita decide duas coisas de uma vez:** qual é a unidade e como as unidades se juntam, com contagens fixas por peça. Não há onde a estrutura do conteúdo entrar.
4. **Dois números medidos separam os arranjos:** itens por fileira e tamanho da unidade. Com o agrupamento, dão cinco arranjos: pilha, faixa, grade, teclas e blocos.
5. **Proposta:** separar três decisões que hoje estão fundidas no tecido. O **conteúdo** escolhe o programa do edifício, como hoje. O **arranjo** dos itens escolhe a composição da quadra. O **grupo** vira um conjunto com cabeceira e limite. Tudo com as peças do kit que já existem.
6. **Custo previsível:** nos carrosséis de cartões pequenos (Spotify, Airbnb) o resultado fiel é uma rua baixa de frentes iguais, sem o campo de torres. É a consequência mais parecida com a H2, e está dita antes.
7. **Dependência:** o conteúdo da unidade se lê do DOM (49 de 53 territórios), o arranjo não (30 de 53). O arranjo precisa do passe de layout, que hoje só existe localmente.

Esquema, a partir dos números medidos e não da cidade renderizada: um grupo na página, a quadra de hoje e a quadra pela estrutura dos itens (`item-grammar-sketch.jpg`, no arquivo).

## 1. Como o gerador representa itens e grupos hoje

| Descritor | O que guarda | Quem lê | O que chega à geometria |
| --- | --- | --- | --- |
| `Region.items` e `Territory.repeat` | Os itens de uma região tipada, cortados entre 5 e 60 conforme o tipo; zero em território não tipado | `compose.ts` e `brief.ts` | Casas por fileira, de 2 a 6, e a escolha da família `rows` |
| `Territory.items` (`ItemForm`) | A série dominante: contagem, forma (`ul > li`), caracteres, links, imagens e controles por item, quantos têm título | `simpleIndex()` | Um bit: se é "índice simples", o uso do edifício vira institucional |
| `Territory.structure` | Grupos abertos por títulos ou por listas irmãs: fatia, itens, caracteres, nível, seção | `planFrontage()`, só em sobrados | Passagens entre trechos de fachada. Nível, seção e caracteres não são lidos |
| `Territory.metrics` | Caracteres, links, imagens, controles, tabelas | `softMix()` | A mistura de tecidos, por proporções. Depois é descartado |
| `NNode.cluster` | Itens repetidos além do 20º (ou do 8º) viram um nó só | Todos | O tamanho de cada item some |

São quatro descrições sobrepostas do interior de um território, nenhuma geométrica, cada uma consumida por uma regra estreita.

A contagem que chega à geometria, contra a contagem real:

| Página | Itens na série | `repeat` | Casas por fileira |
| --- | --- | --- | --- |
| Hacker News | 30 | 30 | 6 |
| lobste.rs | 25 | 8 | 3 |
| Paul Graham | 215 | 0 | 2 |
| craigslist | 323 | 0 | 2 |
| MDN | 247 | 1 | 2 |
| Spotify | 96 | 16 | 5 |

O `ItemForm` acerta a contagem nas seis. O que desenha as casas é o `repeat`, que depende de a região ter sido tipada e de qual corte o tipo aplica.

## 2. Onde geometria e hierarquia deixam de influenciar

Quatro pontos, em ordem.

**A escolha do tecido.** `softMix()` olha proporções: imagens por mil caracteres, links por cem caracteres, controles contra links, fração em tabelas. A tabela `BY_KIND` fixa o resto. Nenhuma das duas sabe se os itens estão empilhados, lado a lado ou em grade.

**A receita por peça.** `composePiece()` recebe a peça, o território e o tecido. Cada tecido é um par fixo de unidade e arranjo:

| Tecido | Unidade | Arranjo numa quadra inteira |
| --- | --- | --- |
| Sobrados | Casa em fileira | 4 fileiras e 4 esquinas em volta de um quintal |
| Mídia | Torre com pódio | 1 torre e 1 anexo numa praça |
| Grade | Sobrado comercial | 9 cubos, 3 por 3 |
| Quadras | Bloco | 1 quadra perimetral |
| Índice | Lâmina baixa | 3 barras paralelas |
| Praça | Quiosque | 2 quiosques numa praça |

Os arranjos existem. O que falta é a página poder escolher entre eles e dar os parâmetros.

**A variação.** Dentro de uma fileira, a largura de cada casa (0,8 a 1,2), os andares (mais ou menos 1,5), o tipo de telhado, a cor da parede, o toldo e a placa são sorteados pela semente. É a textura de que o Hacker News é feito, e nenhuma parte dela vem do conteúdo.

**A hierarquia.** O nível do título de um grupo é calculado e não é lido. O tamanho do título na tela, de 0 a 72 px, não entra em lugar nenhum. O único marco depende de um bloco de abertura.

## 3. O que os dados medidos mostram

Nas 22 páginas medidas há 77 territórios com 16 lotes ou mais. Em 54 deles a série que o próprio plano escolhe tem itens com caixa, e eles cobrem 74% desses lotes.

| Página | Tecido hoje | Unidade na tela | Por fileira × fileiras | Grupos | Título / corpo |
| --- | --- | --- | --- | --- | --- |
| Hacker News | Sobrados | 700×19 | 1 × 30 | 1 | sem título / 13 px |
| lobste.rs | Sobrados | 946×59 | 1 × 25 | 1 | 32 / 16 |
| GOV.UK | Sobrados | 610×109 | 1 × 16 | 1 | 36 / 19 |
| craigslist | Sobrados | 287×15 | 1 × 8 | 36 | 13 / 13 |
| GitHub, arquivos | Índice | 902×41 | 1 × 20 | 1 | sem título / 14 |
| Python docs | Quadras | 800×351 | 1 × 9 | 1 | 32 / 16 |
| Spotify | Mídia | 168×212 | 8 × 1 | 8 | 24 / 16 |
| Airbnb | Mídia | 180×240 | 8 × 1 | 1 por território | 14 / 12 |
| IKEA | Mídia | 232×434 | 3 × várias | 1 | 40 / 16 |
| Pinterest | Mídia | 273×276 | 5 × várias | 1 | sem título |
| Apple | Mídia | 702×580 | 2 × 3 | 1 | 56 / 17 |
| Excalidraw | Mídia | 36×36 | 13 × 1 | 3 | sem título |

Três leituras:

- **As seis páginas de mídia são seis estruturas.** Faixa de 8 cartões pequenos, grade de 3 retratos altos, grade de 5 quadrados, 2 painéis grandes por fileira, 13 teclas. Hoje recebem a mesma receita.
- **As listas também diferem, em duas coisas:** a altura da linha (15, 19, 41, 59, 109 px) e o agrupamento (uma lista de 30 contra 36 listas de 8).
- **Itens por fileira e tamanho da unidade bastam para separar os arranjos.** Não precisei de classe CSS, de palavra nem de domínio.

**O que o DOM sozinho dá.** Comparando a classe medida com a que sairia só do `ItemForm`:

| | Concorda |
| --- | --- |
| Se a unidade tem imagem ou não | 49 de 53 |
| O arranjo e o porte (linha, cartão, retrato, tecla, bloco) | 30 de 53 |

Os erros são sempre os mesmos: itens de texto dispostos vários por fileira (10 casos), seções grandes com imagem tomadas por cartões (6) e teclas tomadas por linhas. E a proporção da imagem não se salva pelo HTML: só 28% das imagens têm largura e altura declaradas.

**Qual é o item.** As séries se aninham, e a escolha do nível muda o resultado. Na IKEA, o `ItemForm` escolhe as seções de 1344×781 e a região guarda os produtos de 232×434. No craigslist há os links de 287×15 e, acima deles, as colunas de 337×800. No Airbnb, um seletor ingênuo pega as linhas de texto de dentro dos cartões. Qualquer gramática precisa de uma regra explícita para isso.

## 4. A proposta

**Princípio:** separar o que hoje o tecido decide sozinho.

| Decisão | Hoje | Proposta | De onde vem |
| --- | --- | --- | --- |
| **Programa** do edifício: térreo, fachada, letreiro, uso | Tecido | Conteúdo da unidade: texto, imagem, controle | DOM, como hoje |
| **Arranjo** das unidades na quadra | Tecido | Itens por fileira e fileiras por grupo | Layout medido |
| **Proporção** da unidade | Fatia do território, mais sorteio | Proporção e tamanho do item | Layout medido |
| **Conjunto**: onde um grupo começa e acaba, e o que o encabeça | Só passagens, só em sobrados | Um conjunto por grupo, com cabeceira pelo título | DOM e layout |

### Os cinco arranjos

| Arranjo | Estrutura na página | Composição na quadra | Peças do kit |
| --- | --- | --- | --- |
| **Pilha** | 1 por fileira, item largo e baixo | Fileiras ao longo das faces, como hoje | `rows`, `corner`, `planFrontage` |
| **Faixa** | Vários por fileira, 1 fileira por grupo | Uma rua de frentes iguais numa face, quintal atrás | `rows` ou `walkup` com largura calculada, `yard` |
| **Grade** | Vários por fileira, várias fileiras | Módulos soltos em malha, com passagens | `walkup` ou `narrowTower`, a malha do tecido de grade |
| **Teclas** | Itens de até 72 px em fileira | Quiosques na borda de uma praça | `kiosk`, `plaza`, `stalls()` |
| **Blocos** | 1 por fileira, item alto | Quadra perimetral, como hoje | `courtyard`, `lshape` |

Não é uma lista de famílias novas. São regras de como juntar as que existem, com parâmetros que hoje são fixos.

### As regras

- **Cadência.** Itens por fileira viram frentes por face da quadra, com teto. Oito cartões por fileira dão oito frentes estreitas; dois dão duas largas.
- **Proporção.** A proporção do item é a proporção da frente: um retrato de 232×434 dá um módulo esguio e alto; um quadrado de 273×276, um cubo. O tamanho na tela decide o porte: cartões pequenos fazem tecido miúdo e baixo, painéis grandes fazem blocos.
- **Programa.** Unidade com imagem leva a fachada e o letreiro de mídia de hoje. Texto leva porta e loja. Controle leva quiosque.
- **Conjunto.** Cada grupo ocupa peças contíguas no percurso, até onde couber. O projeto já tem esse passo: `kit/layout.ts` distribui grupos pelas peças e dobra os que não cabem num vizinho.
- **Cabeceira.** O primeiro edifício do conjunto cresce com a razão entre o título e o corpo do texto. Sem título, sem cabeceira.

### As seis perguntas

**Distinguir listas, grades, cartões, controles e conteúdo editorial sem regra por site.** Por três medidas independentes: conteúdo da unidade (do DOM), itens por fileira e tamanho da unidade (do layout). Nenhuma olha nome, classe ou domínio. O ganho sobre hoje é parar de inferir disposição a partir de conteúdo: um catálogo deixa de depender de aparecer um preço.

**Preservar agrupamento e repetição sem um edifício por item.** O item define o **tipo** de módulo e a cadência, não a quantidade de edifícios. A área continua vindo da importância. Dentro dela o módulo se repete até preencher, como textura, que é o que o Hacker News faz. O grupo é preservado como conjunto, contado até o limite da malha.

**Contraste sem sorteio cosmético.** Todo parâmetro novo sai de uma medida: cadência, proporção, cabeceira, número de conjuntos. Dois conjuntos diferem quando seus itens diferem. O sorteio que já existe dentro de uma fileira fica como está; não acrescento nenhum.

**Territórios dominantes.** Um território de 95% é uma sequência de conjuntos quando a página tem grupos: o Spotify tem 8, o craigslist 36. Quando não tem (Hacker News, Paul Graham), a cidade é homogênea, e isso é fiel.

### Transformações necessárias

1. **Leitura.** Uma função que devolve a série do território com os nós, e não só as médias. O `itemsOf()` já faz a seleção; falta expor os nós e uma regra de nível: a série mais fina de caixas uniformes que cobre a maior parte da área.
2. **Plano.** Um descritor único, `Territory.series`: itens por fileira, fileiras, proporção e tamanho da unidade, conteúdo, grupos com seus títulos, e se foi medido ou estimado. Substitui, para a composição, os papéis espalhados de `repeat`, `items` e `structure`.
3. **Layout de território.** Generalizar o `kit/layout.ts` de "fórum" para qualquer território com série: peças para conjuntos, papel de cabeceira ou corpo.
4. **Composição.** Um compositor por arranjo no lugar da receita por tecido, só para os territórios governados. As receitas de hoje continuam como definição de pilha e de blocos e como retorno quando não há medida.

## 5. O que mudaria visualmente

Previsão a partir do esquema. As alturas saem de uma regra de esboço: altura da frente igual à largura dividida pela proporção do item.

| Página | Hoje | Pela estrutura | O que se veria |
| --- | --- | --- | --- |
| Hacker News, lobste.rs | Fileiras | Pilha | Nada |
| Python docs, Wikipedia | Quadra perimetral | Blocos | Nada |
| Spotify | Torre e anexo | 8 ruas de 8 frentes, cada uma com cabeceira | Tecido baixo e regular, 8 acentos. **Perde o campo de torres** |
| Airbnb | Torre e anexo | Ruas de 8 frentes, sem cabeceira (o título tem 14 px) | Como o Spotify, mais plano |
| IKEA | Torre e anexo | Grade de 3 módulos esguios por fileira | Mantém altura, com três torres finas por face |
| Pinterest | Torre e anexo | Grade de 5 cubos por fileira | Malha miúda e baixa |
| Apple | Torre e anexo | 2 blocos grandes por fileira, cabeceira alta | Poucos volumes grandes |
| Excalidraw | Torre e anexo | Quiosques na borda de uma praça | Deixa de ser cidade de torres; vira palco |

Das seis cidades de mídia, hoje com uma receita, sairiam quatro formas: rua baixa (Spotify, Airbnb), torres finas (IKEA), malha de cubos (Pinterest), blocos grandes (Apple), além do palco (Excalidraw). Spotify e Airbnb continuariam gêmeas, porque são a mesma estrutura.

## 6. Riscos de regressão

| Risco | Tratamento |
| --- | --- |
| **Repetir a H2 nas faixas.** Rua baixa com uma cabeceira por grupo se parece com "uma torre por grupo e pavilhões" | A diferença: a rua é contínua e tem a cadência da página, e nas grades o resultado é outro. Se nas faixas a cidade se ler como campo, o arranjo de faixa não entra e a decisão é sua |
| **Spotify e Airbnb perdem a silhueta** | É consequência da regra, não defeito de implementação. Só se julga na cidade renderizada |
| **Outro campo.** Todo protótipo de tecido até aqui virou campo | Aqui a repetição tem cadência e conjunto medidos. O critério de aceite pede formas diferentes entre páginas, não só uma forma nova |
| **Nível do item errado.** Seções no lugar de produtos, linhas no lugar de cartões | Regra explícita de nível, com teste nos casos conhecidos (IKEA, Airbnb, craigslist) |
| **Degrau entre arranjos.** 1 ou 2 por fileira troca pilha por grade | Faixa neutra e o teste de um item a mais ou a menos |
| **Controles** | Pilha e blocos usam as receitas de hoje sem mudança. Hacker News, Paul Graham e Python docs saem idênticos por construção |
| **Peças irregulares.** A alocação corta quadras em meias, quartos e lotes | Cada arranjo precisa de uma versão por tipo de peça, como as receitas de hoje têm |

## 7. Dependências

- **O arranjo precisa de layout.** Sem o passe de medição, só o conteúdo é confiável, e a gramática cai nas receitas de hoje. Em produção nada muda enquanto a captura for estática. É a mesma dependência da proposta anterior, agora com um consumidor que usa o que se mede.
- **Não depende da poda.** A gramática lê os itens que têm caixa. O conteúdo oculto continua pesando na área, como hoje.
- **Decisões mantidas:** área por importância, mesma extensão, mesma câmera, nenhuma regra por site.

## 8. O menor protótipo que valida

**Escopo.** Só os arranjos novos (faixa, grade, teclas) e só nos territórios que hoje são de mídia ou de grade. Pilha e blocos ficam com as receitas atuais.

| Parte | O que é | Tamanho estimado |
| --- | --- | --- |
| Série com nós e regra de nível | Em `items.ts` | cerca de 70 linhas |
| `Territory.series`, quando o snapshot é medido | Em `plan.ts` | cerca de 30 linhas |
| Conjuntos por grupo | Reuso de `layout.ts` | cerca de 30 linhas |
| Três compositores de arranjo | Em `compose.ts` | cerca de 120 linhas |
| Chave | Um nome, só na visão de desenvolvimento | 1 flag |

**Páginas.** As 22 já medidas, cada uma renderizada com e sem a chave, do mesmo snapshot. Mudança esperada em Spotify, Airbnb, IKEA, Pinterest, Apple e Excalidraw.

**Critérios de aceite.**

1. Hacker News, Paul Graham, lobste.rs e Python docs idênticos peça por peça.
2. Na cidade inteira, as seis páginas de mídia mostram pelo menos quatro formas distinguíveis, e cada uma se explica apontando para a página.
3. As gêmeas próximas entre essas seis caem para um par (Spotify e Airbnb).
4. A correlação entre a diferença das páginas e a distância das cidades sobe em "itens por fileira" (hoje 0,31) e em "forma do item" (0,18).
5. Um item a mais ou a menos não troca o arranjo.
6. Nenhuma das seis fica pior que hoje, no seu julgamento.

**Como ler um fracasso.**

- **Arranjos saem como no esquema e as cidades se leem como campos parecidos:** a hipótese está refutada nesta malha. Estrutura do item não basta para compor, e eu paro.
- **Arranjos não saem como no esquema:** a implementação não testou.
- **Passa em grade e teclas e falha em faixa:** a ideia vale em parte, e as faixas ficam com a receita de hoje.

## 9. O que preciso de você

1. **Aprovação para o protótipo** com esse escopo.
2. **Faixas.** A regra fiel deixa Spotify e Airbnb baixos. A alternativa é dar à cabeceira a altura que a torre tem hoje, o que preserva silhueta e aproxima o resultado da H2. Recomendo testar a regra fiel e decidir olhando a cidade.
3. **Listas depois.** A altura da linha e o agrupamento das listas estão medidos e ficaram de fora de propósito, para manter os controles. Entrariam numa segunda etapa, só se a primeira convencer.

## Estado do código

- **Removido do código ativo:** a alocação espacial, a moldura dos territórios, o solo aberto, a flag `layout` e o gancho da poda no normalizador.
- **Mantido como instrumento, sem uso no produto:** o passe de medição da captura local, as caixas no snapshot e no modelo, o escopo de cada território quando o snapshot é medido, a função de poda e `scripts/morphology/layout-capture.ts`.
- **Verificado depois da limpeza:** lint e typecheck passam; as 248 capturas de referência geram cidades idênticas às do último commit; 256 verificações e as 22 da captura renderizada passam.
- **Arquivado:** os scripts e os números deste estudo em `docs/morphology/archive/item-grammar-study-2026-10-12.tgz`.

## Limitações

- 22 páginas, medidas num dia, numa máquina.
- O esquema é um desenho a partir de números; as alturas vêm de uma regra de esboço e podem mudar.
- Os limiares que separam os arranjos (72 px para tecla, proporção 3 para linha) foram escolhidos olhando estes dados e ainda não foram testados em páginas novas.
- Os números da tabela da seção 3 vêm de dois seletores de série diferentes, porque nenhum acerta o nível em todas as páginas. Isso é parte do problema descrito.
