
from collections import Counter

import psycopg2

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from src.database.connection import get_connection


# =============================================
# POKEMON NEXUS - DECK BUILDER API V1
# =============================================

router = APIRouter(
    prefix="/api/decks",
    tags=["Deck Builder"]
)

PLAYER_NAME = "nexus_trainer"

DECK_SIZE = 20
MAX_COPIES = 3


# =============================================
# REQUEST SCHEMAS
# =============================================

class DeckCardInput(BaseModel):
    card_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=MAX_COPIES)


class DeckInput(BaseModel):
    name: str = Field(
        min_length=3,
        max_length=80
    )
    cards: list[DeckCardInput] = Field(
        min_length=1
    )


# =============================================
# PLAYER
# =============================================

def get_player(cursor, lock=False):
    query = """
        SELECT player_id
        FROM players
        WHERE username = %s
    """

    if lock:
        query += " FOR UPDATE"

    cursor.execute(query, (PLAYER_NAME,))
    player = cursor.fetchone()

    if player is None:
        raise HTTPException(
            status_code=404,
            detail="Jogador nao encontrado."
        )

    return player["player_id"]


# =============================================
# VALIDATION
# =============================================

def validate_deck(cursor, player_id, data):
    name = data.name.strip()

    if len(name) < 3:
        raise HTTPException(
            status_code=422,
            detail="Nome deve ter pelo menos 3 caracteres."
        )

    quantities = Counter()

    for item in data.cards:
        quantities[item.card_id] += item.quantity

    if sum(quantities.values()) != DECK_SIZE:
        raise HTTPException(
            status_code=422,
            detail="O deck deve conter exatamente 20 cartas."
        )

    for card_id, quantity in quantities.items():
        if quantity > MAX_COPIES:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Carta {card_id} excede o limite "
                    "de 3 copias."
                )
            )

    cursor.execute(
        """
        SELECT card_id, quantity
        FROM player_cards
        WHERE player_id = %s
        FOR UPDATE
        """,
        (player_id,)
    )

    owned = {
        row["card_id"]: row["quantity"]
        for row in cursor.fetchall()
    }

    for card_id, quantity in quantities.items():
        available = owned.get(card_id, 0)

        if quantity > available:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Carta {card_id}: voce possui "
                    f"{available} copia(s) e tentou "
                    f"adicionar {quantity}."
                )
            )

    return name, quantities


# =============================================
# LIST DECKS
# =============================================

@router.get("")
def list_decks():
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                player_id = get_player(cursor)

                cursor.execute(
                    """
                    SELECT
                        d.deck_id,
                        d.name,
                        d.created_at,
                        d.updated_at,
                        COALESCE(
                            SUM(dc.quantity),
                            0
                        ) AS total_cards
                    FROM decks d
                    LEFT JOIN deck_cards dc
                        ON dc.deck_id = d.deck_id
                    WHERE d.player_id = %s
                    GROUP BY d.deck_id
                    ORDER BY d.updated_at DESC,
                             d.deck_id DESC
                    """,
                    (player_id,)
                )

                results = [
                    dict(row)
                    for row in cursor.fetchall()
                ]

        return {
            "player": PLAYER_NAME,
            "total_decks": len(results),
            "results": results
        }

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Falha ao consultar os decks."
        )


# =============================================
# GET DECK DETAILS
# =============================================

@router.get("/{deck_id}")
def get_deck(deck_id: int):
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                player_id = get_player(cursor)

                cursor.execute(
                    """
                    SELECT
                        deck_id, name,
                        created_at, updated_at
                    FROM decks
                    WHERE deck_id = %s
                      AND player_id = %s
                    """,
                    (deck_id, player_id)
                )

                deck = cursor.fetchone()

                if deck is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Deck nao encontrado."
                    )

                cursor.execute(
                    """
                    SELECT
                        dc.card_id,
                        dc.quantity,
                        c.rarity,
                        p.pokemon_id,
                        p.name,
                        p.image_url,
                        s.hp,
                        s.attack,
                        s.defense,
                        s.total_stats
                    FROM deck_cards dc
                    JOIN cards c
                        ON c.card_id = dc.card_id
                    JOIN pokemon p
                        ON p.pokemon_id = c.pokemon_id
                    JOIN pokemon_stats s
                        ON s.pokemon_id = p.pokemon_id
                    WHERE dc.deck_id = %s
                    ORDER BY p.pokemon_id
                    """,
                    (deck_id,)
                )

                cards = [
                    dict(row)
                    for row in cursor.fetchall()
                ]

        return {
            **dict(deck),
            "total_cards": sum(
                item["quantity"]
                for item in cards
            ),
            "cards": cards
        }

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Falha ao consultar o deck."
        )


# =============================================
# SAVE DECK
# =============================================

@router.post("", status_code=201)
def create_deck(data: DeckInput):
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                player_id = get_player(
                    cursor, lock=True
                )

                name, quantities = validate_deck(
                    cursor, player_id, data
                )

                cursor.execute(
                    """
                    INSERT INTO decks (
                        player_id, name
                    )
                    VALUES (%s, %s)
                    RETURNING deck_id
                    """,
                    (player_id, name)
                )

                deck_id = cursor.fetchone()["deck_id"]

                for card_id, quantity in quantities.items():
                    cursor.execute(
                        """
                        INSERT INTO deck_cards (
                            deck_id,
                            card_id,
                            quantity
                        )
                        VALUES (%s, %s, %s)
                        """,
                        (deck_id, card_id, quantity)
                    )

        return {
            "success": True,
            "message": "Deck criado com sucesso!",
            "deck_id": deck_id,
            "name": name,
            "total_cards": DECK_SIZE
        }

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Falha ao salvar o deck."
        )


# =============================================
# UPDATE DECK
# =============================================

@router.put("/{deck_id}")
def update_deck(deck_id: int, data: DeckInput):
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                player_id = get_player(
                    cursor, lock=True
                )

                cursor.execute(
                    """
                    SELECT deck_id
                    FROM decks
                    WHERE deck_id = %s
                      AND player_id = %s
                    FOR UPDATE
                    """,
                    (deck_id, player_id)
                )

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Deck nao encontrado."
                    )

                name, quantities = validate_deck(
                    cursor, player_id, data
                )

                cursor.execute(
                    """
                    DELETE FROM deck_cards
                    WHERE deck_id = %s
                    """,
                    (deck_id,)
                )

                for card_id, quantity in quantities.items():
                    cursor.execute(
                        """
                        INSERT INTO deck_cards (
                            deck_id, card_id, quantity
                        )
                        VALUES (%s, %s, %s)
                        """,
                        (deck_id, card_id, quantity)
                    )

                cursor.execute(
                    """
                    UPDATE decks
                    SET name = %s,
                        updated_at = NOW()
                    WHERE deck_id = %s
                      AND player_id = %s
                    """,
                    (name, deck_id, player_id)
                )

        return {
            "success": True,
            "message": "Deck atualizado!",
            "deck_id": deck_id,
            "total_cards": DECK_SIZE
        }

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Falha ao atualizar o deck."
        )


# =============================================
# DELETE DECK
# =============================================

@router.delete("/{deck_id}")
def delete_deck(deck_id: int):
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                player_id = get_player(
                    cursor, lock=True
                )

                cursor.execute(
                    """
                    DELETE FROM decks
                    WHERE deck_id = %s
                      AND player_id = %s
                    RETURNING deck_id
                    """,
                    (deck_id, player_id)
                )

                if cursor.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Deck nao encontrado."
                    )

        return {
            "success": True,
            "message": "Deck excluido."
        }

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Falha ao excluir o deck."
        )
