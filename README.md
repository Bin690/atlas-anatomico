# Atlas Anatômico 3D

Atlas anatômico 3D interativo, em português do Brasil, para estudantes de medicina e enfermagem.
Funciona no navegador do celular, do iPad e do computador, e pode ser instalado como app (PWA) para uso offline.

## Funcionalidades

- **Corpo inteiro em 3D:** 1.663 estruturas reais, divididas em 16 camadas (pele, esqueleto, articulações,
  músculos, sistema nervoso, olhos e orelhas, coração, artérias, veias, pulmões, vias respiratórias,
  digestório, urinário, genital, glândulas endócrinas e linfático).
- **Toque em qualquer peça:** destaque, rótulo 3D e card com nome (Terminologia Anatômica), nome original em
  inglês, estrutura-mãe ("Faz parte de"), descrição, ficha técnica (ex.: origem, inserção, inervação e ação) e
  correlação clínica.
- **Busca** em português ou inglês, sem precisar de acentos (`/` ou Ctrl/⌘+K).
- **Ferramentas:**
  - camadas que se ligam e desligam;
  - ocultar e isolar estruturas;
  - raio-X;
  - cortes anatômicos axial, sagital e coronal.
- **Quiz:** a estrutura fica destacada no modelo, sem nome, e o aluno escolhe entre 4 opções. São 10
  perguntas por sistema, com explicação depois de cada resposta.
- **Offline (PWA):** a interface fica guardada no aparelho, e os modelos podem ser baixados pelo painel de
  camadas.

## Instalação

Requer Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev            # http://localhost:5173
```

Para testar no celular ou no iPad na mesma rede Wi-Fi, abra o endereço da linha **Network** que o
`npm run dev` mostra (ex.: `http://192.168.0.10:5173`). Libere o Node no firewall do macOS, se ele pedir.

| Comando           | O que faz                                         |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento                       |
| `npm run build`   | Build de produção em `dist/` (com service worker) |
| `npm run preview` | Serve o build de produção                         |
| `npm run lint`    | Lint (oxlint)                                     |
| `npm run format`  | Formatação (Prettier)                             |

## Stack

- Vite, React 19 e TypeScript
- React Three Fiber e drei, com Three.js
- Tailwind CSS v4
- Zustand
- React Router
- vite-plugin-pwa

## Estrutura

```
src/
  App.tsx                 rotas; o canvas 3D fica fora das rotas e nunca é desmontado
  pages/                  Explorador (tela principal), Quiz, NaoEncontrado
  components/
    Viewer3D.tsx          canvas, luzes e camadas (com carga progressiva)
    3d/CamadaBatched.tsx  cada camada é UM BatchedMesh: uma chamada de desenho, com cor,
                          visibilidade e seleção por estrutura
    3d/RigCamera.tsx      câmera: voos, foco e enquadramento descontando os painéis abertos
    3d/corte.ts           plano de corte e seleção que respeita o corte
    ui/                   busca, camadas, cortes, card da estrutura
    QuizPanel.tsx
  data/
    sistemas.json         camadas (GERADO)
    estruturas.json       estruturas com nome em português (GERADO)
    conteudo.json         descrição, ficha e correlação clínica por id (EDITADO À MÃO)
    quiz.ts               sorteio de perguntas e alternativas
  store/useAtlasStore.ts  estado global (Zustand)
public/models/            uma camada .glb por sistema (+ versões "-leve")
scripts/modelos/          gerador dos modelos e do catálogo
```

## Dados

- **Modelos e nomes:** são gerados a partir do BodyParts3D pelo script `scripts/modelos/gerar.mjs`. O passo
  a passo está em [scripts/modelos/README.md](scripts/modelos/README.md). Não edite `sistemas.json` nem
  `estruturas.json` à mão: rode o gerador de novo.
- **Conteúdo didático:** fica em `src/data/conteudo.json`, com a chave sendo o id FMA da estrutura.

```jsonc
"FMA37686": {   // Cabeça longa do músculo bíceps braquial direito
  "descricao": "…",
  "correlacaoClinica": "…",
  "ficha": { "Origem": "…", "Inserção": "…", "Inervação": "…", "Ação": "…" }
}
```

Para descobrir o id de uma estrutura, procure pelo nome dela em `src/data/estruturas.json`. Os rótulos da
`ficha` são livres e aparecem na ordem em que foram escritos.

### Adicionar uma estrutura ou camada nova

1. Inclua a regra em `scripts/modelos/sistemas.mjs`: a camada e/ou o padrão do nome FMA.
2. Se for preciso, inclua termos novos em `scripts/modelos/traducao.mjs`.
3. Rode o gerador. A camada aparece sozinha no app.
4. Escreva o conteúdo em `src/data/conteudo.json`.

## Créditos e licença dos modelos

Os modelos 3D são do **BodyParts3D**, © The Database Center for Life Science, sob licença
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Foram adaptados: simplificados, convertidos para
glTF e, no caso dos pulmões, com superfícies reconstruídas. O crédito aparece no app.

## Limitações conhecidas

- **Estruturas ausentes no BodyParts3D:** cóccix, ossículos da orelha e alguns músculos (ex.: reto do abdome).
- **Pulmões:** as superfícies foram reconstruídas a partir das árvores brônquicas e são aproximações
  didáticas.
- **Nomes e textos:** foram gerados com apoio de IA, a partir de fontes de referência (Moore, Gray, Netter,
  Machado). Recomenda-se a revisão por um docente de anatomia antes do uso em sala.
