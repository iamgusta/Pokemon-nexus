
import json
import time
from pathlib import Path

import requests

API_URL = "https://pokeapi.co/api/v2/pokemon"
OUTPUT_DIR = Path("data/raw")
TIMEOUT = 30


def coletar_pokemon():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("POKEMON NEXUS - DATA INGESTION")
    print("Consultando a PokéAPI...")

    session = requests.Session()

    try:
        resposta = session.get(
            API_URL,
            params={"limit": 1},
            timeout=TIMEOUT
        )
        resposta.raise_for_status()

        total = resposta.json()["count"]
        print(f"Registros disponíveis na API: {total}")

        for pokemon_id in range(1, total + 1):
            arquivo = OUTPUT_DIR / f"pokemon_{pokemon_id}.json"

            if arquivo.exists():
                continue

            try:
                resposta = session.get(
                    f"{API_URL}/{pokemon_id}/",
                    timeout=TIMEOUT
                )

                if resposta.status_code == 404:
                    continue

                resposta.raise_for_status()
                dados = resposta.json()

                with arquivo.open("w", encoding="utf-8") as f:
                    json.dump(
                        dados,
                        f,
                        ensure_ascii=False,
                        indent=4
                    )

                print(
                    f"[{pokemon_id}/{total}] "
                    f"{dados['name']} salvo!"
                )

                time.sleep(0.1)

            except requests.RequestException as erro:
                print(f"Erro no Pokémon {pokemon_id}: {erro}")

        print("Coleta finalizada!")

    finally:
        session.close()


if __name__ == "__main__":
    coletar_pokemon()
