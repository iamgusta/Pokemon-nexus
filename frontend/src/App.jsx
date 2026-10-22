
import { useEffect, useMemo, useState } from "react";

import {
  motion,
  AnimatePresence,
  useReducedMotion
} from "motion/react";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Database,
  Gift,
  Heart,
  Layers3,
  Menu,
  RefreshCw,
  Search,
  Shield,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Wifi,
  WifiOff,
  X,
  Zap
} from "lucide-react";

import PokemonCard, {
  formatName,
  typeColors,
  typeNames
} from "./components/PokemonCard";

import TcgHub from "./components/TcgHub";
import DeckBuilder from "./components/DeckBuilder";
import BattleArena from "./components/BattleArena";

import {
  getPokemon,
  getPokemonById,
  getStats
} from "./services/api";

// ==============================================
// POKEMON NEXUS - APPLICATION V1.5
// POKEDEX + BOOSTERS + COLLECTION + DECKS
// + BATTLE ARENA
// ==============================================

const LIMIT = 24;

const TYPES = ["all", ...Object.keys(typeNames)];

const SORTS = [
  { value: "number", label: "Número da Pokédex" },
  { value: "name", label: "Nome A–Z" },
  { value: "hp", label: "Maior HP" },
  { value: "attack", label: "Maior ataque" },
  { value: "total_stats", label: "Maior poder" }
];

const FAVORITES_KEY = "pokemon-nexus-favorites-v1";

const NAVIGATION = [
  {
    id: "pokedex",
    label: "Explorar Pokédex",
    icon: Compass
  },
  {
    id: "boosters",
    label: "Booster Arena",
    icon: Gift
  },
  {
    id: "collection",
    label: "Minha Coleção",
    icon: Layers3
  },
  {
    id: "decks",
    label: "Deck Builder",
    icon: Shield
  },
  {
    id: "battles",
    label: "Batalhas",
    icon: Swords
  }
];

const PAGE_TITLES = {
  pokedex: "DISCOVER",
  boosters: "BOOSTER ARENA",
  collection: "MY COLLECTION",
  decks: "DECK BUILDER",
  battles: "BATTLE ARENA"
};

// ==============================================
// HELPERS
// ==============================================

function readFavorites() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]"
    );

    return Array.isArray(stored)
      ? stored.filter(Number.isInteger)
      : [];
  } catch {
    return [];
  }
}

function TypePill({ type }) {
  return (
    <span
      className="type-pill"
      style={{
        "--chip": typeColors[type] || "#9cabcb"
      }}
    >
      {typeNames[type] || type}
    </span>
  );
}

// ==============================================
// POKEMON DETAILS
// ==============================================

function PokemonDetails({
  pokemon,
  onClose,
  favorite,
  onFavorite
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  const stats = [
    ["HP", pokemon.hp],
    ["Ataque", pokemon.attack],
    ["Defesa", pokemon.defense],
    ["Ataque especial", pokemon.special_attack],
    ["Defesa especial", pokemon.special_defense],
    ["Velocidade", pokemon.speed]
  ];

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.aside
        className="pokemon-detail"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de ${pokemon.name}`}
        initial={
          reducedMotion
            ? false
            : { x: 450 }
        }
        animate={{ x: 0 }}
        exit={{ x: 450 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 30
        }}
      >
        <div className="detail-actions">
          <span>POKÉMON PROFILE</span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={21} />
          </button>
        </div>

        <div className="detail-visual">
          <div className="detail-ring" />

          {pokemon.image_url && (
            <motion.img
              src={pokemon.image_url}
              alt={formatName(pokemon.name)}
              initial={{
                opacity: 0,
                scale: 0.6
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
            />
          )}

          <span>
            #{String(pokemon.pokemon_id).padStart(4, "0")}
          </span>
        </div>

        <div className="detail-title-row">
          <h2>{formatName(pokemon.name)}</h2>

          <button
            type="button"
            className={`detail-heart ${
              favorite ? "active" : ""
            }`}
            onClick={() =>
              onFavorite(pokemon.pokemon_id)
            }
            aria-label="Alternar favorito"
          >
            <Heart
              fill={
                favorite
                  ? "currentColor"
                  : "none"
              }
            />
          </button>
        </div>

        <div className="detail-type-row">
          {pokemon.types?.map((type) => (
            <TypePill
              key={type}
              type={type}
            />
          ))}
        </div>

        <div className="detail-info-grid">
          <div>
            <small>ALTURA</small>
            <b>{pokemon.height_m} m</b>
          </div>

          <div>
            <small>PESO</small>
            <b>{pokemon.weight_kg} kg</b>
          </div>

          <div>
            <small>PODER BASE</small>
            <b>{pokemon.total_stats}</b>
          </div>
        </div>

        <h3>Estatísticas de combate</h3>

        <div className="detail-stats">
          {stats.map(([label, value], index) => {
            const numericValue = Number(value) || 0;

            return (
              <div key={label}>
                <div className="detail-stat-label">
                  <span>{label}</span>
                  <b>{numericValue}</b>
                </div>

                <div className="detail-progress">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        Math.min(
                          100,
                          (numericValue / 255) * 100
                        )
                      }%`
                    }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.65,
                      delay: reducedMotion ? 0 : index * 0.07
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <h3>Habilidades</h3>

        <div className="ability-tags">
          {pokemon.abilities?.map((ability) => (
            <span key={ability}>
              {formatName(ability)}
            </span>
          ))}
        </div>

        <p className="detail-disclaimer">
          Estatísticas originais da Pokédex.
          O sistema de batalhas utiliza
          regras próprias do Pokémon Nexus.
        </p>
      </motion.aside>
    </motion.div>
  );
}

