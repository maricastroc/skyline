# Encerramento da fase morfológica

12/10/2026, branch `morphology/consolidation`. Fecha a sequência [estudo](MORPHOLOGY_STUDY.md), [rodada 1](MORPHOLOGY_ROUND_1.md), [protótipos](MORPHOLOGY_PROTOTYPES.md), [consolidação](MORPHOLOGY_CONSOLIDATION.md) e [fundações](MORPHOLOGY_FOUNDATIONS.md).

## Conclusão

**Sim, a fundação morfológica está madura o bastante para avançar.** Não há bloqueador para a experiência jogável. O comportamento padrão é o baseline com duas correções comprovadas, as cidades de referência estão iguais, o código experimental caiu de 37 flags para 3, e tudo passa.

O que fica em aberto são melhorias desejáveis (fim da seção E), e nenhuma delas impede exploração, voo, interação ou destruição.

## A. Decisões finais

### Entrou no comportamento padrão

| Mudança | Evidência | Custo |
| --- | --- | --- |
| **Desempate estável** (antiga `steady`): entre grupos de irmãos quase do mesmo tamanho, vence o mais pesado | Corrige o colapso do Hacker News com uma história a menos (4 territórios viravam 22; agora 4 e 4). 132 de 135 cidades idênticas peça por peça; as 30 do benchmark idênticas ao baseline. Casos desproporcionais com um item editado: 27 para 25 | 3 páginas mudam de leve em repouso (lista awesome, repositório GitHub, Wikipedia renderizada): mesma estrutura, detalhes sorteados de novo. Conferidas visualmente |
| **Captura com imagens respondidas da memória**, no renderizador local | SoundCloud 1 para 16 imagens com endereço, Bandcamp 13 para 147, 500px 0 para 60. Genérica: age por tipo de recurso, depois da política de URL, nada sai da máquina | Sem custo médio: 7,6 s contra 7,4 s em 16 páginas, duas execuções cada. Vimeo (+3,6 s, e já bate no prazo de espera nos dois modos) e a busca do Hacker News (+1,0 s) ficam mais lentos; três páginas ficam mais de 1 s mais rápidas |

Dois ajustes pequenos entraram junto com a captura, achados ao avaliar custo e segurança:

- Imagens respondidas localmente não gastam mais o orçamento de 400 pedidos de rede (têm teto próprio de 400). Antes, uma página com muitas imagens podia esgotar o orçamento e perder pedidos de conteúdo.
- A resposta leva cabeçalho de CORS, para que imagens pedidas com `crossorigin` também carreguem. Há teste para isso.

`SKYLINE_RENDER_IMAGES=abort` volta ao comportamento antigo. Vale lembrar o alcance: a captura renderizada só existe na máquina de desenvolvimento, então esta mudança ainda não chega a visitantes.

### Não entrou, fica como experimento

| Flag | O que é | Por que não entrou |
| --- | --- | --- |
| `reading` | A leitura de listas validada na rodada 1 (antigas `coverage`, `lists2`, `whole`, `nodir`, `transient`, `item-form3`, `avatars`) mais a antiga `runs` | É a melhor leitura medida (desproporcionais 19, conjunto de territórios mudando em 37 casos contra 48 do padrão), mas entrega catálogos a um campo de cubos e páginas de controles a praças vazias. Só vale junto com tecidos melhores |
| `forum` | Praça cercada por arcadas com contagem conservada (antiga `i-c`), usando a camada de layout | Tipologia que você manteve como possibilidade. Sem uso no padrão |
| `market` | Mercado coberto para catálogos (antiga `g-c`) | Idem. Como está, ainda vira campo |

A antiga `runs` foi separada das outras duas correções de estabilidade, como você pediu, e **não** entrou sozinha: ela muda 7 páginas em repouso de forma grande e transforma o Mastodon numa praça vazia. Com a leitura de listas o problema some, por isso ela mora dentro de `reading`.

### Descartado

| Item | Motivo |
| --- | --- |
| `ids` (sementes por identidade) | Sorteia de novo os detalhes de 22 das 30 cidades do benchmark para reduzir 1 a 2 pontos de ruído de detalhe, sem reduzir mudanças de planta (61 para 63 casos). O ganho não paga o custo. Volta a fazer sentido se o estado de um edifício precisar persistir entre visitas |
| `quads` | Tentativa negativa: 8,2% para 8,3% |
| Consumidor do layout para o tecido parcelado | Experimento logo abaixo |
| G-a, G-b, I-a na regra original, I-b, T1, T2, T2s | Já recusados por você ou substituídos |
| `majority`, `nesting`, `narrow`, `min6`, `dialogs`, `image-led`, `item-form` 1 e 2, `feed-soft`, `cards`, `lists` 1, `wrappers`, `decorative`, `rhythm`, `extent` | Não generalizaram, ou dependiam de tipologias que não vêm agora |

### O experimento com a camada de layout

**Decisão: não incorporar.** A camada fica só como planejador do `forum` experimental.

