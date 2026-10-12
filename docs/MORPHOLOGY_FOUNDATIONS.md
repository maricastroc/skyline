# Fundações estruturais: leitura estável e layout territorial

Rodada de 11/10/2026, sequência de [MORPHOLOGY_CONSOLIDATION.md](MORPHOLOGY_CONSOLIDATION.md). Nada foi ativado por padrão, nada foi commitado. Com todas as flags desligadas a medição reproduz `docs/morphology/baseline.json` linha a linha (30 de 30 páginas) e as suítes congeladas passam.

> **Encerramento, 12/10/2026.** As flags citadas aqui foram consolidadas em três (`reading`, `forum`, `market`) ou removidas. As decisões finais, o mapa de nomes e como reproduzir estes resultados a partir do arquivo estão em [MORPHOLOGY_CLOSING.md](MORPHOLOGY_CLOSING.md). Os links para `morphology/sheets-full/` apontam para pranchas em tamanho original que ficam fora do git.

## Veredito

1. **A instabilidade tem causa identificada e é da leitura, não da geometria.** Em 56 dos 61 casos em que um único item a mais ou a menos muda mais de 10% da planta, o que mudou foi o próprio plano (conjunto de territórios ou tecidos). Só 5 são geometria.
2. **A redução é mensurável e modesta.** Casos desproporcionais com um item editado: 27 para 19 em 217. Nas páginas que não guiaram as correções: 16 para 14. A meta que eu mesma propus na consolidação (28% dos casos para 10%) **não foi atingida**: 28% para 25%.
3. **A captura de páginas visuais tinha um defeito real e genérico**, e a correção funciona: SoundCloud passa de 1 para 16 imagens com endereço e deixa de ser lida como bairro residencial. Vale para qualquer página que só publica o endereço da imagem depois que ela carrega. Ganho material em 3 de 16 páginas lidas em navegador.
4. **A camada de layout territorial existe, está separada da geração de edifícios e é inerte por padrão.** Hoje tem um único consumidor. É uma base correta e ainda estreita: a avaliação crítica está na seção 7.
5. **Um caso de regressão claro:** Mastodon com a estabilização sozinha vira uma praça vazia. Com a leitura da rodada 1 junto, o problema some. As duas coisas precisam andar juntas ou não andar.

## 1. O que entrou e o que ficou de fora

Seguindo suas sete decisões:

| Decisão | Como foi respeitada |
| --- | --- |
| Área ligada a estrutura e importância, não a quantidade | `allocate()` intocado. O modelo novo registra quantidades ao lado da área, sem usá-las para dimensionar território |
| Conservar a contagem de elementos dominantes sem impor um edifício por grupo | O layout distribui dominantes até o limite que o tecido declara caber. Grupos que não cabem são dobrados num vizinho e contados (`groups`), não multiplicados |
| Preservar o baseline onde não houve melhoria | Padrão idêntico ao baseline. Nenhuma flag ligada |
| Não incorporar T1, G-a, G-b, I-b | Continuam como flags desligadas, sem novos usos |
| G-c e I-a apenas experimentais | Idem. O `i-c` (contagem conservada do fórum) foi o único protótipo tocado, para passar a ler do layout |
| Não adotar cidade menor com câmera próxima | `extent` não foi usado em nada desta rodada |
| Não reduzir flags antes de garantir reprodutibilidade | Nenhuma flag removida. São 37. Todos os braços relevantes têm nome em `geometry.ts` e comando na seção 9 |

Nenhuma família geométrica nova. Nenhuma regra por URL ou domínio (há um teste que falha se aparecer nome de site no código do layout). Duas páginas recusaram a captura (Behance, Tidal) e ficaram de fora.

## 2. Por que uma pequena mudança numa lista muda os territórios

Método: para cada uma das 135 páginas, remover e acrescentar um item da lista principal e comparar a planta resultante com o raster do próprio projeto. "Desproporcional" = troca entre construído e aberto em mais de 10% da planta **e** mais de 3 vezes a fração da lista que foi editada. Um rastreador novo (`trace-edit.ts`) compara regiões e territórios por chave para atribuir a causa.

Causas dos casos desproporcionais no baseline:

| Causa | Metade que guiou as correções (11) | Metade que não guiou (16) |
| --- | --- | --- |
| Uma ou duas regiões aparecem ou somem | 5 | 8 |
| Três ou mais regiões aparecem ou somem | 2 | 5 |
| O plano troca para blocos observados porque a cobertura nomeada cai abaixo de 50% | 2 | 0 |
| Uma região muda de tipo num limiar | 0 | 2 |
| Mesmas regiões e tecidos, só as proporções deslizam na alocação | 2 | 1 |

Na primeira metade eu abri caso a caso: os 5 da primeira linha são listas não reconhecidas em que **cada item é ele mesmo uma região**, e os 2 da segunda são capas editoriais em que o "item" é uma seção inteira. Na segunda metade o rótulo é o do rastreador, sem inspeção manual, de propósito: olhar esses casos os transformaria em casos de desenho.

O mecanismo do Hacker News, que é o caso mais didático: o `tbody` tem 30 linhas de história (peso 434) e 30 linhas de subtexto (peso 386). `repeated()` escolhe o grupo mais numeroso. Com uma história a menos, o subtexto passa a ser o maior grupo, a tag dele não passa no teste de item, o feed deixa de existir, a cobertura nomeada cai abaixo de 50% e o plano inteiro troca para blocos observados: **4 territórios viram 22**. A cidade com 29 itens é outra cidade.

Três padrões gerais saem disso:

- **Empates decididos por contagem crua.** Dois grupos irmãos quase do mesmo tamanho trocam de posição com um item.
- **Itens de uma sequência promovidos a seção.** Quando a lista não é tipada, a regra de seção pega cada item grande e faz dele um território.
- **Identidade derivada de posição e de contagem.** A semente de cada peça vinha do índice do território, e a chave de bloco observado incluía o número de itens ("td × 215"). Qualquer mudança a montante renomeava tudo a jusante.

## 3. Estabilização da leitura: três mudanças pequenas

Cada uma atrás de uma flag, todas desligadas.

| Flag | O que faz | Onde |
| --- | --- | --- |
| `steady` | Em `repeated()`, entre grupos de mesma assinatura com pelo menos 80% do tamanho do maior, vence o mais pesado, não o mais numeroso | `analyze.ts` |
| `runs` | Itens de uma sequência (8 ou mais irmãos repetidos que somam 40% ou mais do pai) não são promovidos a seção | `analyze.ts` |
| `ids` | Sementes das peças vêm da chave do território, não do índice. Chaves de bloco observado deixam de carregar a contagem | `district.ts`, `plan.ts` |

"Estabilizada" abaixo = as três juntas.

### Métricas antes e depois

Um item removido ou acrescentado, 217 casos em 135 páginas:

| | baseline | `steady` | `runs` | `ids` | estabilizada | leitura R1 | leitura R1 + estabilizada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Planta com qualquer mudança de altura (média) | 22,0% | 21,1% | 21,0% | 20,6% | **18,8%** | 22,8% | 20,0% |
| Construído ↔ aberto (média) | 8,2% | 8,0% | 7,7% | 8,1% | **7,4%** | 8,2% | 7,7% |
| Casos acima de 10% | 61 | 59 | 55 | 63 | **54** | 62 | 57 |
| Casos desproporcionais | 27 | 25 | 21 | 27 | **19** | 23 | **19** |
| Conjunto de territórios mudou | 50 | 48 | 41 | 50 | 39 | 42 | **37** |

Separado por metade do conjunto (a metade 0 guiou as correções, a 1 não):

| | Metade 0, baseline | Metade 0, estabilizada | Metade 1, baseline | Metade 1, estabilizada | Metade 1, leitura R1 + estabilizada |
| --- | --- | --- | --- | --- | --- |
| Casos acima de 10% | 29 | 23 | 32 | 31 | 27 |
| Desproporcionais | 11 | 5 | 16 | 14 | 11 |
| Conjunto de territórios mudou | 27 | 21 | 23 | 18 | 15 |

Outras perturbações, baseline para estabilizada:

| Perturbação | Qualquer mudança de altura | Construído ↔ aberto | Casos acima de 10% |
| --- | --- | --- | --- |
| Texto ±10% (270 casos) | 8,3% → 7,0% | 2,3% → 2,1% | 17 → 11 |
| Um link em dez removido (135) | 19,3% → 17,4% | 6,3% → 6,1% | 29 → 27 |
| Seção secundária removida (135) | 14,6% → 12,9% | 5,8% → 5,4% | 29 → 27 |
| Dois itens (207) | 29,2% → 26,2% | 11,2% → 10,4% | 79 → 71 |

### Leitura honesta desses números

