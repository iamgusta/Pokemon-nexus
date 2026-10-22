
import { motion } from "motion/react";
import { Sparkles, Zap } from "lucide-react";

export const RARITIES = {
  common: {
    label: "Comum",
    color: "#aeb9cf"
  },
  uncommon: {
    label: "Incomum",
    color: "#52e0a3"
  },
  rare: {
    label: "Rara",
    color: "#59a9ff"
  },
  epic: {
    label: "Épica",
    color: "#c08aff"
  },
  legendary: {
    label: "Lendária",
    color: "#ffd15f"
  }
};

export function pokemonName(name = "") {
  return name
    .split("-")
    .map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export default function TcgCard({
  card,
  quantity,
  compact = false
}) {
  const rarity = RARITIES[card.rarity] || RARITIES.common;

  return (
    <motion.article
      className={`tcg-card rarity-${card.rarity} ${
        compact ? "tcg-compact" : ""
      }`}
      style={{ "--rarity-color": rarity.color }}
      initial={{ opacity: 0, scale: 0.84, rotateY: -60 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{
        type: "spring",
        stiffness: 160,
        damping: 19
      }}
      whileHover={{
        y: -9,
        rotateZ: -1,
        scale: 1.025
      }}
    >
      <div className="tcg-card-shine" />

      <div className="tcg-card-header">
        <span>
          #{String(card.pokemon_id).padStart(4, "0")}
        </span>
        <Sparkles size={17} />
      </div>

      <div className="tcg-card-image">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={pokemonName(card.name)}
            loading="lazy"
          />
        ) : (
          <Zap size={56} />
        )}
      </div>

      <div className="tcg-card-body">
        <h3>{pokemonName(card.name)}</h3>
        <span className="tcg-rarity">{rarity.label}</span>

        <div className="tcg-card-stats">
          <div>
            <small>HP</small>
            <b>{card.hp}</b>
          </div>
          <div>
            <small>ATK</small>
            <b>{card.attack}</b>
          </div>
          <div>
            <small>DEF</small>
            <b>{card.defense}</b>
          </div>
        </div>

        <div className="tcg-power">
          <Zap size={15} />
          PODER BASE
          <strong>{card.total_stats}</strong>
        </div>
      </div>

      {quantity != null && (
        <span className="tcg-quantity">×{quantity}</span>
      )}
    </motion.article>
  );
}
