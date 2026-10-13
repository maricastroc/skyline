# Itens condicionando a receita: resultado do protótipo

12/10/2026, branch `morphology/consolidation`, sem commit. Continua [ITEM_GRAMMAR_PROTOTYPE.md](ITEM_GRAMMAR_PROTOTYPE.md). Uma rodada de implementação e uma de avaliação, em três braços dos mesmos snapshots: hoje, o protótipo `series` e a nova flag `ensemble`.

> **Decisão, no mesmo dia.** O `ensemble` fica como candidato experimental, sem entrar no produto. O `series` saiu do código ativo. O passo seguinte é a leitura das unidades, antes de voltar às receitas: ver [UNIT_READING_DIAGNOSIS.md](UNIT_READING_DIAGNOSIS.md).

## Recomendação

**Revisar; não incorporar ainda.**

- **A direção se sustenta.** Com a receita preservada e os itens só condicionando parâmetros, nenhuma cidade desmonta: não há matriz de cubos, campo de quiosques nem trio repetido, e a silhueta fica. Spotify, Airbnb, Pinterest e craigslist ficam melhores que hoje.
- **A identidade é parcial.** As cidades de mídia passam a se distinguir sem cor, mas continuam sendo todas cidades de torres. A diferença está na segunda camada (o que acompanha a torre), e é menor que a do `series`.
- **Duas das quatro regras não generalizam.** Cadência e hierarquia de título funcionam nas páginas novas. Proporção do item e teclas dependem de uma leitura que erra a unidade em 4 das 12 páginas novas que mudam, e ali a cidade perde altura ou volume sem motivo.
- **O Guardian não mantém o que o `series` deu.** Fica igual a hoje.

Nada aqui muda o caminho padrão, e nada funciona sem o passe de medição, que só existe na captura local.

## Pranchas

Todas de cidades renderizadas, mesmos snapshots, câmera, hora e semente nos três braços.

| O que | Prancha |
| --- | --- |
| Cidade inteira: IKEA, Pinterest, Excalidraw | far-1 (arquivada) |
| Cidade inteira: Spotify, Airbnb, Guardian | far-2 (arquivada) |
| Cidade inteira: craigslist, GitHub, Apple | far-3 (arquivada) |
| Controles: Hacker News, Paul Graham, Python docs, lobste.rs, Wikipedia | far-controls (arquivada) |
| Sem cor nem letreiro | flat-1 (arquivada), flat-2 (arquivada) |
| Quadras de perto | close-1 (arquivada), close-2 (arquivada) |
| Páginas novas que mudam | 1 (arquivada), 2 (arquivada), 3 (arquivada), sem cor (arquivada) |
| Páginas novas idênticas nos três braços | As 13 primeiras de baseline/unseen-25 (arquivada) |
| Antes do único ajuste | trial-before-adjustment (arquivada) |

## O que foi construído

Uma função, `composeEnsemble`, que é a receita de mídia de hoje com quatro parâmetros lidos da série medida. A leitura (`kit/series.ts`) é a do protótipo anterior, sem alteração. Nenhuma família nova, nenhum sorteio novo.

| Parte | Onde | Tamanho |
| --- | --- | --- |
| Receita condicionada | `compose.ts` | 64 linhas |
| Escolha das peças e cabeceiras | `district.ts` | 7 linhas, 5 delas no lugar de outras |
| Flag `ensemble`, só na visão de desenvolvimento | `experiments.ts`, `plan.ts` | 2 linhas |

A receita de hoje numa quadra inteira é torre com pódio num canto, anexo assimétrico no canto oposto, praça no resto. O que cada medida muda:

| Medida do item | Decisão da receita | Efeito |
| --- | --- | --- |
| **Itens por fileira** (2 a 8) | Quantas frentes baixas entram na quadra, e quanto do pódio elas tomam | 2 por fileira é a receita de hoje. Cada item a mais acrescenta uma frente e encolhe o pódio de 8 para 5,6 |
| **Tamanho da frente** | Família das frentes | Até 2,9 de largura, sobrados geminados (`rows`). Acima, edifícios isolados (`walkup`) |
| **Fileiras por grupo** | Onde as frentes ficam | Uma fileira: todas numa face, como rua. Várias: divididas em duas faces, em torno do pátio |
| **Proporção do item** | Família do dominante | Retrato (1,5 ou mais): torre esguia. Paisagem (abaixo de 0,75): lâmina, mais baixa. No meio: torre com pódio, como hoje |
| **Título do grupo** | Altura do dominante | A primeira quadra de cada grupo tem a altura de hoje. As demais descem pela raiz da razão entre título e corpo. Sem título, todas iguais |
| **Teclas** (até 72 px) | O que acompanha a torre | Quiosques na borda da praça, no lugar do anexo |

O conteúdo continua decidindo o programa: fachada de vidro, telão, térreo e uso saem do mesmo `prog()` de hoje. A altura continua vindo do peso do território.

Três propriedades por construção, e verificadas:

- **Caso neutro.** Dois itens por fileira, proporção média e sem título dão exatamente a quadra de hoje. A Apple sai idêntica peça por peça.
- **Mesmo alcance do `series`.** Territórios de mídia com série medida e 8 lotes ou mais. Os de grade ficaram fora, de propósito, para mexer numa receita só.
- **Controles.** Sem série, nada muda.

### O único ajuste

Depois de quatro fotos de teste, troquei a família das frentes largas. Eu tinha usado `rows` para qualquer número de frentes, e uma "fileira" de uma casa só, com 3,6 de largura e telhado de duas águas, sai como um galpão (visível em IKEA e Pinterest na prancha de teste). Passei a usar `walkup` acima de 2,9 de largura. Considero defeito de implementação: a família de sobrados foi aplicada a algo que não é fileira. Não mexi em mais nada depois de ver imagens, e as páginas novas só foram avaliadas com o código congelado.

## Os casos prioritários

| Caso | Pedido | Resultado | Contra hoje | Contra `series` |
| --- | --- | --- | --- | --- |
| **IKEA** | Sem trios idênticos, sem voltar ao genérico | Torre esguia, anexo e um edifício baixo por quadra: três volumes de papéis diferentes. As três cabeceiras ficam mais altas. O widget de avaliação vira torres com quiosques | Diferente. De longe, mais leve e reconhecível. De perto, mais pobre: a torre esguia do kit é um prisma liso numa praça vazia | Melhor: sem repetição, sem quadrante vazio |
| **Pinterest** | Grade sem matriz de cubos | Torre, anexo e dois edifícios em duas faces. Quadra cheia, com telões | Melhor: mais densa e mais rica | Muito melhor |
| **Excalidraw** | Aplicação sem campo de quiosques | Torres soltas em esplanadas com quiosques na borda | Diferente e legível. Menos volume, porque os anexos saem | Muito melhor: continua cidade |
| **Spotify** | Silhueta e volume, com os carrosséis | Torre atrás, rua de seis sobrados com telões na frente, anexo fechando a face | Melhor. É o resultado mais convincente | Melhor: mantém a rua e devolve as 16 torres |
| **Airbnb** | Idem | Idem, com cinco frentes | Melhor | Melhor |
| **Guardian** | Preservar ou superar a variedade do `series` | Lâminas nas seções de cartão deitado, torres esguias nas de retrato, o resto como hoje | Igual | **Pior.** Não reproduz os acentos altos e esguios |

O Guardian falha por uma escolha deste protótipo. A variedade que o `series` deu vinha de calcular a altura pela proporção do item. Aqui a altura ficou presa ao peso do território, para proteger a silhueta, e em territórios pequenos (8 a 35 lotes, quase sempre meias quadras) só a família do dominante muda.

Spotify e Airbnb continuam gêmeas. São a mesma estrutura.

craigslist mantém as duas torres do centro e ganha quatro edifícios. GitHub mantém as torres, com seis quiosques. As duas perdas do `series` não se repetem.

## Controles

