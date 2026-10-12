# Leitura das unidades: diagnóstico e proposta

12/10/2026, branch `morphology/consolidation`, sem commit. Continua [ITEM_ENSEMBLE_PROTOTYPE.md](ITEM_ENSEMBLE_PROTOTYPE.md). É diagnóstico e proposta: nenhuma leitura nova foi implementada, e a composição `ensemble` não foi tocada.

> **Depois.** A proposta foi prototipada e avaliada em [UNIT_READING_PROTOTYPE.md](UNIT_READING_PROTOTYPE.md).

## Resumo

1. **A captura não é o principal problema.** Das imagens que aparecem na página real, a captura mede a mesma caixa em 95% nas páginas de trabalho e em 79% nas páginas novas. O número de 47% engana: metade das imagens do HTML não aparece na página real, com ou sem captura.
2. **A maior perda está em como a leitura escolhe a unidade.** Ela parte das imagens e escolhe pela contagem. Nas páginas novas, dos 36 territórios de mídia que têm uma unidade de conteúdo, a leitura acerta 12.
3. **São dois defeitos diferentes.** Um é de cobertura: 9 territórios ficam sem série porque as imagens não têm caixa, embora os itens estejam medidos. O outro é de precisão: em 8 a leitura devolve a unidade errada, quase sempre um elemento pequeno e numeroso.
4. **A informação certa já está na captura em 16 desses 24 casos.** Os itens irmãos repetidos estão medidos, com caixa confiável. A leitura não olha para eles.
5. **Seis casos são da captura, e são uma regra só.** Em páginas que rolam dentro de um contêiner (Apple Music, Twitch, Vimeo), o passe de medição descarta tudo o que fica abaixo da primeira tela.
6. **"Teclas" hoje é um rótulo para seis coisas.** De 24 leituras de teclas, 6 são barras de ferramentas.
7. **Proposta:** a unidade passa a ser o item repetido, não a imagem; a escolha passa a ser por área coberta e por aninhamento, não por contagem; e a série passa a dizer o que a unidade é. Uma função, em `kit/series.ts`.

Pranchas, todas com a página ao vivo ao lado do que a captura mediu e do que a leitura escolheu:

- Unidade errada (arquivada): Pexels, itch.io, Vimeo, Twitch, MoMA, BBC
- Sem série, com os itens medidos (arquivada): Open Library, GOG, SoundCloud, Behance, Books to Scrape, Apple Music
- Estruturas diferentes sob o mesmo rótulo (arquivada): LEGO, Coursera, Lucide, Emojipedia, craigslist, Excalidraw
- Onde a leitura acerta (arquivada): Flickr, TED, NASA, Spotify, Guardian, NPR

## O que foi medido

| Conjunto | Páginas | Uso |
| --- | --- | --- |
| De trabalho | 22 | As capturas da rodada anterior |
| Novas da rodada anterior | 25 | Idem. Incluem Twitch, Pexels, MoMA e Vimeo |
| Novas desta etapa | 11 | Capturadas hoje para o diagnóstico. Outras 9 falharam (bloqueio, página vazia, navegador recusado) |
| Seladas | 11 | Capturadas hoje e não abertas. Ficam para a validação |

Três instrumentos, todos fora do produto:

- **Sondagem ao vivo.** Cada página aberta duas vezes no mesmo navegador: com as imagens trocadas por um marcador de 1×1, como a captura faz, e com as imagens reais. Depois, rolada até o fim. A caixa de cada imagem é comparada entre os três estados.
- **Rastreamento da leitura.** Cada imagem e cada território seguidos pela captura, pela normalização, pela escolha da unidade e pelo agrupamento, com o motivo de cada descarte.
- **Rótulos.** Para cada território de mídia com 8 lotes ou mais, olhei a página ao vivo e anotei qual é a unidade, se a leitura acertou e, quando não, em que etapa a unidade certa se perdeu. São 76 territórios.

## Onde os dados se perdem

