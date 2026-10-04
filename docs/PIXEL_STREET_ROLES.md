# Pixel city: art direction C1 · hierarquia viária

> Primeiro experimento da Art Direction Layer. A foundation-v1 continua congelada:
>
> - plano, alocação, todos os quarteirões (lotes, peças, prédios, praças, pátios) e o trace de
>   prédios, peças, marco e frentes são byte a byte os do kit-v9 nas 42 cidades do corpus;
> - com a camada desligada (`artDirection: false`), a cidade inteira é o kit-v9 byte a byte (§8).
>
> Só C1 foi feito: nada de C2, C3, C4, skyline, vegetação geral, carros ou pessoas gerais.
>
> **C1 aprovada e encerrada** (incluindo o novo contrato de `test:foundation`). As limitações do §9
> ficam registradas e **não serão corrigidas nesta fase**, por decisão de projeto:
>
> - bulevares fragmentados;
> - hero sempre no mesmo quarteirão;
> - Street enquadrando principalmente o marco;
> - densidade e massing;
> - viela lida principalmente pelo material;
> - volume atual de carros.

## Conclusão

**Parcialmente sim.** O sinal é forte, causal e bem distribuído: o mapa de papéis
([D-roles](screenshots/street-roles/sheets/D-roles.jpg)) mostra estruturas viárias claramente
diferentes, contínuas entre páginas e com família preservada.

A expressão produz diferença macroscópica perceptível na City em 3 das 8 cidades:

- **NASA** e **Linear**: os calçadões fundem praças em superquarteirões;
- **IKEA**: o bulevar com canteiro verde em volta do marco e da faixa de serviço, as ruas comuns
  estreitas e uma viela de pedra;
- **GOV.UK**: parcialmente.

No Overview e nos thumbnails do distrito, a diferença também aparece em 6 de 8. Paul Graham e
craigslist passam a ter uma rede de vielas de pedra quente, que se lê em 240 px.

Nas cidades densas (**Paul Graham, craigslist, Python Docs**), a City padrão vê telhados, não ruas:
de 5 a 6 andares sobre ruas de 2,6 tiles, os prédios escondem quase todo o chão. Ali **C1 sozinho é
insuficiente na City**. O limite não é o sinal nem a camada: é a oclusão, que vem do massing (o
gargalo G5 da auditoria, congelado).

## 1. Gramática viária derivada

**Corredores existentes.** A grade tem 5 linhas por eixo, a cada 18,8 tiles. Cada linha é um leito de
2,6 tiles entre os anéis de calçada (1,1) de dois quarteirões, 4,8 de corredor no total. Um
**trecho** é o pedaço de uma linha entre dois cruzamentos: 24 trechos internos (quarteirão dos dois
lados), 16 no anel externo (vazio de um lado) e os trechos que saem para o vazio. Cada trecho interno
tem 4 lotes de frente de cada lado. Isso é o que a alocação congelada já decide.

**Sinais.** Cada par de lotes frente a frente vota no papel da rua. Todos os votos leem só o plano e
a alocação (`trace.alloc.owner`):

| o par de lotes | voto | sinal da fundação | por que é causal |
|---|---|---|---|
| territórios de **tiers diferentes** (hero / conteúdo / chrome / rodapé / resto) | **primary** | `Territory.tier` (T2 do plano) | a rua costura as regiões de nível superior da página: é a estrutura principal da página virando a estrutura principal da cidade |
| o **mesmo território**, conteúdo de **links** (parcelled, archive, navigation, support) | **lane** | `owner` + composição (o mapeamento conteúdo-da-composição do plano) | a rua corre dentro de uma lista, índice ou menu: tecido fino de itens pequenos e repetidos |
| **chão aberto** dos dois lados (media, interactive, landmark, marker) | **pedestrian** | composição dos lotes | essas composições já põem o prédio sobre praça; a rua entre duas praças é praça |
| qualquer outro (texto contínuo, grade, tabelas; costura entre seções do mesmo tier) | **street** | — | a rua comum |

O trecho fica com o papel que tiver mais votos. Empate vira street (neutro). O motivo de cada trecho
fica em `trace.streets[].why` ([`street-roles/roles.txt`](street-roles/roles.txt)).

**Quantas classes.** Quatro, e cada uma vem de um sinal próprio:

- primary: o tier;
- lane: território interno com links;
- pedestrian: chão aberto dos dois lados;
- street: o caso residual.

