# Interpretação semântica e morfologia urbana: estudo

Escrito em 11/10/2026 sobre `main`, sem commit. Parte das evidências de [RENDERED_CAPTURE_REPORT.md](RENDERED_CAPTURE_REPORT.md) e dos 34 pares de captura. Nenhuma mudança deste estudo está no comportamento principal: tudo fica atrás de flags desligadas por padrão, e o caminho do produto (`api/capture` e `kit-city.ts`) não passa flag nenhuma.

> **Encerramento, 12/10/2026.** As flags citadas aqui foram consolidadas em três (`reading`, `forum`, `market`) ou removidas. As decisões finais, o mapa de nomes e como reproduzir estes resultados a partir do arquivo estão em [MORPHOLOGY_CLOSING.md](MORPHOLOGY_CLOSING.md). Os links para `morphology/sheets-full/` apontam para pranchas em tamanho original que ficam fora do git.

> **Atualização, 11/10/2026.** A recomendação deste documento foi posta à prova em páginas novas e revista em [MORPHOLOGY_ROUND_1.md](MORPHOLOGY_ROUND_1.md). As regras `lists` e `item-form` descritas aqui não generalizaram como estavam; o diagnóstico e as tentativas que falharam continuam válidos.

## Veredito

1. **O problema não é só de rótulo, e corrigir o rótulo sozinho não muda a cidade.** Tirei o "showcase" do Bluesky e a cidade ficou idêntica; tirei o "pricing" do hn.algolia e a página virou 94 seções. Em cada um dos casos apontados há duas ou três causas empilhadas, em camadas diferentes.
2. **Parte da variedade de hoje é acidental.** 34% de todo o solo do benchmark está sob três rótulos de evidência fina (`showcase` 19%, `pricing` 9%, `faq` 6%). Esses acidentes fazem páginas parecidas gerarem cidades diferentes (HN é sobrados, hn.algolia é uma malha de cubos) e páginas diferentes gerarem a mesma cidade (Bluesky, Excalidraw e Spotify são a mesma cidade de torres).
3. **Há um conjunto pequeno que melhora a leitura sem estragar cidade boa.** Cinco intervenções (`lists`, `item-form`, `coverage`, `transient`, `avatars`) mudam 17 das 30 páginas, deixam 13 idênticas ao pixel da medição, melhoram com clareza seis cidades e têm um custo visível em uma (Airbnb). É o que recomendo levar para uma rodada formal.
4. **Nove das quatorze tentativas não entram**: quatro falharam e cinco não se provaram. São a parte mais informativa do estudo, porque mostram onde a interpretação correta produz uma cidade pior.
5. **Existe um limite real, e ele está na tradução, não na leitura.** Trinta páginas produzem quatro tipos de cidade, e dois dos tecidos do kit não sustentam uma cidade inteira. Interpretar melhor move as páginas entre os mesmos quatro tipos. O menor ajuste capaz de superar isso não é uma família nova de geometria: é fazer os tecidos que já existem lerem a anatomia do item, que já chega até eles e não é usada.

O critério de sucesso que você definiu (cidades de sites estruturalmente diferentes com organização e identidade distintas, vindas da interpretação) **é atendido em parte**. Depois do conjunto recomendado, HN, Mastodon, Bluesky, a documentação do Python, gov.uk e Guardian são cidades com tecido diferente por razão legível. Mas feed curto, índice de documentação e diretório continuam sendo a mesma cidade de sobrados, e ali a identidade ainda vem quase toda da paleta.

Pranchas: [famílias antes](morphology/sheets-full/families-before.jpg) e [famílias com o conjunto recomendado](morphology/sheets-full/families-recommended.jpg).

## 1. Método

**Benchmark fixo.** 30 páginas em 6 famílias, em `scripts/morphology/dataset.ts`. As famílias são agrupamentos meus para organizar a comparação, não verdade de referência.

| Família | Páginas |
| --- | --- |
| feed | HN, lobste.rs, Bluesky, Mastodon, hn.algolia, Twitch |
| docs | Python docs, Wikipedia, MDN, DevDocs |
| market | IKEA, craigslist, Airbnb, Spotify, Pinterest, SoundCloud |
| editorial | Guardian, NASA, Paul Graham |
| app | GitHub (repo), ray.so, YouTube, Excalidraw, Photopea |
| landing | portfólio, dois SaaS, Apple, gov.uk, Duolingo |

Quatorze vêm do corpus congelado e dezesseis dos pares de captura renderizada.

