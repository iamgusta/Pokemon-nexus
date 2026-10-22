
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import { AnimatePresence, motion } from "motion/react";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  Gift,
  Layers3,
  LockKeyhole,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap
} from "lucide-react";

import {
  getBoosterStatus,
  getCollection,
  openBooster
} from "../services/api";

import TcgCard, { RARITIES } from "./TcgCard";


const TOTAL_CATALOG = 1025;


function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return (
    `${String(minutes).padStart(2, "0")}:` +
    `${String(remaining).padStart(2, "0")}`
  );
}


export default function TcgHub({ section }) {
  const [collection, setCollection] = useState(null);
  const [collectionLoading, setCollectionLoading] = useState(true);

  const [statusLoading, setStatusLoading] = useState(true);
  const [nextAvailable, setNextAvailable] = useState(null);
  const [remaining, setRemaining] = useState(0);

  const [opening, setOpening] = useState(false);
  const [booster, setBooster] = useState(null);
  const [revealed, setRevealed] = useState(0);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");

  const requestInProgress = useRef(false);


  const loadCollection = useCallback(async () => {
    setCollectionLoading(true);

    try {
      const data = await getCollection();
      setCollection(data);
    } catch {
      setError("Não foi possível carregar a coleção.");
    } finally {
      setCollectionLoading(false);
    }
  }, []);


  const loadStatus = useCallback(async () => {
    setStatusLoading(true);

    try {
      const data = await getBoosterStatus();

      if (data.can_open) {
        setNextAvailable(null);
        setRemaining(0);
      } else {
        const serverNow = Date.parse(data.server_time);
        const nextTime = Date.parse(data.next_available_at);

        const remainingMs = Math.max(
          0,
          nextTime - serverNow
        );

        setNextAvailable(Date.now() + remainingMs);
        setRemaining(Math.ceil(remainingMs / 1000));
      }

      return data;
    } catch {
      setError("Não foi possível consultar o cooldown.");
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, []);


  useEffect(() => {
    loadCollection();
    loadStatus();
  }, [loadCollection, loadStatus, section]);


  useEffect(() => {
    if (!nextAvailable) return;

    function tick() {
      const seconds = Math.max(
        0,
        Math.ceil((nextAvailable - Date.now()) / 1000)
      );

      setRemaining(seconds);

      if (seconds === 0) {
        setNextAvailable(null);
        loadStatus();
      }
    }

    tick();

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextAvailable, loadStatus]);


  async function handleOpenBooster() {
    if (
      requestInProgress.current ||
      loading ||
      statusLoading ||
      remaining > 0
    ) {
      return;
    }

    requestInProgress.current = true;
    setLoading(true);
    setError("");

    try {
      const result = await openBooster();

      if (!result.success || result.cards?.length !== 5) {
        throw new Error("Resposta inválida do servidor.");
      }

      setBooster(result);
      setRevealed(0);
      setOpening(true);

      // Exibição imediata. O status será
      // sincronizado novamente com o servidor.
      setRemaining(120);
      setNextAvailable(Date.now() + 120000);

      await Promise.allSettled([
        loadCollection(),
        loadStatus()
      ]);

    } catch (err) {
      if (err.status === 429) {
        setError("Aguarde o cooldown para abrir outro booster.");
      } else {
        setError(
          err.message || "Não foi possível abrir o booster."
        );
      }

      await loadStatus();
      await loadCollection();

    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }


  function revealNext() {
    if (!booster) return;

    setRevealed(value =>
      Math.min(value + 1, booster.cards.length)
    );
  }


  function resetOpening() {
    setOpening(false);
    setBooster(null);
    setRevealed(0);
    setError("");
  }


  const owned = collection?.unique_cards ?? 0;
  const copies = collection?.total_cards ?? 0;

  const progress = Math.min(
    (owned / TOTAL_CATALOG) * 100,
    100
  );

  const filteredCards = (collection?.cards || []).filter(
    card =>
      rarityFilter === "all" ||
      card.rarity === rarityFilter
  );


  // ==========================================
  // MINHA COLECAO
  // ==========================================

  if (section === "collection") {
    return (
      <motion.section
        className="tcg-screen"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="tcg-section-title">
          <span>
            <Layers3 size={17} /> PLAYER INVENTORY
          </span>

          <h1>Minha <em>Coleção.</em></h1>

          <p>
            Todas as suas cartas estão armazenadas
            no PostgreSQL.
          </p>
        </div>

        <div className="collection-overview">
          <div>
            <Layers3 size={26} />
            <strong>{owned}</strong>
            <small>Cartas diferentes</small>
          </div>

          <div>
            <Gift size={26} />
            <strong>{copies}</strong>
            <small>Cartas totais</small>
          </div>

          <div>
            <Trophy size={26} />
            <strong>{progress.toFixed(2)}%</strong>
            <small>Catálogo conquistado</small>
          </div>
        </div>

        <div className="collection-progress">
          <div>
            <b>Progresso do colecionador</b>
            <span>{owned} / {TOTAL_CATALOG}</span>
          </div>

          <div className="collection-progress-track">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="collection-controls">
          <div className="collection-filters">
            <button
              className={rarityFilter === "all" ? "active" : ""}
              onClick={() => setRarityFilter("all")}
            >
              Todas
            </button>

            {Object.entries(RARITIES).map(([key, rarity]) => (
              <button
                key={key}
                className={rarityFilter === key ? "active" : ""}
                onClick={() => setRarityFilter(key)}
              >
                {rarity.label}
              </button>
            ))}
          </div>

          <button
            className="tcg-refresh"
            onClick={loadCollection}
            disabled={collectionLoading}
          >
            <RefreshCw size={17} /> Atualizar
          </button>
        </div>

        {error && (
          <p className="tcg-error">{error}</p>
        )}

        {collectionLoading ? (
          <div className="tcg-empty">
            Carregando sua coleção...
          </div>
        ) : filteredCards.length > 0 ? (
          <div className="tcg-collection-grid">
            {filteredCards.map(card => (
              <TcgCard
                key={card.card_id}
                card={card}
                quantity={card.quantity}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="tcg-empty">
            <Layers3 size={40} />
            <h3>Nenhuma carta encontrada</h3>
            <p>Abra boosters para aumentar a coleção.</p>
          </div>
        )}
      </motion.section>
    );
  }


  // ==========================================
  // BOOSTER ARENA
  // ==========================================

  return (
    <motion.section
      className="tcg-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="tcg-section-title">
        <span>
          <Sparkles size={17} /> NEXUS TCG EXPERIENCE
        </span>

        <h1>Booster <em>Arena.</em></h1>

        <p>
          Cinco cartas por pacote.
          Um novo booster a cada dois minutos.
        </p>
      </div>

      {!opening ? (
        <div className="booster-stage">
          <div className="booster-stage-decoration">
            <div className="booster-circle circle-one" />
            <div className="booster-circle circle-two" />
          </div>

          <motion.div
            className="booster-pack"
            whileHover={{ scale: 1.04, rotate: -3 }}
            animate={{ y: [0, -9, 0] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="booster-foil top-foil" />

            <div className="booster-pack-content">
              <Sparkles size={38} />

              <h2>POKÉMON</h2>
              <strong>NEXUS</strong>

              <div className="booster-emblem">
                <Zap size={100} fill="#ffda65" />
              </div>

              <span>TCG BOOSTER PACK</span>
              <small>5 RANDOM CARDS</small>
            </div>

            <div className="booster-foil bottom-foil" />
          </motion.div>

          <div className="booster-information">
            <span className="booster-edition">
              NEXUS COLLECTION • VOL. 01
            </span>

            <h2>
              {remaining > 0
                ? "Seu próximo booster está recarregando."
                : "Seu próximo Pokémon está esperando."}
            </h2>

            <p>
              Abra pacotes e descubra Pokémon de
              diferentes raridades.
            </p>

            {remaining > 0 && (
              <div className="booster-cooldown">
                <div className="cooldown-title">
                  <Clock3 size={19} />
                  PRÓXIMO BOOSTER
                </div>

                <div className="cooldown-time">
                  {formatTime(remaining)}
                </div>

                <div className="cooldown-track">
                  <motion.div
                    animate={{
                      width: `${
                        Math.max(0, 100 - remaining / 120 * 100)
                      }%`
                    }}
                  />
                </div>
              </div>
            )}

            <button
              className="open-booster-button"
              onClick={handleOpenBooster}
              disabled={
                loading ||
                statusLoading ||
                remaining > 0
              }
            >
              {loading ? (
                <>
                  <RefreshCw size={20} />
                  Abrindo...
                </>
              ) : statusLoading ? (
                <>
                  <Clock3 size={20} />
                  Verificando...
                </>
              ) : remaining > 0 ? (
                <>
                  <LockKeyhole size={20} />
                  Aguarde {formatTime(remaining)}
                </>
              ) : (
                <>
                  <PackageOpen size={22} />
                  Abrir Booster
                  <ArrowRight size={19} />
                </>
              )}
            </button>

            <span className="booster-note">
              Gratuito • 5 cartas • Cooldown de 2 minutos
            </span>
          </div>
        </div>
      ) : (
        <div className="booster-reveal-area">
          <div className="reveal-heading">
            <div>
              <span>BOOSTER OPENING</span>
              <h2>
                {revealed === 5
                  ? "Pacote revelado!"
                  : "Descubra suas cartas"}
              </h2>
            </div>

            <button
              className="reveal-close"
              onClick={resetOpening}
              aria-label="Fechar revelação"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          <div className="reveal-progress">
            <span>
              {revealed} / {booster.cards.length} cartas
            </span>

            <div>
              <motion.div
                animate={{
                  width: `${
                    revealed / booster.cards.length * 100
                  }%`
                }}
              />
            </div>
          </div>

          {revealed < booster.cards.length ? (
            <div className="reveal-card-zone">
              <div className="reveal-unknown">
                <div className="unknown-card">
                  <Sparkles size={60} />
                  <b>NEXUS</b>
                  <span>?</span>
                </div>

                <button
                  className="open-booster-button"
                  onClick={revealNext}
                >
                  <Sparkles size={20} />
                  Revelar carta {revealed + 1}
                </button>
              </div>
            </div>
          ) : (
            <div className="reveal-card-zone">
              <div className="reveal-complete">
                <CheckCircle2 size={36} />
                <h3>Booster concluído!</h3>
                <p>
                  Cinco cartas salvas na sua coleção.
                </p>
              </div>
            </div>
          )}

          <div className="revealed-cards-grid">
            <AnimatePresence>
              {booster.cards.slice(0, revealed).map(
                (card, index) => (
                  <TcgCard
                    key={`${booster.opening_id}-${index}`}
                    card={card}
                    compact
                  />
                )
              )}
            </AnimatePresence>
          </div>

          {revealed === booster.cards.length && (
            <button
              className="open-booster-button"
              onClick={resetOpening}
            >
              <RotateCcw size={19} />
              Voltar à Arena
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="tcg-error">{error}</p>
      )}

      <div className="tcg-bottom-note">
        <Database size={17} />
        Boosters e cooldown controlados pelo PostgreSQL.
      </div>
    </motion.section>
  );
}