Nos 36 territórios de mídia das páginas novas que têm uma unidade de conteúdo:

| Etapa | Territórios | O que acontece | Exemplos |
| --- | --- | --- | --- |
| Lida certa | 12 | | Flickr, TED, NASA, NPR, Coursera |
| **Captura** | 6 | O conteúdo rola dentro de um contêiner. O passe de medição considera fora da página tudo o que está abaixo do fim do documento | Apple Music: 26 imagens medidas, 106 descartadas |
| **Seleção da unidade** | 9 sem série | A leitura parte de imagens com caixa de 24 px ou mais. Sem elas, não há unidade, embora os itens estejam medidos | Open Library, Books to Scrape, GOG, Behance, SoundCloud |
| | 1 errada | A subida da imagem até o cartão para quando o pai tem mais de uma imagem | LEGO: duas imagens por ladrilho, 12 por fileira em vez de 6 |
| **Agrupamento** | 7 erradas | Uma série por território, escolhida pela classe de tamanho mais numerosa. Elementos pequenos vencem | Pexels, itch.io, Vimeo, Twitch, Apple Music, Coursera |
| Não julgado | 1 | | Apple Music, uma fileira de 5 |

A **interpretação** não perde unidades, mas confunde o que elas são. Está na seção 4.

Nas 22 páginas de trabalho a leitura acerta 19 das 21 séries. As duas erradas: Pinterest (a miniatura de dentro da colagem) e craigslist (os ladrilhos de um mapa, lidos como grade de 12 imagens).

## 1. Por que só 47% das imagens têm caixa

Porque quase metade das imagens do HTML não aparece na página. A sondagem ao vivo, nas 25 páginas novas da rodada anterior:

| Estado da imagem | Com imagens reais | Com marcadores |
| --- | --- | --- |
| Aparece, com 24 px ou mais | 56% | 48% |
| Invisível (`display: none`, `visibility: hidden`) | 29% | 31% |
| Colapsada, com menos de 2 px | 8% | 13% |
| Além da largura ou do fim da página | 6% | 6% |
| Pequena, de 2 a 24 px | 1% | 2% |

As invisíveis são variantes para outras larguras de tela, menus fechados e slides inativos. Não são perda.

O marcador custa 8 pontos. Das imagens que aparecem na página real:

| A captura mede | De trabalho (327 imagens) | Novas (927 imagens) |
| --- | --- | --- |
| A mesma caixa | 95% | 79% |
| Um quadrado, no lugar da proporção real | 2% | 9% |
| Colapsada | 2% | 7% |
| Menos de 24 px | 0% | 2% |
| Não pareada entre as duas cargas | 1% | 3% |

O dano se concentra em poucas páginas: LEGO (45 imagens viram quadrados), Behance (32 colapsam), Books to Scrape (20 ficam com 11×11), Open Library, MoMA. Ter tamanho ou proporção declarados ajuda menos do que eu esperava: 87% mantêm a caixa com declaração, 75% sem.

Duas outras perdas da captura, menores:

- **Rolagem.** Depois de rolar, aparecem mais 185 imagens em 8 páginas (listas infinitas e carregamento tardio).
- **Imagem de fundo.** No SoundCloud a capa é um fundo em CSS, que o script da página só aplica depois que a imagem carrega: 17 fundos com imagens reais, 2 com marcadores.

## 2. Por que só 55% do solo de mídia recebe série

Nas 25 páginas, 35 territórios de mídia; 21 ficam sem série, com 45% do solo.

| Motivo da leitura | Territórios | Lotes | O que há na página |
| --- | --- | --- | --- |
| Menos de 4 unidades | 9 | 559 | Em 6, uma grade ou carrossel com os itens medidos e as imagens sem caixa |
| Uma unidade por fileira | 3 | 300 | Em 2, uma lista de fato. No GOG, uma grade de 3 por fileira com imagens sem caixa |
| Imagens abaixo de 24 px | 1 | 206 | Books to Scrape: 20 cartões de 225×410, 4 por fileira, medidos |
| Nenhuma imagem como nó | 1 | 122 | Apple Music: prateleiras fora do documento |
| Nenhuma imagem com caixa | 7 | 118 | Apple Music em 5; em 1, cartões medidos |

