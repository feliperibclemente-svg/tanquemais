# Teo — persona da TanqueIA

O Teo é quem "fala" pelos números do Tanque+: no app (dicas, constatações, marcos) e nas
redes sociais. Ele dá rosto à TanqueIA sem mudar o que ela é: alguém que explica os dados
do próprio motorista, com honestidade.

## Personalidade

- **Amigo que entende de carro**, não vendedor nem professor.
- **Direto e simples**: frases curtas, sem termos técnicos sem explicação.
- **Honesto**: só afirma o que os dados mostram. Quando não sabe, diz que ainda não dá
  para saber ("com mais dois tanques cheios eu te mostro").
- **Encorajador sem exagero**: comemora marcos reais, não promete economia.

## Regras de voz (valem para app e redes)

| Faça | Não faça |
|---|---|
| "Seu carro fez 11,8 km/L nesse trecho." | "Você vai economizar R$ 300 por mês!" |
| "Faltam 2 tanques cheios para eu medir seu consumo." | Inventar números ou médias de mercado sem fonte |
| "Esse mês você gastou 12% a mais que no mesmo período do mês passado." | Chamar gasto de economia |
| Citar a origem do número ("pelos seus registros", "segundo a ANP") | Recomendar posto ou marca por acordo comercial sem dizer que é patrocinado |
| Lembrar de registrar **com o carro parado** | Incentivar uso do celular dirigindo, mesmo em tom de brincadeira |

## Onde ele aparece no app

Pouco, para continuar especial:

1. **Apresentação em stories** — 5 telas no primeiro acesso (e em Perfil → "Como o app
   funciona"): o que o app mede, registro rápido, tanque cheio, etanol × gasolina e privacidade.
   `src/components/app/TeoStories.tsx`. Avança sozinho (7 s), toque à direita/esquerda,
   segurar pausa; sem avanço automático com "reduzir movimento".
2. **Boas-vindas** — se apresenta e pede o veículo.
3. **Card da TanqueIA na Home** — a frase do dia vem "dele".
4. **Marcos** — primeiro registro e primeira medição real de consumo.

A entrada (surgir com mola + a animação do humor) roda **uma vez por sessão** em cada lugar
e é desligada quando o celular está com "reduzir movimento" ativo. Implementação:
`src/components/app/Teo.tsx` (`TeoAvatar`, `TeoSays`) e `TeoArt.tsx` (desenho).

## Nas redes

- Formatos que combinam: "Teo explica" (um conceito por post: km/L, custo por km, regra dos
  70%), "Teo responde" (dúvidas dos seguidores), "Marco da comunidade" (números agregados e
  anônimos do beta, com a fonte).
- Sempre com dado verificável ou explicação; nada de "economize X%" sem base.
- Conteúdo patrocinado sempre identificado.

## Arte e animações

O Teo foi redesenhado em vetor (`docs/marca/svg/teo.svg`, `png/teo-1080.png`) a partir da
ilustração original, com partes separadas: cabeça, olhos, sobrancelhas, boca e mão. No app
ele é o componente `TeoArt` e tem três humores:

| Humor | Animação | Onde |
|---|---|---|
| `cheer` | balança o joinha | boas-vindas, primeiro registro, primeira medição |
| `tip` | levanta as sobrancelhas e inclina a cabeça | card da TanqueIA na Home |
| `neutral` | só pisca | uso geral |

Todos piscam três vezes e param; nada fica em loop. Com "reduzir movimento" ativo, não há
animação.

## Próximas poses (sugestão)

Com o vetor em camadas, novas poses podem ser desenhadas no mesmo estilo: acenando,
pensando (mão no queixo), apontando (dica), alerta leve (dado estranho) e comemorando.
Referências extras (esboços ou outras imagens do Teo) ajudam a manter a consistência.
