
import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

# ============================================
# POKEMON NEXUS - DATABASE CONNECTION
# ============================================

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")


def get_connection():
    """Cria uma conexão com o PostgreSQL."""

    config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "dbname": os.getenv("DB_NAME", "pokemon_nexus"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD")
    }

    if not config["password"]:
        raise ValueError(
            "Configure DB_PASSWORD no arquivo .env"
        )

    return psycopg2.connect(**config)


def test_connection():
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT current_database(), version()"
                )

                nome, versao = cursor.fetchone()

                print("POKEMON NEXUS - DATABASE")
                print(f"Banco conectado: {nome}")
                print(f"Servidor: {versao.split(',')[0]}")
                print("Conexao realizada com sucesso!")

    except (psycopg2.Error, ValueError) as erro:
        print(f"Falha na conexao: {erro}")


if __name__ == "__main__":
    test_connection()
