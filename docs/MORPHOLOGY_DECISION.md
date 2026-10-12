# Decisão morfológica e consolidação

12/10/2026, branch `morphology/consolidation`. Fecha a sequência de experimentos descrita em [morphology/history/](morphology/history/README.md): das hipóteses de geometria ao `ensemble` e à leitura das unidades. A alternativa C foi aprovada e **está consolidada no código**. As seções "Decisão" e "O que foi consolidado" dizem o que vale hoje; as seguintes são a comparação que levou à escolha.

Consolidar C encerra a sequência de experimentos e dá uma base estável. **Não resolve a identidade arquitetônica dos sites**, que continua sendo o objetivo aberto.

## Decisão

**C — uma versão conservadora do `ensemble`, alimentada pela leitura nova (`unitsOf`).**

Fica a parte do `ensemble` que só acrescenta: as frentes baixas que acompanham a torre, em número e arranjo dados pelos itens da página. Saem as três regras que trocam ou rebaixam o que a cidade de hoje já tem.

| Regra do `ensemble` | Lê da página | Decisão |
| --- | --- | --- |
| Itens por fileira → quantas frentes baixas entram na quadra | itens por fileira | **Manter** |
| Largura da frente → sobrados geminados ou edifícios isolados | itens por fileira | **Manter** |
| Uma fileira ou várias → frentes numa face ou em duas | arranjo | **Manter** |
| Proporção do item → altura das frentes, limitada à do anexo | proporção | **Manter** |
| Proporção do item → família da torre (esguia, lâmina) | proporção | **Retirar** |
| Título do grupo → altura das quadras sem cabeceira | grupos, título | **Retirar** |
| Teclas → quiosques no lugar do anexo | tipo "tecla" | **Retirar** (território de teclas fica com a receita de hoje) |

Por quê, em três linhas:

- **A leitura nova é a que deve alimentar a base.** A antiga molda cidades inteiras por unidades falsas: chips no Pexels, avatares no Vimeo, ladrilhos de mapa no OpenStreetMap.
- **O `ensemble` completo (A) distingue mais os sites, mas piora a arquitetura** em metade do solo que governa, e amplia qualquer erro de leitura para a cidade toda.
- **A versão conservadora nunca tira nada da cidade de hoje.** Nas 97 páginas medidas, nenhuma torre some, nenhuma cidade fica mais baixa, nenhum edifício se sobrepõe; ela acrescenta frentes em 32 páginas e deixa as outras 65 idênticas.

**O que esta decisão não resolve: a identidade entre sites.** Em C, as cidades de mídia continuam sendo cidades de torres; o que muda entre elas é a segunda camada (nenhuma frente, um ou dois edifícios, um muro de sobrados, um pátio). É uma base defensável, não a solução da identidade.

## O que foi consolidado

### Código

| Onde | O que ficou |
| --- | --- |
| `acquisition/render-page.ts` | O passe de medição: caixa e tamanho de fonte de cada elemento visível e com área. Tem orçamento de 1,5 s; se estourar, ou se a página medida passar do limite de tamanho, a captura segue sem caixas |
| `acquisition/rendered-capture.ts` | A captura renderizada local mede por padrão |
| `snapshot/parse-html.ts`, `model/normalize.ts` | `box`, `fontSize` e `layout` atravessam o snapshot e o documento normalizado. Sem `layout`, atributos de caixa no HTML são ignorados |
| `kit/series.ts` | `unitsOf`, a leitura das unidades |
| `kit/plan.ts` | Cada território de um documento medido recebe sua série, com uma linha no "porquê" |
| `kit/compose.ts`, `kit/district.ts` | `composeEnsemble`: a torre e o anexo de hoje, mais as frentes. Vale para território de mídia com série que não seja de teclas e oito lotes ou mais |

Saíram do código:

- a leitura antiga (`seriesOf`);
- a troca de família da torre pela proporção, a regra de título com as cabeceiras e os ramos de teclas;
- as flags `ensemble` e `units` (ficam as três já commitadas: `reading`, `forum`, `market`);
- restos de experimentos anteriores: a poda de elementos não vistos, os campos `ink`, `faded` e `unseen` com o cálculo deles na medição, a opção de capturar sem JavaScript e o script de captura do estudo.

Nenhuma receita, heurística ou família nova. Sem caixas, o caminho é exatamente o de antes. O código limpo reproduz a prévia peça por peça nas 97 páginas medidas.

### O fluxo real de captura e medição