- O ganho onde eu **não** ajustei nada é pequeno: 16 para 14 desproporcionais. A maior parte da melhora vistosa (11 para 5) está na metade que eu olhei para desenhar as correções. O número que representa generalização é o segundo, não o primeiro.
- `steady` não muda **nada** na metade de validação. É a correção certa de um defeito real (o do Hacker News), mas é um mecanismo, não um ganho geral de estabilidade.
- `ids` não reduz mudanças de planta em edição de item (61 para 63 casos). O que ele reduz é ruído de detalhe: qualquer mudança de altura cai em todas as perturbações (texto: 8,3% para 7,2%). Ele serve à identidade, não à estabilidade do plano.
- `runs` é quem carrega o ganho de plano (territórios mudando: 50 para 41) e é também quem traz o risco (seção 5).
- A leitura da rodada 1 **piora** a estabilidade geométrica geral em relação ao baseline (qualquer mudança de altura com link removido: 19,3% para 22,3%; em 964 casos, 98 pioram dez pontos ou mais e 53 melhoram). Com a estabilização junto ela volta ao nível do baseline (19,7%) e fica melhor em edição de item. Isso eu não tinha medido na rodada 1, que só olhou estabilidade no nível do plano.
- O que sobra depois das três correções: listas com menos de 8 itens e itens compostos virando região, tipos que trocam em limiares, e a alocação deslizando. Uma sonda para a última (`quads`, alinhar fronteiras a múltiplos de 4 lotes) **falhou**: 8,2% para 8,3%, 61 casos inalterados. Fica registrada como tentativa negativa.

### Identidades estáveis

Com `steady,runs,ids`, um item a menos em Hacker News, lobste.rs e Paul Graham mantém todos os territórios e todos os conjuntos sob a mesma identidade (4, 4 e 3). Está no teste `test:layout`, ao lado do teste que mostra o defeito sem a correção (4 para 22).

Limite: a identidade é estável para **territórios e conjuntos**. Itens individuais não têm identidade no modelo (acima de 20 itens a normalização já os agrupa e descarta a série), e subgrupos de estrutura são identificados pela ordem, então inserir uma sublista no meio renomeia as seguintes.

## 4. Captura de páginas visuais

O defeito: o renderizador local recusa todas as requisições de imagem. Páginas que só escrevem o endereço da capa depois do `onload` da imagem ficam com `img` sem endereço, o snapshot não vê conteúdo visual e a página é lida como texto.

A correção, opcional (`images: "placeholder"`, ou `SKYLINE_RENDER_IMAGES=placeholder`): a requisição de imagem é respondida da memória com um GIF de 1 pixel. Nada é baixado, a política de URL continua valendo antes, e o padrão continua sendo recusar. Há um teste com uma página de mentira que reproduz o padrão (0 capas com recusa, 6 com resposta local).

24 páginas visuais, 21 capturadas nos dois modos, 16 lidas em navegador:

| Página | Imagens com endereço | Imagens de conteúdo | Cidade (regras de hoje) |
| --- | --- | --- | --- |
| SoundCloud | 1 → 16 | 3 → 18 | parcelado 70% → mídia 63% (seção → vitrine) |
| Bandcamp | 13 → 153 | 42 → 152 | igual hoje (mídia 86%). Sob a leitura R1: feed parcelado 84% → galeria mídia 86% |
| 500px (nunca vista) | 0 → 60 | 3 → 53 | interativo 56% + contínuo 31% → vitrine 90% |
| Vimeo (nunca vista) | 22 → 34 | 28 → 40 | sem mudança de tecido |
| Pinterest | 25 → 35 | 26 → 37 | sem mudança |
| Bluesky | 60 → 69 | 60 → 69 | sem mudança |
| Mastodon | 3 → 6 | 4 → 7 | sem mudança |

O que **não** melhora, e por quê:

- Twitch (38 e 19 nos dois modos), Flickr, Deezer, Giphy, Imgur: já publicavam os endereços.
- YouTube: 0 imagens nos dois modos. O conteúdo não chega ao DOM no tempo de captura. Problema diferente, não tratado.
- Capturas estáticas (Letterboxd com 0 imagens, Audiomack com 90 elementos, Apple Music, Spotify): o modo só existe no renderizador. Enquanto as fases 2 e 3 da captura renderizada estiverem em espera, essas páginas não se beneficiam.
- Airbnb: 40 → 32 imagens, com 2640 → 2154 elementos. É variação de uma página viva entre duas execuções, não efeito do modo. Não atribuo.

