#!/usr/bin/env python3
"""
Gera o áudio com o nome de cada estrutura (voz masculina neural), para o app dizer o nome da peça tocada.

Uso (num ambiente Python com o pacote `piper-tts` instalado):
    python scripts/voz/gerar_audios.py <voz.onnx>

A voz usada no app é a pt_PT "tugão" (medium) do Piper (https://huggingface.co/rhasspy/piper-voices,
dados de treino CC0). Para outra voz, passe outro modelo .onnx; os arquivos são todos regenerados.

Saída:
    public/audio/nomes/<id>.m4a   um arquivo AAC mono por estrutura (dos dois corpos)
    src/data/voz.json             voz usada e versão (o app põe a versão no endereço dos arquivos)

Requisitos: `afconvert` (macOS) para converter WAV em AAC.
"""
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DADOS = RAIZ / "src" / "data"
SAIDA = RAIZ / "public" / "audio" / "nomes"

ORDINAL_M = ["", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo", "oitavo", "nono",
             "décimo", "décimo primeiro", "décimo segundo"]
CARDINAL = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze"]
LETRAS = {"C": "cê", "T": "tê", "L": "éle", "S": "ésse"}
ROMANOS = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10}


def para_fala(nome: str) -> str:
    """Texto que a voz deve ler: ordinais e códigos de vértebras por extenso, parênteses como pausa."""
    t = re.sub(r"\b(\d{1,2})º", lambda m: ORDINAL_M[int(m.group(1))], nome)
    t = re.sub(r"\b(\d{1,2})ª", lambda m: ORDINAL_M[int(m.group(1))][:-1] + "a", t)
    t = t.replace("décimo primeira", "décima primeira").replace("décimo segunda", "décima segunda")
    t = re.sub(r"\b([CTLS])(\d{1,2})\b", lambda m: f"{LETRAS[m.group(1)]} {CARDINAL[int(m.group(2))]}", t)
    t = re.sub(r"\s*\(([^)]*)\)", r", \1", t)
    # Numeração romana (segmentos do fígado): "Segmento hepatovenoso IV" -> "... quatro"
    t = re.sub(r"\b(I{1,3}|IV|V|VI{1,3}|IX|X)\b", lambda m: CARDINAL[ROMANOS[m.group(1)]], t)
    return t


def estruturas():
    base = json.loads((DADOS / "estruturas.json").read_text(encoding="utf-8"))
    fem = json.loads((DADOS / "feminino.json").read_text(encoding="utf-8"))["estruturas"]
    return [(e["id"], e["nome"]) for e in base + fem]


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    modelo = Path(sys.argv[1])

    import numpy as np
    import piper
    from piper import PiperVoice, SynthesisConfig

    # O espeak-ng embutido no pacote procura os dados na pasta do pacote: aponta para lá se preciso
    pasta_pacote = Path(piper.__file__).parent
    for f in (pasta_pacote / "espeak-ng-data").iterdir():
        alvo = pasta_pacote / f.name
        if not alvo.exists():
            alvo.symlink_to(f)

    voz = PiperVoice.load(str(modelo))
    config = SynthesisConfig(length_scale=1.05, noise_scale=0.5, noise_w_scale=0.333)
    itens = estruturas()
    SAIDA.mkdir(parents=True, exist_ok=True)
    # A marca de versão muda quando a forma de gerar muda, para os aparelhos trocarem os áudios em cache
    resumo = hashlib.sha256(f"{modelo.name}|r-inicial-duplo".encode())
    with tempfile.TemporaryDirectory() as tmp:
        for n, (ident, nome) in enumerate(itens, 1):
            texto = para_fala(nome)
            resumo.update(f"{ident}\t{texto}\n".encode())
            wav = Path(tmp) / f"{ident}.wav"
            with wave.open(str(wav), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(voz.config.sample_rate)
                for k, frase in enumerate(voz.phonemize(texto)):
                    # No arranque da fala a voz quase não pronuncia o R inicial (5–10 ms, inaudível em
                    # "Rádio", "Reto", "Rim"); duplicado, fica com a duração que tem no meio da frase.
                    if k == 0 and frase and frase[0] == "ʁ":
                        frase = ["ʁ", *frase]
                    audio = voz.phoneme_ids_to_audio(voz.phonemes_to_ids(frase), config)
                    w.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
            subprocess.run(
                ["afconvert", "-f", "m4af", "-d", "aac", "-b", "32000", str(wav), str(SAIDA / f"{ident}.m4a")],
                check=True,
            )
            if n % 200 == 0:
                print(f"{n}/{len(itens)}", flush=True)
    # Remove áudios de estruturas que não existem mais
    ids = {i for i, _ in itens}
    for f in SAIDA.glob("*.m4a"):
        if f.stem not in ids:
            f.unlink()
    (DADOS / "voz.json").write_text(
        json.dumps({"voz": f"Piper {modelo.stem}", "versao": resumo.hexdigest()[:10]}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    print(f"✓ {len(itens)} áudios em public/audio/nomes/ e src/data/voz.json")


if __name__ == "__main__":
    main()
