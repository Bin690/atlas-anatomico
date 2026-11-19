"""
Mescla textos didáticos escritos por nome-base (FMA em inglês, sem lado) em src/data/conteudo.json.

Uso: python3 scripts/modelos/mesclar-conteudo.py <pasta> 
A pasta deve ter bases_<sistema>.json ({base, ids}) e saida_*.json ({base: {descricao, correlacaoClinica?, ficha?}}).
Entradas já existentes em conteudo.json não são sobrescritas (edições manuais têm prioridade).
"""
import glob, json, os, sys

pasta = sys.argv[1]
destino = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'conteudo.json')
ids_por_base = {}
for f in glob.glob(os.path.join(pasta, 'bases_*.json')):
    for item in json.load(open(f, encoding='utf-8')):
        ids_por_base.setdefault(item['base'], []).extend(item['ids'])

conteudo = json.load(open(destino, encoding='utf-8'))
novos = 0
for f in sorted(glob.glob(os.path.join(pasta, 'saida_*.json'))):
    textos = json.load(open(f, encoding='utf-8'))
    for base, texto in textos.items():
        if not texto.get('descricao'):
            continue
        entrada = {k: v for k, v in texto.items() if k in ('descricao', 'correlacaoClinica', 'ficha') and v}
        for i in ids_por_base.get(base, []):
            if i not in conteudo:
                conteudo[i] = entrada
                novos += 1
    print(f'{os.path.basename(f)}: {len(textos)} bases')

json.dump(conteudo, open(destino, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{novos} estruturas novas; total com conteúdo: {len(conteudo)}')
