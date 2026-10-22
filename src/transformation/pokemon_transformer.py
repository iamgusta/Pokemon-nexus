
import csv
import json
from pathlib import Path
from collections import Counter

# ============================================
# POKEMON NEXUS - DATA TRANSFORMATION
# ============================================

BASE_DIR = Path(__file__).resolve().parents[2]

RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

OUTPUT_FILE = PROCESSED_DIR / "pokemon.csv"

STATS = [
    "hp",
    "attack",
    "defense",
    "special-attack",
    "special-defense",
    "speed"
]

COLUMNS = [
    "pokemon_id",
    "species_id",
    "name",
    "is_default",
    "height_m",
    "weight_kg",
    "base_experience",
    "types",
    "abilities",
    "hp",
    "attack",
    "defense",
    "special_attack",
    "special_defense",
    "speed",
    "total_stats",
    "image_url"
]


def extrair_species_id(dados):
    especie = dados.get("species") or {}
    url = (especie.get("url") or "").rstrip("/")

    try:
        return int(url.split("/")[-1])
    except (ValueError, IndexError):
        return None


def transformar_pokemon(dados):
    tipos = [
        item["type"]["name"]
        for item in sorted(
            dados.get("types", []),
            key=lambda x: x["slot"]
        )
    ]

    habilidades = [
        item["ability"]["name"]
        for item in dados.get("abilities", [])
    ]

    estatisticas = {
        item["stat"]["name"]: item["base_stat"]
        for item in dados.get("stats", [])
    }

    sprites = dados.get("sprites") or {}

    official_artwork = (
        sprites.get("other", {})
        .get("official-artwork") or {}
    )

    valores_stats = {
        stat: estatisticas.get(stat, 0)
        for stat in STATS
    }

    return {
        "pokemon_id": dados["id"],
        "species_id": extrair_species_id(dados),
        "name": dados["name"],
        "is_default": dados.get("is_default", False),
        "height_m": dados.get("height", 0) / 10,
        "weight_kg": dados.get("weight", 0) / 10,
        "base_experience": dados.get("base_experience"),
        "types": "|".join(tipos),
        "abilities": "|".join(habilidades),
        "hp": valores_stats["hp"],
        "attack": valores_stats["attack"],
        "defense": valores_stats["defense"],
        "special_attack": valores_stats["special-attack"],
        "special_defense": valores_stats["special-defense"],
        "speed": valores_stats["speed"],
        "total_stats": sum(valores_stats.values()),
        "image_url": (
            official_artwork.get("front_default")
            or sprites.get("front_default")
            or ""
        )
    }


def executar_transformacao():
    print("=" * 50)
    print("POKEMON NEXUS - DATA TRANSFORMATION")
    print("=" * 50)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    arquivos = sorted(RAW_DIR.glob("pokemon_*.json"))

    print(f"Arquivos encontrados: {len(arquivos)}")

    if not arquivos:
        print("Nenhum arquivo JSON encontrado.")
        return

    registros = []
    erros = []

    for arquivo in arquivos:
        try:
            with arquivo.open(
                "r",
                encoding="utf-8"
            ) as f:
                dados = json.load(f)

            registro = transformar_pokemon(dados)
            registros.append(registro)

        except (OSError, ValueError, KeyError, TypeError) as erro:
            erros.append((arquivo.name, str(erro)))

    registros.sort(key=lambda p: p["pokemon_id"])

    with OUTPUT_FILE.open(
        "w",
        newline="",
        encoding="utf-8"
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=COLUMNS
        )

        writer.writeheader()
        writer.writerows(registros)

    especies = {
        p["species_id"]
        for p in registros
        if p["species_id"] is not None
    }

    tipos = Counter()

    for pokemon in registros:
        for tipo in pokemon["types"].split("|"):
            if tipo:
                tipos[tipo] += 1

    print()
    print("TRANSFORMACAO CONCLUIDA!")
    print(f"Registros processados: {len(registros)}")
    print(f"Especies distintas: {len(especies)}")
    print(f"Arquivos com erro: {len(erros)}")

    print()
    print("DISTRIBUICAO POR TIPO:")

    for tipo, quantidade in tipos.most_common():
        print(f"{tipo}: {quantidade}")

    if erros:
        print()
        print("ERROS ENCONTRADOS:")

        for arquivo, erro in erros[:10]:
            print(f"{arquivo}: {erro}")

    print()
    print(f"Arquivo gerado: {OUTPUT_FILE}")
    print("=" * 50)


if __name__ == "__main__":
    executar_transformacao()
