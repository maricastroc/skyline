# Leitura das unidades: protótipo e avaliação

12/10/2026, branch `morphology/consolidation`, sem commit. Avaliação do protótipo aprovado em [UNIT_READING_DIAGNOSIS.md](UNIT_READING_DIAGNOSIS.md). A leitura nova está em `src/lib/pixelcity/kit/series.ts`, ao lado da atual, e **não está ligada a nada**: o plano continua chamando `seriesOf`; nenhuma cidade foi produzida nem alterada. Sem commit, merge ou push.

> **Depois.** A leitura nova foi ligada ao `ensemble` no caminho experimental e comparada com as outras alternativas em [MORPHOLOGY_DECISION.md](../../MORPHOLOGY_DECISION.md).

## Resultado contra os critérios

| Critério fixado antes do experimento | Desenvolvimento | Validação independente | |
| --- | --- | --- | --- |
| Nenhuma regressão nas 19 séries certas do conjunto de trabalho | 19 de 19 mantidas | — | **Atendido** |
| Precisão de pelo menos 85% nas páginas novas | 28 de 30 (93%) | 16 de 19 (**84%**) | **Não atingido na validação, por um caso** |
| Cobertura de pelo menos 70% nas páginas novas | 28 de 35 (80%) | 15 de 19 (79%) | **Atendido** |

A leitura nova é melhor que a atual em todos os eixos, nos dois conjuntos, e não perde nenhuma série de mídia que a atual acertava. Mas o critério de precisão, do jeito que foi escrito, **não foi atingido** nas páginas que o código nunca tinha visto: faltou um acerto em 19 (seriam precisos 17). Nada foi ajustado depois de abrir essas páginas.

Com 19 séries, cada caso vale 5 pontos; a medida não separa 84% de 85%. Isso não muda o veredito, só o tamanho da afirmação: o que a validação sustenta é "entre oito e nove séries certas em dez", não "acima de 85%".

## O que foi implementado

Só `kit/series.ts`. `seriesOf` (a leitura atual) ficou intacta, como referência; as funções novas são `unitGroups` e `unitsOf`, que devolvem o mesmo formato `Series` mais um campo `kind`.

| Pedido | Como ficou |
| --- | --- |
| Itens irmãos repetidos como candidatos | Filhos do mesmo pai, com o mesmo papel e a mesma tag, de largura parecida (±35%), medidos pela própria caixa. Conjuntos de pais paralelos e de mesma largura se juntam (as prateleiras de uma mesma lista) |
| Aninhamento para separar unidade, componente e agrupamento | Quando um conjunto mora dentro dos itens de outro: se os itens de fora ficam lado a lado, os de dentro são componentes; se os de fora só se empilham e cada um é quase todo ocupado por vários itens completos, os de fora são agrupamento e os de dentro são a unidade |
| Área coberta no lugar da frequência | Entre os conjuntos que sobram como unidade, vence o que cobre mais área, não o que tem mais elementos |
| Imagem, cartão e tecla | Tecla: botões ou controles pequenos com no máximo um glifo. Imagem: a figura ocupa quase todo o item, ou o item quase não tem texto. Cartão: o resto dos itens com figura. Itens sem figura não viram unidade |
| Contagem sem depender da normalização | Visíveis mais os que a normalização fundiu num resumo (`cluster.count`) |

Também ficaram de fora, de propósito: ladrilhos colados sem vão e sem link (mapas), e conjuntos de uma coluna só.

Não foram tocados: captura, classificação de tecidos, alocação, `composeEnsemble` e a regra dos elementos fora da primeira tela.

## Método

