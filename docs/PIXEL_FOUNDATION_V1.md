# Pixel city: fundação semântica / arquitetônica v1

> **SEMANTIC / ARCHITECTURAL FOUNDATION V1: FROZEN**
>
> Baseline final: **kit-v9** (`src/lib/pixelcity/kit-v9`, `?v=9`), tag git `foundation-v1`. O kit
> atual (`?v=10`) é byte a byte o kit-v9 até a próxima fase. Checagem do freeze:
> `npm run test:foundation`.
>
> **Desde a C1 da art direction** ([hierarquia viária](PIXEL_STREET_ROLES.md)), o kit atual difere
> do kit-v9 só no cenário a jusante (ruas, semáforos, carros). `test:foundation` verifica três
> coisas:
>
> - tudo o que a fundação decide (plano, alocação, cada parte de cada quarteirão, trace) continua
>   byte a byte o kit-v9;
> - com `artDirection: false`, a cidade inteira é o kit-v9;
> - o kit-v9 reproduz os hashes gravados no freeze.

## 1. Pipeline congelado

```
PAGE
→ SEMANTIC EXTRACTION
→ PAGE MODEL
→ TERRITORY
→ INTERNAL STRUCTURE
→ COMPOSITION
→ MASSING
→ PROGRAM
→ SURFACE GRAMMAR
→ OPENINGS / MATERIAL
→ PIXELS
```

| camada | o que decide | onde | rodada |
|---|---|---|---|
| semantic extraction | regiões e tipos; imagens incidentais e chrome tratados pela higiene | `semantics/`, `model/normalize` | [higiene](PIXEL_SEMANTIC_HYGIENE.md) |
| page model | territórios com peso, chave, ordem, mix, métricas | `kit/plan.ts` | [alocação](PIXEL_SEMANTIC_ALLOCATION.md) |
| territory | caminho, segmentos e lotes, proporcionais ao peso | `kit/territory.ts` | [alocação](PIXEL_SEMANTIC_ALLOCATION.md) |
| internal structure | `Territory.structure` (grupos) e `Territory.items` (forma do item) | `kit/structure.ts`, `kit/items.ts` | [intra-território](PIXEL_INTRA_TERRITORY_COMPOSITION.md), [program](PIXEL_PROGRAM_DIFFERENTIATION.md) |
| composition | organização do terreno (fileiras, grade, contínuo, mídia…), frentes agrupadas | `kit/compose.ts`, `kit/frontage.ts` | [massing](PIXEL_KIT_MASSING.md), [intra-território](PIXEL_INTRA_TERRITORY_COMPOSITION.md) |
| massing | famílias, andares, telhados | `kit/buildings.ts`, `kit/massing.ts` | [massing](PIXEL_KIT_MASSING.md) |
| program | uso de cada prédio e **o motivo** (`trace.buildings[].program`) | `kit/compose.ts` (`assignUse`) | [program](PIXEL_PROGRAM_DIFFERENTIATION.md) |
| surface grammar | térreo, base, corpo, coroa, cobertura por uso; estilo como expressão | `kit/surface.ts` | [surface](PIXEL_SURFACE_GRAMMAR.md), [program §14](PIXEL_PROGRAM_DIFFERENTIATION.md) |
| openings / material | recesso, moldura e luz das aberturas | `kit/openings.ts`, shader | [openings](PIXEL_OPENINGS_DEPTH.md) |

Validação ponta a ponta: [PIXEL_END_TO_END_DIFFERENTIATION.md](PIXEL_END_TO_END_DIFFERENTIATION.md).

**Kits congelados:**

| versão | estado |
|---|---|
| v1 | primeiro kit |
| v2 | massing |
| v3 | alocação semântica |
| v4 | higiene |
| v5 | surface grammar |
| v6 | openings |
| v7 | intra-território |
| v8 | experimento de índice simples |
| **v9** | **fundação v1** |

## 2. Regras a partir deste baseline

1. **Causalidade.** As decisões arquitetônicas continuam ligadas à página, com evidência no
   trace. Nenhuma decisão vem de sorteio entre opções não equivalentes, nem do estilo quando
   deveria vir do conteúdo.
2. **`?flat=1` é o teste de regressão de silhueta e massing.** Uma mudança de superfície, material
   ou cenário não pode mover o flat. Se mover, a mudança não é só visual.
3. **Nada de hostname nem de hacks por site.** Diferenças visuais futuras não podem depender de
   URL, host, nome do site ou regras para páginas específicas. Os testes verificam isso no
   descritor, na regra de uso e na Surface Grammar.
4. **As regras congeladas não se reabrem em silêncio.** A próxima fase pode consumir os sinais
   que a fundação já produz (territórios, `structure`, `items`, composição, programa e motivo,
   anatomia). Mudar as camadas acima (extração e higiene, page model, `items`, `structure`,
   allocation, geometria dos territórios, composition, massing, atribuição de Program, Surface
   Grammar, Openings, mapeamento de estilo) exige uma rodada própria, com freeze, BEFORE × AFTER
   e aprovação.