1. `/pixel` envia a URL a `POST /api/capture`, em modo automático.
2. `acquire()` tenta a captura estática. Se ela volta com conteúdo, é a que vale: **sem caixas, cidade de hoje.**
3. Se a estática volta vazia ou como casca de SPA, e há renderizador, entra a captura renderizada. O renderizador local só existe na máquina de desenvolvimento (`SKYLINE_LOCAL_RENDERER=1`). **É só nessa captura que a medição acontece**, porque só ali existe um layout.
4. O servidor normaliza o snapshot; `box`, `fontSize` e `layout` seguem no documento que o cliente recebe.
5. No cliente, `buildKitCity` → `planFromPage` lê as séries → `generateKitDistrict` usa `composeEnsemble` nos territórios de mídia com série.

Qual captura o modo automático usa, em 14 páginas ao vivo (12/10/2026):

| Captura | Páginas | Itens chegam à cidade? |
| --- | --- | --- |
| Renderizada, porque a estática é casca de SPA | Pinterest, Vimeo, Airbnb, SoundCloud, Excalidraw | Sim |
| Estática | Spotify, itch.io, LEGO, Guardian, IKEA, Pexels, MUJI, Linear, Hacker News | Não |

**Consequência:** nas páginas que a captura estática resolve, o modo automático continua mostrando a cidade de hoje. Para essas, `/pixel` oferece a exploração detalhada descrita abaixo, que pede a captura renderizada só quando a pessoa quer. Em produção nada muda: não há renderizador, toda captura é estática e a opção não aparece.

### Como C chega ao produto: opções

A composição precisa de caixas, e caixas só existem depois de um layout. O HTML estático não as traz: em 12 páginas capturadas estaticamente, 30% das figuras declaram largura e altura no HTML e 5 páginas não declaram nenhuma; quantos itens cabem numa fileira não está no HTML em nenhuma, porque depende do CSS e da largura da janela. Qualquer caminho para C passa por um navegador.

Medido em 43 páginas ao vivo (12/10/2026), com a captura estática do próprio produto: 29 são lidas pela estática, 8 são casca de SPA e vão para a renderizada, 6 são bloqueadas e hoje dão erro.

| Alternativa | Espera | C aparece em | O que exige | Limites |
| --- | --- | --- | --- | --- |
| **1. Como está.** Estática primeiro; renderizada só para cascas de SPA | Cerca de 1 s; 3 a 16 s nas cascas | 8 das 43, só com renderizador | Nada | Invisível nas 29 páginas estáticas |
| **2. Levantamento detalhado a pedido.** A estática continua padrão; um controle explícito pede a captura renderizada | Cerca de 1 s por padrão; 3 a 16 s só quando a pessoa pede | Qualquer página que o navegador leia, a pedido; inclusive as 6 bloqueadas para a estática | Um controle na interface e a API dizer se há renderizador. A API já aceita `strategy: "rendered"` | Não é automático. A cidade renderizada é outra cidade, não a estática com acréscimos (o DOM montado difere) |
| **3. Passe leve automático.** O HTML estático já baixado é diagramado num navegador com scripts desligados e só o CSS carregado, e medido | +0,9 s na mediana (0,4 a 1,9 s): 0,3 s para abrir o navegador, 0,5 s de CSS e layout | 15 das 29 estáticas, mais as 8 cascas pela renderizada | Um caminho novo de captura e validação própria | É outra medição, não a validada: das 25 páginas em que a renderizada lê alguma unidade, coincide em 12, fica a um item por fileira em 4, erra em 2 e não lê nada em 7. Não resolve SPAs |
| **4. Em dois tempos.** Mostra a estática e troca pela renderizada quando chega | 1 s, e a cidade muda depois de 3 a 16 s | Todas, com renderizador | Fila de captura no cliente | A cidade muda sob os olhos da pessoa e a carga dobra |
| **5. Renderizada sempre** | 3 a 16 s em toda cidade | Todas, com renderizador | Uma linha | É o custo que não se quer pagar |
| **6. Inferir do HTML, sem navegador** | Nenhuma | — | — | Não há medida para inferir; seria uma heurística nova |

Sobre o passe leve (alternativa 3), que é a opção barata que existe:

- O DOM medido tem os mesmos elementos do snapshot estático nas 28 páginas testadas, e sem as caixas a cidade é exatamente a estática. As caixas só acrescentam.
- Onde acerta: Spotify, itch.io, LEGO, Books to Scrape, GOG, NASA, Sketchfab, Last.fm, Gutenberg, Bootstrap, NPR.
- Onde erra: sem scripts, o carrossel da Apple se desmonta numa faixa falsa de nove por fileira; no Meetup a grade principal some. Na MUJI o menu continua lido como cartões, como na renderizada.
- Onde não lê nada: IKEA, TED, The Verge, National Geographic, Emojipedia, Patagonia, GitHub. Os itens só existem ou só ganham tamanho com scripts.