- **Rótulos antes da leitura.** Para cada território, anotei à mão a unidade que a página mostra (largura, altura, itens por linha, tipo), a partir da página real. O arquivo do conjunto de desenvolvimento foi escrito antes de existir código novo; o da validação, depois do congelamento e antes de rodar qualquer leitura nessas páginas.
- **Acerto** = largura e altura dentro de ±25% do rótulo. Os outros eixos (itens por linha ±1, tipo, nível) só são contados sobre as séries certas.
- **Desenvolvimento:** 58 páginas (as 22 de trabalho, 25 novas e 11 recentes), 76 territórios de mídia rotulados e 10 casos extras. A implementação passou por quatro versões **neste conjunto** (ver "Histórico").
- **Congelamento:** `series.ts` congelado às 15h17 (sha256 `d51a0449…`), antes de abrir qualquer página selada. O arquivo não mudou desde então.
- **Validação independente:** as 11 páginas seladas renderam só 8 territórios de mídia (várias são listas de texto ou páginas de erro), e apenas 2 com unidade. Como o plano previa, capturei a lista de reserva depois do congelamento: 28 de 36 páginas (8 falharam na captura). Total: 39 páginas, 33 territórios de mídia rotulados (30 pontuados: 19 com unidade de conteúdo, 1 de teclas, 10 sem unidade) e 39 de outros tecidos (37 pontuados).
- **Controles:** Hacker News, Paul Graham, lobste.rs, Wikipedia e a documentação do Python não recebem série de nenhuma das duas leituras.

## Comparação

### Territórios de mídia

| | Atual | Nova |
| --- | --- | --- |
| **Conjunto de trabalho (22 páginas)** | | |
| Precisão (séries certas / produzidas) | 19/21 (90%) | 20/21 (95%) |
| Cobertura (territórios com unidade de conteúdo lidos certo) | 15/16 | 16/16 |
| Territórios sem unidade que ficam sem série | 11/12 | 11/12 |
| **Páginas novas do desenvolvimento (36 páginas)** | | |
| Precisão | 12/20 (60%) | 28/30 (93%) |
| Cobertura | 12/35 (34%) | 28/35 (80%) |
| Nível: certo · abaixo · acima | 12 · 7 · 0 | 28 · 0 · 0 |
| Tipo | — | 22/28 (79%) |
| Itens por linha | 12/12 | 28/28 |
| **Validação independente (39 páginas)** | | |
| Precisão | 9/18 (50%) | 16/19 (84%) |
| Cobertura | 9/19 (47%) | 15/19 (79%) |
| Nível: certo · abaixo · acima · mesmo tamanho, medida errada | 9 · 4 · 1 · 3 | 16 · 0 · 0 · 2 |
| Tipo | — | 14/15 (93%) |
| Itens por linha | 9/9 | 16/16 |
| Territórios sem unidade que ficam sem série | 9/10 | 9/10 |

Separando a validação: nas 11 seladas, 2 de 2 (a atual, 0 de 1); na reserva, 14 de 17 (82%) de precisão e 13 de 17 (76%) de cobertura.

### Os cinco eixos

1. **Precisão da unidade.** De 60% para 93% nas páginas novas do desenvolvimento e de 50% para 84% na validação.
2. **Cobertura.** De 34% para 80% e de 47% para 79%. O ganho vem dos dois defeitos do diagnóstico: territórios com itens medidos que ficavam sem série, e territórios em que uma unidade pequena errada ocupava o lugar da certa.
3. **Nível de aninhamento.** A atual descia para um componente interno em 7 séries do desenvolvimento e 4 da validação. A nova não desce nem sobe em nenhum território de mídia rotulado. Uma ressalva: no Sketchfab ela escolhe a camada da miniatura (439×247) e não o cartão (439×295); passa pela tolerância de tamanho, mas é um nível abaixo, sai classificada como imagem e conta 48 unidades onde há 24.
4. **Tipo.** Teclas: de "tiles" para "tecla", o rótulo passa a significar uma coisa só. Em todos os territórios (não só os rotulados), a atual dá "tiles" a 28 séries no desenvolvimento e 17 na validação; a nova dá "tecla" a 8 e 3. Imagem × cartão é o eixo mais fraco: 79% no desenvolvimento; todas as confusões são entre esses dois tipos, em itens de legenda curta (capas da Open Library, NASA, Vimeo).
5. **Casos antes corretos.** Nenhuma série de mídia certa foi perdida: 19 de 19 no conjunto de trabalho, 31 de 31 no desenvolvimento inteiro, 9 de 9 na validação.

