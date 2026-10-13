# Gramática pelos itens: resultado do protótipo

12/10/2026, branch `morphology/consolidation`, sem commit. Testa a proposta de [ITEM_GRAMMAR_PROPOSAL.md](ITEM_GRAMMAR_PROPOSAL.md) nos arranjos faixa, grade e teclas, em 22 páginas, contra o baseline dos mesmos snapshots.

> **Continuação.** A revisão sugerida aqui, o arranjo como restrição sobre a receita, foi prototipada no mesmo dia: ver [ITEM_ENSEMBLE_PROTOTYPE.md](ITEM_ENSEMBLE_PROTOTYPE.md).

## Recomendação

**Revisar; não incorporar.**

- **A separação entre conteúdo, arranjo e grupo funciona como fonte de identidade.** Cinco cidades de mídia que hoje são o mesmo campo de torres passam a ter cinco massas diferentes, e a diferença se vê sem cor e sem letreiro.
- **A regra de composição não funciona como cidade.** Onde a página é regular, a quadra sai mecânica: trios de torres iguais, matriz de cubos, praça vazia com quiosques. É o diagrama tridimensional da página que você pediu para evitar.
- **O saldo estético é negativo.** Das 9 cidades que mudam, 4 pioram, 2 trocam de linguagem com perda de silhueta, 1 melhora e 2 quase não mudam.

O problema está, nesta ordem, na composição das quadras, nos limites do kit para módulos baixos e teclas, e só depois na classificação dos itens.

Pranchas, todas de cidades renderizadas nas mesmas condições:

- Cidade inteira: IKEA, Pinterest, Excalidraw (arquivada), Spotify, Airbnb, Guardian (arquivada), craigslist, GitHub, Apple (arquivada)
- Sem cor nem letreiro: 1 (arquivada) e 2 (arquivada)
- Aproximações das quadras afetadas: 1 (arquivada) e 2 (arquivada)

São as pranchas da rodada seguinte, refotografadas dos mesmos snapshots. As colunas `hoje` e `series` são as deste relatório; a terceira é o `ensemble`. As pranchas originais, de duas colunas, não existem mais.

## O que foi construído

| Parte | Onde | Tamanho |
| --- | --- | --- |
| Leitura da série: unidades com imagem e teclas, itens por fileira, grupos, título | `kit/series.ts`, novo | 105 linhas |
| Três arranjos | `compose.ts` | 78 linhas |
| Conjuntos e cabeceiras por grupo | `district.ts` | 34 linhas |
| Flag `series`, só na visão de desenvolvimento | `experiments.ts`, `plan.ts` | 8 linhas |

Regras respeitadas: nenhuma família nova, nenhum sorteio novo. Cada módulo recebe seu programa pelo mesmo `prog()` que as receitas de hoje já chamam por edifício; altura, largura, cadência e cabeceira saem dos números medidos.

Três desvios em relação à proposta, todos para evitar o resultado literal:

- **Faixa baixa tem dois lados.** A proposta dizia uma face e quintal atrás. Com uma face só a quadra ficaria 70% vazia; duas fileiras de frente para um calçadão se leem como rua.
- **Faixa alta fica numa esplanada, de um lado só.** Dos dois lados, a IKEA teria 55 torres.
- **Grade tem duas fileiras em volta de um pátio,** e não uma malha completa. Mesmo assim saiu matriz.

Territórios com menos de 8 lotes ficam com a receita de hoje, porque não há espaço para um arranjo. Foi o que manteve a Wikipedia idêntica.

O que a leitura detectou:

| Página | Lotes governados | Arranjo | Unidade | Por fileira | Grupos, título |
| --- | --- | --- | --- | --- | --- |
| Spotify | 197 | Faixa | 168×212 | 8 | 5, título 1,5× o corpo |
| Airbnb | 169 | Faixa (3 territórios), teclas | 180×247 | 7 | sem cabeceira, 1,17× |
| IKEA | 197 | Faixa em 154, teclas em 43 | 434×698 | 3 | 3, 2,0× |
| Pinterest | 156 | Grade | 91×91 | 4 | 1 |
| Excalidraw | 239 | Teclas | 36×36 | 18 | 1 |
| Guardian | 166 | Faixas e grades em 8 territórios | de 460×125 a 480×575 | 2 a 4 | títulos de 1,0× a 1,9× |
| craigslist | 41 | Grade | 256×256 | 6 | 1 |
| GitHub | 24 | Teclas | 32×32 | 6 | 2 |
| Apple | 15 | Grade | 702×580 | 2 | 1 |

## As cinco perguntas

### 1. IKEA, Pinterest, Apple e Excalidraw ganham identidades distintas?

Três das quatro ficam distintas. Nenhuma fica melhor.