Somando pelo que há na página:

| | Territórios | Lotes |
| --- | --- | --- |
| Unidade na página, itens medidos na captura, série não produzida | 9 | 852 |
| Unidade na página, descartada pela regra de "fora do documento" | 6 | 206 |
| Sem unidade de 2 ou mais por fileira: a leitura está certa | 6 | 247 |

Se as unidades viessem dos itens, a cobertura iria de 55% para 84% do solo de mídia, sem mudar a captura. É um teto: não diz quantas dessas séries sairiam certas.

Há ainda uma perda na **normalização**. Depois do 8º item repetido (do 20º em páginas menores), os itens viram um nó só, sem caixa própria. Nas páginas novas isso atinge 27% das imagens dos territórios de mídia (Flickr, itch.io, GOG, NPR, Verge, Apple Music). A largura e o número por fileira sobrevivem. O número de fileiras não, e é ele que separa faixa de grade.

## 3. Quando um elemento interno vira a unidade

Três mecanismos, todos na leitura.

**A subida da imagem ao cartão.** A leitura sobe da imagem enquanto o pai tiver uma imagem só e até 6 vezes a área dela. Quando o cartão tem duas imagens, ela não sobe.

| Página | Unidade real | Unidade lida |
| --- | --- | --- |
| LEGO | Ladrilho de 225×261, 6 por fileira | As duas imagens de dentro, 109×109, 12 por fileira |
| Pinterest | Cartão de colagem, 273×276 | Miniatura de 91×91 |
| BBC | Cartão de 296×306 | A foto, 296×167 |

**A escolha pela mais numerosa.** A leitura toma a largura mediana de todas as unidades e descarta as que diferem mais de 35%. Vence a classe de tamanho com mais elementos.

| Página | Unidade real | Unidade lida | Área do território coberta |
| --- | --- | --- | --- |
| Pexels | Foto, 678×1119 | Etiqueta com avatar, 175×48 | 73% contra 1% |
| itch.io | Jogo, 277×328, 4 por fileira | Miniatura da barra lateral, 110×87 | 37% contra 5% |
| Twitch | Destaque, 638×255 | Etiqueta de categoria, 194×38 | 48% contra 4% |

**A regra das teclas.** Se os elementos de até 72 px forem o dobro dos maiores, a série inteira vira teclas.

| Página | Unidade real | Unidade lida |
| --- | --- | --- |
| Vimeo | Cartão de vídeo, 259×219, cobre 68% | 17 ícones e botões de 24 px, de dentro dos cartões |
| Apple Music | Faixa, 383×85 | A capa de 40×40 de cada faixa |
| Coursera | Curso, 416×92 | O logotipo de 64×64 de cada curso |

Nos três mecanismos o elemento escolhido está **dentro** da unidade real, ou cobre uma fração mínima do território. A leitura não usa nenhuma das duas informações.

## 4. Unidade de conteúdo ou elemento auxiliar

A leitura devolve três arranjos: faixa, grade e teclas. Nenhum diz o que a unidade é.

**"Teclas" são seis coisas.** As 24 leituras de teclas nas 58 páginas:

| O que são | Quantas | Exemplos |
| --- | --- | --- |
| Barra de ferramentas ou teclado | 6 | Excalidraw, tldraw, Desmos, ray.so |
| Fileira auxiliar de ícones | 10 | Redes sociais do rodapé (BBC, SoundCloud), abas de categoria (Airbnb), avatares (GitHub), logos de pagamento (IKEA) |
| Miniatura ou ícone de dentro de um item | 6 | Apple Music, Vimeo, Coursera, DEV |
| Enfeite de uma ilustração | 2 | Linear |