### Outros tecidos

Nos 37 territórios de outros tecidos pontuados na validação, a nova não é melhor que a atual: 2 séries certas de 6 produzidas nas duas, cobertura de 1 em 5 nas duas. Ela tira dois falsos "tiles" (avatares no Medium, marcadores no Kickstarter) e acrescenta dois falsos cartões (Indie Hackers, NYTimes). Esses territórios não entram no critério e hoje não são governados pelo `ensemble`.

## Casos corrigidos

**Desenvolvimento (17 séries ganhas, 1 corrigida entre os casos extras e 2 séries falsas retiradas):**

| Território | Atual | Nova |
| --- | --- | --- |
| Pinterest T2 | 91×91, miniaturas internas | 273×276, 4 por linha |
| itch.io T0 | 110×87, miniaturas da lateral | 277×328, 4 por linha, 36 jogos |
| LEGO T0 | 109×109 | 225×261, 6 por linha |
| Pexels T2 | 175×48, chips | 678×1017, 2 por linha |
| Vimeo T1 | 24×25, avatares | 259×219 |
| Apple Music T3 | 40×40 | 383×85 |
| Coursera T2 e T8 | 64×64, ícones | 416×92, 3 por linha |
| Open Library T4–T7, Books to Scrape T2, GOG T9, SoundCloud T2, Behance T5, NPR T7 | sem série | a unidade certa |
| MoMA T2 (extra) | 260×340, 4 por linha | 198×340, 5 por linha |
| Craigslist T0, SoundCloud T12 (extra) | ladrilhos de mapa e ícones lidos como série | sem série |

**Validação (7 séries ganhas, mais 3 séries falsas retiradas):** Khan Academy T7 (logos), National Geographic T4, Meetup T2 e T3, Kickstarter T3 (324×190 → 324×332), MUJI T2 (325×325 em 12 por linha → 325×471 em 3 por linha) e Genius T0; o mapa do OpenStreetMap, os avatares do Medium e os marcadores do Kickstarter deixam de virar série.

Pranchas da validação, com a página real ao lado da unidade escolhida: acertos (arquivada) e [erros](../sheets/reading/validation-errors.jpg). Os defeitos da leitura atual estão nas pranchas do diagnóstico (unidade errada (arquivada), sem série (arquivada)).

## Regressões

- **Séries de mídia que a atual acertava:** nenhuma perdida, em nenhum conjunto.
- **Uma série certa perdida fora de mídia:** Desmos T5 (desenvolvimento, caso extra). A atual lia os botões da barra como teclas; a nova não lê nada, porque os botões estão espalhados por pais diferentes e não formam um conjunto de quatro irmãos.
- **Séries novas onde a atual, corretamente, não lia nada:**
  - Linear T4 (conjunto de trabalho): 7 botões reais de uma interface ilustrativa lidos como teclas. Ligada ao `ensemble`, essa leitura mudaria a cidade do Linear.
  - MUJI T1 (validação): o menu do topo lido como 9 cartões.
  - NPR T6 (desenvolvimento): 7 cartões de 330×134; o rótulo diz "sem unidade" e parece errado (ver "Rótulos em dúvida").
  - Indie Hackers T2 e NYTimes T2 (outros tecidos).

## Erros restantes, por causa

### Captura incompleta — a leitura não tem como acertar

| Caso | O que falta |
| --- | --- |
| Twitch T0, Apple Music T1 e T5–T9 (desenvolvimento, 7 territórios) | Conteúdo dentro de uma área de rolagem interna, descartado como "fora do documento". É a regra adiada para a próxima etapa, e sozinha responde pelos 7 territórios sem cobertura do desenvolvimento |
| Bookshop T1 (validação) | As capas não tinham carregado: os itens das prateleiras foram medidos com 22 px de largura. A leitura cai para outro conjunto (4 cartões de 295×162) |
| Leaflet T2 (validação) | Os logos de "Trusted by" não chegam medidos ao território; só os ladrilhos do mapa, que a nova recusa (a atual os lia como grade de 256×256) |
| Rotten Tomatoes T2 (outros tecidos) | Os pôsteres ficam dentro de componentes web: 48 itens de 164×364 medidos, nenhum com imagem |
| Pixilart T0, calculator.net T7 (outros tecidos) | Ferramentas sem caixa na captura (Pixilart) e teclas ausentes do território (calculator.net) |

