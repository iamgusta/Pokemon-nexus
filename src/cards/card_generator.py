
from collections import Counter
from datetime import datetime, timedelta, timezone
from secrets import SystemRandom

from psycopg2.extras import RealDictCursor

from src.database.connection import get_connection


# ============================================
# POKEMON NEXUS - BOOSTER ENGINE V2
# COOLDOWN DE 120 SEGUNDOS
# ============================================

PLAYER_NAME = "nexus_trainer"
CARDS_PER_BOOSTER = 5
COOLDOWN_SECONDS = 120

RARITY_WEIGHTS = {
    "common": 55,
    "uncommon": 27,
    "rare": 12,
    "epic": 5,
    "legendary": 1
}

rng = SystemRandom()


class BoosterCooldownError(Exception):
    def __init__(self, remaining_seconds, next_available_at):
        self.remaining_seconds = max(
            1, int(remaining_seconds)
        )
        self.next_available_at = next_available_at

        super().__init__(
            f"Aguarde {self.remaining_seconds} segundos."
        )


def buscar_jogador(cursor, username, lock=False):
    query = """
        SELECT player_id
        FROM players
        WHERE username = %s
    """

    if lock:
        query += " FOR UPDATE"

    cursor.execute(query, (username,))
    row = cursor.fetchone()

    if row is None:
        raise ValueError(
            f"Jogador nao encontrado: {username}"
        )

    return row["player_id"]


def verificar_cooldown(cursor, player_id):
    # O horario do PostgreSQL é a fonte de verdade.
    cursor.execute("SELECT clock_timestamp() AS agora")
    agora = cursor.fetchone()["agora"]

    cursor.execute(
        """
        SELECT opened_at
        FROM booster_openings
        WHERE player_id = %s
        ORDER BY opened_at DESC, opening_id DESC
        LIMIT 1
        """,
        (player_id,)
    )

    row = cursor.fetchone()

    if row is None:
        return {
            "can_open": True,
            "remaining_seconds": 0,
            "next_available_at": None,
            "server_time": agora.isoformat()
        }

    proxima_abertura = row["opened_at"] + timedelta(
        seconds=COOLDOWN_SECONDS
    )

    restante = max(
        0,
        (proxima_abertura - agora).total_seconds()
    )

    # Arredondamento para cima sem dependências.
    segundos = int(restante)
    if restante > segundos:
        segundos += 1

    return {
        "can_open": segundos == 0,
        "remaining_seconds": segundos,
        "next_available_at": proxima_abertura.isoformat(),
        "server_time": agora.isoformat()
    }


def obter_status_booster(username=PLAYER_NAME):
    with get_connection() as conn:
        with conn.cursor(
            cursor_factory=RealDictCursor
        ) as cursor:
            player_id = buscar_jogador(
                cursor, username
            )

            status = verificar_cooldown(
                cursor, player_id
            )

    return {
        "player": username,
        "cooldown_seconds": COOLDOWN_SECONDS,
        **status
    }


def carregar_catalogo(cursor):
    cursor.execute(
        """
        SELECT
            c.card_id,
            c.rarity,
            p.pokemon_id,
            p.name,
            p.image_url,
            s.hp,
            s.attack,
            s.defense,
            s.total_stats
        FROM cards c
        JOIN pokemon p
            ON p.pokemon_id = c.pokemon_id
        JOIN pokemon_stats s
            ON s.pokemon_id = p.pokemon_id
        ORDER BY c.card_id
        """
    )

    catalogo = {
        rarity: [] for rarity in RARITY_WEIGHTS
    }

    for row in cursor.fetchall():
        carta = dict(row)
        catalogo[carta["rarity"]].append(carta)

    return catalogo


def sortear_carta(catalogo):
    disponiveis = [
        rarity
        for rarity, cartas in catalogo.items()
        if cartas
    ]

    if not disponiveis:
        raise ValueError("Catalogo de cartas vazio.")

    raridade = rng.choices(
        disponiveis,
        weights=[
            RARITY_WEIGHTS[rarity]
            for rarity in disponiveis
        ],
        k=1
    )[0]

    return rng.choice(catalogo[raridade])


def abrir_booster(username=PLAYER_NAME):
    with get_connection() as conn:
        with conn.cursor(
            cursor_factory=RealDictCursor
        ) as cursor:

            # Bloqueia a linha do jogador durante a
            # transacao para impedir aberturas simultaneas.
            player_id = buscar_jogador(
                cursor, username, lock=True
            )

            status = verificar_cooldown(
                cursor, player_id
            )

            if not status["can_open"]:
                raise BoosterCooldownError(
                    status["remaining_seconds"],
                    status["next_available_at"]
                )

            catalogo = carregar_catalogo(cursor)

            cartas = [
                sortear_carta(catalogo)
                for _ in range(CARDS_PER_BOOSTER)
            ]

            cursor.execute(
                """
                INSERT INTO booster_openings (player_id)
                VALUES (%s)
                RETURNING opening_id, opened_at
                """,
                (player_id,)
            )

            abertura = cursor.fetchone()
            opening_id = abertura["opening_id"]
            opened_at = abertura["opened_at"]

            for posicao, carta in enumerate(
                cartas, start=1
            ):
                cursor.execute(
                    """
                    INSERT INTO booster_opening_cards (
                        opening_id, position, card_id
                    )
                    VALUES (%s, %s, %s)
                    """,
                    (
                        opening_id,
                        posicao,
                        carta["card_id"]
                    )
                )

                cursor.execute(
                    """
                    INSERT INTO player_cards (
                        player_id,
                        card_id,
                        quantity
                    )
                    VALUES (%s, %s, 1)
                    ON CONFLICT (player_id, card_id)
                    DO UPDATE SET
                        quantity = player_cards.quantity + 1
                    """,
                    (player_id, carta["card_id"])
                )

    proxima_abertura = opened_at + timedelta(
        seconds=COOLDOWN_SECONDS
    )

    return {
        "opening_id": opening_id,
        "player_id": player_id,
        "cards": cartas,
        "opened_at": opened_at.isoformat(),
        "next_available_at": proxima_abertura.isoformat(),
        "cooldown_seconds": COOLDOWN_SECONDS
    }


def mostrar_resultado(resultado):
    print("=" * 55)
    print("POKEMON NEXUS - BOOSTER OPENING")
    print("=" * 55)

    print(f"Booster ID: {resultado['opening_id']}")
    print(f"Jogador ID: {resultado['player_id']}")
    print()

    raridades = Counter()

    for index, carta in enumerate(
        resultado["cards"], start=1
    ):
        raridades[carta["rarity"]] += 1

        print(
            f"{index}. "
            f"#{carta['pokemon_id']:04d} "
            f"{carta['name'].upper()} "
            f"[{carta['rarity'].upper()}] "
            f"POWER: {carta['total_stats']}"
        )

    print()
    print("RESUMO DO BOOSTER")

    for raridade, quantidade in raridades.items():
        print(f"{raridade}: {quantidade}")

    print()
    print("Cartas salvas na colecao!")
    print("Proximo booster disponivel em 2 minutos.")
    print("=" * 55)


if __name__ == "__main__":
    try:
        resultado = abrir_booster()
        mostrar_resultado(resultado)

    except BoosterCooldownError as erro:
        print(
            "Booster bloqueado. "
            f"Aguarde {erro.remaining_seconds} segundos."
        )
