
import csv
from pathlib import Path

from src.database.connection import get_connection

# ============================================
# POKEMON NEXUS - DATA LOADING
# ============================================

BASE_DIR = Path(__file__).resolve().parents[2]
CSV_FILE = BASE_DIR / "data/processed/pokemon.csv"


def numero_inteiro(valor):
    if valor is None or str(valor).strip() == "":
        return None
    return int(valor)


def numero_decimal(valor):
    if valor is None or str(valor).strip() == "":
        return None
    return float(valor)


def lista_valores(valor):
    if not valor:
        return []

    return list(dict.fromkeys(
        item.strip()
        for item in valor.split("|")
        if item.strip()
    ))


def obter_id(cursor, tabela, coluna_id, nome, cache):
    chave = (tabela, nome)

    if chave in cache:
        return cache[chave]

    # Os nomes das tabelas e colunas são constantes
    # definidas no próprio código.
    from psycopg2 import sql

    consulta = sql.SQL("""
        INSERT INTO {tabela} (name)
        VALUES (%s)
        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING {coluna}
    """).format(
        tabela=sql.Identifier(tabela),
        coluna=sql.Identifier(coluna_id)
    )

    cursor.execute(consulta, (nome,))

    identificador = cursor.fetchone()[0]
    cache[chave] = identificador

    return identificador


def carregar_pokemon(cursor, pokemon):
    cursor.execute("""
        INSERT INTO pokemon (
            pokemon_id,
            species_id,
            name,
            is_default,
            height_m,
            weight_kg,
            base_experience,
            image_url
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (pokemon_id)
        DO UPDATE SET
            species_id = EXCLUDED.species_id,
            name = EXCLUDED.name,
            is_default = EXCLUDED.is_default,
            height_m = EXCLUDED.height_m,
            weight_kg = EXCLUDED.weight_kg,
            base_experience = EXCLUDED.base_experience,
            image_url = EXCLUDED.image_url
    """, (
        int(pokemon["pokemon_id"]),
        numero_inteiro(pokemon["species_id"]),
        pokemon["name"],
        pokemon["is_default"].lower() == "true",
        numero_decimal(pokemon["height_m"]),
        numero_decimal(pokemon["weight_kg"]),
        numero_inteiro(pokemon["base_experience"]),
        pokemon["image_url"] or None
    ))


def carregar_stats(cursor, pokemon):
    cursor.execute("""
        INSERT INTO pokemon_stats (
            pokemon_id,
            hp,
            attack,
            defense,
            special_attack,
            special_defense,
            speed,
            total_stats
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (pokemon_id)
        DO UPDATE SET
            hp = EXCLUDED.hp,
            attack = EXCLUDED.attack,
            defense = EXCLUDED.defense,
            special_attack = EXCLUDED.special_attack,
            special_defense = EXCLUDED.special_defense,
            speed = EXCLUDED.speed,
            total_stats = EXCLUDED.total_stats
    """, (
        int(pokemon["pokemon_id"]),
        int(pokemon["hp"]),
        int(pokemon["attack"]),
        int(pokemon["defense"]),
        int(pokemon["special_attack"]),
        int(pokemon["special_defense"]),
        int(pokemon["speed"]),
        int(pokemon["total_stats"])
    ))


def carregar_relacionamentos(cursor, pokemon, cache):
    pokemon_id = int(pokemon["pokemon_id"])

    # Remove associações antigas antes de recriá-las.
    cursor.execute(
        "DELETE FROM pokemon_types WHERE pokemon_id = %s",
        (pokemon_id,)
    )

    cursor.execute(
        "DELETE FROM pokemon_abilities WHERE pokemon_id = %s",
        (pokemon_id,)
    )

    for tipo in lista_valores(pokemon["types"]):
        type_id = obter_id(
            cursor, "types", "type_id", tipo, cache
        )

        cursor.execute("""
            INSERT INTO pokemon_types (pokemon_id, type_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (pokemon_id, type_id))

    for habilidade in lista_valores(pokemon["abilities"]):
        ability_id = obter_id(
            cursor,
            "abilities",
            "ability_id",
            habilidade,
            cache
        )

        cursor.execute("""
            INSERT INTO pokemon_abilities (
                pokemon_id, ability_id
            )
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (pokemon_id, ability_id))


def executar_pipeline():
    print("=" * 55)
    print("POKEMON NEXUS - DATA LOADING")
    print("=" * 55)

    if not CSV_FILE.is_file():
        print(f"Arquivo nao encontrado: {CSV_FILE}")
        return

    with CSV_FILE.open(
        "r", encoding="utf-8-sig", newline=""
    ) as arquivo:
        registros = list(csv.DictReader(arquivo))

    print(f"Registros encontrados: {len(registros)}")

    cache = {}
    total = 0

    try:
        # Uma transação: qualquer falha desfaz a importação.
        with get_connection() as conn:
            with conn.cursor() as cursor:
                for pokemon in registros:
                    carregar_pokemon(cursor, pokemon)
                    carregar_stats(cursor, pokemon)
                    carregar_relacionamentos(
                        cursor, pokemon, cache
                    )

                    total += 1

                    if total % 100 == 0:
                        print(
                            f"[{total}/{len(registros)}] "
                            "Pokemon importados..."
                        )

                cursor.execute(
                    "SELECT COUNT(*) FROM pokemon"
                )
                total_banco = cursor.fetchone()[0]

                cursor.execute(
                    "SELECT COUNT(*) FROM types"
                )
                total_tipos = cursor.fetchone()[0]

                cursor.execute(
                    "SELECT COUNT(*) FROM abilities"
                )
                total_habilidades = cursor.fetchone()[0]

        print()
        print("DATA LOADING CONCLUIDO!")
        print(f"Registros importados: {total}")
        print(f"Pokemon no banco: {total_banco}")
        print(f"Tipos cadastrados: {total_tipos}")
        print(f"Habilidades cadastradas: {total_habilidades}")
        print("Transacao confirmada com sucesso!")

    except Exception as erro:
        print(f"Falha na importacao: {erro}")
        print("Transacao cancelada.")
        raise


if __name__ == "__main__":
    executar_pipeline()