### Seleção da unidade

| Caso | O que acontece |
| --- | --- |
| MUJI T1 | Itens de menu contam como "com figura" por causa das imagens do painel que abrem, que não está visível |
| Linear T4, BBC T2 | Botões de uma interface ilustrativa e ícones do rodapé passam pela regra de tecla |
| Bootstrap T7 | O território tem 3 cartões na captura; o mínimo é 4 |
| Desmos T5 | Botões sob pais diferentes não formam conjunto |
| BBC T0 (extra) | Vence por área um conjunto de 8 imagens de 832×468, não os cartões de 296×306 (a atual também erra, para baixo) |
| DEV T7 (extra) | Avatares de 32×32 continuam virando série (a atual também erra) |
| Indie Hackers T2 | Quatro links, metade com imagem, bastam para formar um conjunto |
| Sketchfab T2 | A camada interna em vez do cartão (certo pela tolerância) |

### Classificação

| Caso | O que acontece |
| --- | --- |
| Imagem × cartão: 6 séries no desenvolvimento, 1 no conjunto de trabalho (Guardian T1), 1 na validação (Sketchfab T2) | A fronteira (figura ocupando 80% do item, ou menos de 10 caracteres) discorda do rótulo em itens com legenda curta |
| Color Hunt T2, Heroicons T3, Font Awesome T2 (outros tecidos) | Itens repetidos e medidos, mas sem imagem reconhecida (cor de CSS, SVG embutido). A leitura só aceita unidade com figura ou tecla; as duas leituras perdem esses casos |

### Medida ou rótulo

| Caso | O que acontece |
| --- | --- |
| Bootstrap T4 (validação) | O elemento escolhido é o cartão certo (12, em 4 por linha), mas mede 408 de altura contra 311 no rótulo: 31% acima, fora da tolerância. Contado como erro nas duas leituras |
| NYTimes T2, Thingiverse T2 (outros tecidos) | Rotulei "sem unidade" porque a página ao vivo mostrava verificação de robô e página de erro; o snapshot tinha o conteúdo. Contados como séries a mais |

## Rótulos em dúvida

Encontrei rótulos meus que parecem errados. **Não corrigi nenhum**; todos os números acima usam os rótulos como foram escritos.

- **IKEA T3** (trabalho): são os logos de pagamento do rodapé, não um widget de avaliação nem teclas. A leitura nova diz "imagem"; o rótulo dizia "tecla". O diagnóstico repetia o engano e foi corrigido nesse ponto.
- **NPR T6** (desenvolvimento): há 7 cartões de 330×134 no território; o rótulo dizia "sem unidade".
- **Bootstrap T4** (validação): na prancha, os cartões têm imagem, título e duas linhas de texto; a altura de 311 do rótulo parece ter deixado o texto de fora. Se este rótulo estiver errado, a precisão da validação seria 17 de 19 (89%). Não posso afirmar isso depois de ver o resultado; fica para a sua leitura da prancha.
- **Bootstrap T7** (validação): a foto da página ao vivo pegou a seção vizinha, deslocada em relação à captura.

No sentido contrário: contando o Sketchfab como erro de nível, a precisão da validação seria 15 de 19 (79%).

## Histórico das quatro versões

Todas no conjunto de desenvolvimento, antes do congelamento.

