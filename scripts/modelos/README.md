# Geração dos modelos 3D

Os arquivos `public/models/*.glb` são gerados a partir do **BodyParts3D**
(© The Database Center for Life Science, licença
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). O crédito aparece na tela inicial do app.

## 1. Baixar os dados (uma vez)

Em <https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/>, baixe para uma pasta qualquer:

- `partof_BP3D_4.0_obj_99.zip` (62 MB): extraia na mesma pasta
- `partof_element_parts.txt`, `partof_parts_list_e.txt`, `partof_inclusion_relation_list.txt`
- `isa_inclusion_relation_list.txt` (usado para listar os ossos)

O servidor é lento (~30 KB/s por conexão). Se precisar, baixe em partes paralelas com `curl -r`.

## 2. Gerar

Baixe também `isa_BP3D_4.0_obj_99.zip` (136 MB, contém músculos e outras estruturas) e extraia na mesma pasta.

```bash
node scripts/modelos/gerar.mjs /caminho/da/pasta
```

Leva ~15 segundos e gera:

- `public/models/<camada>.glb`: uma camada por sistema do corpo (16 ao todo), uma mesh por estrutura,
  com o id FMA como nome;
- `src/data/sistemas.json` e `src/data/estruturas.json`: camadas e todas as estruturas com nome em
  português (gerados, não editar à mão);
- `src/data/conteudo.json`: descrição e correlação clínica por id. É criado só se não existir e depois
  é editado à mão.

Arquivos do gerador:

| Arquivo          | Função                                               |
| ---------------- | ---------------------------------------------------- |
| `sistemas.mjs`   | camadas, regras de classificação e cores             |
| `traducao.mjs`   | tradução dos nomes FMA para a Terminologia Anatômica |
| `ossos.mjs`      | nomes, descrições e correlações dos ossos            |
| `superficie.mjs` | reconstrução dos lobos pulmonares                    |

## Detalhes

- **Coordenadas:** todas as camadas usam o mesmo "espaço do corpo" (metros, y para cima, frente em +z,
  lado esquerdo do paciente em +x, pés em y = 0). Por isso cada peça já aparece no lugar certo.
- **Desempenho:** no app, cada camada vira um único `BatchedMesh` (uma chamada de desenho), com cor,
  visibilidade e seleção por estrutura. As malhas são simplificadas e comprimidas com meshoptimizer.
- **Pulmões:** o BodyParts3D não tem a superfície dos lobos, só as árvores brônquica e vascular. A
  superfície é reconstruída: cada voxel da cavidade pleural (dentro das costelas e fora do mediastino)
  fica com o lobo cuja árvore está mais próxima. É uma aproximação didática.
- **Ausentes no BodyParts3D:** cóccix, ossículos da orelha e alguns músculos (ex.: reto do abdome).
