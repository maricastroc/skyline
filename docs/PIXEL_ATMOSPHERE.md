# Pixel city: art direction C4 · atmosfera

> Terceiro experimento da Art Direction Layer. Só a C4: nada de C2, nada na C1 ou na C3, no
> massing, nos prédios ou na fundação. O resultado da C3 foi congelado como **kit-v11** (`?v=11`),
> baseline da Art Direction; o atual é `?v=12`.
>
> **Sem commit da C4 até a avaliação.**

## Conclusão

**Em parte.**

- **O céu deixou de ser carimbado.** As oito cidades têm agora:
  - sua própria altura de névoa (a faixa começa entre 53% e 69% da altura do quadro);
  - sua saturação de céu (de quase cinza a azul vivo);
  - seu tom de horizonte;
  - seu equilíbrio entre luz direta e luz difusa.

  Tudo isso sai de cinco sinais da página. A mudança aparece na City em tamanho real e nos
  thumbnails: Paul Graham sob uma névoa baixa e pálida, craigslist sob um azul denso e baixo, NASA
  sob um céu alto e limpo azul-violeta, IKEA e Linear sob um céu claro com horizonte creme.
- **Mas a diferença é moderada, não dramática**, por dois motivos honestos:
  1. **A maior parte do corpus é azul.** O matiz dominante de 6 das 8 páginas está entre 241° e 269°,
     colado ao azul do céu padrão. O eixo de cor só se mostra nas páginas que não são azuis
     (IKEA, Linear) e nas que não têm cor (Paul Graham). Inventar um matiz que a página não tem
     seria um filtro, não direção de arte.
  2. **Os limites de legibilidade** (§6) seguram o céu numa faixa estreita de luminosidade e
     croma, e a luz entre ×0,85 e ×1,15.
- **À noite, o caráter se mantém, mas fica fraco.** Os eixos e a faixa de névoa são os mesmos, mas a
  noite escura comprime as diferenças de cor. Linear e IKEA ficam numa noite mais neutra e quente;
  as páginas azuis, numa noite azul. A diferença existe, mas não salta à vista.

## 1. Commits da C3

| commit | mensagem |
|---|---|
| `e920971` | chore(pixel): freeze the street roles kit (C1) as kit-v10 |
| `d0e14ba` | feat(pixel): derive street life from frontage, street role and page (art direction C3) |
| `4aafb37` | test(pixel): check street life and map the flat view onto the block slice |
| `0883cec` | docs: add street life (C3) evaluation and screenshots |
| `929bdf0` | chore(pixel): freeze the street life kit (C3) as kit-v11, the art direction baseline |

Push em `main`. As limitações da C3 foram registradas como não corrigidas
([PIXEL_STREET_LIFE.md](PIXEL_STREET_LIFE.md)).

## 2. Diagnóstico da atmosfera (kit-v11)

| elemento | onde | o que decide | classe |
|---|---|---|---|
| céu de dia (gradiente zênite → horizonte, 7 faixas com dither) | `palette.ts`, `PixelPost` | constante: `oklch(0.7, 0.11, 240)` → `oklch(0.92, 0.05, 210)` | **constante** |
| céu dourado | `palette.ts` | constante (violeta → pêssego) | **preset** (hora) |
| céu noturno | `palette.ts` | matiz do fundo da página (`bgHue`), se tiver croma | **da página** (só à noite) |
| hora do dia | `grammar.ts` | escuridão > 0,5 → noite; matiz primário quente → dourado; senão dia | **da página** (3 presets) |
| sol (cor, intensidade, direção) | `palette.ts`, `Lights` | um valor por hora | **preset** (hora) |
| luz ambiente (hemisfério céu / chão, intensidade) | `palette.ts`, `Lights` | um valor por hora | **preset** (hora) |
| sombra | `Lights` | mapa fixo, bias fixo; dureza = razão sol / ambiente | **preset** (hora) |
| névoa da City | `PixelScene` (Rig) | faixa fixa: começa a 64% e termina a 97% da altura do quadro | **constante** |
| estrelas | `PixelPost` | noite | **preset** (hora) |
| tinta do contorno | `inkOf` | dois valores (dia / noite) | **preset** (hora) |
| bloom, tone mapping | `Post` | dois valores (dia / noite); neutro | **preset** (hora) |
| paredes, telhados | `palette.ts` | estilo + matiz da página | **do estilo** (não é atmosfera; fora da C4) |
| grading global | — | não existe | — |

