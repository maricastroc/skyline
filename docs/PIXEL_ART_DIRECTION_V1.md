# Pixel city: Art Direction v1

> **Atualização (2026-10-05):** o código dos kits congelados (`kit-v1` … `kit-v12`), as rotas
> `?v=N` e as checagens de equivalência byte a byte com eles foram removidos. Esta fase deixou de
> ser um contrato verificado pelo CI; o kit-v12 continua recuperável pela tag git `art-direction-v1`. Os testes
> atuais verificam as invariantes do kit atual, cada camada ligada × desligada (README → How to
> run). O restante deste documento é o registro do freeze.

> **ART DIRECTION V1: FROZEN**
>
> Baseline final: **kit-v12** (`src/lib/pixelcity/kit-v12`, `?v=12`), tag git `art-direction-v1`.
> O kit atual (`?v=13`) é byte a byte o kit-v12. Checagem do freeze: `npm run test:art-direction`.

## 1. Estado das fases

| fase | estado | documento |
|---|---|---|
| **Foundation v1** (semântica / arquitetura) | **congelada** (kit-v9, tag `foundation-v1`) | [PIXEL_FOUNDATION_V1.md](PIXEL_FOUNDATION_V1.md) |
| auditoria visual de cenário | concluída | [PIXEL_ART_DIRECTION_AUDIT.md](PIXEL_ART_DIRECTION_AUDIT.md) |
| **C1 Road Hierarchy** (papéis viários) | **encerrada** (kit-v10) | [PIXEL_STREET_ROLES.md](PIXEL_STREET_ROLES.md) |
| **C2 Ground Character** | **não será implementada nesta fase** | — |
| **C3 Street Life** (vida urbana) | **encerrada** (kit-v11) | [PIXEL_STREET_LIFE.md](PIXEL_STREET_LIFE.md) |
| **C4 Atmosphere** (ambiente) | **encerrada** (kit-v12) | [PIXEL_ATMOSPHERE.md](PIXEL_ATMOSPHERE.md) |

## 2. Pipeline congelado

```
FOUNDATION V1 (kit-v9)        extraction · page model · territory · structure · composition ·
                              massing · Program · Surface Grammar · Openings
        ↓ só lê
ART DIRECTION V1 (kit-v12)    C1 papéis viários (alocação → bulevar / rua / viela / calçadão)
                              C3 vida urbana (frente × papel × página → gente / copa / tráfego)
                              C4 ambiente (página → abertura / cor do ar / saturação / dureza da luz)
        ↓
SCENE → PIXELS
```

## 3. Kits congelados

| versão | estado |
|---|---|
| v9 | Foundation v1 |
| v10 | Art Direction C1 (papéis viários) |
| v11 | Art Direction C3 (vida urbana) |
| **v12** | **Art Direction v1** (C4 ambiente): baseline final |

Ablações (verificadas dentro do kit-v12 e no kit atual):

| ablação | resultado byte a byte |
|---|---|
| `atmosphere: false` | kit-v11 |
| `streetLife: false` | kit-v10 |
| `artDirection: false` | kit-v9 (Foundation v1) |

## 4. Regras a partir deste baseline

1. **Nada abaixo se altera sem uma rodada própria** (freeze, BEFORE × AFTER, aprovação):
   - extração semântica;
   - alocação, território, composição, massing;
   - Program, Surface Grammar, Openings;
   - classificação viária (C1);
   - gramática de vida urbana (C3);
   - gramática de atmosfera (C4).
2. **`?flat=1` mantém a semântica histórica** (teste de silhueta e massing).
3. **Nada de hostname, site ou preset por página**, em nenhuma camada.
4. A próxima fase (**VISUAL POLISH**) é separada e será definida à parte. Ela não reabre as camadas
   acima em silêncio.

## 5. Bateria final de regressão (no freeze)

| verificação | resultado |
|---|---|
| typecheck · lint · build | ok · 0 problemas · ok |
| `test:allocation` · `hygiene` · `surface` · `openings` · `composition` · `program` | todos ✓ |
| `test:foundation` (page model = kit-v9; quarteirões e trace = kit-v9; `artDirection: false` = kit-v9; kit-v9 = hashes do freeze; v1–v8 constroem) | 14/14 · 42/42 · 42/42 · 42/42 · 98/98 |
| `test:streets` (C1) | 8 ✓ |
| `test:life` (C3) | 11 ✓ |
| `test:atmosphere` (C4) | 12 ✓ |
| `test:art-direction` (atual = kit-v12; kit-v12 = hashes do freeze; cadeia de ablações dentro do kit-v12; dia, dourado, noite, flat) | 56/56 · 56/56 · 56/56 |

## 6. Backlog preservado (não corrigir agora)

**Foundation v1:** o backlog de [PIXEL_FOUNDATION_V1.md §4](PIXEL_FOUNDATION_V1.md) continua
valendo.

**C1: hierarquia viária**

- bulevares fragmentados (cada trecho é classificado sozinho; empates viram rua comum);
- hero sempre no mesmo quarteirão (a espiral da alocação), daí um anel de bulevares parecido entre
  páginas com hero;
- a Street (`focus=0,0`) enquadra principalmente o marco;
- oclusão nas cidades densas (massing);
- a viela se lê principalmente pelo material;
- Python Docs como grade uniforme de ruas comuns;
- saídas para o vazio continuam o papel do trecho.

**C3: vida urbana**

- Python Docs com muitas frentes comerciais (térreos da Surface Grammar);
- carros acumulando nos cruzamentos;
- ritmo uniforme dos postes;
- pouca variedade de carros e de árvores;
- pessoas dentro das praças vindas da composição;
- leitura limitada na City (gente e mobiliário pequenos demais);
- número de ônibus segue o número de bulevares movimentados.

**C4: atmosfera**

- corpus majoritariamente azul: o eixo de cor só diferencia páginas não azuis;
- a noite comprime o caráter;
- o céu noturno base já usava o fundo da página (antes da C4);
- a dureza da luz é sutil na City;
- o dither da névoa fica visível nas faixas baixas;
- a hora dourada não está nas pranchas;
- a Street não muda (a névoa é só da City).

**C2: caráter do chão.** Não implementada nesta fase.