Cada classe aparece em pelo menos 6 das 14 páginas (primary 13, street 14, lane 10, pedestrian 6;
`test:streets`), e cada uma é a classe dominante de alguma página. Juntar lane e pedestrian apagaria
a diferença entre "dentro de uma lista" e "entre duas praças", que são as duas organizações que mais
separam páginas. Três classes não bastariam.

**Determinismo.** Nem a seed, nem a URL, nem o site entram. Papéis idênticos com seeds 7, 8 e 11
(14/14). Pequenas edições da página (texto ±10%, links −10%, remover uma seção) mudam 2,2% dos
papéis.

## 2. Expressão: dentro do corredor, estrutura antes de decoração

| papel | corte transversal (no leito de 2,6) | tom do corredor (o que sobrevive no thumbnail) |
|---|---|---|
| **primary** | asfalto na largura toda, mais escuro; canteiro central gramado de 0,5 (refúgio), parando antes das faixas; duas pistas com linha de faixa cada | escuro com uma linha verde |
| **street** | pista de 1,6 com linha central tracejada; o resto vira calçada, com meio-fio na borda da pista | cinza, estreito |
| **lane** | superfície compartilhada de paralelepípedo de meio-fio a meio-fio, sem pintura; mão única em fila; onde encontra uma rua com tráfego, a calçada da rua principal atravessa a boca da viela | pedra quente |
| **pedestrian** | sem pista: o leito vira piso de praça, no nível da calçada, sem meio-fio | claro |

Cruzamentos:

- O cruzamento assume o papel mais alto entre os que se encontram ali.
- As esquinas avançam até as pistas que de fato se cruzam.
- Faixa de pedestres e linha de retenção só cruzam ruas com tráfego.
- Semáforos só onde duas ruas com tráfego se cruzam.

Carros:

- Os sorteios continuam os mesmos.
- Cada carro só é reposicionado na pista do seu trecho: duas pistas, fila única na viela, nenhum no
  calçadão.

O mobiliário de calçada (árvores, postes, bancos, pessoas) é o do kit-v9, peça por peça (C3 não
começou).

**Iteração.** A primeira expressão estreitava a viela para uma faixa de 0,8. Era invisível na City:
estreitar a pista quase não muda o tom do corredor. A viela passou a ser superfície compartilhada de
pedra na largura toda. A regra de **classificação** não mudou entre as duas versões.

**Visões.**

- `?debug=streets`: prédios em cinza e cada trecho na cor do seu papel, com legenda.
- `?flat=1`: não foi redefinido. Continua com a regra histórica: tudo acima de 0,4 em cinza, o resto
  na própria cor. Por isso, no kit atual, mostra as ruas novas no chão.
- `?v=9`: continua sendo o BEFORE.

## 3. Distribuição nas 8 páginas

| página | internos (24): primary · street · lane · pedestrian | anel externo (16) |
|---|---|---|
| IKEA | 6 · 17 · 1 · 0 | 0 · 13 · 3 · 0 |
| Paul Graham | 0 · 3 · **21** · 0 | 0 · 0 · 16 · 0 |
| craigslist | **8** · 5 · **11** · 0 | 0 · 0 · 16 · 0 |
| GOV.UK | 6 · 11 · 6 · 1 | 0 · 5 · 9 · 2 |
| Wikipedia | 5 · **17** · 2 · 0 | 0 · 10 · 6 · 0 |
| NASA | 6 · 10 · 1 · **7** | 0 · 0 · 4 · **12** |
| Linear | 7 · 12 · 0 · 5 | 0 · 8 · 2 · 6 |
| Python Docs | 1 · **23** · 0 · 0 | 0 · 15 · 1 · 0 |
| *Wikipedia 2* | 7 · 14 · 3 · 0 | 0 · 10 · 5 · 1 |

Outras páginas do corpus: Guardian com 16 calçadões; lobste.rs com 21 vielas, como o Paul Graham;
portfolio e Vercel perto do Linear. Não são dois presets: os quatro papéis se misturam em proporções
contínuas.

Mapa: [D-roles](screenshots/street-roles/sheets/D-roles.jpg) (Overview com `?debug=streets`).

## 4. BEFORE × AFTER

Capturas 1440×900 @2x, dia, seed 7, mesma câmera:

- BEFORE = `?v=9`;
- AFTER = kit atual.