De dia, em mesmas condições, **as oito cidades tinham o mesmo céu, a mesma névoa e a mesma luz**.
A página só escolhia uma das três horas.

## 3. Sinais escolhidos

| sinal | de onde | por que é causal |
|---|---|---|
| **espaço em branco** (`fp.airiness`) | fingerprint | uma página que respira vira um ar que respira |
| **chão aberto** (lotes media / interactive / landmark / marker) | alocação (congelada) | praças e esplanadas abrem a vista |
| **cobertura** (`grammar.coverage`) | gramática | quanto do terreno está construído |
| **cor dominante** (fundo cromático, senão o primeiro matiz da marca) e os matizes a até 60° dela | fingerprint | a cor da página tinge o ar. Matizes distantes ficam de fora: a média de um azul e um vermelho inventaria um violeta que a página não tem (a primeira versão fazia isso: Wikipedia, NASA e craigslist ficavam lilás) |
| **colorfulness** | fingerprint | uma página preto e branco tem um céu pálido, quase cinza |
| **ornamento** (sombras, gradientes, animação) | fingerprint | a página que desenha sombras tem luz com sombra nítida; a chapada, luz difusa |

Ficam de fora:

- `darkness`: já decide a hora; usar de novo seria contar duas vezes;
- `imagery`: está contaminado (backlog);
- estilo: tipografia não é clima;
- densidade de mídia: não há relação defensável com o ar.

## 4. Eixos ambientais

| eixo | fórmula | o que muda |
|---|---|---|
| **air** (abertura) | 0,45 · espaço em branco + 0,35 · chão aberto + 0,2 · terreno não construído | a altura da faixa de névoa (início 0,53–0,77, fim 0,90–1,05 da altura do quadro) e a luminosidade do céu (±0,04 zênite, ±0,02 horizonte) |
| **tint** (cor do ar) | matiz do grupo dominante; força = croma / 0,10 | o horizonte se inclina para o matiz (90%). Se o matiz está a mais de 90°, atravessa o neutro: nunca passa pelas cores intermediárias. O zênite gira só se o matiz está a até 60°; se não, empalidece. A luz ambiente se inclina um pouco (35% / 20%). O sol esquenta ou esfria (até 60%) |
| **vivid** | colorfulness | croma do céu e do ambiente × (0,4 + 0,6 · vivid) |
| **hardness** | ornamento | sol × (0,85 + 0,3 · hardness), ambiente × (1,12 − 0,24 · hardness) |

**Caráter + hora.** A hora continua vindo da gramática (dia, dourado, noite). A C4 é aplicada
**sobre** a paleta da hora, e os eixos e a faixa de névoa são os mesmos às três horas (`test:atmosphere`).
À noite, o horizonte se inclina metade: um matiz distante deixa a noite mais neutra, mas nunca a
repinta.

**O que não muda:** nenhuma parte da cidade lê esses valores. Prédios, ruas, props, placas, cenário
e fumaça são os do kit-v11, parte por parte, e a paleta só difere em céu, sol e ambiente.

## 5. Valores das 8 páginas

| página | air | tint (matiz, força) | vivid | hardness | névoa (início → fim) | zênite de dia | sol / ambiente |
|---|---|---|---|---|---|---|---|
| IKEA | 0,42 | 96° (amarelo), 1,00 | 0,84 | 0,85 | 0,62 → 0,96 | pálido (C 0,063) + horizonte creme | ×1,11 / ×0,92 |
| Paul Graham | **0,08** | —, 0 | **0,00** | **0,00** | **0,53 → 0,90** | pálido, quase cinza (C 0,044) | ×0,85 / ×1,12 (difusa) |
| craigslist | **0,08** | 264° (azul), 1,00 | 1,00 | 0,45 | **0,53 → 0,90** | azul vivo (C 0,110) | ×0,98 / ×1,01 |
| GOV.UK | 0,45 | 255°, 1,00 | 1,00 | 0,43 | 0,63 → 0,96 | azul vivo | ×0,98 / ×1,02 |
| Wikipedia | 0,17 | 265°, 1,00 | 0,92 | 0,34 | 0,55 → 0,92 | azul-violeta | ×0,95 / ×1,04 |
| NASA | **0,70** | 269°, 1,00 | 1,00 | 0,66 | **0,69 → 1,00** | azul-violeta claro | ×1,05 / ×0,96 |
| Linear | **0,68** | 99° (amarelo), 0,84 | 0,73 | 0,85 | **0,69 → 1,00** | pálido + horizonte creme | ×1,10 / ×0,92 |
| Python Docs | 0,11 | 241°, 1,00 | 0,86 | 0,15 | 0,54 → 0,91 | azul (≈ padrão) | ×0,89 / ×1,08 |
| *Wikipedia 2* | 0,20 | 265°, 1,00 | 1,00 | 0,45 | 0,56 → 0,92 | azul-violeta | ×0,98 / ×1,01 |
| *kit-v11 (todas)* | | | | | 0,64 → 0,97 | C 0,110 h240 | ×1 / ×1 |

