# Identidade urbana: investigação

12/10/2026, branch `morphology/consolidation`, sobre `7b624b2`. Sequência de [MORPHOLOGY_CLOSING.md](../../MORPHOLOGY_CLOSING.md). Limite fixado no início: três hipóteses, uma rodada de validação.

> **Pranchas.** As pranchas deste relatório não estão mais na pasta ativa. Reconstruções reduzidas, feitas a partir das fotos que restaram, estão em `historical-sheets-2026-10-12.tgz` (arquivada); o nome de cada arquivo aparece ao lado da citação.

## Decisão

**Parar. Nenhuma das três hipóteses produziu ganho convincente e nada foi incorporado.** O código está idêntico ao último commit. Os protótipos ficaram só como patch de arquivo, para reproduzir as pranchas.

O motivo não é falta de regra de geometria. As duas variáveis que decidem se uma cidade parece outro lugar são a figura da cidade (onde há cheio e vazio) e a organização espacial da página. A primeira está fixa por decisões suas das rodadas anteriores, e a segunda não chega ao pipeline. Dentro do que sobra, o teto é baixo, e está medido abaixo.

## 1. Por que as cidades se parecem

Medido nas 30 páginas do benchmark, no comportamento padrão. Prancha: dez cidades inteiras, hoje (`identity-far-today.jpg`, no arquivo).

| Causa | Número | Camada |
| --- | --- | --- |
| Toda cidade é o mesmo quadrado cheio | 16 quadras, 256 lotes, solo aberto de 0% a 9% em todas | Geometria (e decisão: área é importância, não quantidade) |
| Monocultura | 16 de 30 cidades têm um único tecido em 70% ou mais do solo: 7 de sobrados, 5 de torres, 3 de cubos, 1 de quadras. Dentro de cada grupo só muda a paleta | Representação (um território, um tecido) e geometria (uma receita por tecido) |
| Altura em dois degraus | Topo mediano dos edifícios entre 2,8 e 6,7 em todas. O 9º decil vai de 3,4 a 7,2 nas cidades sem mídia e só passa disso, até 12,7, onde há torres de mídia | Geometria: a altura vem da fatia do território, com faixa estreita |
| Marco raro | 15 de 30 sem marco, 7 com um pavilhão de 3 ou 4 andares, 8 com marco alto | Leitura: o marco depende de um bloco de abertura de landing page |

Pares que, na prancha, se leem como a mesma cidade: Hacker News e Paul Graham, MDN e documentação do Python, Spotify e Airbnb.

Uma ressalva de fidelidade: Hacker News e o índice do Paul Graham **são** a mesma estrutura no DOM, uma lista plana de links. A cidade repetir isso não é erro de leitura. O que distingue os dois sites é desenho visual, e isso já vai para a paleta e o estilo.

## 2. O que do DOM chega, e onde se perde

| Informação | Chega até | O que acontece com ela |
| --- | --- | --- |
| Ordem e peso relativo das regiões | Geometria | Usada: sequência e área dos territórios |
| Tipo de conteúdo (texto, links, mídia, controles, tabelas) | Geometria | Usada: escolhe o tecido |
| Cores, tipografia, espaçamento, raio | Geometria | Usada: paleta e estilo arquitetônico |
| Sublistas com título | Geometria | Usada só nos sobrados (passagens entre grupos) |
| **Quantidade absoluta** (caracteres, imagens por território) | Plano | Chega certa e não é usada. Varia 160 vezes entre páginas (233 caracteres no ray.so, 37.888 na Wikipedia); por lote, mediana 14, 1º decil 1, máximo 209 |
| **Hierarquia entre regiões** (quem contém quem) | Semântica | Perdida no plano: os territórios são uma lista plana |
| **Níveis de título** | Plano | Agrupam sublistas dentro de um território. Como marco, só o `<h1>` de um bloco de abertura |
| Itens de listas longas | Normalização | Só os primeiros guardam tamanho próprio; os demais são agrupados |
| **Layout em duas dimensões** (colunas, barras laterais, faixas, o que aparece primeiro) | Não chega | O campo `box` existe no snapshot e nunca é preenchido |
| Tamanho real de imagens e de texto | Não chega | Só os atributos `width` e `height`, quando existem |

