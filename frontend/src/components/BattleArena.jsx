
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, Heart, LoaderCircle, Play, RotateCcw,
  Shield, Skull, Sparkles, Swords, Trophy, Zap
} from "lucide-react";

import {
  getDecks,
  getBattle,
  startBattle,
  playBattleTurn
} from "../services/api";

const BATTLE_KEY = "pokemon-nexus-current-battle";

function displayName(value = "") {
  return value
    .split("-")
    .map(part => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function Fighter({ pokemon, label, opponent, hit }) {
  if (!pokemon) return null;

  const percent = Math.max(
    0,
    Math.min(100, pokemon.hp / pokemon.max_hp * 100)
  );

  return (
    <div className={`arena-fighter ${opponent ? "enemy" : "ally"}`}>
      <div className="fighter-info">
        <div className="fighter-label">
          <span>{label}</span>
          <b>{displayName(pokemon.name)}</b>
        </div>

        <div className="fighter-hp-numbers">
          <Heart size={15} />
          {pokemon.hp}/{pokemon.max_hp}
        </div>

        <div className="fighter-hp-track">
          <motion.div
            initial={false}
            animate={{
              width: `${percent}%`,
              backgroundColor:
                percent <= 25 ? "#ef5678"
                : percent <= 50 ? "#ffc75a"
                : "#55daa5"
            }}
            transition={{ duration: 0.65 }}
          />
        </div>
      </div>

      <motion.div
        className="fighter-art"
        key={`${pokemon.pokemon_id}-${hit}`}
        initial={{ opacity: 0.5, scale: 0.9 }}
        animate={{
          opacity: 1,
          scale: pokemon.hp > 0 ? 1 : 0.7,
          x: hit ? [0, -10, 9, 0] : 0
        }}
        transition={{ duration: 0.45 }}
      >
        <div className="fighter-aura" />
        {pokemon.image_url ? (
          <img
            src={pokemon.image_url}
            alt={displayName(pokemon.name)}
          />
        ) : (
          <Shield size={70} />
        )}
      </motion.div>

      <div className="fighter-bottom">
        ATK {pokemon.attack} · DEF {pokemon.defense}
      </div>
    </div>
  );
}

export default function BattleArena() {
  const [decks, setDecks] = useState([]);
  const [deckId, setDeckId] = useState("");
  const [battleId, setBattleId] = useState(null);
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [switchMode, setSwitchMode] = useState(false);
  const [hitVersion, setHitVersion] = useState(0);

  const actionLock = useRef(false);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const deckData = await getDecks();
        if (!active) return;

        const available = deckData.results || [];
        setDecks(available);

        if (available.length) {
          setDeckId(String(available[0].deck_id));
        }

        const stored = localStorage.getItem(BATTLE_KEY);
        if (stored && /^\d+$/.test(stored)) {
          try {
            const result = await getBattle(Number(stored));
            if (active) {
              setBattleId(result.battle_id);
              setState(result.state);
            }
          } catch {
            localStorage.removeItem(BATTLE_KEY);
          }
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => { active = false; };
  }, []);

  async function beginBattle() {
    if (!deckId || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");

    try {
      const response = await startBattle(Number(deckId));
      setBattleId(response.battle_id);
      setState(response.state);
      setSwitchMode(false);
      setHitVersion(0);

      localStorage.setItem(
        BATTLE_KEY,
        String(response.battle_id)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      actionLock.current = false;
    }
  }

  async function sendAction(action, targetIndex = null) {
    if (!battleId || state?.status !== "active" || actionLock.current) {
      return;
    }

    actionLock.current = true;
    setBusy(true);
    setError("");

    try {
      const response = await playBattleTurn(
        battleId,
        action,
        targetIndex
      );

      setState(response.state);
      setHitVersion(current => current + 1);
      setSwitchMode(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      actionLock.current = false;
    }
  }

  function leaveBattle() {
    // Uma partida abandonada permanece no histórico do banco.
    // Esta ação apenas fecha a visualização local.
    localStorage.removeItem(BATTLE_KEY);
    setBattleId(null);
    setState(null);
    setSwitchMode(false);
    setError("");
  }

  const player = state?.player_team?.[state.player_active];
  const enemy = state?.cpu_team?.[state.cpu_active];

  if (loading) {
    return (
      <div className="battle-loading">
        <LoaderCircle className="battle-spinner" size={36} />
        Carregando Battle Arena...
      </div>
    );
  }

  return (
    <section className="battle-screen">
      <header className="battle-heading">
        <div>
          <span className="battle-eyebrow">
            <Sparkles size={16} /> NEXUS BATTLE SYSTEM
          </span>
          <h1>Battle <em>Arena.</em></h1>
          <p>Enfrente a CPU e conquiste cinco nocautes!</p>
        </div>
        <div className="battle-heading-icon">
          <Swords size={38} />
        </div>
      </header>

      {error && (
        <div className="battle-error" role="alert">
          {error}
          <button onClick={() => setError("")}>Fechar</button>
        </div>
      )}

      {!state ? (
        <motion.div
          className="battle-lobby"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="battle-lobby-emblem">
            <Swords size={74} />
          </div>

          <span>TRAINER CHALLENGE · SINGLE PLAYER</span>
          <h2>Pronto para batalhar?</h2>
          <p>
            Selecione um deck salvo e enfrente um treinador
            controlado pelo computador.
          </p>

          {decks.length === 0 ? (
            <div className="battle-no-decks">
              Você ainda não possui decks.
              Crie um baralho no Deck Builder antes de começar.
            </div>
          ) : (
            <>
              <label htmlFor="battle-deck-select">
                SELECIONE SEU DECK
              </label>
              <select
                id="battle-deck-select"
                value={deckId}
                onChange={event => setDeckId(event.target.value)}
              >
                {decks.map(deck => (
                  <option key={deck.deck_id} value={deck.deck_id}>
                    {deck.name} — {deck.total_cards}/20 cartas
                  </option>
                ))}
              </select>

              <button
                className="battle-primary-button"
                onClick={beginBattle}
                disabled={busy || !deckId}
              >
                <Play size={19} fill="currentColor" />
                {busy ? "Preparando..." : "Iniciar batalha"}
                <ArrowRight size={19} />
              </button>
            </>
          )}
        </motion.div>
      ) : (
        <>
          <div className="battle-scoreboard">
            <div>
              <span>SEUS NOCAUTES</span>
              <strong>{state.player_kos} / 5</strong>
            </div>

            <div className="battle-round">
              <Swords size={21} />
              TURNO {state.turn}
            </div>

            <div>
              <span>NOCAUTES CPU</span>
              <strong>{state.cpu_kos} / 5</strong>
            </div>
          </div>

          <div className="battle-stadium">
            <div className="battle-stadium-grid" />
            <Fighter
              pokemon={enemy}
              label="CPU OPPONENT"
              opponent
              hit={hitVersion}
            />

            <div className="battle-versus">VS</div>

            <Fighter
              pokemon={player}
              label="YOUR POKÉMON"
              hit={hitVersion}
            />
          </div>

          <AnimatePresence mode="wait">
            {state.status !== "active" ? (
              <motion.div
                className="battle-result"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {state.status === "won" ? (
                  <Trophy size={42} />
                ) : (
                  <Skull size={42} />
                )}

                <h2>
                  {state.status === "won"
                    ? "VITÓRIA!"
                    : "DERROTA!"}
                </h2>

                <p>
                  {state.status === "won"
                    ? "Você derrotou o treinador adversário!"
                    : "A CPU venceu esta batalha."}
                </p>

                <button
                  className="battle-primary-button"
                  onClick={leaveBattle}
                >
                  <RotateCcw size={18} />
                  Nova batalha
                </button>
              </motion.div>
            ) : (
              <motion.div
                className="battle-controls"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="battle-controls-title">
                  <Zap size={19} />
                  QUAL SERÁ SUA PRÓXIMA AÇÃO?
                </div>

                <div className="battle-main-actions">
                  <button
                    className="battle-attack-button"
                    onClick={() => sendAction("attack")}
                    disabled={busy}
                  >
                    <Swords size={23} />
                    {busy ? "Executando turno..." : "Atacar"}
                  </button>

                  <button
                    className="battle-switch-button"
                    onClick={() => setSwitchMode(value => !value)}
                    disabled={busy}
                  >
                    <RotateCcw size={21} />
                    Trocar Pokémon
                  </button>
                </div>

                {switchMode && (
                  <div className="battle-switch-list">
                    <h3>Escolha seu próximo Pokémon</h3>
                    {state.player_team.map((fighter, index) => (
                      <button
                        key={index}
                        disabled={
                          busy ||
                          fighter.hp <= 0 ||
                          index === state.player_active
                        }
                        onClick={() => sendAction("switch", index)}
                      >
                        {fighter.image_url && (
                          <img src={fighter.image_url} alt="" />
                        )}
                        <span>{displayName(fighter.name)}</span>
                        <small>
                          {fighter.hp}/{fighter.max_hp} HP
                        </small>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="battle-log">
            <h3><Shield size={18} /> Histórico de combate</h3>
            <div aria-live="polite">
              {[...(state.log || [])]
                .reverse()
                .slice(0, 12)
                .map((entry, index) => (
                  <p key={index}>{entry}</p>
                ))}
            </div>
          </div>

          <div className="battle-footer">
            <span>
              BATALHA #{battleId} · SALVA NO POSTGRESQL
            </span>
            <button onClick={leaveBattle}>
              Sair da visualização
            </button>
          </div>
        </>
      )}
    </section>
  );
}