| prancha | visão |
|---|---|
| [A-before-after-city](screenshots/street-roles/sheets/A-before-after-city.jpg) | **City** (principal) |
| [B-before-after-street](screenshots/street-roles/sheets/B-before-after-street.jpg) | Street (`focus=0,0`) |
| [C-before-after-wide](screenshots/street-roles/sheets/C-before-after-wide.jpg) | Overview (o distrito inteiro, `zoom=0.55`) |

Leitura:

- **NASA, Linear**: a mudança é imediata. Os trechos entre praças viram piso, e o chão aberto, antes
  picado pelo asfalto, vira superquarteirões.
- **IKEA**: o bulevar verde-escuro separa o marco e o rodapé da grade de produtos. As ruas comuns
  emagrecem. A viela de pedra na faixa "resto" aparece.
- **GOV.UK, Wikipedia**: a hierarquia aparece, mas é sutil na City (bulevares em volta do marco e na
  costura com o rodapé; ruas comuns mais estreitas).
- **Python Docs**: quase igual. A página é toda tier 1 (a barra lateral não é reconhecida como nav,
  já está no backlog), então não há costura de nível superior: grade de ruas comuns.
- **Paul Graham, craigslist**: na City quase não muda (oclusão). No Overview, a rede de vielas de
  pedra é evidente.
- **Street** (`focus=0,0`): sempre enquadra a vizinhança do marco, que nas páginas com hero é
  cercado de bulevares. A Street mostra o bulevar e pouco das outras classes.

## 5. Thumbnails

- [G-thumbs-blind-after](screenshots/street-roles/sheets/G-thumbs-blind-after.jpg): só AFTER, sem
  nomes, em ordem embaralhada ([chave](screenshots/street-roles/sheets/thumbs-key.txt)).
- [H-thumbs-before-after](screenshots/street-roles/sheets/H-thumbs-before-after.jpg): BEFORE × AFTER
  com nomes, incluindo o Overview em cinza.

Na linha **Overview**, o palco agora separa três famílias que antes eram iguais:

- cruzes e treliça de **pedra quente** (vielas);
- chão **claro e aberto** (calçadões);
- **asfalto** cinza com bulevares.

Na linha **City**, a separação ainda vem principalmente dos prédios. Só NASA e Linear mudaram de
forma clara.

## 6. Paul Graham × Wikipedia

[E-paul-graham-vs-wikipedia](screenshots/street-roles/sheets/E-paul-graham-vs-wikipedia.jpg).

Os extremos do teste a seco divergem como esperado:

- **Paul Graham**: 21/24 vielas, 0 bulevares. Um tecido único de pedra, sem hierarquia.
- **Wikipedia**: 17/24 ruas comuns, 5 bulevares nas costuras com o marco e com o resto. Uma grade de
  asfalto com espinha.

A divergência é clara no Overview e quase nula na City do Paul Graham (oclusão).

## 7. Wikipedia × Wikipedia

[F-wikipedia-family](screenshots/street-roles/sheets/F-wikipedia-family.jpg). Os dois artigos dão
quase o mesmo mapa:

- bulevares em volta do marco e na costura de trás;
- ruas comuns no resto;
- poucas vielas nos índices.

Distância das proporções de papéis: 0,13, contra mediana 0,46 entre os pares do corpus e 0,79 para
Wikipedia × Paul Graham. A família está preservada.

## 8. Foundation regression

| verificação | resultado |
|---|---|
| typecheck · lint · build | ok · 0 problemas · ok |
| `test:foundation`: page model = kit-v9 | 14/14 |
| `test:foundation`: alocação, quarteirões (todas as partes) e trace de prédios / peças / marco / frentes = kit-v9 (dia, noite, flat) | 42/42 |
| `test:foundation`: **art direction desligada → cidade inteira = kit-v9 byte a byte** | 42/42 |
| `test:foundation`: kit-v9 reproduz os hashes gravados no freeze ([`kit-v9.sha1.json`](../scripts/foundation/kit-v9.sha1.json)) | 42/42 |
| `test:foundation`: kits v1–v8 ainda constroem | 98/98 |
| `test:streets` (novo): papéis sem seed, só do plano, sem site, dentro do corredor, mobiliário = kit-v9, 4 classes usadas, família, estabilidade | 8 ✓ |
| `test:allocation` · `hygiene` · `surface` · `openings` · `composition` · `program` | todos ✓ |

