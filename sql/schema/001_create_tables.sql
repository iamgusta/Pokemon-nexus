
-- ============================================
-- POKEMON NEXUS
-- DATABASE SCHEMA V1.0
-- ============================================

-- POKEMON
CREATE TABLE IF NOT EXISTS pokemon (
    pokemon_id INTEGER PRIMARY KEY,
    species_id INTEGER,
    name VARCHAR(150) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    height_m NUMERIC(8,2),
    weight_kg NUMERIC(10,2),
    base_experience INTEGER,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- TIPOS
CREATE TABLE IF NOT EXISTS types (
    type_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- RELACIONAMENTO POKEMON E TIPOS
CREATE TABLE IF NOT EXISTS pokemon_types (
    pokemon_id INTEGER NOT NULL
        REFERENCES pokemon(pokemon_id) ON DELETE CASCADE,
    type_id INTEGER NOT NULL
        REFERENCES types(type_id),
    PRIMARY KEY (pokemon_id, type_id)
);

-- HABILIDADES
CREATE TABLE IF NOT EXISTS abilities (
    ability_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- RELACIONAMENTO POKEMON E HABILIDADES
CREATE TABLE IF NOT EXISTS pokemon_abilities (
    pokemon_id INTEGER NOT NULL
        REFERENCES pokemon(pokemon_id) ON DELETE CASCADE,
    ability_id INTEGER NOT NULL
        REFERENCES abilities(ability_id),
    PRIMARY KEY (pokemon_id, ability_id)
);

-- ESTATISTICAS
CREATE TABLE IF NOT EXISTS pokemon_stats (
    pokemon_id INTEGER PRIMARY KEY
        REFERENCES pokemon(pokemon_id) ON DELETE CASCADE,
    hp INTEGER NOT NULL,
    attack INTEGER NOT NULL,
    defense INTEGER NOT NULL,
    special_attack INTEGER NOT NULL,
    special_defense INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    total_stats INTEGER NOT NULL
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_pokemon_name
ON pokemon(name);

CREATE INDEX IF NOT EXISTS idx_pokemon_species
ON pokemon(species_id);

CREATE INDEX IF NOT EXISTS idx_pokemon_types_type
ON pokemon_types(type_id);

CREATE INDEX IF NOT EXISTS idx_pokemon_abilities_ability
ON pokemon_abilities(ability_id);
