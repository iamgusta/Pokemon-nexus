
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes.pokemon import (
    router as pokemon_router
)
from src.api.routes.stats import (
    router as stats_router
)
from src.api.routes.boosters import (
    router as boosters_router
)
from src.api.routes.collection import (
    router as collection_router
)
from src.api.routes.decks import (
    router as decks_router
)
from src.api.routes.battles import (
    router as battles_router
)


# ==============================================
# POKEMON NEXUS - MAIN API V1.4
# ==============================================

app = FastAPI(
    title="Pokemon Nexus API",
    description=(
        "API para Pokedex, boosters, colecao, "
        "Deck Builder e Battle Arena."
    ),
    version="1.4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE"
    ],
    allow_headers=["Content-Type"]
)

app.include_router(pokemon_router)
app.include_router(stats_router)
app.include_router(boosters_router)
app.include_router(collection_router)
app.include_router(decks_router)
app.include_router(battles_router)


@app.get("/", tags=["System"])
def home():
    return {
        "project": "Pokemon Nexus",
        "version": "1.4.0",
        "status": "online",
        "database": "PostgreSQL",
        "documentation": "/docs",
        "modules": [
            "pokedex",
            "boosters",
            "collection",
            "deck_builder",
            "battle_arena",
            "analytics"
        ]
    }


@app.get("/health", tags=["System"])
def health():
    return {
        "status": "online",
        "service": "pokemon-nexus-api"
    }