**Sem renderizador (produção hoje):** toda captura é estática, nenhuma alternativa de 2 a 5 funciona e a cidade é a de hoje. O controle da alternativa 2 não aparece. O caminho para produção é a rota de renderização de `RENDERED_CAPTURE_PLAN.md` (fases 2 e 3, não feitas). Quando ela existir, o passe leve é o trabalho mais barato e mais seguro para rodar nela, porque não executa scripts da página.

**Decisão (12/10/2026): alternativa 2, como integração intermediária.** O que foi implementado:

- **A opção.** Sobre uma cidade vinda da captura estática, `/pixel` mostra "Explore in more detail". O texto diz que a página é vista como um navegador a mostra, para seguir como ela se organiza na tela, que leva alguns segundos e que pode construir uma cidade diferente. Não promete cidade melhor nem a mesma cidade com acréscimos.
- **Só onde existe renderizador de verdade.** `GET /api/capture` responde `{ detailed }` depois de tentar o renderizador: abre o navegador local e pede a versão, ou alcança o serviço remoto. Uma variável de ambiente ligada com um navegador que não inicia responde `false`. O resultado vale por um minuto.
- **O padrão não muda.** O modo automático continua sendo o de sempre, e a checagem do renderizador corre fora do caminho da captura: nenhuma captura estática espera por ela.
- **Reprodutível.** `?url=…&mode=detailed` abre direto no modo detalhado. Links sem o parâmetro, ou com valor desconhecido, continuam no automático.
- **Carregamento e falha.** Enquanto a captura detalhada corre, a cidade padrão fica na tela com um aviso de andamento. Se ela falha, a cidade padrão continua, um alerta diz o motivo e que aquela ainda é a cidade padrão, e a URL volta ao modo padrão. Num link direto que falha, a tela mostra a falha e oferece construir a cidade padrão; ela não é construída sozinha. O backend não troca um pedido de captura renderizada por uma estática.
- **Voltar.** Na cidade detalhada, "Standard view" volta à captura padrão; a cidade detalhada fica na tela até a padrão chegar.
- **SPAs.** Quando o modo automático já usou o navegador, a opção não aparece: a cidade já é a renderizada.

Conferido no produto, da interface até a API: Books to Scrape (estática, 44 estruturas) vai a 68 no modo detalhado e volta a 44; o link com `mode=detailed` reproduz a cidade detalhada; o Vimeo (SPA) chega renderizado sem a opção; com uma falha da captura detalhada a cidade padrão permanece com o alerta; e num servidor sem renderizador a opção não aparece e o link detalhado mostra a falha com a escolha de construir a cidade padrão.

**Esta é uma integração intermediária.** C continua dependendo de uma renderização para ter medidas reais: sem navegador não há caixas, e sem caixas a cidade é a de hoje. Em produção a opção fica oculta e C não aparece, até existir a infraestrutura de `RENDERED_CAPTURE_PLAN.md` (fases 2 e 3). O passe leve (alternativa 3) não foi implementado; continua sendo o candidato a tornar C automático, e pede validação própria.

### Testes

| | |
| --- | --- |
| `npm test` | 321 verificações, 0 falhas (256 anteriores, 49 de `test:items` e 16 da exploração detalhada em `test:warnings`) |
| `npm run test:rendered` | 34 verificações, 0 falhas (22 anteriores, 8 da medição e 4 da checagem do renderizador) |
| `npm run lint`, `npm run typecheck` | Limpos |

`npm run test:items` (`scripts/item-frontages/check.ts`) guarda os invariantes de C:

- **Leitura, em páginas sintéticas:** cartões repetidos são a unidade; uma fileira é faixa, várias são grade; miniaturas repetidas dentro do cartão não o substituem; item que é só figura é imagem; ladrilhos colados sem link não são série; fileira de botões pequenos é tecla; cartões empilhados não são série; itens fundidos pela normalização continuam contados; página medida que volta sem caixas não tem série e a cidade se constrói.
- **Composição, em seis páginas reais medidas contra o mesmo snapshot sem caixas:** a unidade esperada é lida; só as famílias baixas crescem; nenhuma família perde edifício; o edifício mais alto não cai; nenhuma sobreposição nova; com um item a menos, itens por fileira e arranjo se mantêm.
- **Controles:** Hacker News, Excalidraw e Linear saem idênticos, medidos ou não; a barra do Excalidraw é lida como teclas e fica com a receita de hoje.
- **Captura estática:** nenhum dos 20 snapshots estáticos do repositório carrega série.

`npm run test:rendered` ganhou, com um navegador de verdade: a medição dá caixa a cada elemento com área; sem ela não há caixa; medir não muda mais nada do que se lê da página; uma caixa escrita pela própria página não é aceita; a leitura estática do mesmo HTML ignora as caixas; a captura local mede por padrão; e uma página que só passa do limite de tamanho por causa das caixas é capturada sem elas.