O segundo consumidor foi o mínimo que dá à camada uma chance justa no tecido parcelado: um edifício de cabeceira por grupo real (esquina mais alta, com torreão), sem tocar na densidade. Seis páginas renderizadas na mesma câmera do baseline; a prancha mostra quatro: [close-layout-experiment.jpg](morphology/sheets/close-layout-experiment.jpg).

| Critério | Resultado |
| --- | --- |
| 1. Evitar multiplicação absurda de objetos dominantes | Não se aplica: o parcelado não tem esse defeito. As 56 arcadas eram de um protótipo, não do padrão |
| 2. Preservar densidade e caráter | Sim. Mesma quantidade de edifícios, fileiras e esquinas em todas as páginas; nenhum vazio novo, inclusive na página de 102 elementos |
| 3. Melhorar a relação entre grupos e estrutura urbana | **Não.** Na escala da cidade as versões são indistinguíveis |
| 4. Coerência entre famílias de página | Inócuo em todas, o que não é um ganho |
| 5. Simplicidade que justifique existir | **Não.** Cerca de 150 linhas e um censo para nenhum efeito visível |

Dois números explicam o resultado:

- Das 32 páginas com um quarto ou mais de tecido parcelado, **23 têm um único grupo por território**. Não há o que arranjar. Com o consumidor ligado, 16 das 32 ganham uma cabeceira ou nenhuma.
- Onde há grupos, o baseline já os expressa melhor. O `planFrontage`, que existe desde antes desta fase, traduz **159 de 234** grupos em trechos de fachada com passagens. A camada de layout alcança **107**, porque pensa em peças inteiras e a fachada pensa em vãos. No craigslist: 127 grupos, 59 expressos pela fachada, 27 pelo layout.

Ou seja: para o parcelado, a arquitetura certa já estava lá. A camada nova só rende onde há objeto monumental a contar (o fórum), e isso é tipologia futura. Estender a camada até a granularidade de vão seria criar a terceira arquitetura que você pediu para não criar. O consumidor do parcelado foi removido.

Sobre o Hacker News: nada mudou nele, e nada precisa mudar. Não tratei a repetição de casas como defeito.

## B. Comparação visual

[close-final.jpg](morphology/sheets/close-final.jpg), baseline e resultado final:

1. Hacker News: idêntico.
2. Hacker News com uma história a menos: no baseline vira outra cidade; no final continua a mesma.
3. Documentação do Python: idêntica.
4. Lista awesome: a maior mudança em repouso. Mesma estrutura, cores de um trecho mudam.
5. SoundCloud e 500px: antes lidos como bairro residencial, agora com as imagens que a página realmente tem.

Leitura crítica: nas duas últimas linhas da prancha a leitura fica certa e a cidade resultante é a praça de torres genérica do tecido de mídia. A identidade entre páginas visuais continua fraca. Isso é tipologia, não fundação.

## C. Verificação técnica

| Verificação | Resultado |
| --- | --- |
| `npm test` | 256 verificações: 244 das suítes congeladas (uma nova, a do Hacker News) e 12 do layout |
| `npm run test:rendered` | 22, incluindo capas com `crossorigin` |
| `npm run lint`, `typecheck`, `build` | Passam |
| Limpeza do código | As 6 combinações que sobrevivem geram cidades idênticas, peça por peça, às de antes da limpeza, nas 135 páginas |
| Padrão contra o baseline congelado | 30 de 30 páginas do benchmark idênticas; 132 de 135 do conjunto amplo |
| Suítes com `reading` forçada | 243 de 244. A que falha procura o lobste.rs pelo tipo antigo `faq` |

Estabilidade do padrão final, um item a mais ou a menos, 217 casos:

| | Baseline | Padrão final | Experimento `reading` |
| --- | --- | --- | --- |
| Planta com qualquer mudança de altura | 22,0% | 21,1% | 21,3% |
| Construído ↔ aberto | 8,2% | 8,0% | 7,8% |
| Casos acima de 10% | 61 | 59 | 57 |
| Desproporcionais | 27 | 25 | 19 |
| Conjunto de territórios mudou | 50 | 48 | 37 |

Limitações conhecidas, e se impedem o avanço:

- **A instabilidade a pequenas edições continua quase toda lá** (59 de 217 casos). Não impede: uma cidade é gerada de um snapshot e não muda durante a sessão. Só importaria se a página fosse recapturada no meio do jogo.
- **Imgur varia de 9 a 711 elementos entre execuções, nos dois modos de captura.** Comportamento do site, não do modo.
- **YouTube chega com 0 imagens.** O conteúdo não entra no DOM no tempo de captura. Não tratado.
- **A meta de 28% para 10% de casos grandes não foi atingida** (27%). Documentada, não perseguida.

## D. Estado da arquitetura

```
captura (estática, ou navegador local com imagens respondidas da memória)
  → snapshot → normalize → analyzeSemantics      leitura: regiões tipadas
  → planFromPage                                 territórios: peso, camada, mistura de tecidos
  → allocate                                     256 lotes num caminho em espiral
  → planFrontage                                 só parcelado: grupos reais viram trechos e passagens
  → composePiece → building                      uma receita por tecido e tipo de peça
```

