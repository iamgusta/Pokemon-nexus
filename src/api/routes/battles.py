
import random

import psycopg2

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor, Json

from src.database.connection import get_connection
from src.battle.battle_engine import (
    criar_estado,
    criar_lutador,
    executar_turno
)


# ==============================================
# POKEMON NEXUS - BATTLE API V1
# ==============================================

router = APIRouter(
    prefix="/api/battles",
    tags=["Battle Arena"]
)

PLAYER_NAME = "nexus_trainer"


class StartBattleRequest(BaseModel):
    deck_id: int = Field(gt=0)


class BattleTurnRequest(BaseModel):
    action: str
    target_index: int | None = None


def buscar_jogador(cursor):
    cursor.execute(
        """
        SELECT player_id
        FROM players
        WHERE username = %s
        """,
        (PLAYER_NAME,)
    )

    jogador = cursor.fetchone()

    if not jogador:
        raise HTTPException(
            status_code=404,
            detail="Jogador nao encontrado."
        )

    return jogador["player_id"]


def carregar_deck(cursor, deck_id, player_id):
    cursor.execute(
        """
        SELECT
            dc.card_id,
            dc.quantity,
            p.pokemon_id,
            p.name,
            p.image_url,
            s.hp,
            s.attack,
            s.defense
        FROM deck_cards dc
        JOIN decks d
            ON d.deck_id = dc.deck_id
        JOIN cards c
            ON c.card_id = dc.card_id
        JOIN pokemon p
            ON p.pokemon_id = c.pokemon_id
        JOIN pokemon_stats s
            ON s.pokemon_id = p.pokemon_id
        WHERE d.deck_id = %s
          AND d.player_id = %s
        ORDER BY p.pokemon_id
        """,
        (deck_id, player_id)
    )

    rows = cursor.fetchall()
    time = []

    for row in rows:
        for _ in range(row["quantity"]):
            time.append(criar_lutador(row))

    if len(time) != 20:
        raise HTTPException(
            status_code=422,
            detail="O deck precisa ter exatamente 20 cartas."
        )

    # Confirma que o jogador ainda possui
    # as copias utilizadas no deck.
    cursor.execute(
        """
        SELECT
            dc.card_id,
            dc.quantity,
            COALESCE(pc.quantity, 0) AS owned
        FROM deck_cards dc
        LEFT JOIN player_cards pc
            ON pc.card_id = dc.card_id
           AND pc.player_id = %s
        WHERE dc.deck_id = %s
        """,
        (player_id, deck_id)
    )

    for row in cursor.fetchall():
        if row["quantity"] > row["owned"]:
            raise HTTPException(
                status_code=422,
                detail=(
                    "O deck contem cartas que nao "
                    "estao disponiveis na colecao."
                )
            )

    random.shuffle(time)
    return time


def gerar_time_cpu(cursor):
    cursor.execute(
        """
        SELECT
            c.card_id,
            p.pokemon_id,
            p.name,
            p.image_url,
            s.hp,
            s.attack,
            s.defense
        FROM cards c
        JOIN pokemon p
            ON p.pokemon_id = c.pokemon_id
        JOIN pokemon_stats s
            ON s.pokemon_id = p.pokemon_id
        ORDER BY RANDOM()
        LIMIT 20
        """
    )

    rows = cursor.fetchall()

    if len(rows) < 20:
        raise HTTPException(
            status_code=503,
            detail="Catalogo insuficiente para a CPU."
        )

    return [criar_lutador(row) for row in rows]


def buscar_batalha(cursor, battle_id, player_id, lock=False):
    query = """
        SELECT battle_id, deck_id, status, state,
               created_at, updated_at
        FROM battle_matches
        WHERE battle_id = %s
          AND player_id = %s
    """

    if lock:
        query += " FOR UPDATE"

    cursor.execute(query, (battle_id, player_id))
    batalha = cursor.fetchone()

    if not batalha:
        raise HTTPException(
            status_code=404,
            detail="Batalha nao encontrada."
        )

    return batalha


@router.post("/start", status_code=201)
def start_battle(data: StartBattleRequest):
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                player_id = buscar_jogador(cursor)

                player_team = carregar_deck(
                    cursor,
                    data.deck_id,
                    player_id
                )

                cpu_team = gerar_time_cpu(cursor)

                estado = criar_estado(
                    player_team,
                    cpu_team
                )

                cursor.execute(
                    """
                    INSERT INTO battle_matches (
                        player_id,
                        deck_id,
                        status,
                        state
                    )
                    VALUES (%s, %s, %s, %s)
                    RETURNING battle_id
                    """,
                    (
                        player_id,
                        data.deck_id,
                        estado["status"],
                        Json(estado)
                    )
                )

                battle_id = cursor.fetchone()["battle_id"]

        return {
            "success": True,
            "battle_id": battle_id,
            "state": estado
        }

    except psycopg2.Error as erro:
        print(f"Erro ao iniciar batalha: {erro}")
        raise HTTPException(
            status_code=503,
            detail="Nao foi possivel iniciar a batalha."
        )


@router.get("/{battle_id}")
def get_battle(battle_id: int):
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                player_id = buscar_jogador(cursor)
                batalha = buscar_batalha(
                    cursor, battle_id, player_id
                )

        return {
            "battle_id": batalha["battle_id"],
            "deck_id": batalha["deck_id"],
            "status": batalha["status"],
            "state": batalha["state"],
            "created_at": batalha["created_at"],
            "updated_at": batalha["updated_at"]
        }

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Nao foi possivel consultar a batalha."
        )


@router.post("/{battle_id}/turn")
def play_turn(battle_id: int, data: BattleTurnRequest):
    if data.action not in ("attack", "switch"):
        raise HTTPException(
            status_code=422,
            detail="Use attack ou switch."
        )

    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                player_id = buscar_jogador(cursor)

                batalha = buscar_batalha(
                    cursor,
                    battle_id,
                    player_id,
                    lock=True
                )

                estado = batalha["state"]

                try:
                    estado = executar_turno(
                        estado,
                        data.action,
                        data.target_index
                    )
                except ValueError as erro:
                    raise HTTPException(
                        status_code=422,
                        detail=str(erro)
                    )

                cursor.execute(
                    """
                    UPDATE battle_matches
                    SET
                        status = %s,
                        state = %s,
                        updated_at = NOW()
                    WHERE battle_id = %s
                      AND player_id = %s
                    """,
                    (
                        estado["status"],
                        Json(estado),
                        battle_id,
                        player_id
                    )
                )

        return {
            "battle_id": battle_id,
            "status": estado["status"],
            "state": estado
        }

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Erro ao processar turno."
        )