**Flags.** `src/lib/semantics/experiments.ts` registra 14 experimentos. O conjunto passa por `normalize`, `analyzeSemantics` e `planFromPage` a partir de `realPage`, e pela rota de depuração `/pixel/kit?exp=a,b` (só em desenvolvimento). Com as flags desligadas a medição reproduz o baseline byte a byte: conferi depois de cada alteração de código.

**Medição** (`scripts/morphology/measure.ts`). Por página: regiões, seções e profundidade; tipos atribuídos e sua evidência; territórios e fatia do maior; uso do solo por tecido; famílias de edifício; distribuição de andares; solo aberto; topo dos edifícios (mediana, q90, máximo). A distância entre duas cidades combina esses cinco eixos. `diff.ts` compara um braço com o baseline, `lists.ts` mostra as listas como a regra de feed as enxerga, `anatomy.ts` a anatomia do item, `decisions.ts` quem decide o uso do solo.

**Comparação visual.** `shoot.mjs` fotografa cada página em cada braço com a mesma rota, câmera, hora (dia), semente e viewport (1440×900). Cada intervenção foi fotografada isolada nas páginas que ela altera, e as combinações nas 30. A silhueta foi conferida com `?flat=1` nas páginas que mais mudaram.

**O julgamento visual é meu**, feito sobre as pranchas. Está escrito página a página para você poder discordar olhando a mesma imagem.

## 2. Diagnóstico: o que decide a forma de uma cidade

O caminho é `normalize` (árvore com papéis) → `analyzeSemantics` (regiões tipadas) → `planFromPage` (territórios com peso e mistura de tecidos) → `allocate` (256 lotes) → `composePiece` (edifícios).

**Quem escolhe o tecido.** Medido sobre o solo das 30 cidades:

| Decisão | Solo |
| --- | --- |
| Tabela fixa por tipo de região (`BY_KIND`, `plan.ts:57`) | 30% |
| Conteúdo medido (`softMix`, `plan.ts:93`) | 70% |
| ... que termina em um único tecido | 63% |
| ... que termina em mistura | 7% |

`softMix` é uma cadeia de prioridade com sigmoides quase binárias: tabelas, depois mídia, depois links, depois controles, depois texto. Na prática é uma árvore de decisão. Vira "mídia" qualquer região com 3 imagens ou mais e uma imagem a cada 500 caracteres.

**Quais tecidos existem na prática.** Quatro tecidos seguram 80% do solo:

| Tecido | Solo | O que constrói |
| --- | --- | --- |
| parcelled | 30% | sobrados em fileira ao redor de um quintal |
| media | 25% | torre com pódio e telão sobre praça |
| continuous | 16% | quadra de pátio e blocos em L |
| grid | 9% | nove módulos idênticos por quadra |

O tecido dominante de cada uma das 30 cidades: parcelled em 11, media em 9, continuous em 7, grid em 3. **Trinta páginas, quatro cidades.** Essa é a resposta medida para a pergunta do `PIXEL_FOUNDATION_V1` sobre as cidades parecerem variações do mesmo cenário.

**O que define altura.** Só duas coisas entram: a fatia do território e a verticalidade do fingerprint (fator de 0,7 a 1,3). Sobrados: `2 + log2(1 + 40w)` andares. Pátios: `3 + log2(1 + 20w)`. Grid: `3 + 0,5·log2(1 + 10w)`. Mídia: `6 + 10·(1 − e^(−w/0,08))`. Resultado medido: topos de sobrado entre 5,3 e 6,3; grid plano em 3,4 a 3,9; torres em 10,7 a 12,7. **A única fonte de altura é o tecido de mídia.** Das 9 cidades com q90 acima de 8,5, 8 são dominadas por mídia e a nona (o portfólio) tem 36% do solo em mídia.

**O que não chega à geometria.** A anatomia do item (`ItemForm`: quantos itens, quanto cada um diz, se mostra imagem) é calculada para todo território e chega até `composePiece`, mas só é lida por `simpleIndex` para escolher o uso "institucional". A contagem de itens só define de 2 a 6 unidades por fileira e satura com 21 itens. O tamanho absoluto da página não entra: os 256 lotes são sempre preenchidos, seja a página o Guardian (3.855 elementos) ou o ray.so (233 caracteres). A variação dentro de um território é sorteio com semente, não conteúdo.