- **IKEA: distinta, mecânica.** Trios de torres esguias numa esplanada. De perto é um conjunto elegante. Na cidade inteira os trios se repetem com a mesma altura, porque os cartões são todos do mesmo tamanho, e o que era um horizonte variado vira um padrão. Um quadrante inteiro vira praça com quiosques: são os 13 ícones de um widget de avaliação, que pesam 43 lotes.
- **Pinterest: distinta, pior.** Quatro cubos por fileira, duas fileiras por quadra, perto de cem cubos na cidade. É a matriz de cubos.
- **Excalidraw: distinta, deixa de ser cidade.** 180 quiosques em 15 praças. É fiel a uma barra de ferramentas sobre um palco vazio, e não é bonito nem interessante.
- **Apple: quase igual.** Só 15 lotes entram. Metade da cidade dela é o menu oculto, que a poda tiraria e que não foi incorporada; e as outras imagens não chegaram à captura.

### 2. Spotify e Airbnb perdem qualidade ou mudam de linguagem?

Mudam de linguagem, com uma perda real.

- **De perto, ganham.** Ruas de sobrados com vitrines e telhados variados ao longo de um calçadão arborizado. É um conjunto urbano coerente, e mais legível que a torre sozinha na praça.
- **De longe, perdem.** As fileiras paralelas viram listras. O topo do 9º decil cai de 11,7 para 5,7 no Spotify e para 5,5 no Airbnb, e a silhueta some. O Spotify guarda três cabeceiras; o Airbnb, nenhuma.
- **Continuam gêmeas,** como previsto: são a mesma estrutura.

### 3. Conjuntos coerentes ou padrões mecânicos?

Depende de a própria página variar.

| Caso | Resultado |
| --- | --- |
| Faixa baixa (Spotify, Airbnb) | Conjunto coerente: a rua comercial. O único arranjo que produz um tipo urbano |
| Faixa alta e uniforme (IKEA) | Conjunto legível, repetição mecânica |
| Grade (Pinterest, craigslist) | Padrão mecânico |
| Teclas (Excalidraw, GitHub, widgets) | Vazio |
| Muitos grupos com proporções diferentes (Guardian) | **O melhor resultado.** Alturas variadas, acentos esguios, quadras com caráter próprio. Mais interessante que a cidade de hoje |

O Guardian mostra o mecanismo funcionando: cada seção tem cadência, proporção e título diferentes, e a cidade herda essa variedade. Nas outras, a página é regular e a cidade herda a regularidade.

### 4. As diferenças sobrevivem sem cor e letreiro?

Sim, e é o resultado mais forte. Na vista sem cor, hoje, Spotify, Airbnb, IKEA, Pinterest e Excalidraw são cinco campos de torres indistinguíveis. No protótipo são cinco massas: fileiras baixas, trios de torres, matriz de cubos, praça vazia. A identidade não depende de paleta nem de letreiro.

### 5. Regressões

- **Controles: nenhuma.** Hacker News, Paul Graham, lobste.rs, Python docs e Wikipedia saem idênticos peça por peça com a flag ligada. Outras 8 páginas também.
- **Caminho padrão: intacto.** Com o protótipo presente e a flag desligada, as 248 capturas de referência geram cidades idênticas às do último commit. Lint, typecheck, 256 verificações e as 22 da captura renderizada passam.
- **craigslist perde as duas torres do centro.** Elas vinham da grade de 12 imagens, que agora vira módulos baixos.
- **GitHub perde um grupo de torres.** Os avatares dos colaboradores viram quiosques.

## Números

Uma ressalva antes: a medida de distância do projeto compara composição (tecidos, famílias, alturas, solo aberto). Ela diz se duas cidades são feitas de coisas diferentes, não se alguma é boa.

| | Hoje | Protótipo |
| --- | --- | --- |
| Distância média entre as seis páginas de mídia | 0,298 | 0,422 |
| Par mais próximo entre elas | Spotify e Excalidraw, 0,12 | Spotify e Airbnb, 0,18 |
| Distância média entre as 22 | 0,431 | 0,418 |
| Cidades com gêmea próxima | 3 | 3 |

As seis se afastam 42% entre si. O conjunto todo se aproxima 3%, porque as cidades de cartões pequenos passam a ser feitas de sobrados, como as de lista. A correlação entre itens por fileira e distância entre cidades cai de 0,31 para 0,19 pelo mesmo motivo: hoje "grade" quase sempre significava torre.

Alturas, como topo mediano e 9º decil:

| Página | Hoje | Protótipo | Edifícios |
| --- | --- | --- | --- |
| Spotify | 6,7 e 11,7 | 3,6 e 5,7 | 51 para 56 |
| Airbnb | 5,7 e 11,7 | 3,8 e 5,5 | 71 para 71 |
| IKEA | 6,7 e 12,2 | 1,0 e 10,7 | 45 para 68, dos quais 35 quiosques |
| Pinterest | 3,4 e 11,7 | 3,7 e 4,1 | 63 para 120 |
| Excalidraw | 6,2 e 11,2 | 0,7 e 1,0 | 38 para 184 |
| Guardian | 5,2 e 7,2 | 4,6 e 8,3 | 108 para 112 |