Limitações por camada:

- **Leitura.** Não há layout nem saliência visual. É a única limitação que impede, de fato, uma organização espacial fiel à página.
- **Representação.** O plano guarda fatias, não quantidades nem hierarquia. As quantidades estão lá e são confiáveis: os territórios somam de 90% a 110% do texto da página em 147 das 149 páginas com 500 caracteres ou mais. As duas exceções (um ensaio do Paul Graham e o arquivo do xkcd) perdem todo o texto, porque o texto próprio de um contêiner não entra em nenhum bloco observado. Não muda nenhuma cidade hoje, porque a geometria não lê quantidades.
- **Geometria.** Quadrado fixo, uma receita por tecido e por peça, altura pela fatia.

## 3. As três hipóteses

Cada uma em poucas linhas, com dados que já chegam ao plano, sem regra por site. Oito páginas contrastantes, mesma câmera, mesma hora e semente. Critérios: Hacker News e lobste.rs idênticos peça por peça; a cidade alterada deixa de se confundir com a gêmea da mesma família; nenhuma cidade perde o que tinha de melhor; a distância entre cidades (a medida de `scripts/morphology/measure.ts`) sobe de forma clara.

| Hipótese | O que faz | Efeito medido | Veredito |
| --- | --- | --- | --- |
| **H1. Altura pela quantidade** | A altura dos tecidos comuns acompanha os caracteres e imagens por lote do território, com faixa neutra em torno da mediana | Python docs: topo mediano 5,0 para 8,5. Distância média entre cidades 0,446 para 0,455 (+2%). Gêmeos 6 para 5. Hacker News e lobste.rs idênticos | **Não incorporar.** Direção certa, ganho pequeno |
| **H2. Torres contadas** | No tecido de mídia, uma torre por grupo real; o resto vira pavilhão baixo | Spotify 19 torres para 4, Airbnb 17 para 5. Distância média 0,446 para 0,416 (**−7%**) | **Descartar.** As cidades ficam mais parecidas |
| **H3. Marco do título** | Página com `<h1>` e sem bloco de abertura ganha o marco no centro | 5 de 30 páginas ganham marco. Distância média igual | **Não incorporar.** Visível em 2 das 5 |

Pranchas: H1 e H2 na cidade inteira (`identity-far-hypotheses.jpg`, no arquivo), H3 (`identity-far-monument.jpg`, no arquivo), e na câmera do baseline H1 (`identity-relief.jpg`, no arquivo) e H2 (`identity-towers.jpg`, no arquivo).

**H1.** É a única com direção certa. Nas 182 páginas capturadas, as que mais sobem são quase todas de leitura longa (especificação do W3C, Stanford Encyclopedia, Rust Book, Effective Go, blogs, Wikipedia) e as que mais descem são quase todas aplicativos sem conteúdo (ray.so, tldraw, Desmos, YouTube vazio). Por que não basta:

- É a mesma cidade esticada. Python docs fica mais alta e continua um tapete cinza de quadras; MDN e Python docs continuam gêmeas, só que mais altas as duas. Hacker News e Paul Graham continuam idênticos.
- Mexe em quase tudo um pouco: 151 de 182 páginas mudam, 62 de forma clara (41 sobem 25% ou mais, 21 descem 20% ou mais) e 89 só de leve. Essa segunda parte é variação cosmética.
- Sobrados e casas de telhado em duas águas com 8 andares ficam com proporção estranha. Exigiria trocar a família do edifício com a altura.
- Depende do que a captura enxerga. Uma loja lida com suas imagens sobe (GOG) e outra que chegou como esqueleto desce (Mercado Livre): páginas do mesmo tipo em sentidos opostos.

**H2.** Troca um campo de torres por um campo de pavilhões. Spotify e Airbnb continuam gêmeas e perdem a silhueta, que era o que tinham de mais vistoso. Linear perde três das suas torres. É a regressão que você pediu para evitar.