**Concentração.** Em 9 das 30 cidades um território ocupa 75% ou mais. Regiões tipadas são atômicas (só `main`, `section`, `sidebar` e `page` são abertas) e a regra pega o nó mais externo que satisfaz o teste. Para uma página que é uma lista, isso é fiel: o HN é uma lista. O problema não é o distrito único, é que um distrito único é uma receita repetida 250 vezes.

## 3. Três tipos de problema

### 3.1 Classificação

A cascata de tipos testa evidência incidental antes da estrutural, com contagens absolutas e sem cobertura:

| Regra | Teste atual | Onde |
| --- | --- | --- |
| pricing | 2 textos com cara de preço (a palavra "free" conta) e 2 irmãos | `analyze.ts`, antes de feed |
| showcase | 4 imagens e menos de 140 caracteres por imagem | idem |
| faq | 3 elementos `<summary>` em qualquer lugar abaixo | idem |
| feed | 8 itens e **no máximo 5 links por item** | por último |

A regra de feed é a causa comum dos casos que você apontou. Ela exige até 5 links por item, e feeds reais têm de 6 a 10 (autor, hora, tags, comentários, votos):

| Página | Lista | Fatia da página | Por item |
| --- | --- | --- | --- |
| HN | 30 × `tr.athing` | 47% | 66 caracteres, 3,0 links |
| lobste.rs | 25 × `div.story_liner` | 96% | 137 caracteres, **9,7 links** |
| Bluesky | 21 × `div` | 96% | 373 caracteres, **8,6 links** |
| hn.algolia | 30 × `article.Story` | 85% | 305 caracteres, **6,1 links** |
| Mastodon | 20 × `article` | 62% | 658 caracteres, 0,3 links (só 10% dos itens têm link) |

A estrutura é inequívoca nos cinco casos. Só o HN passa. Os outros caem na primeira regra superficial que os alcança:

- **hn.algolia como "Pricing".** Evidência registrada: `2 prices: "$1", "free"; 30 sibling plans`. Uma manchete cita "$1", outra diz "free".
- **lobste.rs como "FAQ".** 24 `<summary>` na página, e a regra pede 3. O MDN tem 10 e também vira FAQ, em 73% do solo.
- **Bluesky como "showcase".** As 72 imagens "de conteúdo" são 32 avatares, 26 miniaturas e 14 capas de vídeo: 109 caracteres por imagem. Sem os avatares seriam 196 e a regra não dispararia.
- **Photopea como "Pricing"** em 81% do solo: `3 prices: "Free", "free", "free"`.
- **Guardian** com duas regiões "Pricing": `"free", "free"`.
- **Excalidraw como "showcase"** em 94%: 33 desenhos SVG de interface (logo, menu, barra de ferramentas, quase todos `role=img aria-hidden`) contados como imagens de conteúdo.

Três desses rótulos errados (lobste.rs, craigslist, Guardian) já estavam na lista de pendências do `PIXEL_FOUNDATION_V1`. O que este estudo acrescenta é a causa comum e o fato de que ela se reproduz no corpus congelado, não só nas capturas renderizadas.

### 3.2 Segmentação

- **ray.so, 20 seções aninhadas.** `classify.ts:122` dá papel de seção a qualquer classe com a palavra `module`. CSS Modules gera nomes `Frame-module__hash__local`. O infixo de uma ferramenta de build é lido como semântica.
- **YouTube, cada item de menu uma seção.** `classify.ts:121` dá papel de artigo a classes com `entry`, e o YouTube usa `ytd-guide-entry-renderer`. Como a página tem 344 caracteres ao todo, um item de menu sozinho já passa do piso de 2% do peso da página que a regra de seção exige.
- **Mastodon em 20 seções.** Consequência de 3.1: como a lista não é reconhecida, cada `article` vira seção.
- **Conteúdo sobreposto contado como página.** O gerenciador de consentimento OneTrust ocupa 8% do SoundCloud como território "Manage Consent Preferences".
- **Contêiner de seções tipado como uma coisa só.** O IKEA tem 12 seções irmãs, e o nó que as contém vira "pricing" de 75% porque preços aparecem em algum lugar lá dentro.

### 3.3 Tradução morfológica

Está na seção 2 e é o que sobra quando 3.1 e 3.2 estão certos:

- tecido decidido por uma tabela (30% do solo) ou por uma árvore quase binária (63%);
- altura decidida pela fatia do território, igual para toda página de lista única;
- anatomia, contagem e tamanho ausentes da geometria;
- qualquer coisa com imagens vira torre.

### 3.4 As causas se empilham

