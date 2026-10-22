
import psycopg2

from fastapi import APIRouter, HTTPException, Query

from src.api.services.pokemon_service import (
    listar_pokemon,
    buscar_pokemon
)


# ============================================
# POKEMON NEXUS - POKEMON ROUTES
# ============================================

router = APIRouter(
    prefix="/api/pokemon",
    tags=["Pokemon"]
)


@router.get("")
def get_pokemon(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(
        default=None,
        max_length=100
    ),
    type: str | None = Query(
        default=None,
        max_length=50
    )
):
    try:
        return listar_pokemon(
            page=page,
            limit=limit,
            search=search,
            pokemon_type=type
        )

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Banco de dados indisponivel."
        )


@router.get("/{pokemon_id}")
def get_pokemon_by_id(pokemon_id: int):
    try:
        pokemon = buscar_pokemon(pokemon_id)

    except psycopg2.Error:
        raise HTTPException(
            status_code=503,
            detail="Banco de dados indisponivel."
        )

    if pokemon is None:
        raise HTTPException(
            status_code=404,
            detail="Pokemon nao encontrado."
        )

    return pokemon