## 3. Checagem final (no freeze)

| verificação | resultado |
|---|---|
| typecheck · lint · build | ok · 0 problemas · ok |
| `test:allocation` (allocation / segments) | 13 ✓ |
| `test:hygiene` (extraction / hygiene) | 15 ✓ |
| `test:surface` (Surface Grammar) | 45 ✓ |
| `test:openings` (Openings) | 28 ✓ |
| `test:composition` (structure, composition, massing) | 46 ✓ |
| `test:program` (items, Program, narrow lots) | 46 ✓ |
| `test:foundation` (atual = kit-v9: page model 14/14, cidades 42/42 dia/noite/flat; kits v1–v8 ainda constroem, 98/98) | 3 ✓ |

Os controles continuam sem regressão inesperada:

- IKEA, lobste.rs e Wikipedia 2: idênticos ao kit-v7;
- os 242 prédios institucionais largos: geometria idêntica ao kit-v8;
- os volumes e o flat da cidade inteira: idênticos ao kit-v8.

## 4. Backlog conhecido (não reduzido nesta etapa)

**Semântica / extração**

- 35 menus de site não reconhecidos como `nav` (produtos do GitHub e da Vercel, *skip links* do
  Guardian, barra lateral do Python Docs) viram índice simples → institutional.
- Rótulos errados do analyzer (lista do lobste.rs = `faq`, links do craigslist = `features`,
  manchetes do Guardian = `pricing`).
- Instabilidade de detecção de regiões (±10% de texto ou links cria ou apaga regiões).
- Fingerprint de diagnóstico do Paul Graham: `fp.imagery` ainda conta os 471 GIFs espaçadores e
  vota no estilo moderno e em outdoors.
- SPAs e captura renderizada fora do escopo; a cidade real (`/pixel`) ainda usa a extração antiga.

**Território / composição**

- Deslizamento da alocação proporcional numa sequência; distrito fixo em 4×4.
- Peso estrutural superestima rodapés e navegações cheias de links.
- Sinal de estrutura interna fino: as passagens entre grupos são sutis na City; a sequência única
  ainda parece fragmentada.
- Esquina só existe para a família `corner`.

**Program**

- ~23,5% dos volumes em *commercial fallback* (listagens com metadados: lobste.rs, a tabela de
  arquivos do GitHub…), sem Program específico.
- Transação com evidência fraca, só no nível do território.
- Vitrine → office por convenção.
- Navegação sem Program próprio (arcada comercial).
- industrial sem função de página; civic só no marco.

**Massing / skyline**

- verticality → height com sinal fraco (vf varia 0,97–1,20, arredondado).
- Marco desproporcional (landmark dominance).

**Surface / material**

- Instituições estreitas:
  - os degraus da entrada principal avançam até ~0,25 tile sobre as unidades vizinhas;
  - à noite, o térreo é mais escuro (uma luz por fileira).
- Identidade de estilo perdida com o uso institucional: escadas de incêndio e caixas d'água (retrô)
  e jardins de cobertura (soft) não aparecem; o flat do Paul Graham mudou por isso na etapa 3.
- Corpo ainda em grade; lojas de um prédio são clones; HVAC carimbado; varandas repetidas; base e
  coroa sutis; coberturas grandes vazias; noite em grade.
- Rótulo do território repetido como placa ou letreiro de bandeira com palavras de loja nas
  unidades institucionais largas.
- Famílias fora de `block()` sem anatomia (≈4%).
- Openings:
  - a sombra do mundo não entra no recesso;
  - o reveal não projeta sombra;
  - janelas estreitas ficam finas;
  - contraste em paredes extremas;
  - repetição de molduras.
- LOD pop: aberturas pintadas → recuadas no zoom ≈ 1,2.

**Leitura**

- Close sampling: um quadro Close mostra 1–3 prédios e não amostra a página (25/91 pares dentro do
  ruído de seed).
- Nas páginas de lista, o estilo é quase toda a identidade.
- Atlas de letreiros (512²) transborda em cidades densas (Paul Graham, lobste.rs): os últimos
  letreiros são descartados.

## 5. Próxima fase (não iniciada)

**VISUAL SCENARIO DIFFERENTIATION / ART DIRECTION.** É uma fase separada. Começa com uma auditoria
visual de várias cidades lado a lado:

> "Por que, apesar da fundação semântica, estas cidades ainda parecem variações do mesmo cenário?"

Ela vai ser orientada por impacto visual perceptível, não por métricas internas. Por isso, nada de
polimento visual, props, ruas, skyline, vegetação, carros, pessoas, iluminação ou decoração foi
mexido neste freeze.