O Bluesky é o caso que prova isso. Três causas independentes levam ao mesmo resultado:

1. higiene de imagem (avatares contados);
2. ordem das regras (showcase antes de feed) e teto de links;
3. limiar de mídia do `softMix`.

Corrigir só a primeira (`avatars`) remove o rótulo "showcase" e a região passa a ser "remainder". O `softMix` vê 40 imagens em 7.600 caracteres e escolhe mídia. **A cidade se move 0,033 na medida e é visualmente a mesma** ([prancha](morphology/sheets-full/x-wrappers-avatars-nesting.jpg)). Por isso a correção pontual que eu tinha evitado no relatório anterior não teria resolvido.

## 4. Fidelidade estrutural e expressividade visual

O estudo confirmou que são coisas diferentes e que às vezes puxam em sentidos opostos.

- **Corrigir a leitura reduz a distância medida entre as cidades** (média de 0,446 para 0,417), porque elimina variedade que vinha de erro. Ao mesmo tempo as cidades passam a se agrupar melhor: o vizinho mais próximo pertence a outra família em 21 de 30 páginas no baseline e em 17 com o conjunto recomendado. Menos variedade, mais sentido.
- **Algumas cidades boas de hoje são mentiras bonitas.** O Excalidraw é uma cidade de torres vistosa construída sobre 33 ícones de interface. A versão fiel é uma praça quase vazia. A cidade de loja do IKEA, que combina com o site, vem de um rótulo errado ("pricing" sobre uma página que é quase toda vitrine).
- **A distribuição literal do DOM não é o alvo.** Uma lista que ocupa 96% da página ser um distrito de 96% está certo. O que falta é o distrito dizer que lista é aquela.
- **A métrica não julga.** O braço com a melhor separação por família (16 de 30) inclui a intervenção `cards`, que é a pior visualmente. Por isso nenhuma decisão abaixo se apoia na métrica.

## 5. Experimentos

Cada linha foi medida isolada. "Páginas" é quantas das 30 mudam.

| Flag | Hipótese | Camada | Páginas | Veredito |
| --- | --- | --- | --- | --- |
| `lists` | Uma série de irmãos iguais é uma lista antes de qualquer outra coisa; o tipo da lista vem dos itens | classificação | 12 | **entra** |
| `item-form` | A anatomia do item escolhe o tecido da lista | tradução | 0 sozinha, 3 com `lists` | **entra** (segunda versão) |
| `coverage` | Lista de preços exige um valor em dinheiro; FAQ exige que as respostas sejam a maior parte do texto | classificação | 5 | **entra** |
| `transient` | Gerenciador de consentimento injetado não é arquitetura da página | segmentação | 2 | **entra** |
| `avatars` | Imagem cujo endereço diz avatar é interface | classificação | 1 | entra, sem efeito visual próprio |
| `wrappers` | Infixo de CSS Modules não é palavra; um link curto sozinho não é seção | segmentação | 5 | certo, mas a cidade piora: **aguarda** |
| `rhythm` | O k-ésimo edifício tem a altura do k-ésimo item | tradução | 9 | inconclusivo |
| `extent` | Página com pouco conteúdo constrói uma vila | tradução | 2 a 30 | conceito certo, protótipo ruim |
| `decorative` | Ícone de controle não é conteúdo | classificação | 1 ou 2 | duas regras tentadas, nenhuma serve |
| `dialogs` | O que a página chama de diálogo não é arquitetura | segmentação | 4 | esvazia uma cidade boa |
| `majority` | Lista de preços exige preço na maioria dos itens | classificação | 2 | **falhou** |
| `nesting` | Contêiner de seções é aberto, não tipado | segmentação | 1 | **falhou** |
| `image-led` | Só conteúdo guiado por imagem é mídia | tradução | 10 | **falhou** |
| `cards` | Série longa de cartões com imagem é catálogo, não telão | tradução | 6 | **falhou** |

### 5.1 `lists`: a lista primeiro

Inverte a ordem da cascata. Se um nó tem 8 ou mais irmãos iguais que seguram 40% dele, é uma lista. O tipo sai dos itens: catálogo se a maioria tem preço e algum valor é citado; galeria se quase todos são imagem com legenda curta; diretório se cada item é um nome com um link; feed nos outros casos, **sem teto de links**. Um item que contém uma lista própria não é item, é seção, e o grupo não é tratado como lista. Um ancestral que é quase todo ocupado por uma lista não recebe tipo próprio.

Resultado ([prancha](morphology/sheets-full/x-lists.jpg)):