Valores e motivo de cada eixo, de dia e de noite: [`atmosphere/environment.txt`](atmosphere/environment.txt).

## 6. Limites de legibilidade

| grandeza | faixa |
|---|---|
| luminosidade do zênite | dia 0,62–0,78 · dourado 0,52–0,66 · noite 0,12–0,22 |
| luminosidade do horizonte | dia 0,86–0,95 · dourado 0,78–0,90 · noite 0,24–0,38 |
| croma | zênite ≤ 0,14 · horizonte ≤ 0,12 · ambiente ≤ 0,12 |
| luz | sol ×0,85–1,15 · ambiente ×0,88–1,12 (a razão nunca inverte) |
| névoa | começa no máximo a 53% da altura do quadro (de baixo para cima) e termina até 105% |

Verificado em 14 páginas × 3 horas (42/42). Nas capturas, nenhuma cidade fica lavada ou escura: a
de névoa mais baixa (Paul Graham) mantém a metade de baixo do quadro nítida.

## 7. BEFORE × AFTER

Capturas 1440×900 @2x, seed 7, mesma câmera:

- BEFORE = `?v=11`;
- AFTER = atual.

| prancha | visão |
|---|---|
| [A-before-after-city](screenshots/atmosphere/sheets/A-before-after-city.jpg) | **City de dia** |
| [B-before-after-night](screenshots/atmosphere/sheets/B-before-after-night.jpg) | City à noite |
| [C-before-after-street](screenshots/atmosphere/sheets/C-before-after-street.jpg) | Street de dia |
| [D-day-night](screenshots/atmosphere/sheets/D-day-night.jpg) | o mesmo ambiente de dia e à noite |
| [**E-sky**](screenshots/atmosphere/sheets/E-sky.jpg) | **a faixa de céu e skyline** (45% de cima do quadro City) das 8 páginas: antes / depois, dia / noite |
| [F-wikipedia-family](screenshots/atmosphere/sheets/F-wikipedia-family.jpg) | Wikipedia × Wikipedia 2 |
| [G-thumbs-blind-after](screenshots/atmosphere/sheets/G-thumbs-blind-after.jpg) · [chave](screenshots/atmosphere/sheets/thumbs-key.txt) | thumbnails cegos de City (dia, noite, cinza) |
| [H-thumbs-before-after](screenshots/atmosphere/sheets/H-thumbs-before-after.jpg) | thumbnails antes / depois |

Leitura:

- **City de dia.** A mudança mais clara é a névoa:
  - baixa e densa nas páginas compactas (Paul Graham, craigslist, Python Docs, Wikipedia);
  - alta e limpa nas abertas (NASA, Linear).

  Depois vem a saturação: Paul Graham pálido contra craigslist azul vivo. Por último o horizonte
  creme de IKEA e Linear. GOV.UK e Python Docs mudam pouco: são azuis, de abertura e ornamento
  médios.
- **Noite.** A névoa acompanha a de dia. A cor muda pouco: Linear e IKEA ficam mais neutros e
  quentes, os azuis continuam azuis.
- **Street.** Quase nenhuma diferença: a névoa da Street é outra (só na City) e o céu quase não
  aparece. É o esperado, porque a C4 é uma camada de City.

## 8. Wikipedia × Wikipedia