Hacker News, Paul Graham, lobste.rs, Python docs e Wikipedia saem idênticos peça por peça nos três braços. O mesmo vale para MDN, GOV.UK, Linear, Vercel, Mastodon, ray.so, YouTube e o portfólio.

## Páginas novas

25 páginas capturadas nesta rodada com o mesmo passe de medição, nenhuma usada para escrever as regras. Outras 9 não serviram: bloqueio, login, tempo esgotado ou página vazia.

| Resultado | Páginas | O que acontece |
| --- | --- | --- |
| Idênticas a hoje | 13: SQLite, GNU, LWN, arXiv, Photopea, tldraw, Desmos, Books to Scrape, GOG, Behance, SoundCloud, Wikimedia Commons, BBC | Sem série medida, ou território que não é de mídia |
| Quase iguais | 5: itch.io, The Verge, NPR, Apple Music, Open Library | Poucos lotes governados, ou série lida com 2 por fileira (itch.io, onde a leitura pega a barra lateral) |
| Melhores | 2: TED, NASA | Grade de 4 por fileira: quadra cheia, cabeceiras mais altas |
| Forma nova e coerente | 1: Flickr | Fotos deitadas: cidade de lâminas. Mais baixa que hoje, com massa própria |
| Diferentes sem motivo | 2: Twitch, Pexels | Lâminas baixas e sobrados. Não ficam feias, mas a unidade lida está errada e a silhueta cai de 12,7 para 6,7 e de 11,2 para 6,2 |
| Piores | 2: MoMA, Vimeo | MoMA perde as três torres. Vimeo perde os anexos por causa de ícones de 24 px |

O que isso diz:

- **Nenhuma desmonta.** Nas mesmas páginas o `series` produz matriz de cubos (TED, NASA, Flickr), fileiras baixas (Twitch, Pexels) e um campo vazio com uma torre (Vimeo).
- **Onde a leitura acerta, a regra vale.** TED, NASA e Flickr são os três casos em que a unidade lida é o cartão de verdade.
- **Onde a leitura erra, a regra de proporção e a de teclas pioram a cidade.** As quatro páginas das duas últimas linhas.
- **A BBC mostra o limite do alcance.** O território dela é do tecido de grade, que este protótipo não governa, e a cidade de hoje já é uma matriz de cubos. Ali o `series` é o melhor dos três.

## Critérios de sucesso

| Critério | Veredito |
| --- | --- |
| Identidade perceptível entre estruturas diferentes | **Parcial.** Sem cor, distinguem-se agulhas (IKEA), torres soltas (Excalidraw), muros de sobrados com torres (Spotify, Airbnb), quadra cheia (Pinterest, TED, NASA) e lâminas (Flickr). Todas, menos a última, ainda se leem primeiro como cidade de torres |
| Qualidade igual ou superior a hoje | **Sim em 7 das 9 páginas de trabalho,** discutível em 2 (IKEA de perto, Excalidraw). Nas novas: 2 melhores, 1 nova, 2 discutíveis, 2 piores |
| Ritmo, hierarquia e variedade volumétrica | **Sim em ritmo e variedade.** A hierarquia existe e é discreta: onde há título, as quadras de corpo ficam entre 67% e 92% da cabeceira |
| Relação justificável com a página | **Sim, quando a unidade lida é a certa.** Cada parâmetro aponta para uma medida |
| Robustez | **Controles e caminho padrão intactos.** Com um item a menos, arranjo, cadência e classe de proporção se mantêm em todas. Frágil à leitura nas páginas novas |

## Números

A medida de distância do projeto compara composição. Ela não diz se uma cidade é boa.

| | Hoje | `series` | `ensemble` |
| --- | --- | --- | --- |
| Distância média entre as seis páginas de mídia | 0,298 | 0,422 | 0,325 |
| Par mais próximo entre elas | Spotify e Excalidraw, 0,12 | Spotify e Airbnb, 0,18 | Spotify e Airbnb, 0,18 |
| Distância média entre as 22 | 0,431 | 0,418 | 0,425 |
| Distância média entre as 25 novas | 0,445 | 0,476 | 0,449 |
| Correlação com itens por fileira | 0,31 | 0,19 | 0,29 |