| Página | Antes | Depois | Visual |
| --- | --- | --- | --- |
| lobste.rs | faq 96% | feed 96% | igual (os dois eram sobrados) |
| hn.algolia | pricing 86%, malha de cubos | feed 86%, sobrados | melhor, e passa a ser da família do HN |
| Mastodon | 16 territórios, fragmentos | feed 63%, 9 territórios | melhor, quadras coerentes |
| Bluesky | showcase 96%, torres | feed 96%, sobrados | muda de identidade, ver 5.2 |
| gov.uk | feed 22% | directory 22%, lâminas institucionais | melhor, cidade distinta e adequada |
| Airbnb | 4 showcases, torres | 4 catálogos com preço, grid | **mais fiel e mais sem graça** |
| Pinterest, Spotify | showcase | gallery | igual |

`lists` resolve sozinha três dos casos que você pediu para investigar (Bluesky, hn.algolia, lobste.rs) pela mesma regra, sem tratar nenhum deles.

### 5.2 `item-form`: o item escolhe o tecido

Hoje todo feed vira sobrado por tabela. Com a flag, a mistura sai do item: item curto é sobrado, item que diz algo (acima de uns 220 caracteres) é quadra de pátio, e quando os itens mostram imagem 30% do solo recebe torres com telão.

Sozinha a flag não muda nada: os feeds que o baseline reconhece são todos de manchete. Com `lists`:

| Página | Item medido | Mistura |
| --- | --- | --- |
| HN | 30 itens, 46 caracteres | sobrados 100 (igual) |
| lobste.rs | 25 itens, 139 caracteres | sobrados 100 (igual) |
| hn.algolia | 30 itens, 149 caracteres | sobrados 83, pátios 17 |
| Bluesky | 36 itens, 205 caracteres, 1,1 imagem | sobrados 40, pátios 30, mídia 30 |
| Mastodon | 20 itens, 630 caracteres | pátios 100 |

É o resultado que mais se aproxima do seu critério: três feeds, três cidades, e a diferença vem do que cada item é. O Bluesky recomendado tem sobrados densos com torres no meio, e na minha leitura é tão bom quanto a cidade de torres original e mais verdadeiro ([prancha](morphology/sheets-full/rec-1-changed.jpg)).

### 5.3 `coverage`

- Preço: além de dois textos com cara de preço, exige um valor em dinheiro de fato. "free" três vezes não basta.
- FAQ: exige que o texto atrás dos `<summary>` seja a maior parte da região **e** que seja prosa, não lista de links. A primeira versão sem a segunda condição manteve o MDN como FAQ, porque a navegação lateral dele é toda em `<details>`.

Photopea deixa de ser malha de cubos e vira quatro quadras de "features", claramente melhor ([prancha](morphology/sheets-full/rec-2-changed.jpg)). Guardian e MDN mudam pouco. O IKEA mantém o rótulo, porque cita preços de verdade.

### 5.4 `transient` e `avatars`

`transient` tira do SoundCloud o território do OneTrust: 16 territórios viram 9 e a praça de consentimento dá lugar a edifícios. `avatars` não tem efeito visual quando `lists` está ligada. Recomendo porque corrige a contagem de imagens que alimenta o `softMix` e o fingerprint, mas não vou fingir que alguma imagem do benchmark melhora por causa dela.

## 6. Tentativas que falharam e regressões

**`majority` (maioria dos itens com preço).** A regra é a definição correta de lista de preços. O IKEA perde o rótulo, porque só parte das 12 seções tem produto com preço, cai em "showcase" e vira cidade de torres igual à do Spotify ([prancha](morphology/sheets-full/x-coverage-majority.jpg)). Perde-se uma cidade adequada para ganhar um rótulo exato. Sozinha, também transforma o hn.algolia em 94 seções.

**`nesting` (abrir contêiner de seções).** Abre o IKEA em várias vitrines pequenas. Cada uma vira um pedaço de tecido de mídia, que em lote pequeno é praça com uma torre. A cidade fica com grandes áreas de calçamento vazio ([prancha](morphology/sheets-full/x-wrappers-avatars-nesting.jpg)). Segmentação mais fina com o mesmo vocabulário de tecidos dá cidade pior.

