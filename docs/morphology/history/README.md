# Histórico da investigação morfológica

Relatórios das rodadas de 12/10/2026 que levaram à decisão em [MORPHOLOGY_DECISION.md](../../MORPHOLOGY_DECISION.md). Estão aqui para rastreabilidade: descrevem hipóteses e protótipos que **não** estão no código. O que ficou no código está descrito na decisão e em [ARCHITECTURE.md](../../ARCHITECTURE.md).

| Ordem | Relatório | O que testou | Destino |
| --- | --- | --- | --- |
| 1 | [URBAN_IDENTITY.md](URBAN_IDENTITY.md) | Três hipóteses de geometria (`relief`, `towers`, `monument`) | Descartadas |
| 2 | [URBAN_PLAN_PROPOSAL.md](URBAN_PLAN_PROPOSAL.md), [URBAN_PLAN_PROTOTYPE.md](URBAN_PLAN_PROTOTYPE.md) | Plano 2D pela posição medida, solo aberto, poda de elementos não vistos | Descartados. Ficou o passe de medição da captura |
| 3 | [ITEM_GRAMMAR_PROPOSAL.md](ITEM_GRAMMAR_PROPOSAL.md), [ITEM_GRAMMAR_PROTOTYPE.md](ITEM_GRAMMAR_PROTOTYPE.md) | `series`: o arranjo dos itens no lugar da receita | Descartado: identidade sim, composição mecânica |
| 4 | [ITEM_ENSEMBLE_PROTOTYPE.md](ITEM_ENSEMBLE_PROTOTYPE.md) | `ensemble`: a receita de mídia condicionada pelos itens, seis regras | Três regras consolidadas, três retiradas |
| 5 | [UNIT_READING_DIAGNOSIS.md](UNIT_READING_DIAGNOSIS.md) | Por que a leitura das unidades errava fora das páginas de trabalho | Base da leitura consolidada |
| 6 | [UNIT_READING_PROTOTYPE.md](UNIT_READING_PROTOTYPE.md) | A leitura nova (`unitsOf`) contra rótulos, com validação independente | Consolidada |

Onde está o resto:

- **Código de cada protótipo:** `../archive/`, como patches e pacotes pequenos por rodada. O estado completo imediatamente antes da consolidação (os três braços, as seis regras, as duas leituras) é `morphology-decision-2026-10-12.tgz`.
- **Pranchas:** as seis que sustentam a decisão estão em `../sheets/decision/` e `../sheets/reading/`. As demais não são versionadas: nestes relatórios aparecem como "(arquivada)" e ficam em `../archive-local/`, pasta ignorada pelo git que só existe na máquina onde a investigação foi feita.
- **Instrumentos, rótulos e saídas:** nos pacotes `unit-reading-*`, `item-*`, `layout-*` e `morphology-*` de `../archive/`. As fotos usadas para rotular a leitura ficam fora do git, em `../archive-local/`.