**"Faixa" e "grade" misturam três.** Uma grade de imagens (Flickr: a unidade é a foto), um conjunto de cartões (TED: foto e título) e uma fileira de etiquetas (Pexels) saem com o mesmo rótulo.

**O cartão empresta a proporção ao que não é imagem.** No MoMA a unidade lida está certa: cinco sugestões de busca de 322×112, com uma miniatura de 112×112. A série devolve a proporção do cartão, deitada, e o `ensemble` a trata como proporção de imagem. É a origem das lâminas.

**Um mosaico não é uma grade.** No craigslist os 12 ladrilhos de 256×256 são um mapa só.

Sinais que separam os casos nos territórios rotulados, todos estruturais e já presentes na captura:

| Sinal | Conteúdo | Auxiliar |
| --- | --- | --- |
| Área do território coberta pelo grupo | 33% a 95% | 1% a 5% quando concorre com conteúdo |
| Aninhamento | Grupo de topo | Dentro das unidades de um grupo maior (Vimeo, Apple Music, Coursera, Pinterest, LEGO) |
| O que cada unidade contém | Imagem com texto ou link | Só ícone, só controle, ou avatar com um nome |
| Vizinhança | Unidades separadas, cada uma com seu link | Coladas e sem link (mapa) |

O tamanho sozinho não serve. Na Emojipedia e no Lucide os ladrilhos de 50 a 75 px **são** o conteúdo, e cobrem a página.

O que os sinais não resolvem: o MoMA. As sugestões de busca são o único grupo repetido daquele território, cobrem 40% dele e têm imagem com texto. O que as torna auxiliares é o peso que o território recebe, e isso é da alocação.

## 5. O que a captura tem e a interpretação descarta

| Informação | Onde está | O que acontece com ela |
| --- | --- | --- |
| Caixa de cada item repetido | Em todo nó com caixa | Não é lida. A leitura só olha imagens e controles |
| Que o item contém imagem | Contagem do DOM, já usada para classificar o território | A leitura exige a caixa da imagem, que é a medida menos confiável da captura |
| Imagem de fundo | No nó, com caixa | A leitura só aceita nós com papel de imagem |
| Quantos itens foram agrupados | No nó de agrupamento | A leitura conta só os que ficaram |
| Quem está dentro de quem | Na árvore | Usado só para subir de uma imagem |
| Texto, links e controles por item | No nó | Não usados para dizer o que a unidade é |

## 6. O que realmente não está disponível

| Caso | Páginas | O que faltaria |
| --- | --- | --- |
| Conteúdo num contêiner que rola | Apple Music, Twitch, Vimeo | O navegador tem as posições; o passe de medição as descarta por estarem além do fim do documento. É uma regra da medição |
| Conteúdo que só existe depois de rolar | Flickr, itch.io, Pexels, NPR, DEV e outras 3 | Rolar antes de medir |
| Proporção real da imagem | 9% das imagens das páginas novas | Carregar as imagens, ou só o cabeçalho delas |
| Barra de ferramentas desenhada em canvas ou em sprites | JS Paint | Nada no DOM a distingue |
| Página que recusa o navegador | 9 das 20 tentadas hoje | Fora do alcance |

Nenhum desses é necessário para os 16 casos recuperáveis da tabela do início.

## Cobertura e precisão

| | De trabalho | Novas |
| --- | --- | --- |
| Territórios de mídia rotulados | 32 | 44 |
| Séries produzidas | 21 | 21 |
| **Precisão:** séries com a unidade certa | 19 de 21 (90%) | 12 de 20 julgadas (60%) |
| Territórios com unidade de conteúdo | 16 | 36 |
| **Cobertura:** com a unidade certa | 15 de 16 (94%) | 12 de 36 (33%) |
| Territórios sem unidade, e sem série | 11 de 11 | 8 de 8 |

A leitura foi escrita olhando as páginas de trabalho, e ali funciona. Fora delas, erra 4 em cada 10 séries e alcança um terço das unidades.