**`image-led` (limiar de mídia mais exigente).** A ideia era parar de dar torre para texto ilustrado. Tira as torres do Guardian (q90 de 7,2 para 4,3; máximo de 11,8 para 6,3), do portfólio (8,7 para 5,2) e do SaaS ([prancha](morphology/sheets-full/x-image-led.jpg)). São três das melhores cidades do corpus, e ficam chatas. Como a mídia é a única fonte de altura, restringi-la sem dar altura a outro tecido só achata. **Não se deve mexer nesse limiar antes de existir outra fonte de altura.**

**`cards` (cartões com imagem viram grid).** Bluesky, Airbnb, Spotify, Pinterest e Duolingo trocam torres por malha de módulos idênticos ([prancha](morphology/sheets-full/x-cards-decorative.jpg)). Troca "tudo é torre" por "tudo é cubo", e o cubo é o tecido mais monótono do kit. Foi a tentativa que mais ensinou: a leitura "série de cartões é catálogo" é defensável, e o kit não tem um tecido bom para catálogo.

**Primeira versão de `item-form`.** Mandava itens com imagem para o grid. Bluesky ficava 57% cubos. Removi o ramo do grid pelo mesmo motivo.

**`decorative`.** Duas regras, nenhuma correta. "SVG inline com `aria-hidden` é ícone" conserta o Excalidraw e tira as torres do SaaS, cujas ilustrações de produto também são `aria-hidden`. "Desenho inline dentro de um controle é ícone" preserva o SaaS e não pega o Excalidraw, cujos ícones estão em `label`, não em `button`. Falta um sinal de tamanho que o snapshot não tem para SVG inline.

**`dialogs`.** Remover tudo que tem `role=dialog` tira do SaaS-2 (Vercel) um menu de navegação invisível, com 38 links, que ocupava 44 lotes como um bairro escuro denso. A cidade fica mais vazia. A remoção é correta, o resultado é pior, e separei da flag `transient` por isso.

**`wrappers`.** Corrige os dois erros que você apontou: ray.so vai de 22 regiões para 2 e YouTube de 27 para 12. No YouTube e no GitHub a imagem fica praticamente igual. No ray.so a cidade vira uma praça com 88% do solo, mais vazia que antes ([prancha](morphology/sheets-full/x-wrappers-avatars-nesting.jpg)). A segmentação errada estava, por acidente, dando edifícios a uma página que é quase só controles. Pela sua regra de que a mudança precisa preservar ou melhorar o visual, **não passa hoje**. Passa quando o tecido interativo souber construir mais que praça.

**`extent`.** Duas versões. A primeira media o tamanho pela quantidade de nós normalizados e encolheu as 30 cidades, porque o agrupamento de repetições comprime listas (Paul Graham: 2.165 elementos, 135 nós). A segunda mede o que a página diz e mostra (caracteres mais 150 por imagem) e só encolhe de verdade ray.so e YouTube. O mecanismo funciona e é mínimo: um número no plano, três linhas no `allocate`. O resultado visual não está pronto ([prancha](morphology/sheets-full/x-extent-transient.jpg)): o solo vago vira gramados chapados, e como a espiral termina na borda voltada para a câmera eles caem no primeiro plano. Em páginas a 85% ou 95% parece um parque arbitrário no canto.

**`rhythm`.** A altura de cada edifício de uma lista vem do item correspondente (raiz do tamanho relativo à mediana, entre 0,55 e 1,8), em vez de sorteio. O efeito existe e é pequeno: HN q90 de 6,1 para 6,6; os cubos do IKEA de 3,9 para 4,9. Com andares inteiros entre 3 e 6, mais ou menos um andar não se lê. Direção certa, amplitude insuficiente, não comprovado.

**Combinações.** `comb1` (primeira combinação, com `majority` e `nesting`) regrediu o IKEA. `comb3` (com `wrappers`, `decorative`, `rhythm` e `extent`) trouxe gramados no primeiro plano de HN, lobste.rs, Twitch e SoundCloud, tirou as torres do SaaS e deixou ray.so e Excalidraw quase vazios ([pranchas](morphology/sheets-full/comb3-3-app-landing.jpg)). O conjunto recomendado é o que sobrou depois de tirar tudo que causou regressão.

## 7. O conjunto recomendado nas 30 páginas

`coverage, avatars, lists, transient, item-form`. Pranchas: [parte 1](morphology/sheets-full/rec-1-changed.jpg), [parte 2](morphology/sheets-full/rec-2-changed.jpg), [silhuetas](morphology/sheets-full/rec-flat.jpg).