Custo de tempo, numa execução por página (16 páginas renderizadas): média 8,9 s com recusa e 8,7 s com resposta local, mediana 8,9 s e 8,6 s. Sem custo médio mensurável, mas as páginas que ganham imagens demoram mais, porque o carregamento preguiçoso continua trabalhando: Vimeo +4,2 s, 500px +3,8 s, Bluesky +2,8 s, Bandcamp +2,0 s. Quatro ficam mais de 1 s mais lentas e quatro mais de 1 s mais rápidas. É uma execução só, então o ruído é grande.

Leitura crítica: a correção resolve a **perda de informação**. Ela não resolve o que a cidade faz com essa informação: SoundCloud corrigido vira a praça de torres genérica do tecido de mídia, igual a Bandcamp e 500px ([found-capture.jpg](morphology/sheets/found-capture.jpg)). A leitura fica certa, a identidade continua fraca. Isso é assunto da etapa de tipologias, que não comecei.

## 5. Casos de regressão

[found-regressions.jpg](morphology/sheets/found-regressions.jpg) mostra as cinco páginas que mais mudam em repouso com a estabilização (baseline, estabilizada, leitura R1 + estabilizada). Em repouso, `steady` não muda nenhuma das 30 páginas do benchmark; `steady,runs` deixa o plano idêntico em 125 de 135.

| Página | Territórios | O que acontece | Avaliação |
| --- | --- | --- | --- |
| **Mastodon** | 16 → 9 | As postagens deixam de ser falsos distritos e caem no "restante", cujo tecido herda os botões de cada postagem: 172 de 256 lotes viram praça. Edifícios: 79 → 54 | **Regressão.** Estruturalmente mais correto, visualmente pior. Com a leitura R1 a mesma página é lida como feed (65%) e vira cidade densa |
| Slashdot | 27 → 13 | Menos retalhos, quadras mais coerentes | Melhora |
| RubyGems | 35 → 5 | De galpões baixos e gramados para habitação densa | Muda o caráter. Mais fiel a uma lista de resultados, mas é outra cidade. Precisa do seu olho |
| OpenStreetMap diary | 26 → 7 | Mais denso, torre do relógio mantida | Melhora |
| PostgreSQL SELECT | 21 → 10 | Mesmo caráter, mais denso | Neutro a melhora |

Outros riscos conhecidos:

- **Degrau de 7 para 8 itens.** `runs` só protege sequências de 8 ou mais. Abaixo disso o comportamento é o antigo, então existe um ponto em que um item muda a regra aplicada. É o mesmo limiar que a leitura R1 já tinha.
- **`ids` muda todas as cidades uma vez.** Em repouso ele sorteia de novo os detalhes em 22 das 30 páginas do benchmark (cores, variantes, alturas dentro da mesma família; nenhuma acima de 0,05 na medida). Em [found-reference.jpg](morphology/sheets/found-reference.jpg) dá para ver: Hacker News, Wikipedia e Guardian mantêm caráter e composição, mas não são pixel a pixel as mesmas. Quem tem uma captura salva da própria página veria uma cidade ligeiramente diferente no dia da ativação.
- **Suíte congelada.** Com `steady,runs,ids` forçadas: 243 de 243. Com a leitura R1 junto: 242 (a mesma verificação de lobste.rs que procura a página pelo tipo antigo `faq`).
- **Leitura em páginas não vistas.** A estabilização não altera a leitura esperada nos conjuntos de validação (11 de 43 e 19 de 43, iguais ao baseline). Com a leitura R1: 24 e 27, contra 23 e 27 sem a estabilização.

## 6. A camada intermediária de layout territorial

Arquivo novo: `src/lib/pixelcity/kit/layout.ts` (155 linhas). Fica entre `allocate()` e `composePiece()`, e só é calculada quando um consumidor pede (`i-c` ou `census`). Com ela ligada e nenhum consumidor, 14 de 14 cidades do corpus saem idênticas.

O que o modelo representa:

| Conceito pedido | No modelo |
| --- | --- |
| Grupos | `LayoutGroup`: sublistas com título, grupos de controles, ou a lista inteira como um grupo |
| Quantidades | `counts.items`, `counts.controls`, `count` por grupo, `itemSize` |
| Importância | `importance.weight` e `tier`, copiados do plano, separados de `lots` |
| Relações espaciais | Ordem no documento, nível (`level`), contiguidade das peças de um conjunto, âncora. **Parcial**, ver seção 7 |
| Possibilidades de composição | `ROOM`: cada tecido declara, por tipo de peça, quantos elementos dominantes e quantas unidades comporta |
| Conjuntos arquitetônicos | `Ensemble`: um trecho contíguo de peças de um território, ligado a um grupo, com âncora e unidades |

A separação entre planejar e construir é esta: o **tecido declara capacidade** (`ROOM`), o **layout decide quanto vai em cada peça** (`PieceBrief`: dominantes, unidades, ordinal, se é a primeira do conjunto), a **geometria desenha o que recebeu**. `composePiece` deixou de contar por conta própria no único lugar em que contava (a função `conserved()` foi removida).

Evidência (`npm run test:layout`, 14 verificações):

- 846 de 846 peças recebem instrução; 316 conjuntos ordenados cobrem todas as peças; 463 de 463 grupos são carregados.
- craigslist: 7 territórios, 140 grupos (as sublistas com título de cada coluna chegam como grupos).
- Contagens conservadas onde o tecido declara capacidade: 15 de 15 territórios, 10 de 10 arcadas, 43 de 43 quiosques.
- ray.so: 4 arcadas para 4 grupos de controles (o protótipo `i-a` fazia 56). Desmos 5, Steam 24, LessWrong 28. Correlação de postos entre controles da página e quiosques construídos: 0,89 e 0,87.
- Mesma página, mesmo layout. Nenhum nome de site no código.

Visual: [found-layout-model.jpg](morphology/sheets/found-layout-model.jpg) (o modelo desenhado como planta, para craigslist, ray.so, Desmos e Hacker News) e [cons-forum-conserved.jpg](morphology/sheets/cons-forum-conserved.jpg) (o fórum lendo do layout).

## 7. Avaliação crítica da arquitetura resultante

O que ficou melhor de verdade:

- **Existe um lugar para a pergunta "quantos?".** Antes cada peça era composta sozinha e a cidade não sabia quantidades. Agora a quantidade é um dado do território, distribuído antes de qualquer edifício.
- **O contrato é pequeno e na direção certa.** Capacidade declarada pela geometria, decisão tomada fora dela. Acrescentar um segundo tecido é escrever uma linha em `ROOM` e ler o `brief`, sem tocar no layout.
- **Identidade virou propriedade explícita** (chave do território, id do conjunto), e é testada sob perturbação.

O que ainda não é o que o nome promete:

1. **O layout anota, não planeja.** Ele roda depois de `allocate()` e depois do corte das peças. Não pode pedir uma peça maior para uma âncora, fundir duas peças, nem mover um conjunto. "Planejamento territorial" no sentido forte exigiria que o corte das peças lesse o layout, e isso inverte uma dependência que eu não quis inverter sem evidência.
2. **Um consumidor só.** Dos 11 tecidos, apenas o interativo declara `ROOM`. Até um segundo tecido de natureza diferente (o parcelado, lendo `units`) usar o mesmo contrato, a generalidade do modelo é uma hipótese. O risco concreto é uma abstração moldada pelo fórum.
3. **Conjunto é um trecho do caminho em espiral, não uma forma.** Contíguo na ordem de alocação, sem noção de retângulo, frente ou vizinhança em duas dimensões. Serve para distribuir contagens; não serve ainda para compor uma praça com edifícios em volta.
4. **Relações espaciais estão pela metade.** O modelo tem ordem, nível e contiguidade interna. Não tem adjacência entre territórios nem relações de página como "coluna lateral ao lado do principal". Você pediu isso e eu entreguei parcialmente.
5. **Só contagens atravessam.** Tamanho médio do item está no modelo e ninguém o lê. A série de tamanhos nem chega, porque a normalização agrupa acima de 20 itens.
6. **A estabilização trata três mecanismos, não a natureza do problema.** A leitura continua sendo uma cascata gulosa com limiares duros, e a alocação continua proporcional e cumulativa. Enquanto for assim, sempre haverá um item que cruza um limiar. As saídas estruturais seriam histerese ou mistura suave perto dos limiares, e alocação ancorada por identidade em vez de posição cumulativa. Nenhuma das duas foi feita; a única sonda nessa direção (`quads`) falhou.
7. **Dívida de flags.** São 37, com interações (o caso Mastodon mostra que `runs` sem a leitura de listas é pior que nenhuma das duas). Manter todas é o que você pediu e é o certo por ora, mas o custo de raciocinar sobre combinações já é real.
8. **A validação não usou páginas novas para a estabilidade.** A "metade que não guiou" são páginas que já estavam no conjunto; apenas não foram olhadas para desenhar as correções. Páginas genuinamente novas só entraram na captura (12 tentadas, 9 capturadas nos dois modos). Um limiar novo ainda pede um terceiro conjunto.

