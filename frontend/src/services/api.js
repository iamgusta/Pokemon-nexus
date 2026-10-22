
const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8001"
).replace(/\/$/, "");

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("Não foi possível conectar à API na porta 8001.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;
    const error = new Error(
      typeof detail === "string"
        ? detail
        : data?.message || `Erro HTTP ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// POKEDEX

export function getPokemon({
  page = 1,
  limit = 24,
  search = "",
  type = ""
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  if (search.trim()) params.set("search", search.trim());
  if (type) params.set("type", type);

  return request(`/api/pokemon?${params}`);
}

export function getPokemonById(id) {
  return request(`/api/pokemon/${id}`);
}

export function getStats() {
  return request("/api/stats");
}

// BOOSTERS

export function getBoosterStatus() {
  return request("/api/boosters/status");
}

export function openBooster() {
  return request("/api/boosters/open", { method: "POST" });
}

export function getBoosterHistory() {
  return request("/api/boosters/history");
}

// COLLECTION

export function getCollection() {
  return request("/api/collection");
}

// DECKS

export function getDecks() {
  return request("/api/decks");
}

export function getDeckById(id) {
  return request(`/api/decks/${id}`);
}

export function createDeck(data) {
  return request("/api/decks", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateDeck(id, data) {
  return request(`/api/decks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteDeck(id) {
  return request(`/api/decks/${id}`, {
    method: "DELETE"
  });
}

// BATTLE ARENA

export function startBattle(deckId) {
  return request("/api/battles/start", {
    method: "POST",
    body: JSON.stringify({ deck_id: Number(deckId) })
  });
}

export function getBattle(battleId) {
  return request(`/api/battles/${battleId}`);
}

export function playBattleTurn(battleId, action, targetIndex = null) {
  return request(`/api/battles/${battleId}/turn`, {
    method: "POST",
    body: JSON.stringify({
      action,
      target_index: targetIndex
    })
  });
}
