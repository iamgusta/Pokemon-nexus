
import random


# ==============================================
# POKEMON NEXUS - BATTLE ENGINE V1
# ==============================================

MAX_KNOCKOUTS = 5


def criar_lutador(row):
    hp = max(1, int(row["hp"]))

    return {
        "card_id": int(row["card_id"]),
        "pokemon_id": int(row["pokemon_id"]),
        "name": row["name"],
        "image_url": row["image_url"],
        "max_hp": hp,
        "hp": hp,
        "attack": max(1, int(row["attack"])),
        "defense": max(1, int(row["defense"]))
    }


def calcular_dano(atacante, defensor):
    ataque = atacante["attack"]
    defesa = defensor["defense"]

    base = (ataque * 0.45) - (defesa * 0.12)
    variacao = random.uniform(0.9, 1.1)

    return max(5, round(base * variacao))


def encontrar_proximo_time(time):
    for index, lutador in enumerate(time):
        if lutador["hp"] > 0:
            return index

    return None


def verificar_vencedor(estado):
    if estado["player_kos"] >= MAX_KNOCKOUTS:
        estado["status"] = "won"
        return

    if estado["cpu_kos"] >= MAX_KNOCKOUTS:
        estado["status"] = "lost"
        return

    if encontrar_proximo_time(estado["cpu_team"]) is None:
        estado["status"] = "won"
        return

    if encontrar_proximo_time(estado["player_team"]) is None:
        estado["status"] = "lost"


def atacar(estado, atacante_lado):
    if atacante_lado == "player":
        atacante_time = estado["player_team"]
        defensor_time = estado["cpu_team"]
        atacante_index = estado["player_active"]
        defensor_index = estado["cpu_active"]
        chave_kos = "player_kos"
        nome_lado = "Você"
    else:
        atacante_time = estado["cpu_team"]
        defensor_time = estado["player_team"]
        atacante_index = estado["cpu_active"]
        defensor_index = estado["player_active"]
        chave_kos = "cpu_kos"
        nome_lado = "CPU"

    atacante = atacante_time[atacante_index]
    defensor = defensor_time[defensor_index]

    dano = calcular_dano(atacante, defensor)

    defensor["hp"] = max(
        0,
        defensor["hp"] - dano
    )

    estado["log"].append(
        f"{nome_lado}: {atacante['name']} causou "
        f"{dano} de dano em {defensor['name']}."
    )

    if defensor["hp"] == 0:
        estado[chave_kos] += 1

        estado["log"].append(
            f"{defensor['name']} foi derrotado!"
        )

        verificar_vencedor(estado)

        if estado["status"] == "active":
            proximo = encontrar_proximo_time(
                defensor_time
            )

            if proximo is not None:
                if atacante_lado == "player":
                    estado["cpu_active"] = proximo
                else:
                    estado["player_active"] = proximo

                estado["log"].append(
                    f"{defensor_time[proximo]['name']} "
                    "entrou em batalha!"
                )


def criar_estado(player_team, cpu_team):
    if not player_team or not cpu_team:
        raise ValueError(
            "Os dois treinadores precisam de cartas."
        )

    return {
        "status": "active",
        "turn": 1,
        "player_team": player_team,
        "cpu_team": cpu_team,
        "player_active": 0,
        "cpu_active": 0,
        "player_kos": 0,
        "cpu_kos": 0,
        "log": ["A batalha começou!"]
    }


def executar_turno(estado, acao, target_index=None):
    if estado["status"] != "active":
        raise ValueError(
            "Esta batalha ja foi finalizada."
        )

    if acao == "attack":
        atacar(estado, "player")

    elif acao == "switch":
        if target_index is None:
            raise ValueError(
                "Informe o indice do Pokemon."
            )

        if (
            target_index < 0
            or target_index >= len(estado["player_team"])
        ):
            raise ValueError(
                "Pokemon selecionado invalido."
            )

        if target_index == estado["player_active"]:
            raise ValueError(
                "Este Pokemon ja esta ativo."
            )

        escolhido = estado["player_team"][target_index]

        if escolhido["hp"] <= 0:
            raise ValueError(
                "Nao e possivel usar um Pokemon derrotado."
            )

        estado["player_active"] = target_index

        estado["log"].append(
            f"Voce escolheu {escolhido['name']}."
        )

    else:
        raise ValueError("Acao invalida.")

    verificar_vencedor(estado)

    if estado["status"] == "active":
        atacar(estado, "cpu")

    verificar_vencedor(estado)

    estado["turn"] += 1

    # Mantemos os 30 eventos mais recentes.
    estado["log"] = estado["log"][-30:]

    if estado["status"] == "won":
        estado["log"].append(
            "Vitoria! Voce venceu a batalha!"
        )

    elif estado["status"] == "lost":
        estado["log"].append(
            "Derrota! A CPU venceu a batalha."
        )

    return estado
