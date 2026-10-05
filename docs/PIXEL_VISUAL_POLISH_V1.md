# Pixel city: Visual Polish v1

> **VISUAL POLISH V1: ENCERRADO**
>
> Baseline final: o commit `d69c79f` (rodada 2) e esta declaração.
>
> O que o Polish v1 desenha é checado por:
>
> | comando | o que verifica |
> |---|---|
> | `npm run test:polish` | os assets: decisões iguais ao kit-v12; ablação `polishAssets: false` = kit-v12 byte a byte |
> | `npm run test:art-direction` | o kit atual com o polish desligado = kit-v12 |
> | `npm run test:foundation` | a Foundation, intacta |

## 1. Estado das fases

| fase | estado | documento |
|---|---|---|
| **Foundation v1** (semântica / arquitetura) | **congelada** (kit-v9, tag `foundation-v1`) | [PIXEL_FOUNDATION_V1.md](PIXEL_FOUNDATION_V1.md) |
| **Art Direction v1** (C1, C3, C4) | **congelada** (kit-v12, tag `art-direction-v1`) | [PIXEL_ART_DIRECTION_V1.md](PIXEL_ART_DIRECTION_V1.md) |
| auditoria de Visual Polish | concluída | [PIXEL_POLISH_AUDIT.md](PIXEL_POLISH_AUDIT.md) |
| rodada 1: névoa baixa (G1) | **encerrada** | [PIXEL_POLISH_HAZE.md](PIXEL_POLISH_HAZE.md) |
| rodada 2: assets placeholder (G4) | **encerrada** | [PIXEL_POLISH_ASSETS.md](PIXEL_POLISH_ASSETS.md) |
| **Visual Polish v1** | **encerrado** | este documento |

## 2. O que o Visual Polish v1 mudou

```
FOUNDATION V1 (kit-v9)          por que a cidade tem aquela forma
        ↓ só lê
ART DIRECTION V1 (kit-v12)      que caráter o cenário tem
        ↓ só lê
VISUAL POLISH V1                quão bem isso é desenhado
  · renderer   névoa baixa (G1): o ar se deita no chão, o skyline sai dele, sem retícula
  · kit        condensadores de cobertura e billboards estruturados (G4), atrás de polishAssets
```

| rodada | camada | o que mudou | o que não mudou |
|---|---|---|---|
| 1. névoa baixa | renderer (`PixelPost.ts`, `PixelScene.tsx`) | a névoa da City afina com a altura acima do chão; dither só entre níveis vizinhos; mistura perceptual | a faixa e a cor do ar decididas pela C4, a câmera, o objeto cidade (byte a byte) |
| 2. assets placeholder | kit (`buildings.ts`, `core.ts`, `district.ts`) | o ar-condicionado vira condensador (sem o "canhão"); o billboard, com e sem conteúdo, ganha moldura, passarela e refletores | onde, quantos e por que aparecem; o texto da página; todas as decisões da cidade |

## 3. Regras deste baseline

1. **Kits congelam decisões; o renderer é compartilhado.**
   - `?v=1` … `?v=12` reproduzem as decisões de cada kit, desenhadas pelo renderer de hoje (com a
     névoa baixa).
   - Não são histórico visual pixel a pixel.
   - As capturas BEFORE de cada rodada são a referência visual histórica:
     - `docs/screenshots/polish-audit/`;
     - `docs/screenshots/polish-haze/`;
     - `docs/screenshots/polish-assets/before/`.
   - Não há versionamento do render por kit.
2. **O polish de assets é uma ablação, como as camadas anteriores.**
   - `polishAssets: false` → kit-v12.
   - `artDirection: false` → kit-v9 (Foundation v1).
   - As suítes das rodadas antigas rodam o kit atual com o polish desligado. Cada uma continua
     checando o próprio passo com a mesma força.
3. **Nada de Foundation, Art Direction ou Polish se altera sem uma rodada própria** (freeze,
   BEFORE × AFTER, aprovação).
4. **Nada de hostname, site ou preset por página**, em nenhuma camada.

## 4. Bateria final de regressão

| verificação | resultado |
|---|---|
| typecheck · lint | ok · 0 problemas |
| `test:allocation` · `hygiene` · `surface` · `openings` · `composition` · `program` | todos ✓ |
| `test:foundation` | 5 ✓ |
| `test:streets` · `test:life` · `test:atmosphere` | todos ✓ |
| `test:art-direction` | 3 ✓ (atual com o polish desligado = kit-v12, 56/56) |
| `test:polish` | 8 ✓ (ablação = kit-v12; decisões = kit-v12; peças fora dos assets idênticas; footprints e painéis no lugar; mesmos letreiros) |

## 5. Custos conhecidos (aceitos, não otimizados)

- **+3,6% de peças no corpus** (172.872 → 179.037), aceito na aprovação da rodada 2:
  - ar-condicionado: 3,4 → 8,1 peças;
  - billboard: 2,9 → 14,9 peças.
- **O renderer não é versionado.** Rodadas de render mudam a aparência dos kits antigos (regra 1).

## 6. Backlog preservado (não tratar agora)

**Da auditoria** ([PIXEL_POLISH_AUDIT.md](PIXEL_POLISH_AUDIT.md)), ainda abertos:

- **G2, a camada miúda em confete:** árvores-pirulito idênticas, covas escuras, postes quase
  pretos, gente em pontos na City. A arrumação das praças mora em `massing.ts` (Foundation).
- **G3, o chão sem material:** piso chapado, grama neon, viela que lê como lama, tabuleiro fora do
  distrito.
- **G5, luz e volume:** sombras serrilhadas, prédios sem sombra de contato, torres de vidro
  genéricas, janelas noturnas em manchas, o dither de sombra com sol rasante. Encosta em Openings.
- **Água:** quase ausente (só nas fontes).

**Das rodadas:**

- **Névoa:** pontilhado fino residual na faixa enevoada (só de perto); a hora dourada não está nas
  pranchas.
- **Billboards:** a fileira de seis billboards "AI AND" da Linear é o caso mais carregado. A
  simplificação possível seria uma moldura mais clara ou mais rasa, no mesmo asset.
- **Telas sem conteúdo:** o painel continua uma cor só.

Os backlogs de [Foundation v1](PIXEL_FOUNDATION_V1.md) e [Art Direction v1](PIXEL_ART_DIRECTION_V1.md)
continuam valendo.
