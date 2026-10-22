
-- ==============================================
-- POKEMON NEXUS - BATTLE SYSTEM V1
-- ==============================================

CREATE TABLE IF NOT EXISTS battle_matches (
    battle_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    player_id BIGINT NOT NULL
        REFERENCES players(player_id) ON DELETE CASCADE,

    deck_id BIGINT NOT NULL
        REFERENCES decks(deck_id) ON DELETE CASCADE,

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'won', 'lost')),

    state JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battle_matches_player
    ON battle_matches(player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_battle_matches_status
    ON battle_matches(status);
