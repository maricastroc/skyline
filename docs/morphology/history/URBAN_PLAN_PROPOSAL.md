# Planta: proposta de arquitetura para a identidade urbana

12/10/2026, branch `morphology/consolidation`, sem commit. Continua [URBAN_IDENTITY.md](URBAN_IDENTITY.md). É diagnóstico e proposta.

> **Pranchas.** As pranchas deste relatório não estão mais na pasta ativa. Reconstruções reduzidas, feitas a partir das fotos que restaram, estão em `historical-sheets-2026-10-12.tgz` (arquivada); o nome de cada arquivo aparece ao lado da citação.

> **Resultado.** O protótipo foi construído e avaliado no mesmo dia: a planta em duas dimensões foi descartada e a poda ficou para revisão. Ver [URBAN_PLAN_PROTOTYPE.md](URBAN_PLAN_PROTOTYPE.md), que também corrige a afirmação da seção 2 sobre a captura sem JavaScript.

## Resumo

1. **O gerador não enxerga a página, só a árvore do DOM.** A captura descarta o layout, o plano é uma lista de fatias e a alocação despeja essa lista numa espiral fixa. São três pontos de perda em sequência, e nenhuma regra de geometria recupera o que se perdeu antes dela.
2. **A maior perda medida não é a disposição, é a visibilidade.** Em 22 páginas capturadas agora com um passe de layout, o conteúdo que nunca aparece na tela pesa 69% no MDN, 57% na Apple, 55% no Spotify e 48% na Vercel. Tirar só isso muda o tecido de 82% dos lotes do MDN e de 10% ou mais em 10 das 22 páginas. Hacker News e Paul Graham ficam em 0%.
3. **Disposição em duas dimensões entre territórios existe em 4 das 22 páginas** (GitHub, Mastodon, ray.so, portfólio). É menos do que eu supunha. Na maioria, a estrutura em duas dimensões está dentro dos territórios: grade de cartões, linhas de lista.
4. **Proposta:** um modelo espacial medido da página e uma etapa nova de planta em duas dimensões no lugar do `allocate()`. A saída é o mesmo tipo `Allocation`, então a geometria não muda. Sem estrutura espacial na página, a planta é exatamente a de hoje.
5. **O que a proposta não resolve:** gêmeos que são a mesma estrutura (Hacker News e Paul Graham; catálogos de cartões com imagem) e a monocultura dentro de um único território grande. Para isso o layout fornece os dados certos (geometria do item, escala dos títulos), mas o consumo é no tecido, e esse caminho tem histórico ruim. Fica fora do protótipo.
6. **Dependência dura:** só um motor de layout mede isso. Testei o atalho sem navegador (ler `display: none` do CSS) e ele não serve: pega de 0% a 48% do que está oculto e esconde por engano 34% do GitHub.

Prancha: a página, a planta de hoje e a planta proposta, em 14 páginas (`layout-plans.jpg`, no arquivo).

## 1. Onde a informação espacial se perde

```
captura ─► snapshot ─► normalize ─► semântica ─► plano ─► allocate ─► peças ─► geometria
   ①                                              ②         ③
```

| Ponto | O que acontece | Consequência |
| --- | --- | --- |
| ① Captura | Mesmo a captura renderizada devolve só o HTML. O campo `box` do snapshot nunca é preenchido | Ninguém adiante sabe o que aparece, onde, nem de que tamanho. Menus fechados contam como conteúdo |
| ② Plano | `Territory` guarda fatia, tecido, camada e ordem. É uma lista | Não há onde escrever "ao lado de", "à esquerda", "vazio", "grande" |
| ③ Alocação | `allocate()` acumula as fatias ao longo de `lotPath()`, uma espiral fixa de 256 lotes | Toda relação entre territórios vira ordem. A forma de um bairro é um trecho de curva |

A geometria vem depois dos três. As hipóteses H1, H2 e H3 agiam nela, e por isso só conseguiam ajustar a mesma figura.

Como isso explica os quatro sintomas:

| Sintoma | Causa estrutural |
| --- | --- |
| Mesmo quadrado cheio | ③: a espiral preenche tudo; "aberto" só existe como efeito colateral de um tecido |
| Tecido dominante | ① em parte (menus ocultos inflam um tecido só) e, no resto, um território grande com uma receita por peça |
| Falta de contraste | ② e ③: não existem lado, borda, centro de bairro nem vazio como conceitos do plano |
| Layout da página ignorado | ① |

## 2. O que dá para recuperar, medido