A exploração detalhada tem suas verificações em `npm run test:warnings`: o texto diz que a cidade pode ser diferente e não promete que seja melhor; links sem modo ficam no padrão; pedir mais detalhe mantém a cidade padrão na tela; uma falha a deixa lá, com o erro ao lado, e nunca vira página vazia nem outra captura; um link detalhado que falha não constrói a cidade padrão sozinho. Em `test:rendered`, o renderizador só é dado como disponível quando o navegador de fato inicia: desligado, configurado com um binário que não é navegador, ou em build de produção, a resposta é não.

Esses testes guardam estrutura, não beleza. "Só acrescenta" garante que a torre, o anexo, as coberturas e a silhueta de hoje continuam lá; não garante que a quadra com mais edifícios fique melhor. Isso foi julgado nas pranchas, caso a caso, e precisa continuar sendo.

### Desempenho

| | Sem medição | Com medição |
| --- | --- | --- |
| O passe de medição, cronometrado dentro da página (14 páginas ao vivo, até 4.700 elementos; duas responderam à sonda com página de bloqueio) | — | 0 a 10 ms |
| Serializar o HTML da página | 2 a 91 ms | 1 a 87 ms |
| Tamanho do HTML capturado | — | De +0,5% (Airbnb) a +69% (Hacker News, de 35 para 59 KB). Maior alta absoluta: 124 KB (Guardian). A maior página, IKEA, vai de 2,47 para 2,54 MB, contra um limite de 4 MB |
| Captura renderizada inteira (5 páginas, 2 vezes cada) | 3,0 a 13,7 s, mediana 6,8 s | 3,6 a 16,4 s, mediana 6,7 s |
| Normalizar o snapshot (mediana em 97 snapshots medidos) | 0,6 ms | 0,7 ms |
| Ler as séries e planejar | 1,4 ms | 1,9 ms; maior aumento numa página, 5,5 ms |
| Construir a cidade | 13,2 ms | 13,6 ms |
| Documento enviado ao cliente | 171 KB | 187 KB (+7%; pior caso, +10%) |

A medição custa milissegundos numa captura de segundos; no tempo total, a variação da rede é maior que qualquer diferença. Duas proteções cobrem os casos fora da amostra: o passe para em 1,5 s, e se o HTML medido passar do limite de tamanho a página é capturada sem caixas, como antes.

O que mudaria o desempenho é outra coisa: usar a captura renderizada onde hoje basta a estática (cerca de 1 s contra 3 a 16 s por página). Isso não foi feito.

Nos 359 snapshots sem caixas disponíveis na máquina (estáticos e renderizados antigos), a cidade sai idêntica à do código commitado, peça por peça.

### O produto com C

[product](morphology/sheets/decision/product.jpg): a página `/pixel` de verdade, antes e depois, na máquina de desenvolvimento com o renderizador local.

- **Pinterest e Vimeo** chegam pela captura renderizada (a estática é casca de SPA). Depois da consolidação o documento traz caixas (240 de 369 nós no Pinterest, 164 de 552 no Vimeo) e a cidade ganha os edifícios baixos com telão ao redor das torres: Vimeo vai de 51 para 71 estruturas, Pinterest de 59 para 77. As duas capturas do Pinterest são de momentos diferentes da página ao vivo (11 e 13 territórios).
- **Spotify** chega pela captura estática e sai idêntica: 46 estruturas antes e depois.

### Limites que continuam abertos

| | |
| --- | --- |
| **Identidade** | As cidades de mídia continuam sendo cidades de torres; o que as distingue é a segunda camada. É o objetivo central e segue aberto |
| **Alcance no produto** | C só aparece quando a captura é renderizada: automaticamente nas cascas de SPA, e a pedido ("Explore in more detail") nas páginas estáticas, onde houver renderizador. Em produção não há, e C não aparece até a infraestrutura de `RENDERED_CAPTURE_PLAN.md` existir |
| **Leitura** | Precisão de 84% na validação independente. Menu com painéis ocultos lido como cartões (MUJI); carrosséis sob pais de largura diferente (IKEA); camada interna (Sketchfab); fronteira imagem × cartão; unidades sem figura não são lidas |
| **Captura** | Conteúdo em rolagem interna (Twitch, Apple Music); imagens que não carregam (Bookshop) |
| **Receita** | Grades de 5 ou 6 por fileira que ocupam a cidade toda repetem quatro edifícios soltos por quadra (LEGO, Last.fm); a praça encolhe onde entram frentes |
| **Fora do alcance** | Tecido de grade (BBC, MoMA), aplicações e teclas (Excalidraw), proporção do item |

## O que foi comparado

Três braços, nos mesmos 97 snapshots medidos (22 de trabalho, 25 novos, 11 recentes, 39 da validação), mesma câmera, hora e semente:

1. **Hoje.**
2. **`ensemble` com a leitura antiga** (`seriesOf`).
3. **`ensemble` com a leitura nova** (`unitsOf`).

Para ter o terceiro braço, a visão de desenvolvimento ganhou um seletor temporário (`exp=ensemble,units`), duas linhas em `plan.ts` e `experiments.ts`, removido na consolidação. Leitura, captura, tecidos, alocação e receitas não foram tocados durante a comparação.

| | Páginas |
| --- | --- |
| Idênticas nos três braços | 53 de 97 |
| Leitura antiga muda a cidade | 38 |
| Leitura nova muda a cidade | 41 |
| Os dois braços do `ensemble` diferem entre si | 34 |

## Pranchas

No repositório ficaram seis, o mínimo que sustenta a decisão. As outras desta rodada e das anteriores estão num pacote fora do git (ver "Estado").

| O que | Prancha |
| --- | --- |
| Cidade inteira, três braços: Pinterest, IKEA, Excalidraw, Airbnb, Spotify | [far-1](morphology/sheets/decision/far-1.jpg) |
| Cidade inteira, três braços: Pexels, Vimeo, Linear, MUJI, Guardian | [far-2](morphology/sheets/decision/far-2.jpg) |
| Hoje, `ensemble` completo e versão consolidada: IKEA, Books to Scrape, Sketchfab, MUJI, Twitch | [cidade](morphology/sheets/decision/conservative-1.jpg), [de perto](morphology/sheets/decision/conservative-close.jpg) |
| O produto antes e depois | [product](morphology/sheets/decision/product.jpg) |
| A leitura das unidades na validação independente: os erros | [validation-errors](morphology/sheets/reading/validation-errors.jpg) |
| Arquivadas | Outras 15 cidades em três braços (`far-3` a `far-5`), vistas sem cor (`flat-1`, `flat-2`, `conservative-flat`), quadras de perto (`close-1`, `close-2`), mais duas da versão consolidada (`conservative-2`, `conservative-3`) e os acertos da leitura (`validation-right`) |

Controles (Hacker News, Paul Graham, lobste.rs, Python docs, Wikipedia, MDN, GOV.UK, Vercel, Mastodon, ray.so, YouTube, portfólio) saem idênticos peça por peça nos três braços; não há prancha nova para eles.

## Os dez sites pedidos

| Site | `ensemble` + leitura antiga | `ensemble` + leitura nova | Contra hoje | Conservadora |
| --- | --- | --- | --- | --- |
| **Pinterest** | Dois edifícios com telão por quadra, em duas faces. A unidade lida é a miniatura interna, mas a cadência coincide | Os mesmos edifícios, numa face (unidade certa, uma fileira) | Melhor nos dois: quadra mais cheia e mais rica | Igual à nova |
| **IKEA** | Torres esguias lisas, anexo e um edifício; o rodapé de logos vira quiosques | O mesmo sem os quiosques, com duas cabeceiras em vez de três | De longe, mais leve. **De perto, pior:** a torre esguia é um prisma liso numa praça vazia | Torres de hoje, mais um edifício por quadra |
| **Excalidraw** | Torres em esplanadas, quiosques em duas faces | Idem, quiosques em fila única (a barra tem uma linha de 13) | Identidade própria, menos volume: 87 quiosques no lugar de 15 anexos | Igual a hoje |
| **Spotify** | Rua de sobrados com telões diante das torres | Idêntica à antiga | Melhor. Continua o caso mais convincente | Igual, com as torres na altura de hoje |
| **Airbnb** | Idem, com cinco frentes | Quase idêntica | Melhor | Idem |
| **Guardian** | Lâminas e torres esguias em seções pequenas | Idêntica à antiga | Igual a hoje | Igual a hoje |
| **Pexels** | Lâminas baixas e sobrados; a cidade perde as torres (topo de 11,2 para 6,2). A unidade lida são chips | Torres esguias lisas em praças vazias. A unidade está certa (fotos em retrato, 2 por fileira) | **Pior nos dois.** A antiga por unidade errada, a nova pela peça | Igual a hoje |
| **Vimeo** | Praças vazias com um quiosque; os anexos somem. A unidade lida são avatares | Torres, anexos e dois edifícios com telão por quadra | Antiga pior; **nova melhor** | Igual à nova, com as torres na altura de hoje |
| **Linear** | Idêntica a hoje | Meia quadra perde o anexo e vira praça com quiosques (botões de uma interface ilustrativa lidos como teclas) | Nova pior, num trecho pequeno | Igual a hoje |
| **MUJI** | Quase hoje, com sobrados (12 por fileira, unidade errada) | **Metade da cidade vira lâminas de vidro**, porque o menu do topo é lido como cartões deitados; os produtos são lidos certo | Nova: unidade falsa com impacto grande | Torres de hoje; a unidade falsa só acrescenta sobrados |

