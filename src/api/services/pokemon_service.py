
from psycopg2.extras import RealDictCursor

from src.database.connection import get_connection


# ============================================
# POKEMON NEXUS - POKEMON SERVICE
# ============================================

BASE_QUERY = """
    SELECT
        p.pokemon_id,
        p.species_id,
        p.name,
        p.height_m,
        p.weight_kg,
        p.base_experience,
        p.image_url,

        s.hp,
        s.attack,
        s.defense,
        s.special_attack,
        s.special_defense,
        s.speed,
        s.total_stats,

        COALESCE((
            SELECT json_agg(
                t.name ORDER BY t.name
            )
            FROM pokemon_types pt
            JOIN types t
                ON t.type_id = pt.type_id
            WHERE pt.pokemon_id = p.pokemon_id
        ), '[]'::json) AS types,

        COALESCE((
            SELECT json_agg(
                a.name ORDER BY a.name
            )
            FROM pokemon_abilities pa
            JOIN abilities a
                ON a.ability_id = pa.ability_id
            WHERE pa.pokemon_id = p.pokemon_id
        ), '[]'::json) AS abilities

    FROM pokemon p
    JOIN pokemon_stats s
        ON s.pokemon_id = p.pokemon_id
"""


def listar_pokemon(
    page=1,
    limit=20,
    search=None,
    pokemon_type=None
):
    filtros = []
    parametros = []

    if search:
        filtros.append("p.name ILIKE %s")
        parametros.append(f"%{search}%")

    if pokemon_type:
        filtros.append("""
            EXISTS (
                SELECT 1
                FROM pokemon_types pt
                JOIN types t
                    ON t.type_id = pt.type_id
                WHERE pt.pokemon_id = p.pokemon_id
                  AND t.name = %s
            )
        """)
        parametros.append(pokemon_type.lower())

    where_sql = ""

    if filtros:
        where_sql = " WHERE " + " AND ".join(filtros)

    offset = (page - 1) * limit

    with get_connection() as conn:
        with conn.cursor(
            cursor_factory=RealDictCursor
        ) as cursor:

            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM pokemon p
                """ + where_sql,
                parametros
            )

            total = cursor.fetchone()["total"]

            cursor.execute(
                BASE_QUERY
                + where_sql
                + """
                    ORDER BY p.pokemon_id
                    LIMIT %s OFFSET %s
                """,
                parametros + [limit, offset]
            )

            dados = [
                dict(row)
                for row in cursor.fetchall()
            ]

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
        "results": dados
    }


def buscar_pokemon(pokemon_id):
    with get_connection() as conn:
        with conn.cursor(
            cursor_factory=RealDictCursor
        ) as cursor:

            cursor.execute(
                BASE_QUERY
                + " WHERE p.pokemon_id = %s",
                (pokemon_id,)
            )

            resultado = cursor.fetchone()

    if resultado is None:
        return None

    return dict(resultado)


def obter_estatisticas():
    with get_connection() as conn:
        with conn.cursor(
            cursor_factory=RealDictCursor
        ) as cursor:

            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM pokemon)
                        AS total_pokemon,
                    (SELECT COUNT(*) FROM types)
                        AS total_types,
                    (SELECT COUNT(*) FROM abilities)
                        AS total_abilities,
                    (SELECT COUNT(*) FROM pokemon_stats)
                        AS total_stats_records
            """)

            resumo = dict(cursor.fetchone())

            cursor.execute("""
                SELECT
                    t.name AS type,
                    COUNT(*) AS total
                FROM types t
                JOIN pokemon_types pt
                    ON pt.type_id = t.type_id
                GROUP BY t.type_id, t.name
                ORDER BY total DESC
            """)

            distribuicao = [
                dict(row)
                for row in cursor.fetchall()
            ]

    return {
        "summary": resumo,
        "type_distribution": distribuicao
    }
