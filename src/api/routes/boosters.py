
import psycopg2

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from psycopg2.extras import RealDictCursor

from src.cards.card_generator import (
    PLAYER_NAME,
    BoosterCooldownError,
    abrir_booster,
    obter_status_booster
)

from src.database.connection import get_connection


# ============================================
# POKEMON NEXUS - BOOSTER API V2
# ============================================

router = APIRouter(
    prefix="/api/boosters",
    tags=["Boosters"]
)


@router.get("/status")
def booster_status():
    try:
        return obter_status_booster(PLAYER_NAME)

    except (psycopg2.Error, ValueError):
        raise HTTPException(
            status_code=503,
            detail="Nao foi possivel consultar o booster."
        )


@router.post("/open")
def open_booster():
    try:
        resultado = abrir_booster(PLAYER_NAME)

        return {
            "success": True,
            "message": "Booster aberto com sucesso!",
            "opening_id": resultado["opening_id"],
            "player_id": resultado["player_id"],
            "total_cards": len(resultado["cards"]),
            "cards": resultado["cards"],
            "opened_at": resultado["opened_at"],
            "next_available_at": resultado["next_available_at"],
            "cooldown_seconds": resultado["cooldown_seconds"]
        }

    except BoosterCooldownError as erro:
        return JSONResponse(
            status_code=429,
            headers={
                "Retry-After": str(
                    erro.remaining_seconds
                )
            },
            content={
                "success": False,
                "message": "Booster em cooldown.",
                "remaining_seconds": erro.remaining_seconds,
                "next_available_at": erro.next_available_at
            }
        )

    except (psycopg2.Error, ValueError):
        raise HTTPException(
            status_code=503,
            detail="Nao foi possivel abrir o booster."
        )


@router.get("/history")
def booster_history():
    try:
        with get_connection() as conn:
            with conn.cursor(
                cursor_factory=RealDictCursor
            ) as cursor:

                cursor.execute(
                    """
                    SELECT
                        bo.opening_id,
                        bo.opened_at,
                        COUNT(boc.card_id) AS total_cards
                    FROM booster_openings bo
                    JOIN players pl
                        ON pl.player_id = bo.player_id
                    LEFT JOIN booster_opening_cards boc
                        ON boc.opening_id = bo.opening_id
                    WHERE pl.username = %s
                    GROUP BY bo.opening_id, bo.opened_at
                    ORDER BY
                        bo.opened_at DESC,
                        bo.opening_id DESC
                    LIMIT 20
                    """,
                    (PLAYER_NAME,)
                )

                results = [
                    dict(row)
                    for row in cursor.fetchall()
                ]

        return {
            "total_returned": len(results),
            "results": results
        }

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Banco de dados indisponivel."
        )