## O que as imagens mostram, por regra

**As frentes baixas são o ganho consistente.** Onde a página tem três ou mais itens por fileira, a quadra ganha de um a seis edifícios baixos ao lado da torre e do anexo. De perto as quadras ficam mais ricas (Pinterest, Airbnb, Vimeo, LEGO, itch.io; ver LEGO e Books to Scrape em [de perto](morphology/sheets/decision/conservative-close.jpg)); de longe a silhueta se mantém (Spotify, SoundCloud, Behance). É também onde a leitura nova mais contribui: Books to Scrape, GOG, Behance, SoundCloud e Open Library não eram governadas e passam a ser.

**A troca de família pela proporção é onde a qualidade cai.** Com a leitura nova, ela dispara em 35 dos 72 territórios governados, 44% do solo governado:

| Nas 44 páginas que algum braço muda | Hoje | Antiga | Nova | Conservadora |
| --- | --- | --- | --- | --- |
| Torres com pódio | 559 | 443 | 360 | 559 |
| Torres esguias | 0 | 39 | 97 | 0 |
| Lâminas | 72 | 149 | 174 | 72 |
| Quiosques | 299 | 458 | 389 | 299 |
| Edifícios baixos isolados e fileiras de sobrados | 1008 | 1344 | 1512 | 1512 |
| Páginas em que o edifício mais alto cai 2 ou mais | — | 6 | 6 | 0 |

- **Torre esguia** (IKEA, Pexels, Books to Scrape, Open Library, Patagonia, Genius): um prisma liso sem base. Sustenta a silhueta de longe e empobrece a quadra de perto. A leitura nova aumenta a incidência, porque o cartão com legenda é mais alto que a imagem sozinha.
- **Lâmina** (Sketchfab, Flickr, Coursera e, por unidade errada, Twitch, Bookshop e o menu da MUJI): a cidade inteira perde as torres e se lê como conjunto de blocos de vidro. No Twitch e no Bookshop o topo cai de 12,7 e 12,3 para 7,2.
- É a regra que transforma um erro de leitura em cidade diferente. Sem ela, o mesmo erro acrescenta alguns edifícios baixos.

**A regra de teclas tira volume.** No Excalidraw, a cidade inteira vira esplanada com quiosques. No Linear, um trecho perde o anexo por causa de uma leitura falsa. A leitura nova reduz muito as teclas falsas (de 28 séries "tiles" para 8 "tecla" no desenvolvimento), mas o caso verdadeiro continua mais vazio que hoje: falta uma peça entre o quiosque e o anexo.

**A regra de título rebaixa sem ganho visível.** Ela mantém a altura de hoje numa quadra por grupo e desce as demais para 67% a 92%. Com a leitura nova as razões de título cresceram, e páginas com um grupo só ficam com uma única quadra na altura de hoje; quando essa cabeceira cai numa peça pequena, a cidade perde o edifício mais alto (GOG, de 13,2 para 10,7; Pexels, de 11,2 para 9,7). As entradas dela (grupos e razão do título) nunca foram conferidas contra rótulos.

**Repetição.** Não apareceu matriz de cubos, trio repetido nem campo de quiosques fora do Excalidraw. O ponto fraco da regra que fica é a grade de 5 ou 6 por fileira que ocupa a cidade toda (LEGO, Last.fm): quatro edifícios soltos por quadra em doze quadras. De perto a quadra é boa; de longe e sem cor (prancha arquivada) lê-se como um campo de volumes parecidos em torno das torres.

## Leitura antiga × leitura nova, nas cidades

Dos territórios que o `ensemble` pode governar, 76 têm série em pelo menos uma leitura:

| | Territórios | |
| --- | --- | --- |
| A composição recebe o mesmo das duas | 33 | |
| Só a nova lê | 14 | 11 unidades certas, 2 falsas (menu da MUJI, botões do Linear), 1 com rótulo em dúvida (NPR) |
| Só a antiga lê | 4 | 3 mapas lidos como grade (Craigslist, Leaflet, OpenStreetMap), 1 sem rótulo |
| Recebe coisas diferentes | 25 | Detalhe abaixo |

Os 25 que diferem:

| Causa | Territórios | Casos |
| --- | --- | --- |
| **Erro de leitura da unidade, corrigido pela nova** | 12 | Pinterest, itch.io, Apple Music, Vimeo, Pexels, Coursera (2), LEGO, Meetup (2), MUJI (produtos), Kickstarter |
| **Unidade errada nas duas, ou sem rótulo** | 3 | Twitch, Bookshop, Patagonia |
| **Tipo** (ícones e avatares deixam de ser "tecla") | 3 | Airbnb (abas), IKEA (logos), GitHub (avatares) |
| **Contagem ou grupos, mesma unidade** | 7 | IKEA, NASA, Emojipedia, Allrecipes, Last.fm, Excalidraw, Guardian |

