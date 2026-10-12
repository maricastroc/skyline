# Planta: resultado do protótipo vertical

12/10/2026, branch `morphology/consolidation`, sem commit. Testa a proposta de [URBAN_PLAN_PROPOSAL.md](URBAN_PLAN_PROPOSAL.md) da captura à cidade renderizada, em 22 páginas, com os mesmos snapshots em três braços.

> **Pranchas.** As pranchas deste relatório não estão mais na pasta ativa. Reconstruções reduzidas, feitas a partir das fotos que restaram, estão em `historical-sheets-2026-10-12.tgz` (arquivada); o nome de cada arquivo aparece ao lado da citação.

## Decisão

| Parte | Decisão | Motivo em uma linha |
| --- | --- | --- |
| **Planta em duas dimensões** (faixas e vazios) | **Descartar** | Só desloca territórios. Na cidade renderizada não há ganho convincente, e ela tira o marco do centro numa página |
| **Poda do que não aparece** | **Revisar; não incorporar agora** | É a leitura correta e muda muito a composição, mas não dá identidade: aproxima as cidades de mídia e apaga um marco |
| **Identidade urbana** | **Não resolvida** | O que distingue as páginas continua dentro dos territórios, sem caminho até a forma |

O experimento termina aqui. Nada entrou no caminho padrão, e não abro outra sequência.

Pelo critério fixado na proposta, o resultado é refutação e não teste mal feito: as plantas mudaram como a prancha previa, e as cidades continuaram parecidas.

## O que foi construído

- **Uma flag, `layout`**, só na visão de desenvolvimento. Com ela: a leitura descarta o que a página esconde, os territórios ganham moldura espacial e `allocateSpatial()` substitui `allocate()`.
- **Três braços do mesmo snapshot:** hoje (flag desligada), só poda (o snapshot passado pela mesma função de poda, sem dados de layout, flag desligada) e poda com planta (flag ligada). Onde a página não tem colunas nem vazios, os dois últimos saem idênticos peça por peça, como previsto: 16 das 22.
- **Poda mais estreita do que na proposta.** A primeira versão tirava tudo o que não tinha caixa e quebrava os controles, porque `<br>`, espaçadores e mapas de imagem não têm caixa por natureza. A versão final tira só o que a página esconde por CSS ou joga para fora da página.
- **Área pelo peso do que aparece**, como você decidiu. A variante por superfície foi comparada só nas plantas (seção 6).

Pranchas, todas da cidade renderizada salvo indicação:

- Poda: hoje, só poda, poda com planta (`layout-arms-pruning.jpg`, no arquivo)
- Planta: as cinco páginas com colunas (`layout-arms-plan.jpg`, no arquivo), e na câmera do baseline (`layout-arms-close.jpg`, no arquivo)
- Controles (`layout-arms-controls.jpg`, no arquivo)
- As 22 cidades hoje (`layout-sites-today.jpg`, no arquivo) e as 22 com poda e planta (`layout-sites-proposed.jpg`, no arquivo)
- Plantas dos três braços e da variante por superfície (`layout-arms-plans.jpg`, no arquivo) (diagramas)

## 1. Ganho da poda

**O que ela tira.** Fração do peso da página que está oculta: MDN 68%, Apple 58%, Spotify 55%, Vercel 46%, GitHub 35%, YouTube 34%, Pinterest 34%, IKEA 27%, Airbnb 25%, Wikipedia 17%. Em Hacker News, Paul Graham, craigslist, portfólio e GOV.UK, 0%.

**O que muda na composição.** Lotes que trocam de tecido: MDN 100%, Apple 74%, Vercel 49%, Airbnb 30%, GitHub 30%, Pinterest 28%, Wikipedia 25%, Guardian 23%, YouTube 20%. O MDN deixa de ser vizinho do Hacker News: a distância entre os dois vai de 0,09 para 0,43.

**O que se vê.** Menos do que os números sugerem, e nem sempre para melhor:

- **MDN.** Troca sobrados por quadras, e na paleta dele os dois são um tapete cinza-escuro denso. A classificação mudou; a cidade, quase nada.
- **Apple.** Muda muito e por motivo real: somem as barras paralelas que eram o menu fechado. O que fica é um campo de torres em tons pastel, igual ao do Airbnb, do Spotify e do Pinterest.
- **Airbnb.** Perde o bairro de casas, que vinha de conteúdo oculto, e vira campo de torres puro.
- **Wikipedia.** Perde o relógio (seção 4).

**Entre cidades.** A distância média sobe de 0,431 para 0,445. As cidades com gêmea próxima passam de 3 para 6: Airbnb, Spotify e Excalidraw entram na lista.

**Leitura.** A poda é fidelidade: a cidade deixa de ser construída com menus fechados. Mas parte da variedade de hoje vinha desse erro, e a leitura correta empurra as páginas para a monocultura da sua família. As rodadas de morfologia já tinham registrado o mesmo padrão: o baseline tem as cidades mais variadas e a pior leitura.

## 2. Ganho da planta

**Onde ela age.** Colunas em 5 páginas (GitHub, Mastodon, portfólio, GOV.UK, ray.so) e vazio em 2 (Vercel, 10 lotes; ray.so, 13). Nas outras 16 não muda nada.

**O que muda.** Lotes que trocam de dono entre só poda e poda com planta: Mastodon 67%, portfólio 43%, ray.so 39%, GOV.UK 32%, GitHub 31%. A composição não muda; a distância entre as duas versões da mesma cidade fica em 0,06 ou menos.

**O que se vê.**

- **GitHub, GOV.UK.** As torres da coluna lateral se alinham numa borda. É a mudança mais legível, e ainda assim é a mesma cidade com um grupo de torres noutro lugar.
- **Portfólio.** A coluna do nome vira uma faixa de praça na borda oeste e leva o marco consigo. A cidade perde o relógio do centro. Na câmera do baseline é uma regressão clara.
- **Mastodon.** Reembaralha. Não consigo apontar na cidade onde estão as três colunas da página.
- **ray.so.** Um gramado de 13 lotes num canto. A cidade continua sendo quadras escuras em volta de praças.
- **Vercel.** Um gramado de 10 lotes.

**Leitura.** A faixa tem 2 lotes de largura, é feita dos mesmos tecidos que o resto e a fronteira dela cai no meio da quadra, sem rua. Não se lê como bairro de borda. Você pediu que a nova organização não se limitasse a deslocar territórios, e é isso que ela faz.

## 3. O que continua perdido dentro dos territórios

Medido no braço completo, sem tentar resolver.

**Um território, uma receita.** O maior território cobre 60% ou mais da cidade em 9 das 22 páginas, e cada tecido usa duas famílias de edifício.

| Tecido | Página: itens medidos | O que a cidade constrói |
| --- | --- | --- |
| Sobrados | Hacker News: linhas de 700×19 px. lobste.rs: 946×59. GOV.UK: 610×109. craigslist: 287×15 | Fileiras e esquinas, nas quatro |
| Mídia | Airbnb: cartões de 124×117, 8 por fileira. Spotify: 152×152, 8 por fileira. IKEA: 232×434, 3 por fileira. Pinterest: 91×91. Excalidraw: ícones de 36×36, 13 por fileira | Torre com pódio e edifício assimétrico, nas cinco |

A forma do item vai de 37 para 1 até 0,5 para 1, e o número por fileira de 1 a 13. Nada disso chega à geometria. O Excalidraw mostra o outro lado: ícones de barra de ferramentas continuam lidos como mídia e viram torres.

**A distância entre cidades acompanha a diferença entre páginas?** Correlação de postos sobre todos os pares:

| Propriedade da página | Hoje | Só poda | Poda e planta |
| --- | --- | --- | --- |
| Itens por fileira | 0,31 | 0,42 | 0,43 |
| Forma do item | 0,18 | 0,11 | 0,10 |
| Fatia do maior território | 0,21 | 0,23 | 0,22 |
| Maior título | 0,01 | 0,06 | 0,07 |
| Vazio medido | −0,08 | −0,05 | −0,01 |
| Colunas entre territórios | −0,05 | −0,12 | −0,12 |

A cidade responde um pouco a lista contra grade, porque grade costuma ter imagem. É cega à forma do item e à escala dos títulos, antes e depois. A medida de distância olha composição e não disposição, então a linha de colunas diz pouco; para a planta valem as imagens.

## 4. Critérios de aceite e regressões

| Critério da proposta | Resultado |
| --- | --- |
| 1. Hacker News e Paul Graham idênticos; Python docs, lobste.rs e craigslist com até 5% | **Passa.** Os dois primeiros e o craigslist são idênticos peça por peça nos três braços; lobste.rs 1%, Python docs 3% |
| 2. Em 6 das 9 páginas previstas, cidade nova distinguível e explicável pela página | **Não passa.** Claramente em 4 (Apple, Airbnb, GitHub, portfólio). Parcial em MDN, Vercel, ray.so, YouTube. Mastodon muda sem se explicar |
| 3. MDN deixa de ser vizinho do Hacker News | **Passa.** O vizinho passa a ser o Python docs |
| 4. Faixas laterais se leem como bairros de borda | **Não,** no meu julgamento. Só onde a faixa é de torres |
| 5. Um item a menos mantém a planta; duas capturas sem JavaScript dão a mesma | **Passa em parte.** Ver seção 5 |
| 6. Nenhuma cidade que não precisava mudar piora | **Não passa** |

Regressões:

- **Wikipedia perde o marco.** O relógio de hoje existe porque o cabeçalho do artigo carrega o seletor de idiomas, que é oculto. Com a poda o bloco do título cai de 6,8% para 0,1% da página e fica sem lote.
- **Portfólio perde o centro.** O marco vai para a faixa da borda.
- **Mais gêmeas na família de mídia:** de 3 para 6 cidades com gêmea próxima.
- **Nenhuma no caminho padrão.** Com o protótipo presente e a flag desligada, as 248 capturas de referência geram cidades idênticas às do último commit; lint, typecheck, 256 verificações e as 22 da captura renderizada passam.

## 5. Estabilidade

Lotes que trocam de tecido com um item a menos na lista principal:

| | Hoje | Só poda | Poda e planta |
| --- | --- | --- | --- |
| 13 das 18 páginas com lista | 0% a 9% | 0% a 8%, a até 3 pontos de hoje | igual a só poda, a até 1 ponto |
| Apple | 6% | 1% | 1% |
| Mastodon | 3% | 9% | 9% |
| Guardian | 19% | 23% | 23% |
| Pinterest | 19% | 26% | 26% |
| ray.so | 14% | 14% | **22%** |

- A planta só piora o ray.so, onde o número de colunas passa de 4 para 6 com um item a menos.
- Duas capturas sem JavaScript da mesma página dão a mesma planta em 14 de 15. A exceção é o Guardian, cujo conteúdo mudou entre as duas.
- **Janela de 1100 px:** no Mastodon as colunas caem de 4 para 2 e 94% dos lotes trocam de tecido. ray.so 17%, Wikipedia 12%.

**Correção à proposta.** Eu havia escrito que a captura sem JavaScript encontra os mesmos territórios nas mesmas posições em 14 páginas. Comparando lote a lote, isso só vale para 9 de 15. GitHub (88%), craigslist (34%), IKEA (28%), GOV.UK (27%), Vercel (17%) e Wikipedia (14%) mudam de tecido entre uma captura com JavaScript e outra sem. Na medição da proposta eu comparava as chaves dos territórios, que coincidem; lote a lote, o tecido não coincide.

## 6. Área por superfície, só nas plantas