A medida quase não vê o `ensemble`, porque as famílias e as alturas dominantes ficam. É coerente com o que as pranchas mostram: a mudança é na segunda camada.

Alturas, como topo mediano e 9º decil, e número de edifícios:

| Página | Hoje | `series` | `ensemble` |
| --- | --- | --- | --- |
| Spotify | 6,7 e 11,7 (51) | 3,6 e 5,7 (56) | 5,7 e 10,7 (63) |
| Airbnb | 5,7 e 11,7 (71) | 3,8 e 5,5 (71) | 5,7 e 11,2 (79) |
| IKEA | 6,7 e 12,2 (45) | 1,0 e 10,7 (68) | 5,2 e 11,7 (63) |
| Pinterest | 3,4 e 11,7 (63) | 3,7 e 4,1 (120) | 3,6 e 11,7 (81) |
| Excalidraw | 6,2 e 11,2 (38) | 0,7 e 1,0 (184) | 0,7 e 11,2 (110) |
| Guardian | 5,2 e 7,2 (108) | 4,6 e 8,3 (112) | 5,2 e 7,2 (108) |

O 9º decil, que é a silhueta, fica em todas. A mediana da IKEA e do Excalidraw cai porque os quiosques entram na conta.

## Onde está o limite

> **Revisto pelo diagnóstico seguinte.** A ordem abaixo põe a captura em primeiro lugar, e isso estava errado. Medindo a página ao vivo, a captura preserva 79% das imagens que aparecem nas páginas novas, e os 47% vêm sobretudo de imagens que a própria página não exibe. A maior perda está no item 2, a leitura da unidade. Ver [UNIT_READING_DIAGNOSIS.md](UNIT_READING_DIAGNOSIS.md).

Nesta ordem.

**1. Nas informações capturadas. É o que mais limita a generalização.**

| | Páginas de trabalho | Páginas novas |
| --- | --- | --- |
| Imagens com caixa medida | 69% | 47% |
| Solo de mídia com série lida | 92% | 55% |
| Territórios de mídia sem nenhuma imagem medida | 1 de 25 | 17 de 35 |

Em Books to Scrape as 20 capas medem 11×11. Na Open Library, Behance e Apple Music a maioria das imagens não tem caixa. No Twitch as miniaturas medem 184×38. A captura troca imagens por marcadores, e uma imagem sem dimensão declarada desaba. Onde não há caixa útil não há série, e a cidade é a de hoje.

**2. Na leitura da unidade.**

- **Cartão ou imagem.** No MoMA a imagem é quadrada (112×112) e a unidade lida é o cartão com texto ao lado (322×112). A proporção sai deitada, e a regra tira as torres.
- **Teclas vencem cartões.** No Vimeo, 17 ícones de 24 px pesam mais que 11 miniaturas de 239×134.
- **Série errada.** No itch.io a leitura fica com as 24 miniaturas da barra lateral (110×87, 2 por fileira) e não com a grade principal (277×220, 4 por fileira).
- O caso do Pinterest, que para na miniatura, continua.

**3. Na classificação.** O tecido de grade (BBC com 218 lotes, a coleção do MoMA com 135, Photopea com 229) tem como receita, hoje, nove cubos por quadra. E aplicações tipadas como interativas (tldraw, Desmos) não são alcançadas. O Excalidraw só entrou porque a barra de ferramentas dele foi lida como mídia.

**4. Na receita.** A altura presa ao peso do território protege a silhueta e custa a variedade do Guardian. A regra de paisagem baixa a cidade inteira quando o território é dominante, mesmo com a leitura certa (Flickr, de 11,2 para 7,7).

**5. No kit.**

- A torre esguia é um prisma liso sem base. Sustenta a silhueta, não sustenta a quadra de perto.
- A lâmina tem uma orientação só. Uma cidade delas se lê como conjunto habitacional.
- Entre o quiosque e o anexo não há peça. Uma quadra de teclas fica com torre e quiosques.