Nas páginas com unidade falsa de grande impacto, a diferença entre as leituras é esta: com a antiga, Pexels, Vimeo, itch.io, LEGO, Bookshop, Patagonia, Meetup, OpenStreetMap, Leaflet e Twitch; com a nova, Twitch, Bookshop e o menu da MUJI.

## A contagem de unidades

**A composição não lê a contagem.** Ela consome itens por fileira, arranjo (uma fileira ou várias), proporção e, no `ensemble` completo, grupos, razão do título e se as teclas têm duas linhas. A contagem só entra indiretamente, no arranjo e nos grupos.

- **Arranjo.** Foi rotulado e conferido no relatório anterior: certo em 36 de 36 séries certas da leitura nova.
- **Onde a contagem difere com a mesma unidade** (7 territórios), conferi as linhas e os títulos medidos na captura:

| Território | Antiga | Nova | O que a captura mostra | Efeito na quadra |
| --- | --- | --- | --- | --- |
| NASA | 22 em 4 grupos, grade | 15 em 3 grupos, faixa | 4 fileiras em 3 grupos com título: nova coerente | Frentes numa face em vez de duas |
| Allrecipes | 25 em 4 grupos | 12 em 2 grupos | 2 seções de 2 fileiras: nova coerente; a antiga soma fotos de outras faixas | Nenhum em C |
| Last.fm | 48 em 5 grupos | 36 em 3 grupos | 3 seções de 2 fileiras: nova coerente | Nenhum em C |
| Emojipedia | 11 em 3 grupos | 7 em 2 grupos | 2 seções: nova coerente | Nenhum em C |
| Excalidraw | 28 teclas, 18 por linha, 2 linhas | 13 teclas numa linha | Uma barra de 13: nova certa | Quiosques em fila única (em C, nenhum) |
| **IKEA** | 9 em 3 grupos | 6 em 2 grupos | 3 carrosséis de 3: **a nova perde um** | Nenhum em C |
| Guardian | 6 em 3 grupos | 12 em 5 grupos | 6 fileiras de 2 | Nenhum: a cidade sai idêntica |

- **Onde a contagem difere sem mudar nada:** Flickr (17 → 45, com os itens que a normalização funde) e Sketchfab (24 → 48, contagem dobrada por camadas internas).

Conclusão: as diferenças de contagem **não pioram a composição das quadras**. Na versão conservadora, o único efeito possível da contagem é pôr as frentes numa face ou em duas, e esse eixo está validado. Os erros de contagem que existem (um carrossel perdido na IKEA, camadas dobradas no Sketchfab) ficam sem consequência visual.

Separando o que é de quem:

| | Onde aparece |
| --- | --- |
| **Erro de leitura da unidade** | Twitch e Bookshop (captura incompleta), menu da MUJI, botões do Linear |
| **Erro de tipo ou contagem** | IKEA (um carrossel a menos), Sketchfab (camada interna, contagem dobrada), imagem × cartão em legendas curtas |
| **Limitação das receitas** | Torre esguia sem base, lâmina de orientação única, nada entre o quiosque e o anexo, cabeceira que pode cair numa peça pequena, quatro edifícios soltos repetidos em grades largas |
| **Diferença legítima entre páginas** | Rua de sobrados (Spotify, Airbnb, SoundCloud), pátio de edifícios (Pinterest, itch.io, Behance, LEGO), nada (Pexels com 2 por fileira), receita de hoje (Excalidraw, controles) |

## As quatro alternativas

| | Qualidade | Identidade | Coerência com a página | Páginas novas | Controles e estabilidade |
| --- | --- | --- | --- | --- | --- |
| **A.** `ensemble` + `unitsOf` | Melhor nas frentes; pior em 44% do solo governado (torre esguia, lâmina) e no Excalidraw | A mais forte dos quatro | Alta quando a leitura acerta; erro vira cidade inteira (MUJI, Twitch, Bookshop) | Mais governadas, com as mesmas quedas | Linear muda; 6 cidades perdem o edifício mais alto |
| **B.** `ensemble` + `seriesOf` | Igual a A onde as leituras coincidem; pior no resto | Forte, mas em parte por unidades falsas | Baixa fora das páginas de trabalho | Unidade falsa de grande impacto em 10 páginas | Controles intactos |
| **C.** Conservadora + `unitsOf` | Igual ou acima de hoje em todas as 97 | Parcial: só a segunda camada | Alta; erro de leitura acrescenta edifícios baixos e nada mais | 32 páginas mudam, nenhuma perde | Todos os controles idênticos, Linear incluído |
| **D.** Hoje | Referência | A mais fraca: toda página de mídia é torre, anexo e praça | Nenhuma relação com os itens | — | — |