Método: acrescentei à captura local um passe opcional que anota em cada elemento a caixa, a visibilidade, o corpo da letra e a área de texto, e levei esses dados até o modelo. É inerte por padrão (seção 8). Capturei 22 páginas em três condições: com JavaScript, sem JavaScript e com janela de 1100 px em vez de 1440.

| Informação | O que revela | Confiabilidade | Alcance nas 22 |
| --- | --- | --- | --- |
| **Visível ou não** | O que a página realmente mostra | Alta. Com e sem o critério de opacidade o resultado é igual em 19 das 22 e difere até 3 pontos em mais 2; a exceção é o Mastodon (91% contra 61%). Mesmo resultado sem JavaScript nas páginas servidas prontas | Muda 10% ou mais da cidade em 10; 29% ou mais em 4 |
| **Lado a lado, esquerda e direita** | Colunas: barra lateral, trilho, painel | Boa como relação, ruim como coordenada: a fração de largura muda com a janela em 6 de 10 páginas. A relação lado a lado se manteve em 2 das 3 que a tinham e sumiu na Wikipedia, que quebra o layout a 1100 px | Colunas entre territórios em 4 |
| **Geometria do item repetido** | Linha, cartão ou retrato; quantos por fileira | Alta | 15, parte delas com itens de navegação |
| **Escala dos títulos** | Maior título de 0 a 72 px. O corpo do texto não distingue nada (12 a 19 px) | Alta | Todas |
| **Vazio** | Território com caixa e sem tinta | Só no extremo. A cobertura de tinta como medida contínua não presta: imagem conta como tinta cheia e camadas sobrepostas passam de 100% | 4 |

Alguns números:

- **Visibilidade.** Fração do peso do DOM que tem caixa visível: MDN 31%, Apple 43%, Spotify 45%, Vercel 52%, IKEA 72%, Airbnb 76%, GitHub 77%, Hacker News e Paul Graham 100%. No Spotify e na Vercel, 21% e 17% dos lotes de hoje pertencem a territórios que não têm nenhuma caixa.
- **Item.** Largura por altura em pixels: Hacker News 700×19, GitHub 902×41, lobste.rs 946×59, GOV.UK 610×109 (linhas, proporção de 5,6 a 37); Airbnb 180×171, Spotify 152×152 (cartões, proporção 1); IKEA 232×434 (retrato, 0,5). Separa lista de catálogo sem depender de palavra como "free" ou de classe CSS.
- **Títulos.** 0 px no Hacker News, Paul Graham, ray.so e Excalidraw; 29 a 40 em documentação e referência; 56 a 72 em páginas de produto.

O que **não** se recupera:

- Páginas que só existem com JavaScript não têm layout sem ele (7 das 22). Continuam como hoje, com o aviso de esqueleto.
- Conteúdo atrás de interação (abas, sanfonas, carrossel fora da tela) some junto com os menus. É a página como ela se apresenta.
- Listas virtualizadas deixam caixas altas e vazias (Mastodon). Esqueletos de carregamento parecem vazio (YouTube).
- Duas capturas com JavaScript da mesma página podem divergir: o Pinterest veio com 18 elementos numa e completo na outra.

**Sem navegador não dá.** Ler regras `display: none` do CSS com o casador de seletores simples que o projeto já tem acerta 0% do oculto no MDN e 2% na Vercel, e esconde por engano 34% do GitHub.

**Sem JavaScript dá**, nas páginas servidas prontas: em 14 das 22 a captura sem JavaScript encontra os mesmos territórios (de 79% a 100% dos lotes) nas mesmas posições. As 7 restantes são esqueletos. A Apple é o caso à parte: o menu oculto dela é injetado por JavaScript, então só pesa na captura renderizada.

## 3. A proposta

**Princípio:** dar ao gerador um modelo espacial da página (o que aparece, onde, de que tamanho) e uma etapa de planta que trabalha em duas dimensões.

```
captura ──► [A] passe de layout: caixa, visível, corpo da letra        novo, opcional
normalize ─► [B] só entra o que aparece; cada nó guarda sua caixa      novo
plano ─────► território ganha moldura: lado, vazio, item, título       estendido
          ─► [C] planta: lados e vazios; no resto, a ordem de hoje     novo, no lugar de allocate()
peças ─────► geometria                                                 inalterada
```