As duas medidas pedem correções diferentes. Aceitar itens sem imagem medida sobe a cobertura e, sozinho, **pioraria** a precisão: entrariam mais grupos, e a escolha continuaria sendo por contagem. Por isso a proposta trata as duas juntas.

## Proposta

**A unidade passa a ser o item repetido. A imagem passa a ser um atributo dele.**

A mudança cabe em `kit/series.ts`. O tipo `Series` continua o mesmo, com um campo a mais.

1. **Candidatos.** Grupos de 4 ou mais nós irmãos, de mesmo papel e mesma tag, com larguras parecidas (os 35% de hoje), medidos pela própria caixa. Grupos iguais sob pais paralelos contam juntos: as colunas de um mural, os três blocos de três cursos da Coursera.
2. **Nível.** Um grupo que cabe dentro das unidades de outro é parte, não unidade: avatar, estrela, ícone, miniatura. Um grupo cujas unidades contêm, cada uma, outro grupo que as preenche é agrupamento, não unidade: prateleira, seção. Ele vira os grupos e a cabeceira que a série já devolve.
3. **Escolha.** Entre os que restam, o que cobre mais área do território.
4. **Tipo.** Um campo novo, `kind`, com três valores. `picture`: a unidade é quase só a imagem. `card`: imagem com texto ou link. `key`: controle sem texto, de até 72 px, e só quando é o grupo de topo. Grupo sem imagem e sem controle não dá série, como hoje. Imagens coladas e sem link são uma imagem só.
5. **Contagem.** Unidades visíveis mais as agrupadas pela normalização. Fileiras saem do total.
6. **Imagem.** Basta o item conter imagem no DOM. A caixa da imagem deixa de ser exigida.

O que não muda: os limiares (4 unidades, 35%, 72 px), os territórios, a classificação, a alocação, a captura e o `ensemble`.

O que a proposta deixa de fora, de propósito:

- **A regra de "fora do documento".** São 6 territórios em 3 páginas. É uma linha no passe de medição, mas é mudança de captura. Proponho decidir depois da leitura.
- **Rolagem e imagens reais.** Com a unidade vindo do item, deixam de ser pré-requisito.
- **O peso de widgets** (MoMA, logos de pagamento da IKEA) e a **tipagem** (o GitHub Trending é "mídia" por causa dos avatares; a grade de ícones do Lucide vira 26 territórios de texto). São da alocação e da classificação.

## Riscos

| Risco | Como aparece | Tratamento |
| --- | --- | --- |
| **Nível errado** | Seção no lugar do cartão, ou o inverso. BBC, MoMA, NASA e Spotify têm os dois níveis medidos | É a regra que decide tudo. Tem métrica própria na validação |
| **Mais grupos, mais erros** | Menus, rodapés e listas de texto também são irmãos repetidos | Sem imagem e sem controle, não há série. Conferir os controles |
| **A proporção muda de dono** | Com a unidade no cartão, altura e largura são do cartão, não da imagem. O `ensemble` lê isso como proporção de imagem | Não corrigir aqui. A série passa a dizer o tipo, e a regra de proporção se decide ao voltar à arquitetura |
| **Itens sem caixa** | Só os 8 ou 20 primeiros de cada grupo têm caixa | Bastam para medir. A contagem usa o total |
| **Limiares escolhidos nas páginas rotuladas** | O mesmo erro da rodada anterior | Conjunto selado, rotulado depois de congelar o código |
| **As cidades do `ensemble` mudam sem ele ser tocado** | A flag passa a receber outra entrada | Avaliar a leitura sem ligá-la ao plano. A troca é uma linha, depois de validada |

## Plano de validação

A leitura nova é avaliada contra os rótulos, não contra cidades.

