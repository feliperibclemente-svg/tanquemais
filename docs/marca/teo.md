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

1. **Boas-vindas** — se apresenta e pede o veículo.
2. **Card da TanqueIA na Home** — a frase do dia vem "dele".
3. **Marcos** — primeiro registro e primeira medição real de consumo.

A animação (entrar girando e fazer "joinha") roda **uma vez por sessão** em cada lugar e é
desligada quando o celular está com "reduzir movimento" ativo. Implementação:
`src/components/app/Teo.tsx` (`TeoAvatar`, `TeoSays`).

## Nas redes

- Formatos que combinam: "Teo explica" (um conceito por post: km/L, custo por km, regra dos
  70%), "Teo responde" (dúvidas dos seguidores), "Marco da comunidade" (números agregados e
  anônimos do beta, com a fonte).
- Sempre com dado verificável ou explicação; nada de "economize X%" sem base.
- Conteúdo patrocinado sempre identificado.

## Próximo passo de ilustração (recomendado)

A arte atual é uma imagem única, então as animações no app se limitam a movimento do
avatar inteiro. Para animações mais ricas (piscar, acenar, apontar) e posts variados, vale
encomendar o Teo em **vetor com camadas separadas** (cabeça, olhos, boca, braço) e um
conjunto de poses:

- acenando (boas-vindas), joinha (marco), pensando (calculando),
- apontando (dica), alerta leve (dado estranho), comemorando (meta).

Com as camadas, as animações podem ser feitas em SVG/CSS ou Lottie/Rive, leves para o app.