- **A.** O navegador é usado como motor de layout. Funciona com ou sem JavaScript.
- **B.** Subárvores sem nenhuma caixa saem antes da leitura. Os pesos passam a ser do que aparece. A área continua ligada a estrutura e importância: nada aqui usa quantidade de conteúdo para dimensionar bairro, e nenhuma cidade encolhe.
- **C.** Recebe os territórios com moldura e devolve um `Allocation`, o mesmo tipo de hoje. Duas regras:
  - **Lados.** Territórios que a página põe lado a lado viram faixas da cidade na mesma ordem, esquerda no oeste. Dentro de cada faixa vale a espiral de hoje, restrita à faixa.
  - **Vazios.** Território com caixa grande e sem tinta vira solo aberto, do tamanho que já teria.
  - **Sem colunas e sem vazios, a faixa é a cidade inteira e o resultado é a alocação de hoje, lote por lote.** Não é um modo alternativo; é o mesmo código com uma faixa só.

Como cada aspecto da planta seria alimentado:

| Aspecto | Informação da página | No protótipo |
| --- | --- | --- |
| Do que os bairros são feitos | Visível ou não | Sim |
| Relações entre territórios | Lado a lado, esquerda e direita | Sim |
| Espaços abertos | Caixa sem tinta | Sim |
| Eixos | Fronteira entre coluna e corpo | Não. `planStreets` já faz avenida na fronteira entre camadas, mas só em linha de quadra; uma faixa de 2 lotes cai no meio da quadra |
| Densidade e grão | Geometria do item: linha, cartão, retrato | Não. Exige parâmetro no tecido |
| Marcos e silhueta | Escala dos títulos | Não. É parente da H1 e da H3, e só faria sentido depois de existir contraste de vizinhança |

O que a prancha de plantas mostra, antes de qualquer cidade:

- **Hacker News, Paul Graham:** planta igual à de hoje.
- **MDN:** de sobrados (o menu oculto) para quadras de leitura.
- **Apple:** some o "índice" que ocupava 48% e era o menu fechado; ficam as faixas de mídia.
- **GitHub:** a coluna da direita vira uma faixa na borda leste, em vez de uma mancha no canto.
- **Mastodon, portfólio:** faixas laterais nas bordas.
- **ray.so, YouTube:** solo aberto onde a página está vazia (12 e 72 lotes).
- **Spotify, Airbnb, Python docs, Wikipedia:** quase nada muda na planta.

## 4. O que a proposta não resolve

- **Gêmeos por estrutura.** Hacker News e Paul Graham são uma coluna de linhas. Spotify, Airbnb, IKEA e Pinterest são grades de cartões com imagem. Na planta continuam parecidos, e pela leitura do layout isso é fiel.
- **Monocultura dentro de um território.** Uma lista que é 95% da página continua sendo um território com uma receita. A diferença entre listas existe e é medível (linha de 19 px contra linha de 59 px contra cartão), mas vive no tecido.
- **O quadrado.** A cidade continua do mesmo tamanho. A figura só muda onde a página tem vazio ou coluna.
- **Aplicações.** Um editor em canvas expõe uma moldura (barras e palco) e quase nenhum conteúdo. O layout dá a moldura; não inventa o resto.

Se o protótipo confirmar que a planta enxerga e a cidade muda, a continuação natural seria o tecido ler a moldura (item e título). Não estou propondo isso agora.

## 5. Riscos

| Risco | Tratamento |
| --- | --- |
| Podar o invisível remove conteúdo legítimo (abas, sanfonas) | Critério conservador: sai só o que não tem caixa nenhuma. Opacidade não entra: conteúdo que aparece ao rolar fica com opacidade zero e some sem JavaScript (o portfólio cai a 1% visível) |
| Vazio falso em captura incompleta (YouTube, Mastodon) | Com aviso de esqueleto na captura, não abrir vazios |
| Colunas dependem da janela | Janela fixa de 1440 px, como já é. Usar relações, nunca coordenadas |
| Limiar de coluna e de vazio vira degrau | Mesmo teste de um item a mais ou a menos que já existe, mais o teste de janela |
| Malha grossa: 4×4 quadras | Faixa fina vira fileira de prédios de um lote. Preencher por pares de lotes para formar meias quadras |
| Ganho pequeno fora de páginas com menu oculto ou colunas | É o resultado mais provável em metade das páginas, e está dito antes |
| Retângulo bruto engana | Achado ao desenhar as plantas: um território "resto" abraça a página inteira. Usar núcleo por quantis ponderados |

## 6. Dependências

1. **Um motor de layout na captura.** O protótipo roda todo local e não depende de produção. Para chegar a visitantes há dois caminhos, e os dois pedem Chromium no servidor:
   - as fases 2 e 3 de [RENDERED_CAPTURE_PLAN.md](../../RENDERED_CAPTURE_PLAN.md) (proxy de saída e rota), com as caixas como a fase 5 que já estava prevista;
   - um passe só de layout, sem JavaScript, sobre os bytes que o `safe-fetch` já baixou. Sem JavaScript não há `fetch`, WebSocket nem service worker, o que encolhe o problema de SSRF. **Não testei a variante sem rede**: nas minhas medições o navegador ainda buscava as folhas de estilo.