// ==============================================
// MAIN APPLICATION
// ==============================================

export default function App() {
  const reducedMotion = useReducedMotion();

  // NAVEGAÇÃO
  const [section, setSection] = useState("pokedex");
  const [menuOpen, setMenuOpen] = useState(false);

  // POKÉDEX
  const [pokemon, setPokemon] = useState([]);
  const [summary, setSummary] = useState(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("number");

  // FAVORITOS
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(readFavorites);

  // MODAL
  const [selected, setSelected] = useState(null);

  // SISTEMA
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState("");

  // ==========================================
  // NAVIGATION
  // ==========================================

  function navigate(nextSection) {
    setSection(nextSection);
    setMenuOpen(false);
    setSelected(null);

    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth"
    });
  }

  function navigatePokedex() {
    setFavoritesOnly(false);
    navigate("pokedex");
  }

  function navigateFavorites() {
    setFavoritesOnly(true);
    setPage(1);
    navigate("pokedex");

    setTimeout(() => {
      document
        .getElementById("pokedex")
        ?.scrollIntoView({
          behavior: "smooth"
        });
    }, 100);
  }

  function navigateOverview() {
    setFavoritesOnly(false);
    navigate("pokedex");

    setTimeout(() => {
      document
        .getElementById("overview")
        ?.scrollIntoView({
          behavior: "smooth"
        });
    }, 100);
  }

  // ==========================================
  // LOAD ANALYTICS
  // ==========================================

  useEffect(() => {
    let active = true;

    getStats()
      .then((data) => {
        if (!active) return;

        setSummary(data.summary);
        setApiOnline(true);
      })
      .catch(() => {
        if (!active) return;

        setSummary(null);
        setApiOnline(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  // ==========================================
  // LOAD POKEDEX
  // ==========================================

  useEffect(() => {
    if (section !== "pokedex") {
      return;
    }

    let active = true;
    setLoading(true);

    async function loadPokemon() {
      try {
        const data = await getPokemon({
          page: favoritesOnly ? 1 : page,
          limit: favoritesOnly ? 100 : LIMIT,
          search,
          type: type === "all" ? "" : type
        });

        if (!active) return;

        setPokemon(data.results || []);
        setTotal(data.total || 0);
        setApiOnline(true);
        setError("");
      } catch {
        if (!active) return;

        setPokemon([]);
        setApiOnline(false);

        setError(
          "Não foi possível acessar a API na porta 8001."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPokemon();

    return () => {
      active = false;
    };
  }, [
    section,
    page,
    search,
    type,
    favoritesOnly,
    reloadKey
  ]);

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 2400);

    return () => {
      clearTimeout(timer);
    };
  }, [toast]);

  // ==========================================
  // FAVORITES
  // ==========================================

  function toggleFavorite(id) {
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];

      localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(next)
      );

      return next;
    });
  }

  // ==========================================
  // POKEDEX FILTERS
  // ==========================================

  const visiblePokemon = useMemo(() => {
    let items = [...pokemon];

    if (favoritesOnly) {
      items = items.filter((item) =>
        favorites.includes(item.pokemon_id)
      );
    }

    if (sort === "name") {
      items.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } else if (sort !== "number") {
      items.sort((a, b) =>
        (b[sort] || 0) - (a[sort] || 0)
      );
    }

    return items;
  }, [
    pokemon,
    favoritesOnly,
    favorites,
    sort
  ]);

  const totalPages = Math.ceil(total / LIMIT);

  // ==========================================
  // POKEMON ACTIONS
  // ==========================================

  async function openPokemon(item) {
    setSelected(item);

    try {
      const detail = await getPokemonById(
        item.pokemon_id
      );

      setSelected((current) =>
        current?.pokemon_id === item.pokemon_id
          ? detail
          : current
      );
    } catch {
      // Mantém os dados da listagem.
    }
  }

  async function randomPokemon() {
    if (!apiOnline || total <= 0) {
      setToast(
        "Conecte a API para descobrir um Pokémon."
      );
      return;
    }

    try {
      const randomPage =
        Math.floor(Math.random() * total) + 1;

      const data = await getPokemon({
        page: randomPage,
        limit: 1
      });

      if (data.results?.[0]) {
        openPokemon(data.results[0]);
      }
    } catch {
      setToast(
        "Não foi possível sortear um Pokémon."
      );
    }
  }

  function applySearch(event) {
    event.preventDefault();

    setPage(1);
    setSearch(searchText.trim());
    setFavoritesOnly(false);
  }

  function changeType(value) {
    setType(value);
    setPage(1);
  }

  function retry() {
    setReloadKey((value) => value + 1);
  }

  // ==========================================
  // POKEDEX PAGE
  // ==========================================

  function renderPokedex() {
    return (
      <>
        <motion.section
          className="nexus-hero"
          id="overview"
          initial={
            reducedMotion
              ? false
              : { opacity: 0, y: 30 }
          }
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.65
          }}
        >
          <div className="hero-copy">
            <div className="hero-overline">
              <Sparkles size={15} />
              WELCOME TO THE NEXUS
            </div>

            <h1>
              Gotta explore
              <br />
              <span>them all.</span>
            </h1>

            <p>
              Um universo de Pokémon, dados e descobertas.
              Sua jornada começa aqui.
            </p>

            <div className="hero-buttons">
              <a
                href="#pokedex"
                className="button-primary"
              >
                <Compass size={19} />
                Explorar Pokédex
                <ArrowRight size={19} />
              </a>

              <button
                type="button"
                className="button-secondary"
                onClick={randomPokemon}
              >
                <Shuffle size={19} />
                Surpreenda-me
              </button>
            </div>
          </div>

          <div
            className="hero-object"
            aria-hidden="true"
          >
            <div className="hero-orbit orbit-outer" />
            <div className="hero-orbit orbit-inner" />

            <div className="pokeball">
              <div className="ball-top" />
              <div className="ball-bottom" />
              <div className="ball-band" />

              <div className="ball-center">
                <div />
              </div>
            </div>

            <div className="hero-sparkle sparkle-a">
              ✦
            </div>

            <div className="hero-sparkle sparkle-b">
              ✧
            </div>
          </div>
        </motion.section>

        {/* METRICS */}

        <div className="metric-grid">
          {[
            {
              label: "POKÉMON",
              value: summary?.total_pokemon,
              icon: Database,
              color: "#ffcc56"
            },
            {
              label: "TIPOS",
              value: summary?.total_types,
              icon: Shield,
              color: "#61b5ff"
            },
            {
              label: "HABILIDADES",
              value: summary?.total_abilities,
              icon: Zap,
              color: "#af89ff"
            },
            {
              label: "FAVORITOS",
              value: favorites.length,
              icon: Heart,
              color: "#ff729c"
            }
          ].map((item, index) => (
            <motion.div
              className="metric-card"
              key={item.label}
              initial={
                reducedMotion
                  ? false
                  : { opacity: 0, y: 24 }
              }
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: index * 0.1
              }}
            >
              <div
                className="metric-icon"
                style={{ color: item.color }}
              >
                <item.icon size={22} />
              </div>

              <div>
                <span>{item.label}</span>

                <strong>
                  {
                    item.value?.toLocaleString("pt-BR")
                    ?? "—"
                  }
                </strong>
              </div>
            </motion.div>
          ))}
        </div>

        {/* EXPLORER */}

        <section
          id="pokedex"
          className="explorer-section"
        >
          <div className="explorer-heading">
            <div>
              <div className="section-eyebrow">
                <span />
                POKÉDEX EXPLORER
              </div>

              <h2>
                Descubra seus <span>Pokémon.</span>
              </h2>

              <p>
                Explore, filtre e descubra
                os atributos de cada espécie.
              </p>
            </div>

            <button
              type="button"
              className="random-button"
              onClick={randomPokemon}
            >
              <Shuffle size={18} />
              Pokémon aleatório
            </button>
          </div>

          {/* SEARCH */}

          <form
            className="nexus-search"
            onSubmit={applySearch}
          >
            <Search size={22} />

            <input
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder="Pesquise um Pokémon pelo nome..."
              aria-label="Pesquisar Pokémon"
            />

            {searchText && (
              <button
                type="button"
                className="clear-search"
                onClick={() => {
                  setSearchText("");
                  setSearch("");
                  setPage(1);
                }}
                aria-label="Limpar pesquisa"
              >
                <X size={18} />
              </button>
            )}

            <button
              className="search-submit"
              type="submit"
            >
              Buscar
              <ArrowRight size={17} />
            </button>
          </form>

          {/* FILTERS */}

          <div className="filters-bar">
            <div className="filter-label">
              <SlidersHorizontal size={17} />
              FILTRAR POR TIPO
            </div>

            <div className="type-filters">
              {TYPES.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    type === value
                      ? "active"
                      : ""
                  }
                  onClick={() => changeType(value)}
                >
                  {
                    value === "all"
                      ? "Todos"
                      : typeNames[value]
                  }
                </button>
              ))}
            </div>
          </div>

          {/* SORT */}

          <div className="results-toolbar">
            <div className="results-info">
              <span className="count-indicator" />

              {
                favoritesOnly
                  ? visiblePokemon.length
                  : total
              } Pokémon encontrados

              {favoritesOnly && (
                <span className="toolbar-tag">
                  Favoritos · página consultada
                </span>
              )}
            </div>

            <div className="sort-control">
              <ChevronDown size={16} />

              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value)
                }
              >
                {SORTS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* API ERROR */}

          {!apiOnline && !loading && (
            <div className="api-error">
              <WifiOff size={31} />

              <div>
                <h3>Conexão perdida com a API</h3>

                <p>
                  {error} Inicie o FastAPI
                  na porta 8001.
                </p>
              </div>

              <button
                type="button"
                onClick={retry}
              >
                <RefreshCw size={17} />
                Reconectar
              </button>
            </div>
          )}

          {/* POKEMON GRID */}

          {loading ? (
            <div className="loading-screen">
              <div className="loading-pokeball" />
              <span>Sincronizando Pokédex...</span>
            </div>
          ) : (
            <motion.div
              layout
              className="cards-grid"
            >
              <AnimatePresence mode="popLayout">
                {visiblePokemon.map(
                  (item, index) => (
                    <PokemonCard
                      key={item.pokemon_id}
                      index={index}
                      pokemon={item}
                      favorite={favorites.includes(
                        item.pokemon_id
                      )}
                      onFavorite={toggleFavorite}
                      onSelect={openPokemon}
                    />
                  )
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* EMPTY STATE */}

          {!loading &&
            apiOnline &&
            visiblePokemon.length === 0 && (
              <div className="empty-message">
                <Search size={34} />

                <h3>Nenhum Pokémon encontrado</h3>

                <p>
                  Experimente mudar os filtros
                  ou o nome pesquisado.
                </p>
              </div>
            )}

          {/* PAGINATION */}

          {!loading &&
            apiOnline &&
            totalPages > 1 &&
            !favoritesOnly && (
              <div className="pagination">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => {
                    setPage((current) => current - 1);

                    document
                      .getElementById("pokedex")
                      ?.scrollIntoView();
                  }}
                >
                  <ArrowLeft size={17} />
                  Anterior
                </button>

                <span>
                  PÁGINA <b>{page}</b> / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((current) => current + 1);

                    document
                      .getElementById("pokedex")
                      ?.scrollIntoView();
                  }}
                >
                  Próxima
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
        </section>
      </>
    );
  }

  // ==========================================
  // MAIN LAYOUT
  // ==========================================

  return (
    <div className="nexus-app">
      <div
        className="background-grid"
        aria-hidden="true"
      />

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {/* SIDEBAR */}

      <aside
        className={`nexus-sidebar ${
          menuOpen ? "sidebar-open" : ""
        }`}
      >
        <button
          type="button"
          className="nexus-logo"
          onClick={navigatePokedex}
          style={{
            background: "transparent",
            border: "none",
            color: "inherit",
            textAlign: "left",
            cursor: "pointer"
          }}
        >
          <div className="logo-icon">
            <Zap fill="currentColor" />
          </div>

          <div>
            <b>POKÉMON</b>
            <strong>NEXUS</strong>
          </div>
        </button>

        <div className="nav-label">
          MAIN MENU
        </div>

        {/* MENU PRINCIPAL */}

        <nav className="nexus-navigation">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;

            const isActive =
              section === item.id &&
              !(
                item.id === "pokedex" &&
                favoritesOnly
              );

            return (
              <button
                type="button"
                key={item.id}
                className={
                  isActive ? "selected" : ""
                }
                onClick={() => {
                  if (item.id === "pokedex") {
                    setFavoritesOnly(false);
                  }

                  navigate(item.id);
                }}
              >
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}

          {/* FAVORITOS */}

          <button
            type="button"
            className={
              section === "pokedex" &&
              favoritesOnly
                ? "selected"
                : ""
            }
            onClick={navigateFavorites}
          >
            <Heart size={20} />
            Favoritos
            <em>{favorites.length}</em>
          </button>

          {/* ANALYTICS */}

          <button
            type="button"
            onClick={navigateOverview}
          >
            <Activity size={20} />
            Dados & Analytics
          </button>
        </nav>

        {/* STATUS */}

        <div className="sidebar-panel">
          <div className="sidebar-panel-title">
            <Database size={18} />
            DATA ENGINE
          </div>

          <p>
            Python ETL → PostgreSQL → FastAPI → React
          </p>

          <span
            className={
              apiOnline
                ? "connection-ok"
                : "connection-error"
            }
          >
            {
              apiOnline
                ? <Wifi size={14} />
                : <WifiOff size={14} />
            }

            {
              apiOnline
                ? "API CONECTADA"
                : "API DESCONECTADA"
            }
          </span>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <div className="nexus-content">
        <header
          className="nexus-topbar"
          id="home"
        >
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() =>
                setMenuOpen((current) => !current)
              }
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>

            <span className="breadcrumb">
              NEXUS <i>/</i> {
                PAGE_TITLES[section] || "DISCOVER"
              }
            </span>
          </div>

          <div className="topbar-right">
            <span className="topbar-live">
              <span
                className={`live-dot ${
                  apiOnline ? "" : "offline"
                }`}
              />

              {
                apiOnline
                  ? "SYSTEM ONLINE"
                  : "API OFFLINE"
              }
            </span>

            <div className="profile-circle">
              <Zap size={20} />
            </div>
          </div>
        </header>

        {/* PAGES */}

        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={
                reducedMotion
                  ? false
                  : { opacity: 0, y: 15 }
              }
              animate={{
                opacity: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                y: -10
              }}
              transition={{
                duration: reducedMotion ? 0 : 0.25
              }}
            >
              {/* POKEDEX */}

              {section === "pokedex" &&
                renderPokedex()}

              {/* BOOSTERS / COLLECTION */}

              {(
                section === "boosters" ||
                section === "collection"
              ) && (
                <TcgHub section={section} />
              )}

              {/* DECK BUILDER */}

              {section === "decks" && (
                <DeckBuilder />
              )}

              {/* BATTLE ARENA */}

              {section === "battles" && (
                <BattleArena />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* FOOTER */}

        <footer className="nexus-footer">
          <span>
            POKÉMON NEXUS <b>© 2026</b>
          </span>

          <span>
            POWERED BY PYTHON · POSTGRESQL · FASTAPI · REACT
          </span>
        </footer>
      </div>

      {/* POKEMON MODAL */}

      <AnimatePresence>
        {selected && (
          <PokemonDetails
            key={selected.pokemon_id}
            pokemon={selected}
            favorite={favorites.includes(
              selected.pokemon_id
            )}
            onFavorite={toggleFavorite}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* NOTIFICATIONS */}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="nexus-toast"
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            exit={{
              opacity: 0,
              y: 20
            }}
          >
            <Check size={17} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
