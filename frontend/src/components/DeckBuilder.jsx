
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, CheckCircle2, Dice5, Layers3,
  LoaderCircle, Minus, Pencil, Plus, RotateCcw,
  Save, Search, Shield, Sparkles, Trash2,
  TriangleAlert, X, Zap
} from "lucide-react";

import {
  getCollection,
  getDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck
} from "../services/api";

import TcgCard from "./TcgCard";

const MAX_CARDS = 20;
const MAX_COPIES = 3;

function prettyName(name = "") {
  return name.split("-").map(part =>
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(" ");
}

export default function DeckBuilder() {
  const [collection, setCollection] = useState([]);
  const [decks, setDecks] = useState([]);
  const [deckName, setDeckName] = useState("Meu Primeiro Deck");
  const [selected, setSelected] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("builder");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [inventory, savedDecks] = await Promise.all([
        getCollection(),
        getDecks()
      ]);

      setCollection(inventory.cards || []);
      setDecks(savedDecks.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const inventory = useMemo(() => {
    return new Map(
      collection.map(card => [Number(card.card_id), card])
    );
  }, [collection]);

  const totalCards = useMemo(() => {
    return Object.values(selected).reduce(
      (sum, count) => sum + count, 0
    );
  }, [selected]);

  const selectedCards = useMemo(() => {
    return Object.entries(selected)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => ({
        ...inventory.get(Number(id)),
        card_id: Number(id),
        quantity
      }))
      .filter(card => card.name);
  }, [selected, inventory]);

  const availableCards = useMemo(() => {
    return collection.filter(card =>
      card.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [collection, search]);

  const deckPower = selectedCards.reduce(
    (sum, card) => sum + card.total_stats * card.quantity,
    0
  );

  const canSave =
    totalCards === MAX_CARDS &&
    deckName.trim().length >= 3 &&
    !saving;

  function notify(text) {
    setMessage(text);
    setError("");
  }

  function addCard(card) {
    const id = card.card_id;
    const count = selected[id] || 0;
    const allowed = Math.min(MAX_COPIES, card.quantity);

    if (totalCards >= MAX_CARDS) {
      notify("Seu deck já possui 20 cartas.");
      return;
    }

    if (count >= allowed) {
      notify("Você atingiu o limite disponível dessa carta.");
      return;
    }

    setSelected(current => ({
      ...current,
      [id]: (current[id] || 0) + 1
    }));

    setMessage("");
  }

  function removeCard(id) {
    setSelected(current => {
      const next = { ...current };
      if (!next[id]) return current;

      if (next[id] === 1) delete next[id];
      else next[id] -= 1;

      return next;
    });
  }

  function resetDeck() {
    setSelected({});
    setEditingId(null);
    setDeckName("Meu Primeiro Deck");
    setView("builder");
    setError("");
    setMessage("");
  }

  function autoBuild() {
    const pool = [];

    for (const card of collection) {
      const copies = Math.min(card.quantity, MAX_COPIES);
      for (let i = 0; i < copies; i++) {
        pool.push(card.card_id);
      }
    }

    if (pool.length < MAX_CARDS) {
      notify(
        `Você precisa de pelo menos 20 cópias disponíveis. ` +
        `Atualmente há ${pool.length} elegíveis.`
      );
      return;
    }

    // Embaralhamento Fisher-Yates.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const next = {};

    for (const id of pool.slice(0, MAX_CARDS)) {
      next[id] = (next[id] || 0) + 1;
    }

    setSelected(next);
    notify("Deck automático montado com 20 cartas!");
  }

  async function saveDeck() {
    if (!canSave) return;

    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      name: deckName.trim(),
      cards: Object.entries(selected).map(([id, quantity]) => ({
        card_id: Number(id),
        quantity
      }))
    };

    try {
      const result = editingId
        ? await updateDeck(editingId, payload)
        : await createDeck(payload);

      notify(
        result.message || "Deck salvo com sucesso!"
      );

      setEditingId(result.deck_id || editingId);

      const updated = await getDecks();
      setDecks(updated.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function editDeck(deckId) {
    setLoading(true);
    setError("");

    try {
      const deck = await getDeckById(deckId);
      const next = {};

      for (const card of deck.cards) {
        next[card.card_id] = card.quantity;
      }

      setDeckName(deck.name);
      setSelected(next);
      setEditingId(deck.deck_id);
      setView("builder");
      setMessage(`Editando: ${deck.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeDeck(deckId) {
    const deck = decks.find(item => item.deck_id === deckId);
    const confirmed = window.confirm(
      `Excluir "${deck?.name || "este deck"}"? Suas cartas não serão perdidas.`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      await deleteDeck(deckId);

      if (editingId === deckId) resetDeck();

      const updated = await getDecks();
      setDecks(updated.results || []);
      notify("Deck excluído com sucesso.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && collection.length === 0) {
    return (
      <div className="deck-loading">
        <LoaderCircle className="deck-spin" size={38} />
        Carregando cartas e decks...
      </div>
    );
  }

  return (
    <section className="deck-screen">
      <div className="deck-heading">
        <div>
          <span className="deck-eyebrow">
            <Sparkles size={16} />
            NEXUS BATTLE SYSTEM
          </span>
          <h1>Deck <em>Builder.</em></h1>
          <p>
            Monte baralhos de 20 cartas e prepare
            sua estratégia para as próximas batalhas.
          </p>
        </div>
        <div className="deck-heading-icon">
          <Shield size={42} />
        </div>
      </div>

      <div className="deck-tabs">
        <button
          className={view === "builder" ? "active" : ""}
          onClick={() => setView("builder")}
        >
          <Plus size={17} /> Montar deck
        </button>
        <button
          className={view === "saved" ? "active" : ""}
          onClick={() => setView("saved")}
        >
          <Layers3 size={17} /> Meus decks ({decks.length})
        </button>
      </div>

      {error && (
        <div className="deck-notice error">
          <TriangleAlert size={18} />
          {error}
          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {message && (
        <div className="deck-notice success">
          <CheckCircle2 size={18} />
          {message}
          <button onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === "saved" ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {decks.length === 0 ? (
              <div className="deck-empty">
                <Layers3 size={46} />
                <h3>Você ainda não possui decks.</h3>
                <p>Monte seu primeiro baralho de 20 cartas.</p>
                <button onClick={() => setView("builder")}>
                  Criar meu deck <ArrowLeft size={16} />
                </button>
              </div>
            ) : (
              <div className="saved-decks-grid">
                {decks.map(deck => (
                  <article className="saved-deck" key={deck.deck_id}>
                    <div className="saved-deck-icon">
                      <Shield size={35} />
                    </div>
                    <span>DECK #{deck.deck_id}</span>
                    <h3>{deck.name}</h3>
                    <p>{deck.total_cards}/20 cartas</p>

                    <div className="saved-deck-actions">
                      <button onClick={() => editDeck(deck.deck_id)}>
                        <Pencil size={16} /> Editar
                      </button>
                      <button
                        className="delete"
                        disabled={saving}
                        onClick={() => removeDeck(deck.deck_id)}
                      >
                        <Trash2 size={16} /> Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="builder"
            className="deck-builder-layout"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="deck-inventory">
              <div className="deck-panel-heading">
                <div>
                  <span>PLAYER INVENTORY</span>
                  <h2>Suas cartas</h2>
                </div>
                <b>{collection.length} únicas</b>
              </div>

              <label className="deck-search">
                <Search size={19} />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Pesquisar Pokémon..."
                />
              </label>

              {collection.length === 0 ? (
                <div className="deck-empty">
                  <Layers3 size={40} />
                  <h3>Sua coleção está vazia.</h3>
                  <p>Abra boosters para conquistar cartas.</p>
                </div>
              ) : (
                <div className="deck-inventory-grid">
                  {availableCards.map(card => {
                    const count = selected[card.card_id] || 0;
                    const max = Math.min(
                      card.quantity,
                      MAX_COPIES
                    );

                    return (
                      <div
                        className="deck-inventory-item"
                        key={card.card_id}
                      >
                        <div className="deck-card-preview">
                          <TcgCard card={card} compact />
                        </div>

                        <div className="deck-available">
                          <span>
                            Disponíveis: {card.quantity}
                          </span>
                          <div className="deck-quantity-controls">
                            <button
                              disabled={count === 0}
                              onClick={() => removeCard(card.card_id)}
                              aria-label={`Remover ${card.name}`}
                            >
                              <Minus size={16} />
                            </button>
                            <strong>{count}</strong>
                            <button
                              disabled={
                                count >= max ||
                                totalCards >= MAX_CARDS
                              }
                              onClick={() => addCard(card)}
                              aria-label={`Adicionar ${card.name}`}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="deck-editor">
              <div className="deck-panel-heading">
                <div>
                  <span>DECK CONFIGURATION</span>
                  <h2>{editingId ? "Editar deck" : "Novo deck"}</h2>
                </div>
                <Zap size={24} />
              </div>

              <label className="deck-name-label" htmlFor="deck-name">
                NOME DO DECK
              </label>
              <input
                id="deck-name"
                className="deck-name-input"
                value={deckName}
                maxLength={80}
                onChange={event => setDeckName(event.target.value)}
                placeholder="Nome do seu baralho"
              />

              <div className="deck-count-row">
                <span>CARTAS SELECIONADAS</span>
                <strong>{totalCards}/{MAX_CARDS}</strong>
              </div>

              <div className="deck-progress-track">
                <motion.div
                  animate={{
                    width: `${Math.min(
                      100,
                      totalCards / MAX_CARDS * 100
                    )}%`
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="deck-power">
                <Zap size={20} />
                <div>
                  <small>PODER BASE TOTAL</small>
                  <strong>{deckPower.toLocaleString("pt-BR")}</strong>
                </div>
              </div>

              <div className="deck-editor-buttons">
                <button className="deck-auto" onClick={autoBuild}>
                  <Dice5 size={18} /> Montar automaticamente
                </button>
                <button className="deck-reset" onClick={resetDeck}>
                  <RotateCcw size={17} /> Limpar
                </button>
              </div>

              <h3 className="deck-selected-title">
                Cartas do baralho
              </h3>

              <div className="deck-selected-list">
                {selectedCards.length === 0 ? (
                  <div className="deck-mini-empty">
                    Selecione suas cartas à esquerda.
                  </div>
                ) : (
                  selectedCards.map(card => (
                    <div
                      className="deck-selected-item"
                      key={card.card_id}
                    >
                      <img
                        src={card.image_url}
                        alt={card.name}
                      />
                      <div>
                        <b>{prettyName(card.name)}</b>
                        <small>{card.rarity}</small>
                      </div>
                      <span>×{card.quantity}</span>
                      <button
                        onClick={() => removeCard(card.card_id)}
                        aria-label={`Remover ${card.name}`}
                      >
                        <Minus size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="deck-save-footer">
                {totalCards !== MAX_CARDS && (
                  <p>
                    Faltam {Math.max(0, MAX_CARDS - totalCards)}
                    {" "}cartas para completar o deck.
                  </p>
                )}

                <button
                  className="deck-save-button"
                  disabled={!canSave}
                  onClick={saveDeck}
                >
                  {saving ? (
                    <LoaderCircle className="deck-spin" size={18} />
                  ) : (
                    <Save size={19} />
                  )}
                  {editingId ? "Salvar alterações" : "Salvar deck"}
                </button>
              </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