Mesmo ambiente: air 0,17 / 0,20, mesmo matiz (265°), névoa 0,55 / 0,56. A distância entre os
dois vetores ambientais é 0,138, contra mediana de 0,828 entre os pares do corpus e 1,040 para
Wikipedia × Paul Graham.

## 9. Ablações e regressão

| verificação | resultado |
|---|---|
| typecheck · lint · build | ok · 0 problemas · ok |
| **`atmosphere: false` → kit-v11 (C3) byte a byte** (o objeto da cidade inteiro; dia, noite, flat) | 42/42 |
| **`streetLife: false` → kit-v10 (C1)** | 42/42 |
| **`artDirection: false` → kit-v9 (fundação)** | 42/42 |
| C4 ligada: partes, placas, cenário e fumaça = kit-v11; a paleta só difere em céu, sol e ambiente | 42/42 · 42/42 |
| papéis da C1 e vida de rua da C3 inalterados | 14/14 |
| ambiente independente da seed (7 / 8 / 11) · o mesmo às três horas | 14/14 · 14/14 |
| limites de legibilidade (14 páginas × 3 horas) | 42/42 |
| sem hostname · família · pequenas edições da página (média) | ✓ · 0,138 < 0,828 · 0,004 |
| `test:foundation`, `test:streets`, `test:life` e as seis suítes anteriores | todos ✓ |

As camadas se desligam em ordem: sem C3 não há C4, e sem art direction não há nenhuma das duas.

## 10. Limitações

1. **O corpus é azul.** 6 de 8 páginas têm o matiz dominante entre 241° e 269°, perto do céu
   padrão (240°). O eixo de cor só diferencia quem não é azul. Não há sinal honesto para separar
   GOV.UK, Wikipedia, craigslist e Python Docs pela cor do ar; elas se separam pela abertura e pela
   saturação.
2. **A noite comprime o caráter.** A noite escura reduz a diferença de matiz a quase nada. A névoa
   e a luz continuam, mas o resultado é discreto.
3. **O céu noturno base já usava o fundo da página.** No kit-v11, IKEA à noite já era oliva (fundo
   amarelo). A C4 não mexe nisso: o céu noturno base é da hora, não da C4.
4. **A dureza da luz é sutil.** Sol de ×0,85 a ×1,15 se nota nas sombras de perto, quase nada na
   City.
5. **A névoa é um degrau de 4 tons com dither.** Faixas mais baixas mostram mais o padrão de dither
   (Paul Graham), o que é legível mas visível.
6. **Golden hour.** As capturas usam dia e noite fixos. A hora própria do IKEA (dourado) recebe a
   mesma C4 (testado), mas não está nas pranchas.
7. **Street não muda.** A névoa da Street é zero por desenho da câmera. A C4 é uma camada de City.

## 11. Conclusão perceptual

> **"C4 tornou as cidades macroscopicamente mais distintas em City?"**

**Sim, mas moderadamente.**

- O palco deixou de ser idêntico: céu, névoa e luz agora dependem da página, e isso aparece na
  City e nos thumbnails sem depender de rua ou prédio.
- A variação é explicável, a família se mantém, a seed não decide nada, dia e noite são o mesmo
  ambiente e nenhuma cidade perdeu legibilidade.
- O efeito mais forte é a **abertura (air)**, isto é, a altura da névoa. Depois vem a **saturação**.
  A **cor** só aparece nas páginas que não são azuis.

Para quem esperava "cidades de climas diferentes", a C4 entrega "o mesmo clima com ares
diferentes", e isso é o que os sinais justificam. Forçar mais seria escolher temas.

## Arquivos

- Código:
  - `src/lib/pixelcity/kit/atmosphere.ts` (eixos e aplicação);
  - `kit/district.ts` (`atmosphere`, `trace.environment`);
  - `types.ts` (`PixelCity.atmosphere`);
  - `PixelScene.tsx` (faixa de névoa por cidade);
  - `src/lib/pixelcity/kit-v11/` (C3 congelado);
  - `page.tsx` e `KitView.tsx` (`?v=11`, atual `?v=12`).
- Testes: `scripts/atmosphere/check.ts` (`npm run test:atmosphere`).
- Capturas e dados:
  - `scripts/atmosphere/shoot.mjs`, `sheets.py`, `environment.ts`;
  - `docs/screenshots/atmosphere/{before,after}/` e `sheets/`;
  - `docs/atmosphere/environment.txt`.