- **13 páginas idênticas na medição:** HN, Python docs, IKEA, craigslist, NASA, Paul Graham, ray.so, YouTube, Excalidraw, portfólio, SaaS, SaaS-2, Apple.
- **Melhoram com clareza (6):** hn.algolia, Mastodon, Bluesky, Photopea, gov.uk, SoundCloud.
- **Mudam sem ganho nem perda visível (10):** lobste.rs, Twitch, Wikipedia, MDN, DevDocs, Spotify, Pinterest, Guardian, GitHub, Duolingo.
- **Custo (1):** Airbnb. Torres viram grid de catálogo. É mais fiel, distingue o Airbnb do Spotify, e é uma cidade menos vistosa.

| | Baseline | Recomendado |
| --- | --- | --- |
| Tecido dominante por cidade | parcelled 11, media 9, continuous 7, grid 3 | parcelled 12, continuous 8, media 7, grid 2, archive 1 |
| Cidades com um território de 75% ou mais | 9 | 7 |
| Solo sob `showcase` + `pricing` + `faq` | 34% | 15% |
| Solo decidido pela anatomia do item | 0% | 19% |
| Vizinho mais próximo em outra família | 21 de 30 | 17 de 30 |

O teste de silhueta em `?flat=1` confirma HN e Apple inalterados.

## 8. O limite arquitetural e o menor ajuste

**Onde está.** Em `composePiece` (`kit/compose.ts`). O `switch` sobre o tecido é todo o vocabulário morfológico. Cada caso constrói a partir de tecido, tipo de peça, fatia do território, verticalidade e semente. O território inteiro está em escopo, com `items` e `structure`, e quase nada dele é lido.

Quatro consequências medidas:

1. **O vocabulário efetivo são quatro receitas.** Melhorar a interpretação reclassifica páginas entre as mesmas quatro. O conjunto recomendado prova: o Airbnb sai de "torres" e entra em "grid".
2. **Dois tecidos não sustentam uma cidade.** O grid (nove células idênticas por quadra) vira campo de cubos sempre que passa de metade do solo: Photopea e hn.algolia no baseline, o braço `cards` inteiro. O interativo (praça com no máximo dois quiosques por quadra, qualquer que seja o número de controles) vira praça vazia: ray.so corrigido. São justamente os tecidos para onde a leitura correta manda catálogos e aplicativos. Por isso, nesses casos, o erro de leitura dá cidade melhor que o acerto.
3. **Altura tem uma fonte e uma entrada.** Só a mídia é alta, e só a fatia do território a modula.
4. **A forma geral é constante.** 256 lotes sempre cheios, mesma malha, mesma espiral.

**O menor ajuste.** Não é uma família nova de geometria nem reescrever o pipeline. É tornar os tecidos existentes paramétricos na anatomia do item, que já está no território:

- grão: unidades por fileira e células por quadra vindas da contagem de itens, sem o teto de 6;
- altura: do tamanho do item, com amplitude maior que a do protótipo `rhythm`;
- praça interativa mobiliada pela quantidade de controles;
- um escalar de extensão no plano, lido por `allocate`.

As duas costuras já estão prototipadas e são pequenas: `Territory.rhythm` com `beat()` em `compose.ts` (umas 20 linhas) e `Plan.extent` em `territory.ts` (3 linhas). O que falta é desenho, não encanamento: decidir como um grid e uma praça ficam interessantes quando dominam a cidade. É trabalho de superfície e composição, as camadas congeladas, e precisa de rodada própria.

## 9. Recomendação

**Levar para uma rodada formal** (com congelamento, ANTES × DEPOIS e aprovação, como manda o `PIXEL_FOUNDATION_V1` §2), nesta ordem:

1. `lists`. Maior efeito, causa comum de três dos casos investigados. Risco: é a mudança de maior alcance (12 páginas) e mexe na ordem da cascata; precisa passar pelos testes de estabilidade a perturbação antes de entrar.
2. `item-form`, segunda versão. Depende de `lists`. Risco: três constantes (220 caracteres, 30% de telões, inclinação da sigmoide) calibradas olhando três páginas. Podem estar ajustadas demais a este benchmark.
3. `coverage`. Pequena, sem regressão observada.
4. `transient`. Pequena. Risco: a lista de nomes de produtos de consentimento envelhece.
5. `avatars`. Opcional, sem ganho visual próprio.

**Uma decisão sua dentro do item 1:** o Airbnb. Se a perda das torres incomodar, a saída é `lists` não criar catálogos com preço (as quatro fileiras voltariam a ser galeria e torres). Não testei essa variante.

