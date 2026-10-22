
import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Heart, ArrowUpRight, Sparkles } from "lucide-react";

export const typeNames = {
  normal: "Normal", fire: "Fogo", water: "Água",
  electric: "Elétrico", grass: "Planta", ice: "Gelo",
  fighting: "Lutador", poison: "Veneno", ground: "Terra",
  flying: "Voador", psychic: "Psíquico", bug: "Inseto",
  rock: "Pedra", ghost: "Fantasma", dragon: "Dragão",
  dark: "Sombrio", steel: "Aço", fairy: "Fada"
};

export const typeColors = {
  normal: "#a6a9bd", fire: "#ff724d", water: "#59a8ff",
  electric: "#ffd34d", grass: "#65d995", ice: "#75e6ec",
  fighting: "#ff866d", poison: "#c58aff", ground: "#d9a16b",
  flying: "#9ebcff", psychic: "#ff82b2", bug: "#a9d86a",
  rock: "#bfad84", ghost: "#aa8bff", dragon: "#7989ff",
  dark: "#8c8aa8", steel: "#9bb8ca", fairy: "#ffa2dc"
};

export function formatName(name = "") {
  return name
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function PokemonCard({
  pokemon,
  index = 0,
  favorite = false,
  onFavorite,
  onSelect
}) {
  const ref = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion();

  const mainType = pokemon.types?.[0] || "normal";
  const color = typeColors[mainType] || "#8ca3ff";

  function handlePointerMove(event) {
    if (reducedMotion || event.pointerType === "touch") return;
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;

    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    setRotate({ x: -y * 13, y: x * 13 });
  }

  return (
    <motion.article
      ref={ref}
      className="nexus-card"
      style={{ "--accent": color }}
      initial={reducedMotion ? false : { opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(index, 15) * 0.035,
        duration: 0.4
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setRotate({ x: 0, y: 0 })}
    >
      <motion.div
        className="card-tilt"
        animate={{
          rotateX: rotate.x,
          rotateY: rotate.y
        }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
      >
        <button
          type="button"
          className="card-click-area"
          onClick={() => onSelect(pokemon)}
          aria-label={`Ver detalhes de ${pokemon.name}`}
        >
          <div className="card-topline">
            <span>
              #{String(pokemon.pokemon_id).padStart(4, "0")}
            </span>
            <Sparkles size={15} />
          </div>

          <div className="card-art">
            <div className="card-aura" />
            {pokemon.image_url ? (
              <img
                src={pokemon.image_url}
                alt={formatName(pokemon.name)}
                loading="lazy"
              />
            ) : (
              <div className="missing-art">?</div>
            )}
          </div>

          <div className="card-bottom">
            <div className="card-heading">
              <h3>{formatName(pokemon.name)}</h3>
              <ArrowUpRight size={17} />
            </div>

            <div className="card-types">
              {pokemon.types?.map(type => (
                <span
                  key={type}
                  style={{
                    "--chip": typeColors[type] || "#9aa7bc"
                  }}
                >
                  {typeNames[type] || type}
                </span>
              ))}
            </div>

            <div className="card-attributes">
              <div><small>HP</small><strong>{pokemon.hp}</strong></div>
              <div><small>ATK</small><strong>{pokemon.attack}</strong></div>
              <div><small>DEF</small><strong>{pokemon.defense}</strong></div>
            </div>
          </div>
        </button>

        <button
          type="button"
          className={`favorite-button ${favorite ? "is-favorite" : ""}`}
          aria-label={favorite ? "Remover favorito" : "Adicionar favorito"}
          aria-pressed={favorite}
          onClick={() => onFavorite(pokemon.pokemon_id)}
        >
          <Heart size={18} fill={favorite ? "currentColor" : "none"} />
        </button>
      </motion.div>
    </motion.article>
  );
}