2. **Custo.** Hoje o navegador só entra quando a página é esqueleto. Layout para todas as páginas significa navegador em toda captura. Local, o passe sem JavaScript levou de 2 a 7 s contando a partida do navegador, com exceções mais lentas.
3. **Decisões suas que mantive:** área por estrutura e importância; mesma extensão e mesma câmera; Hacker News preservado; nenhuma regra por site.

## 7. A menor implementação que valida

| Parte | O que é | Tamanho |
| --- | --- | --- |
| A. Passe de layout | Já existe como instrumento de medição | cerca de 90 linhas, feitas |
| B. Poda e moldura | Tirar subárvores sem caixa; núcleo, lado e vazio por território | cerca de 60 linhas |
| C. Planta | Faixas por coluna, espiral restrita, lotes abertos; receita de solo aberto | cerca de 170 linhas |
| Chave | Um único nome, `layout`, só na visão de desenvolvimento, para renderizar o mesmo snapshot com e sem a etapa | 1 flag |

Validação, numa rodada:

- **Páginas:** as 22 já capturadas. Cada uma renderizada duas vezes do mesmo snapshot, com e sem a etapa, para isolar a arquitetura da captura.
- **Mudança esperada (9):** MDN, Apple, Vercel, Airbnb, GitHub, Mastodon, portfólio, ray.so, YouTube.
- **Controles:** Hacker News e Paul Graham idênticos peça por peça. Python docs, lobste.rs e craigslist com até 5% dos lotes mudando de tecido.
- **Imagens:** cidade inteira e câmera do baseline, mais a prancha de plantas.

Critérios de aceite:

1. Os controles passam.
2. Em pelo menos 6 das 9, a cidade nova se distingue da de hoje na vista da cidade inteira, e a diferença se explica apontando para a página.
3. O MDN deixa de ser vizinho mais próximo do Hacker News na medida de distância do projeto.
4. As faixas laterais se leem como bairros de borda. Esse julgamento é seu.
5. Um item a menos mantém a planta. Duas capturas sem JavaScript da mesma página dão a mesma planta.
6. Nenhuma cidade que não precisava mudar piora.

Como ler um fracasso:

- **Plantas mudam como na prancha e as cidades continuam parecidas:** a hipótese está refutada. Estrutura no plano não basta, o contraste depende do tecido, e eu paro para relatar.
- **Plantas não mudam como na prancha:** a implementação não testou a hipótese.
- **Controles quebram:** a regra de identidade está errada, e isso se corrige antes de julgar o resto.

## 8. Estado do código

- Sem commit: o passe de medição em `render-page.ts`, `rendered-capture.ts`, `parse-html.ts`, `normalize.ts`, `plan.ts` e nos dois arquivos de tipos. Só age quando alguém pede `measure` na captura.
- Com ele presente: as 248 capturas locais geram cidades idênticas às do último commit, lint e typecheck passam, 256 verificações e as 22 da captura renderizada passam.
- A poda e a planta que geraram a prancha são scripts de estudo, fora do repositório. Estão arquivados com os números em `docs/morphology/archive/layout-study-2026-10-12.tgz`. Os 54 snapshots medidos ficam em `docs/morphology/recapture/layout/`, fora do git.

## 9. O que preciso de você

1. **Aprovação para construir o protótipo** como na seção 7.
2. **Área.** O protótipo mantém a área pelo peso do que aparece, que é a regra de hoje sem o invisível. A alternativa é a superfície que cada território ocupa na tela: mais fiel em páginas de produto (um hero de tela cheia com dez palavras) e em aplicações, e mais frágil. Proponho comparar as duas só na prancha de plantas, sem flag, e decidir antes de renderizar cidades.
3. **Produção.** O ganho só chega a visitantes com um navegador na captura. Não trava a validação, mas define quanto vale o esforço.

## Limitações

- 22 páginas, capturadas num dia, numa máquina. O alcance (10, 4, 4) é dessa amostra.
- As plantas da prancha vêm de um esboço de estudo, não do código que faria a cidade.
- A detecção de colunas usa limiares escolhidos uma vez (70% de largura, 50% de sobreposição, 6 lotes) e não ajustados.
- A comparação com e sem JavaScript foi feita com o critério de visibilidade que ainda incluía opacidade.
