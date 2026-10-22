
-- =============================================
-- POKEMON NEXUS - DECK BUILDER V1
-- =============================================

CREATE TABLE IF NOT EXISTS decks (
    deck_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id BIGINT NOT NULL
        REFERENCES players(player_id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deck_cards (
    deck_id BIGINT NOT NULL
        REFERENCES decks(deck_id) ON DELETE CASCADE,
    card_id BIGINT NOT NULL
        REFERENCES cards(card_id),
    quantity INTEGER NOT NULL
        CHECK (quantity BETWEEN 1 AND 3),
    PRIMARY KEY (deck_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_decks_player
    ON decks(player_id);

CREATE INDEX IF NOT EXISTS idx_deck_cards_card
    ON deck_cards(card_id);

-- Este script prepara a estrutura.
-- A API validara as 20 cartas e o estoque.

ALTER TABLE decks
ADD COLUMN IF NOT EXISTS updated_at
TIMESTAMPTZ NOT NULL DEFAULT NOW();