## 8. O que eu ativaria, se a decisão fosse minha (não é)

| Item | Recomendação | Motivo |
| --- | --- | --- |
| `steady` | Pode ativar sozinha | Zero mudança em repouso nas 30 páginas, corrige o colapso do Hacker News, 243 de 243 |
| Captura com imagens respondidas da memória | Pode ativar no renderizador local | Sem download, sem regra por site, 3 páginas ganham leitura, nenhuma perde de forma atribuível ao modo. Custa 2 a 4 s a mais justamente nas páginas que se beneficiam, medido em uma execução |
| `runs` | Só junto com a leitura de listas da rodada 1 | Sozinha transforma o Mastodon em praça. Juntas dão o melhor resultado medido (territórios mudando: 50 → 37) |
| `ids` | Ativar junto com alguma outra mudança visível | Muda todas as cidades uma vez. Melhor pagar esse custo uma vez só |
| Camada de layout | Manter inerte | Só ganha sentido de produto quando um segundo tecido a consumir |
| `quads` | Descartar quando a limpeza de flags for liberada | Tentativa negativa |

Próximo passo que eu proporia, sem avançar para tipologias: fazer o parcelado ler `units` do layout (segundo consumidor, testa o contrato) e medir se a multiplicação de casas do Hacker News (30 itens, 422 casas) cai sem mudar a área. É o teste que decide se a camada é a base certa.

## 9. Como reproduzir

```bash
npx tsx scripts/morphology/measure.ts check none && npx tsx scripts/morphology/diff.ts check
```

(Deve imprimir "0 of 30 pages changed". Gera `docs/morphology/check.json`, que pode ser apagado.)

```bash
npx tsx scripts/morphology/geometry.ts run 0/1 "baseline|steady|runs|ids|stable|reading|reading+stable"
```

```bash
npx tsx scripts/morphology/geometry.ts report
```

```bash
npx tsx scripts/morphology/trace-edit.ts half=0 arm=baseline
```

```bash
npx tsx scripts/morphology/with.ts steady,runs,ids scripts/composition/check.ts
```

```bash
npx tsx scripts/morphology/recapture.ts && npx tsx scripts/morphology/recapture-report.ts
```

```bash
npm run test:layout
```

Resultados guardados: `docs/morphology/geometry.txt` (estabilidade), `docs/morphology/capture.txt` (captura), `docs/morphology/layout/*.json` (modelos), `docs/morphology/sheets/found-*.jpg` (comparações). Os snapshots de captura e os `.jsonl` intermediários estão no `.gitignore` da pasta.

## 10. Verificação final

- Flags desligadas: medição igual a `baseline.json` em 30 de 30 páginas.
- `npm test` (inclui `test:layout`), `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:rendered` (22 verificações): tudo passa.
- Nenhuma linha de comentário adicionada ao código. Nenhum commit, stash, merge ou release. Servidor de desenvolvimento parado e arquivos gerados na raiz removidos.

## Comparações visuais

- [found-hn-one-item.jpg](morphology/sheets/found-hn-one-item.jpg): Hacker News com 30 e com 29 itens, baseline e estabilizada. É a imagem que resume o problema.
- [found-reference.jpg](morphology/sheets/found-reference.jpg): 12 páginas de referência, baseline e estabilizada lado a lado.
- [found-regressions.jpg](morphology/sheets/found-regressions.jpg): as 5 páginas que mais mudam em repouso.
- [found-capture.jpg](morphology/sheets/found-capture.jpg): SoundCloud, Bandcamp e 500px nos dois modos de captura.
- [found-layout-model.jpg](morphology/sheets/found-layout-model.jpg): o modelo intermediário desenhado.
- [cons-forum-conserved.jpg](morphology/sheets/cons-forum-conserved.jpg) e [cons-forum-unseen.jpg](morphology/sheets-full/cons-forum-unseen.jpg): o fórum com contagem conservada, lendo do layout.