**O contrato do teste mudou, e por quê.** A checagem antiga dizia "a cidade atual inteira é o
kit-v9 byte a byte". O próprio documento da fundação limitava isso: "até a próxima fase". Com a C1,
ela deixa de valer por definição: as ruas mudaram. Ficou dividida em duas checagens mais fortes:

1. **Tudo o que a fundação decide continua idêntico:** plano, alocação, cada parte de cada quarteirão
   e o trace.
2. **A C1 é a única mudança:** com `artDirection: false`, a cidade inteira volta a ser o kit-v9 byte
   a byte.

Além disso, o kit-v9 agora é verificado contra hashes gravados, e não só contra o kit atual.

As suítes das rodadas anteriores (openings, composition, program) comparam a cidade inteira com
kits antigos. Elas passaram a usar `artDirection: false`, como já faziam com `items` e `structure`:
cada suíte verifica o efeito da sua rodada.

## 9. Limitações

1. **Oclusão nas cidades densas.** Com prédios de 5–6 andares sobre ruas de 2,6, a City padrão
   mostra telhados. A C1 aparece no Overview e nas bordas, quase não na City. É o G5 (massing,
   congelado), não um problema do sinal.
2. **Esqueleto de bulevares parecido entre páginas com hero e rodapé.** A espiral da alocação
   (congelada) põe o hero sempre no quarteirão (1,1) e o rodapé e o resto no fim. Por isso IKEA,
   GOV.UK, NASA, Linear e Wikipedia compartilham um anel de bulevares em volta do marco e uma costura
   na última fileira. O que as separa são as outras classes.
3. **A Street (`focus=0,0`) sempre enquadra o marco.** Ela mostra quase sempre bulevares e é a visão
   que menos diferencia.
4. **Bulevares fragmentados.** Cada trecho é classificado sozinho; não há regra de continuidade
   (seria inventar um eixo que a página não tem). Empates viram rua comum e podem interromper um
   bulevar (por exemplo, Wikipedia `z2.1`: pedestrian 2 × primary 2).
5. **Python Docs fica uma grade uniforme de ruas comuns.** É fiel ao plano (sem tiers), mas
   visualmente é "a mesma cidade, com ruas mais estreitas".
6. **Densidade de carros inalterada.** As ruas comuns, mais estreitas, parecem mais cheias. O
   mobiliário continua na linha do meio-fio antigo, agora no meio da calçada alargada. As duas
   coisas são da C3.
7. **A viela se lê pelo material, não pela largura.** Uma viela estreita de verdade não cabe sem
   mover lotes, e a versão estreita (0,8) foi invisível.
8. **As saídas para o vazio continuam o papel do trecho** (um calçadão vira viela). No Overview,
   isso faz parte da leitura, mas não é informação da página.

## 10. Resposta

**C1 produziu diferença macroscópica perceptível em parte das cidades, não em todas.**

Ela muda o palco onde o palco é visível: cidades abertas e de densidade média na City, e todas as
cidades com vielas ou calçadões no Overview e nos thumbnails. Faz isso sem mover nenhum prédio e a
partir de um sinal claramente causal.

Nas cidades densas, a City continua dominada pelos prédios, e nenhuma camada de chão (C1, ou C2
depois) vai mudar isso sozinha. A próxima alavanca para elas está no que a câmera vê: telhado,
altura, skyline, isto é, massing (congelado) ou C4 (atmosfera). Antes de C2, vale decidir se o chão
é a prioridade certa para as cidades densas.

## Arquivos

- Código:
  - `src/lib/pixelcity/kit/street-roles.ts` (papéis);
  - `src/lib/pixelcity/kit/street.ts` (expressão, `uniformStreetSurfaces` = ablação);
  - `src/lib/pixelcity/kit/district.ts` (ligação, semáforos, carros, `trace.streets`, `trace.scene`,
    `artDirection`, `?debug=streets`);
  - `KitView.tsx` e `page.tsx` (legenda e parâmetro).
- Testes:
  - `scripts/street-roles/check.ts` (`npm run test:streets`);
  - `scripts/foundation/check.ts` e `record.ts`, mais `kit-v9.sha1.json`;
  - `artDirection: false` nas suítes de openings, composition e program.
- Capturas: `scripts/street-roles/shoot.mjs`, `sheets.py`, `roles.ts` →
  `docs/screenshots/street-roles/{before,after,roles}/` e `sheets/`,
  `docs/street-roles/roles.txt`.