| Versão | Defeito encontrado | Correção |
| --- | --- | --- |
| 1 | Linhas de texto dentro de um cartão rebaixavam o cartão a agrupamento: 9 séries antes certas perdidas | Aninhamento decidido pelo arranjo (lado a lado × empilhado) e pela ocupação |
| 2 | Fileira de ícones lida como mosaico (Airbnb); duas camadas sobrepostas rebaixavam o item (Behance); cartão alto engolia duas linhas (Vimeo) | Mosaico exige duas linhas coladas; agrupamento exige dois itens internos que não se sobreponham; linhas por contenção mútua dos centros |
| 3 | Células de jogos fundidas com widgets da lateral (itch.io) | Conjuntos só se juntam sob pais de mesma largura |
| 4 | — | Congelada |

A leitura nova traz sete limiares próprios (semelhança de largura 35%, maioria 60%, ocupação 1/4 e 2/3, quase todos 80%, 10 caracteres, 2 glifos), todos escolhidos nesse conjunto. É a razão de a validação independente pesar mais que os 93%.

## Limites desta avaliação

- **Rótulos de uma pessoa só, que também escreveu a leitura.** Feitos antes de rodar, mas a partir de fotos da página ao vivo, com tamanhos estimados em vários casos e quatro rótulos em dúvida.
- **Amostra pequena.** 19 séries na validação; as 11 páginas seladas quase não tinham mídia.
- **A contagem de unidades não foi rotulada.** Nas séries que as duas leituras acertam, a contagem nova sobe onde entram os itens fundidos pela normalização (Flickr 17 → 45) e num caso dobra (Guardian T1, 6 → 12), mas cai em vários territórios (Allrecipes 25 → 12, NASA 22 → 15, GitHub 19 → 14, IKEA T2 9 → 6), porque conta só o conjunto escolhido e não todas as figuras de largura parecida. Não sei dizer qual das duas está certa nesses casos, e o número de fileiras que o `ensemble` usa sai da contagem.
- **Página ao vivo e captura são momentos diferentes.** Três rótulos foram afetados.
- **Efeito nas cidades desconhecido.** A leitura não foi ligada; nada aqui diz se as cidades melhoram.

## Recomendação

O critério de precisão não foi atingido, então a integração não decorre automaticamente desta etapa; a decisão é sua.

Minha leitura: a entrada do `ensemble` hoje acerta 5 a 6 séries em 10 fora das páginas de trabalho; a nova acerta entre 8 e 9, cobre o dobro dos territórios, não desce mais para componentes internos e não perdeu nenhuma série certa. Como entrada de um candidato experimental, é claramente melhor que a atual. Como leitura confiável, ainda não: sobram dois defeitos de seleção que produzem unidades falsas em territórios grandes (menu com painéis ocultos, botões de interfaces ilustrativas) e a contagem não foi verificada.

Dois caminhos coerentes com o que foi combinado:

1. **Manter o critério à risca.** Uma rodada de correção restrita a esses dois defeitos e à verificação da contagem, validada em páginas novas — as 39 de agora já foram vistas e não servem mais como validação independente.
2. **Aceitar o resultado como está** e ligar a leitura nova ao `ensemble` atrás da flag, sabendo que a precisão medida é 84% e que o Linear muda.

Eu recomendaria o primeiro só se a contagem e as unidades falsas pesarem na composição; isso se vê mais rápido no segundo, que é reversível e não toca o caminho padrão.

## Verificações

| | |
| --- | --- |
| Cidades do caminho padrão, 497 snapshots | Idênticas ao HEAD |
| Cidades com `ensemble`, 497 snapshots | Idênticas às de antes da leitura nova |
| Referências a `unitsOf` ou `unitGroups` fora de `series.ts` | Nenhuma |
| `npm test` | 256 passam, 0 falham |
| `npm run test:rendered` | Passa |
| `npm run lint`, `npm run typecheck` | Limpos |
| `series.ts` desde o congelamento | Inalterado (sha256 conferido) |

## Evidências

- Pranchas: `docs/morphology/sheets/reading/` ([índice](../sheets/README.md)).
- Instrumentos, rótulos, saídas das duas leituras e cópia do código congelado: `docs/morphology/archive/unit-reading-prototype-2026-10-12.tgz`.
- Snapshots da validação: `docs/morphology/recapture/reading-sealed/` (fora do git).