Trocar o peso pela superfície que cada território ocupa na tela, do jeito mais direto, quebra os controles: 76% dos lotes do Hacker News e 72% do lobste.rs mudam. O motivo é estrutural: os retângulos dos territórios se sobrepõem (um "resto" abraça os filhos), então somar áreas não reparte a página. Fazer isso direito exigiria particionar o plano da página, o que é outra etapa. Mantive a área pelo peso do que aparece.

## 7. O que ainda falta, com precisão

A informação, em boa parte, já existe com o passe de layout. O que falta é transformação.

1. **Do interior do território para a forma urbana.** Hoje o caminho é território, depois tecido, depois uma receita por peça. Forma do item, itens por fileira e seções internas são medidos e não têm por onde entrar. É aí que está a diferença entre o Hacker News e o lobste.rs, e entre o Airbnb e a IKEA. Enquanto a peça for composta sozinha, com duas famílias por tecido, qualquer ganho anterior a ela termina no mesmo campo.
2. **Tipagem por geometria, e não só por proporção de conteúdo.** Com a leitura honesta, mais páginas caem em "mídia". Cinco tecidos comuns são poucos para o que a leitura passa a distinguir, e ícones de 36 px ainda viram torres.
3. **Marco por saliência visual.** O tamanho do marco vem do peso do bloco no DOM. O título da Wikipedia é o maior texto da primeira tela e pesa 0,1%. A escala dos títulos (0 a 72 px) está medida e não é usada.
4. **Resolução da malha.** Com área por peso, uma coluna lateral tem de 7% a 15% da cidade. Em 16 quadras isso dá uma faixa de 2 lotes, abaixo do que se lê na escala da cidade.

Informação que continua faltando mesmo com layout: tamanho real das imagens (a captura responde com um pixel), conteúdo recortado por `overflow`, listas virtualizadas e tudo o que uma aplicação desenha em canvas.

Sobre a ordem das coisas: os itens 1 e 2 são geometria e tipagem, as camadas em que as rodadas anteriores mais tropeçaram. A diferença é que agora existiriam entradas medidas, em vez de contagens e palavras. Não comecei nada disso.

## 8. Estado do código

> **Atualização, mesmo dia.** A alocação espacial, a moldura, o solo aberto, a flag `layout` e o gancho da poda foram removidos do código ativo depois da sua decisão. Ficaram o passe de medição, a função de poda como instrumento e o patch arquivado. A sequência está em [ITEM_GRAMMAR_PROPOSAL.md](ITEM_GRAMMAR_PROPOSAL.md). O texto abaixo descreve o estado no momento da avaliação.

- **No diretório de trabalho, sem commit:** o passe de medição, a poda (`snapshot/layout.ts`), a moldura e a alocação espacial (`kit/spatial.ts`), e os ganchos em `normalize.ts`, `plan.ts`, `district.ts`, `compose.ts`. São 122 linhas acrescentadas em 11 arquivos, mais dois arquivos novos. Tudo atrás de `layout`, que só a visão de desenvolvimento aceita.
- **Arquivados:** o patch do protótipo e os scripts de avaliação com os números, em `docs/morphology/archive/layout-prototype-2026-10-12.*`.
- **Fora do git:** os 64 snapshots medidos em `docs/morphology/recapture/layout/` e as cópias `lay-*` que a visão de desenvolvimento lê em `docs/rendered-capture/snapshots/`.

Recomendo remover a alocação espacial e o solo aberto, que foram descartados, e manter o passe de medição e a poda como instrumentos sem uso no produto. Não removi nada: a decisão é sua.

## Limitações

- 22 páginas, capturadas num dia, numa máquina, com JavaScript. O julgamento visual é meu, em duas câmeras, uma hora e uma semente.
- A medida de distância entre cidades é a do projeto e não enxerga disposição.
- A tabela de correlações usa descritores de página que escolhi; serve como indício, não como prova.
- Os limiares de coluna e de vazio foram escolhidos uma vez e não ajustados.
