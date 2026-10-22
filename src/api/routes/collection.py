
import psycopg2

from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor

from src.database.connection import get_connection


# ============================================
# POKEMON NEXUS - COLLECTION API
# ============================================

router = APIRouter(
    prefix="/api/collection",
    tags=["Collection"]
)

PLAYER_NAME = "nexus_trainer"


@router.get("")
def get_collection():
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                cursor.execute("""
                    SELECT
                        c.card_id,
                        p.pokemon_id,
                        p.name,
                        p.image_url,
                        c.rarity,
                        pc.quantity,
                        pc.acquired_at,
                        s.hp,
                        s.attack,
                        s.defense,
                        s.total_stats
                    FROM player_cards pc
                    JOIN players pl
                        ON pl.player_id = pc.player_id
                    JOIN cards c
                        ON c.card_id = pc.card_id
                    JOIN pokemon p
                        ON p.pokemon_id = c.pokemon_id
                    JOIN pokemon_stats s
                        ON s.pokemon_id = p.pokemon_id
                    WHERE pl.username = %s
                    ORDER BY
                        pc.acquired_at DESC,
                        p.pokemon_id ASC
                """, (PLAYER_NAME,))

                cards = [
                    dict(row)
                    for row in cursor.fetchall()
                ]

        total_copies = sum(
            card["quantity"]
            for card in cards
        )

        return {
            "player": PLAYER_NAME,
            "unique_cards": len(cards),
            "total_cards": total_copies,
            "cards": cards
        }

    except psycopg2.Error as erro:
        print(f"Erro na colecao: {erro}")

        raise HTTPException(
            status_code=503,
            detail="Nao foi possivel carregar a colecao."
        )
