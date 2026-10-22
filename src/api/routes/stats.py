
import psycopg2

from fastapi import APIRouter, HTTPException

from src.api.services.pokemon_service import (
    obter_estatisticas
)


# ============================================
# POKEMON NEXUS - ANALYTICS ROUTES
# ============================================

router = APIRouter(
    prefix="/api/stats",
    tags=["Analytics"]
)


@router.get("")
def get_stats():
    try:
        return obter_estatisticas()

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Banco de dados indisponivel."
        )