O que **não** limitou: a composição em si. Em nenhuma das 47 páginas houve sobreposição nova de edifícios, quadra vazia ou padrão repetido.

## Verificações e testes

| Verificação | Resultado |
| --- | --- |
| Caminho padrão: cidades com as flags desligadas, contra o último commit | 497 snapshots, 497 idênticos |
| `npm test` | 256 verificações, 0 falhas |
| `npm run test:rendered` | 22 verificações, 0 falhas |
| `npm run lint` e `npm run typecheck` | Sem erros |
| Páginas idênticas a hoje com a flag ligada | 14 das 22 (13 sem território governado, mais a Apple, que é o caso neutro) e 13 das 25 |
| Sobreposição de edifícios | Nenhuma nova em 47 páginas |
| Um item a menos na lista principal | Mesmo arranjo, cadência e classe em todas. A cidade se move de 0,00 a 0,09, como hoje. No Guardian dois territórios a mais passam a ser governados, como no `series` |
| Console do navegador com a flag ligada | Sem erros |

Dois incidentes de instrumento, sem efeito nas imagens: a primeira foto do braço de hoje (Spotify, cidade inteira) saiu com a câmera em movimento e foi refeita; e os processos de fotografia ficaram presos ao fechar o navegador quando rodados três em paralelo.

## Evidências

Índice em [morphology/sheets/README.md](../sheets/README.md).

- **Baseline canônico:** as 47 cidades de hoje em baseline/known-22 (arquivada) e baseline/unseen-25 (arquivada). As fotos estão em `docs/morphology/shots/itm-base/`, com os outros dois braços em `itm-series` e `itm-ensemble`, na mesma câmera. Fora do git.
- **Pranchas do candidato:** `docs/morphology/sheets/ensemble/`.
- **Snapshots novos:** `docs/morphology/recapture/layout-holdout/`, fora do git.
- **Arquivado:** o patch só desta rodada e os scripts de avaliação com as saídas, em `docs/morphology/archive/item-ensemble-prototype-2026-10-12.*`. O estado do diretório de trabalho antes de começar, com o `series` inteiro, em `working-tree-before-item-composition-2026-10-12.tgz`.
- **Pranchas que faltavam.** Ao começar, 24 pranchas citadas pelos documentos não estavam em `docs/morphology/sheets/`: tudo o que vinha depois de `found-` em ordem alfabética. As 5 rastreadas pelo git foram restauradas. As outras 19 nunca foram commitadas. Refiz todas a partir das fotos e dos scripts arquivados e, depois da decisão acima, tirei-as da pasta ativa: 14 foram para `docs/morphology/archive-local/historical-sheets-2026-10-12.tgz`, reduzidas, e as 5 do `series` foram substituídas pelas pranchas desta rodada, que têm as mesmas colunas. São reconstruções, não as originais.

## Estado do código

- **No diretório de trabalho, sem commit:** `composeEnsemble`, os ganchos da flag `ensemble` e a leitura `kit/series.ts`, que é a entrada dela.
- **Removido do código ativo depois da avaliação:** a composição do `series` e a flag. As cidades do `ensemble` e do caminho padrão saem idênticas antes e depois da remoção, nos 497 snapshots. O `series` volta com `git apply` do patch guardado no arquivo acima.
- **Sem alteração nesta rodada:** leitura da série, classificação de tecidos, alocação e captura.

## Limitações

- 22 páginas de trabalho e 25 novas, uma captura de cada, numa máquina. O julgamento visual é meu, em três câmeras, uma hora e uma semente.
- As páginas novas foram escolhidas por mim, e as 9 que falharam eram quase todas catálogos. O conjunto pende para o que a captura consegue ler.
- Os limiares (1,5 e 0,75 de proporção, 2,9 de largura, o degrau pela raiz do título) foram escolhidos uma vez, antes das fotos.
- As pranchas refeitas dos relatórios anteriores não são as originais.
- Não comecei nenhuma revisão nem estendi o alcance para o tecido de grade.