- **B fica descartada.** Não há caso em que a leitura antiga produza cidade melhor por mérito: onde ela ganha (LEGO com sobrados, MUJI sem o menu) é por coincidência de uma unidade errada.
- **A não serve como base hoje.** Tem os dois defeitos que a rodada define como bloqueadores: regressão visual (IKEA e Pexels de perto, cidades achatadas) e unidade falsa com impacto arquitetônico grande (MUJI). A menor correção para os dois é não trocar a família da torre, que é a alternativa C.
- **D joga fora um ganho que se repete** em 32 páginas e não custa nada às outras.
- **C é a única sem regressão encontrada.**

## Prévia da versão conservadora

C é um subconjunto das regras existentes, sem regra nova. Antes da aprovação, apliquei as três remoções num patch temporário, medi as 97 páginas e fotografei as que importam. O código consolidado depois reproduz essa prévia peça por peça nas 97 páginas.

| Nas 97 páginas | |
| --- | --- |
| Idênticas a hoje | 65 |
| Diferentes de hoje | 32 |
| Edifício mais alto abaixo do de hoje | 0 |
| Alguma família com menos edifícios que hoje | 0 |
| Sobreposições novas | 0 |
| Edifícios acrescentados | 504 (455 isolados, 49 fileiras de sobrados) |
| Mediana de edifícios nas 32 | 58,5 → 75 |

O que a prévia mostra ([cidade](morphology/sheets/decision/conservative-1.jpg), [de perto](morphology/sheets/decision/conservative-close.jpg); as outras duas pranchas de cidade e a sem cor estão arquivadas):

- IKEA, Books to Scrape, Sketchfab, Flickr, Twitch e Bookshop mantêm as torres de hoje, na altura de hoje, e ganham edifícios baixos.
- Spotify, Airbnb, SoundCloud, LEGO, itch.io e Vimeo ficam como no `ensemble` completo, com as torres de volta à altura de hoje.
- MUJI mantém as torres e ganha sobrados, inclusive no território do menu: a unidade falsa continua lá, com efeito pequeno.
- Pexels, Excalidraw, Linear, Guardian e GitHub saem idênticas a hoje.

O custo visível é a praça: onde entram frentes, o espaço aberto da quadra encolhe, e em grades largas (LEGO, itch.io) a quadra fica cheia.

## Bloqueadores e melhorias futuras

**Bloqueadores da versão conservadora: nenhum encontrado.**

**Bloqueadores do `ensemble` completo, registrados para não voltar por inércia:**

- Troca de família pela proporção: regressão de perto, cidades achatadas e erro de leitura ampliado. Menor correção: não trocar a família (é C). Para a regra voltar, o kit precisa de torre esguia com base e de lâmina com mais de uma orientação.
- Regra de teclas: muda um controle (Linear) e esvazia o Excalidraw. Menor correção: não governar teclas (é C).

**Melhorias futuras, sem rodada obrigatória:**

| | |
| --- | --- |
| Leitura | Menu com painéis ocultos lido como cartões (MUJI); carrosséis sob pais de largura diferente (IKEA); camada interna (Sketchfab); fronteira imagem × cartão; unidades sem figura (cores de CSS, SVG) |
| Captura | Conteúdo em rolagem interna (Twitch, Apple Music), a regra adiada; imagens que não carregam (Bookshop) |
| Receita | Variar as frentes em grades de 5 ou 6 por fileira (LEGO, Last.fm); hierarquia entre quadras por título, com entradas validadas |
| Alcance | Tecido de grade (BBC, MoMA) e aplicações tipadas como interativas continuam fora |
| Identidade | Continua parcial. É o objetivo central e segue aberto |

## Estado

| | |
| --- | --- |
| Branch | `morphology/consolidation`, 7 commits à frente de `b1eb38d`. Consolidação preparada num commit local; sem merge, sem push |
| Rastreabilidade no repositório | Os relatórios das rodadas, em [morphology/history/](morphology/history/README.md). O código de cada protótipo descartado, como patches e pacotes pequenos em `docs/morphology/archive/` (0,7 MB ao todo); o estado inteiro antes da consolidação é `morphology-decision-2026-10-12.tgz` |
| Fora do repositório | Em `docs/morphology/archive-local/`, ignorada pelo git: as pranchas arquivadas (`morphology-sheets-…tgz`, `historical-sheets-…tgz`) e as fotos de rotulagem da leitura (`unit-reading-prototype-…-full.tgz`), 20 MB. Também fora: fotos brutas (`docs/morphology/shots/`) e snapshots de estudo (`docs/morphology/recapture/`). Nada disso é necessário para rodar ou testar o código |