**H3.** O relógio numa praça no meio do craigslist é bom, e o pavilhão quebra a grade de cubos do Photopea. No Python docs o pavilhão de 4 andares some entre quadras mais altas que ele; no Airbnb e no Pinterest é mais uma torre entre torres.

## 4. O que as três ensinam juntas

**Um elemento só dá identidade quando contrasta com o entorno.** O relógio aparece na cidade baixa e desaparece na alta. A torre vale numa cidade sem torres. As cidades que hoje mais parecem lugares (Wikipedia, Linear, Mastodon) são as que têm vazio e um dominante ao mesmo tempo.

Num quadrado sempre cheio, com um tecido cobrindo 70% do solo, quase nenhuma página consegue produzir esse contraste. Altura, contagem e marco são ajustes dentro da mesma figura. Por isso o ganho ficou em 2%.

## 5. O que falta, e a menor intervenção

**Para organização espacial falta o layout da página.** Sem as caixas dos elementos não há como saber se a página é uma coluna, um corpo com barra lateral, faixas de largura cheia ou uma grade. A ordem no DOM, que é o que temos, já está toda usada.

- Menor intervenção: preencher o `box` que o snapshot já declara. Só a captura renderizada pode fazer isso: gravar o retângulo dos elementos grandes num atributo antes de ler o HTML (`render-page.ts`) e lê-lo em `parse-html.ts`. São dezenas de linhas, sem tocar em geometria.
- O limite: a captura renderizada só existe na máquina de desenvolvimento. Visitantes continuariam sem layout até as fases 2 e 3 de [RENDERED_CAPTURE_PLAN.md](../../RENDERED_CAPTURE_PLAN.md). Ou seja, identidade espacial depende do roteiro da captura, não de mais uma rodada de morfologia.
- Não testei isso. É hipótese, e só vale um protótipo (colunas da página escolhendo o percurso da alocação) depois que as caixas existirem.

**Para silhueta os dados bastam, e o que limita é a figura fixa.** O contraste que falta é o vazio. A forma mais direta de vazio (cidade menor com câmera próxima) você já recusou, e mantive a recusa. Existe uma variante que não testei e que não muda tamanho nem câmera: territórios quase sem conteúdo virarem jardim no lugar. O alcance é pequeno, perto de 3 das 30 páginas (ray.so, YouTube vazio, SoundCloud), e por isso não entrou no limite de três.

**Defeito achado de passagem:** o texto próprio de contêineres em blocos observados (seção 2). Só importa se as quantidades passarem a ser usadas.

## 6. Recomendação

1. Encerrar a rodada de hipóteses na geometria aqui.
2. Tratar a identidade na arquitetura do gerador, começando pelas caixas. A proposta está em [URBAN_PLAN_PROPOSAL.md](URBAN_PLAN_PROPOSAL.md). A recomendação original deste item, voltar à experiência jogável, partia de uma premissa errada: a morfologia vem antes.
3. Se, olhando a prancha, você quiser a H1 mesmo assim: são cerca de 45 linhas em `compose.ts` e `district.ts`. Precisaria de faixa neutra mais larga, troca de família com a altura e um teste ligado contra desligado. Eu não recomendo sozinha.

## Reprodução

Os três protótipos estão em `docs/morphology/archive/identity-prototypes-2026-10-12.patch` (nomes `relief`, `towers`, `monument`).

```bash
git apply docs/morphology/archive/identity-prototypes-2026-10-12.patch
```

Com o servidor de desenvolvimento no ar:

```bash
BASE=http://localhost:3100 FORCE=1 VIEW_QUERY="time=day&view=street&focus=0,0&zoom=0.5" node scripts/morphology/shoot.mjs id-relief relief far docs reference hn
```

Com o patch aplicado e nenhum experimento ligado, as 248 capturas locais geram cidades idênticas, peça por peça, às do último commit.

## Limitações

- O julgamento visual é meu, em duas câmeras, uma hora e uma semente.
- Oito páginas para as pranchas; os números de alcance vêm de 30 (benchmark) e 182 (todas as capturas locais).
- Os limiares da H1 foram escolhidos uma vez, pela mediana do corpus, e não ajustados depois.
- A medida de distância entre cidades não enxerga um marco isolado; na H3 vale a prancha.