**Guardar para a rodada de tradução**, que é onde está o limite: `rhythm`, `extent`, `wrappers` e a regra de ícones. `wrappers` é a que mais me incomoda deixar de fora, porque corrige dois erros reais, e a razão é só que o tecido interativo não aguenta a página corrigida.

**Não levar:** `majority`, `nesting`, `image-led`, `cards`, `dialogs`.

**Não avançar para as fases 2 e 3 da captura renderizada** por causa deste estudo. Nada aqui muda aquela conclusão.

## 10. O que está comprovado e o que é hipótese

Comprovado, com medição e imagem:

- a regra de feed rejeita feeds reais pelo teto de 5 links;
- os rótulos de Bluesky, hn.algolia, lobste.rs, Photopea, Guardian, MDN e Excalidraw vêm de evidência incidental, identificada caso a caso;
- corrigir o rótulo sem corrigir a regra seguinte não muda a cidade (Bluesky) ou piora (hn.algolia);
- 70% do solo é decidido pelo `softMix`, e 63 pontos desses 70 terminam em tecido único;
- a mídia é a única fonte de altura;
- o conjunto recomendado deixa 13 páginas idênticas e não destrói nenhuma cidade boa das 30.

Hipótese ou julgamento:

- "melhor", "igual" e "pior" nas tabelas são leitura minha das pranchas;
- as famílias do benchmark são rótulos meus;
- que tecidos paramétricos resolvam a monotonia do grid e da praça: o protótipo `rhythm` aponta a direção e não prova;
- que as constantes de `item-form` generalizem para fora destas 30 páginas.

Limitações:

- uma semente, uma hora do dia, uma câmera; a câmera enquadra o centro e a periferia não foi julgada;
- não rodei os testes de estabilidade a perturbação sobre as regras novas;
- 16 das 30 páginas dependem dos snapshots em `docs/rendered-capture/snapshots`, que estão fora do git;
- `majority` e `dialogs` foram separadas de `coverage` e `transient` no meio do estudo. As pranchas `x-coverage-majority` e `x-extent-transient` mostram a versão anterior, com as duas juntas.

## Arquivos

Código atrás de flags (desligadas por padrão):

- `src/lib/semantics/experiments.ts` (novo): registro das 14 flags.
- `src/lib/semantics/analyze.ts`: `lists`, `nesting`, `coverage`, `majority`, parte de `wrappers`.
- `src/lib/model/normalize.ts`, `classify.ts`, `src/lib/snapshot/media.ts`: `avatars`, `decorative`, `wrappers`, `transient`, `dialogs`.
- `src/lib/pixelcity/kit/plan.ts`: `item-form`, `cards`, `image-led`, `rhythm`, `extent`.
- `src/lib/pixelcity/kit/compose.ts`, `district.ts`, `territory.ts`: leitura de `rhythm` e `extent`.
- `src/lib/pixelcity/kit/real-page.ts`, `src/app/pixel/kit/page.tsx`: passagem das flags, só no caminho de depuração.

Ferramentas e evidências:

- `scripts/morphology/`: `dataset.ts`, `measure.ts`, `diff.ts`, `lists.ts`, `anatomy.ts`, `decisions.ts`, `shoot.mjs`, `sheets.py`.
- `docs/morphology/*.json`: medição de cada braço. `baseline.json` e `rec.json` são os dois que importam.
- `docs/morphology/sheets/`: pranchas. `docs/morphology/shots/` (fotos individuais, 76 MB) fica fora do git.

Os arquivos `comb1.json`, `comb2.json`, `comb3.json`, `rec-with-dialogs.json`, `r1-coverage-majority.json` e `r2-transient-dialogs.json` são registros históricos: foram medidos antes de eu separar `majority` e `dialogs` e de trocar a versão de `item-form` e `decorative`, e não se reproduzem com os mesmos nomes de flag.

## Verificação

Com todas as flags desligadas, depois da última alteração de código:

- a medição das 30 páginas é idêntica ao baseline gravado no início do estudo;
- `npm test`: 243 verificações, nenhuma falha;
- `npm run test:rendered`: passou;
- `npm run lint`, `npm run typecheck` e `npm run build`: sem erros;
- a rota de depuração não leva `docs/morphology` nem `docs/rendered-capture` para o build de produção (0 referências no trace).

Para reproduzir um braço:

```bash
npx tsx scripts/morphology/measure.ts rec coverage,avatars,lists,transient,item-form
```

```bash
npx tsx scripts/morphology/diff.ts rec
```
