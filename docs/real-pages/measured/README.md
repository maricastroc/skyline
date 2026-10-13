# Páginas reais medidas

Nove capturas renderizadas de 12/10/2026, com o passe de medição (caixa e tamanho de fonte de cada elemento). São as fixtures de `npm run test:items`, que compara a cidade de cada uma com a do mesmo snapshot sem as caixas.

| Arquivo | Papel no teste |
| --- | --- |
| `spotify`, `soundcloud` | Uma fileira de cartões: rua de sobrados |
| `pinterest` | Uma fileira de quatro: edifícios isolados |
| `lego`, `toscrape` | Grade: frentes em duas faces |
| `sketchfab` | Cartões deitados: a família da torre não muda |
| `hn` | Controle: lista de links, sem série |
| `excalidraw` | Barra de teclas: lida, e a receita de hoje fica |
| `linear` | Controle: botões de uma interface ilustrativa |

Para refazer uma: `captureWithLocalBrowser(new URL(…))`, em `src/lib/acquisition/rendered-capture.ts`, que mede por padrão.
