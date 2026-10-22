
-- =============================================
-- POKEMON NEXUS - TCG SYSTEM V1
-- =============================================

-- JOGADORES
CREATE TABLE IF NOT EXISTS players (
    player_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CARTAS DISPONIVEIS NO JOGO
CREATE TABLE IF NOT EXISTS cards (
    card_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pokemon_id INTEGER NOT NULL UNIQUE
        REFERENCES pokemon(pokemon_id),
    rarity VARCHAR(20) NOT NULL
        CHECK (rarity IN (
            'common',
            'uncommon',
            'rare',
            'epic',
            'legendary'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COLECAO DO JOGADOR
CREATE TABLE IF NOT EXISTS player_cards (
    player_id BIGINT NOT NULL
        REFERENCES players(player_id) ON DELETE CASCADE,
    card_id BIGINT NOT NULL
        REFERENCES cards(card_id),
    quantity INTEGER NOT NULL DEFAULT 1
        CHECK (quantity > 0),
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, card_id)
);

-- HISTORICO DE ABERTURA DE BOOSTERS
CREATE TABLE IF NOT EXISTS booster_openings (
    opening_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id BIGINT NOT NULL
        REFERENCES players(player_id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CARTAS RECEBIDAS EM CADA BOOSTER
CREATE TABLE IF NOT EXISTS booster_opening_cards (
    opening_id BIGINT NOT NULL
        REFERENCES booster_openings(opening_id)
        ON DELETE CASCADE,
    position SMALLINT NOT NULL
        CHECK (position BETWEEN 1 AND 5),
    card_id BIGINT NOT NULL
        REFERENCES cards(card_id),
    PRIMARY KEY (opening_id, position)
);

-- INDICES
CREATE INDEX IF NOT EXISTS idx_cards_rarity
    ON cards(rarity);

CREATE INDEX IF NOT EXISTS idx_player_cards_card
    ON player_cards(card_id);

CREATE INDEX IF NOT EXISTS idx_booster_openings_player
    ON booster_openings(player_id, opened_at DESC);

-- CRIA OU ATUALIZA AS CARTAS BASE
INSERT INTO cards (pokemon_id, rarity)
SELECT
    p.pokemon_id,
    CASE
        WHEN s.total_stats > 600 THEN 'legendary'
        WHEN s.total_stats > 520 THEN 'epic'
        WHEN s.total_stats > 450 THEN 'rare'
        WHEN s.total_stats > 350 THEN 'uncommon'
        ELSE 'common'
    END
FROM pokemon p
JOIN pokemon_stats s
    ON s.pokemon_id = p.pokemon_id
ON CONFLICT (pokemon_id)
DO UPDATE SET rarity = EXCLUDED.rarity;

-- JOGADOR LOCAL DE TESTES
INSERT INTO players (username)
VALUES ('nexus_trainer')
ON CONFLICT (username) DO NOTHING;