- **Leitura** decide o que a página tem. A única mudança desta fase que ficou nela é o desempate estável.
- **Territórios** continuam dimensionados por estrutura e importância, não por quantidade de itens.
- **Layout**: o planejador que o padrão usa é o `planFrontage`. O `kit/layout.ts` é calculado apenas com `forum` ligado; por padrão não há censo nem layout (há teste para isso).
- **Geometria** não sabe quantidades, exceto no fórum experimental.
- **Experimentos**: `semantics/experiments.ts` tem 3 nomes, acessíveis só em `/pixel/kit?exp=`. O caminho do produto não passa nenhum. Um nome desconhecido gera aviso em vez de cair em silêncio no padrão.

Ficou mais simples: os arquivos rastreados diferem do último commit em 20 arquivos (+570, −67), contra 21 (+815, −96) no começo da rodada, e isso inclui a captura renderizada das fases 0 e 1. Seis scripts de estudo saíram; os instrumentos que ficaram (`measure`, `diff`, `geometry`, `stability`, `holdout`, `trace-edit`, `recapture`, `layout-map`, `shoot`) foram apontados para as 3 flags.

### Evidências e reprodução

- `docs/morphology/sheets/`: 15 pranchas em tamanho de leitura, 7,5 MB. As 42 originais (82 MB) ficam em `sheets-full/`, fora do git.
- `docs/morphology/archive/experiments-2026-10-12.tgz` (142 KB): todos os arquivos de código como estavam antes da limpeza, com as 38 flags. Para reproduzir um resultado antigo: checkout de `b1eb38d` numa pasta à parte, extrair o arquivo por cima, rodar o comando do relatório correspondente.
- `docs/morphology/archive/measurements/`: as medições por braço das rodadas anteriores.
- `geometry-final.txt`, `capture.txt`, `capture-cost.json`: números desta rodada.

## E. Próxima etapa do Skyline

O que o repositório já tem:

| | Onde | Estado |
| --- | --- | --- |
| Cidade isométrica com arrastar, zoom e giro | `/pixel`, `PixelScene.tsx` | No ar |
| Seleção sob o cursor por raycast | `PixelScene.tsx`, `nodeOf` e `unitOf` | No ar, mas a interface só resolve **território** |
| Cada peça sabe seu edifício | `Part.unit`, `trace.buildings[i].parts` | Existe, sem uso na interface |
| Colapso no shader | `aAnim.y` em `materials.ts` | Existe, nada escreve nele |
| Motor de destruição, destroços, som, integridade, registro | `/maquette`: `runtime.ts`, `Debris.tsx`, `Hud.tsx` | Funciona na maquete antiga, indexado por nó do DOM |
| Câmera de voo livre com pointer lock | `/maquette`: `Controls.tsx` | Idem, em perspectiva |
| Voo, avatar ou veículo na cidade isométrica | | Não existe |

**Recomendação: fazer do edifício a unidade de jogo em `/pixel`, e a primeira ação ser destruí-lo.**

1. Hover e clique passam a resolver o edifício, não só o território. O dado já chega até a cena.
2. Portar `CityRuntime.destroy` para intervalos de peças por edifício, escrevendo no `aAnim.y` que o shader já entende. Reaproveitar o escalonamento do colapso e os destroços da maquete, na linguagem de voxel. `R` reconstrói.
3. Só depois, voo.

Por que nesta ordem: todos os ganchos existem, o passo é pequeno e visível, e ele testa na prática a identidade dos edifícios, que é o que o resto da experiência vai precisar.

Uma decisão sua antes do voo: numa câmera ortográfica isométrica não existe "voar" sem escolher entre um avatar que sobrevoa a cidade com a câmera seguindo, ou um modo em perspectiva como o da maquete. São produtos diferentes.

O que a fundação garante a essa camada: mesmo snapshot, mesma cidade (há teste); índice de edifício e intervalo de peças estáveis dentro de uma cidade gerada. O que não garante: identidade de edifício entre duas capturas diferentes da mesma página. Só vira requisito se a destruição precisar sobreviver a uma nova visita.

### Melhorias desejáveis, para depois

- Tecidos de catálogo e de território interativo, que são o que destrava `reading`.
- Tirar a regra de painel de consentimento de dentro de `reading` quando a captura renderizada for para produção.
- Granulação do parcelado em listas com mais de 20 itens (Paul Graham sai com casas largas porque a contagem usa nós agrupados).
- Limiares suaves na leitura e alocação ancorada por identidade, se a estabilidade virar requisito.
- Fases 2 e 3 da captura renderizada.

## Estado do git

Consolidado em commits na branch `morphology/consolidation` no mesmo dia, a partir de `b1eb38d`: avisos de captura, captura renderizada local, desempate estável, os três experimentos atrás de flags, os instrumentos do estudo e estes documentos. Sem merge: `main` não foi tocada.