1. **Sem ligar ao plano.** A função nova fica ao lado da atual. Os scripts comparam as duas nos mesmos snapshots. O plano continua chamando a atual até a validação.
2. **Rótulos já feitos:** os 76 territórios de mídia, mais os territórios de outros tecidos com série. Ficam no arquivo.
3. **Medidas por território:** unidade certa (largura e altura dentro de 25%), tipo certo, itens por fileira com erro de até 1, faixa ou grade, e ausência de série onde não há unidade.
4. **Linha de base:** a tabela de cobertura e precisão acima.
5. **Critérios:**
   - Nas páginas de trabalho, nenhuma das 19 séries certas piora, e nenhum dos 11 territórios sem unidade ganha série.
   - Nas novas, precisão de 85% ou mais e cobertura de 70% ou mais. O teto medido é 28 de 36.
   - Nas seladas, a mesma precisão, com tolerância de um território.
   - Caminho padrão idêntico nos 497 snapshots. Hacker News, Paul Graham, Python docs, lobste.rs e Wikipedia sem série em território de mídia.
6. **Seladas.** As 11 já capturadas, e uma reserva de 36 endereços se faltarem territórios de mídia. Rotulo pela página ao vivo, sem ver a saída da leitura, e só depois comparo.
7. **Estabilidade.** Um item a menos; e a janela de 1100 px, com as 12 capturas estreitas que já existem.
8. **Só então:** ligar a leitura ao plano e refotografar o `ensemble`. Essa é a etapa seguinte, não esta.

Como ler um fracasso:

- **Precisão sobe e cobertura não:** as regras de nível estão descartando demais.
- **Cobertura sobe e precisão cai:** a escolha por área não basta, e o tipo precisa entrar na escolha.
- **Passa nas rotuladas e falha nas seladas:** limiares ajustados às páginas vistas. Paro e mostro.

## Organização feita nesta etapa

- **`series` fora do código ativo.** A composição e a flag saíram. A leitura `kit/series.ts` ficou, porque é a entrada do `ensemble`. As cidades do `ensemble` e do caminho padrão saem idênticas antes e depois, nos 497 snapshots. O `series` volta com o patch de `docs/morphology/archive/working-tree-before-item-composition-2026-10-12.tgz`.
- **Pranchas.** Índice em [morphology/sheets/README.md](../sheets/README.md): `baseline/` com as 47 cidades de hoje, `reading/` com esta investigação, `ensemble/` com o candidato. As 14 pranchas refeitas para relatórios antigos foram para um arquivo só, reduzidas, e as 5 do `series` saíram, porque as do `ensemble` têm as mesmas colunas. As referências foram atualizadas.
- **Dados desta etapa**, fora do git: `docs/morphology/recapture/reading-probe/` (sondagem e fotos das páginas), `reading-study/` (capturas de hoje) e `reading-sealed/` (seladas).
- **Arquivado:** os scripts, as saídas e os rótulos em `docs/morphology/archive/unit-reading-diagnosis-2026-10-12.tgz`.
- **Verificado depois da limpeza:** `npm test` com 256 verificações, `test:rendered` com 22, lint e typecheck sem erros.

## Limitações

- Os rótulos são meus, olhando a página ao vivo numa janela de 1440 px e os primeiros 2700 px de altura. Dois territórios (Verge e Allrecipes) foram julgados mais pelas caixas medidas que pela página, e um ficou sem julgamento.
- A sondagem ao vivo é de hoje; as capturas das 47 páginas são de ontem e de hoje cedo. Airbnb e Pinterest mudaram entre uma e outra, e para elas vale o rastreamento da captura antiga.
- O teto de 28 em 36 conta em quantos territórios a unidade certa está entre os grupos medidos. Não é previsão do que a regra proposta acerta.
- Das 20 páginas novas tentadas hoje, 9 falharam, e eram sobretudo lojas e acervos. O conjunto continua pendendo para o que a captura alcança.
- Só territórios de mídia foram rotulados por inteiro. BBC, DEV e Lucide mostram que os mesmos defeitos existem em outros tecidos.