Estabilidade: com um item a menos na lista principal, o arranjo e a cadência se mantêm em Spotify, Airbnb, IKEA, craigslist e GitHub, e a cidade se move tanto quanto hoje (0,00 a 0,03). No Pinterest e na Apple um território pequeno de teclas aparece ou some; no Guardian dois territórios a mais passam a ser governados.

## Fidelidade e qualidade, cidade por cidade

| Cidade | Fiel à estrutura | Como cidade |
| --- | --- | --- |
| Guardian | Sim | Melhor |
| Spotify | Sim | Outra linguagem: melhor de perto, mais pobre de longe |
| Airbnb | Sim | Idem |
| IKEA | Sim nas torres; o widget de avaliação é ruído | Pior no conjunto: mecânica, com um quadrante vazio |
| Pinterest | Em parte: a unidade lida é a miniatura, não o cartão | Pior |
| Excalidraw | Sim | Pior |
| craigslist | Sim | Um pouco pior: perde o acento do centro |
| GitHub | Sim | Quase igual |
| Apple | Sim, em 15 lotes | Quase igual |

Fidelidade subiu em todas. Qualidade subiu em uma.

## Onde está o problema

**1. Na composição das quadras. É a causa principal.**

A regra que implementei faz um módulo por posição de item, com a proporção do item. Isso transfere a regularidade da página direto para a quadra. Uma grade é regular por definição, então a quadra sai como grade.

A riqueza do Skyline hoje não vem de módulos variados. Vem de receitas que **misturam** famílias dentro de uma quadra: torre com pódio e anexo assimétrico numa praça; quatro fileiras, quatro esquinas com torreão e um quintal. Os arranjos novos usam uma família por fileira e perdem essa mistura.

Em outras palavras, pus o arranjo no lugar da receita. O que os resultados sugerem é o arranjo como restrição sobre uma receita rica: a cadência decide quantos, a proporção decide quão esguio, o título decide a cabeceira, e a receita continua decidindo como os volumes se combinam.

**2. Nos limites do kit.**

- O módulo baixo e solto do kit é o `walkup`, um cubo. Não há peça entre ele e a torre que dê variedade a uma fileira de módulos iguais.
- O quiosque é pequeno demais para sustentar uma quadra. Um arranjo de teclas não tem com o que preencher 15 quadras.
- A quadra de 14 unidades comporta uma ou duas fileiras. Não há como expressar a diferença entre uma grade de 2 e uma de 8 fileiras.

**3. Na classificação dos itens. Contribui, não explica.**

- **Nível da unidade.** No Pinterest o cartão é uma colagem de três miniaturas, e a leitura para na miniatura.
- **Peso de widgets.** Os ícones de avaliação da IKEA e os avatares do GitHub são lidos corretamente como teclas, mas ocupam área demais. Isso é da área por peso do DOM, não desta leitura.
- **Apple.** O que limitou o teste foi o menu oculto, que é assunto da poda.

A classificação acertou os casos que mais mudaram (Spotify, Airbnb, IKEA, Excalidraw, Guardian). Os resultados ruins não vêm de leitura errada.

## O que fica de pé

- **A separação entre conteúdo, arranjo e grupo.** A identidade apareceu, e aparece na massa, não na cor.
- **A faixa baixa como rua.** É o único arranjo que virou um tipo urbano reconhecível.
- **O Guardian.** Quando a página tem grupos com estruturas diferentes, a gramática produz variedade com motivo.

O que não fica: a grade e as teclas como foram compostas, e a faixa alta e uniforme.

Não comecei nenhuma revisão. Não estendi para listas, tecidos novos nem outra hipótese.

## Estado do código

- **No diretório de trabalho, sem commit:** `kit/series.ts` e os ganchos em `compose.ts`, `district.ts`, `plan.ts` e `experiments.ts`, atrás da flag `series`, que só a visão de desenvolvimento aceita.
- **Arquivado:** o patch do protótipo e os scripts de avaliação com as saídas, em `docs/morphology/archive/item-grammar-prototype-2026-10-12.*`.
- **Fora do git:** as fotos em `docs/morphology/shots/ser-*` e os snapshots medidos.

## Limitações

- 22 páginas, uma captura de cada, numa máquina. O julgamento visual é meu, em uma hora e uma semente.
- Só uma rodada: os três desvios da proposta foram decididos antes de fotografar, e não ajustei nada depois de ver as imagens.
- A Apple não testa a hipótese; o Pinterest testa com a unidade errada.
- Os limiares da leitura (72 px para tecla, 35% de tolerância na largura, 1,25 para cabeceira) foram escolhidos uma vez.
