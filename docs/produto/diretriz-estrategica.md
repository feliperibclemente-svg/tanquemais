# Diretriz estratégica de produto: foco e simplicidade

> Documento do Felipe (20/10/2026). Referência para priorizar, decidir escopo e avaliar
> cada mudança. Os princípios de "app popular" (`principios.md`) valem a serviço desta diretriz.

TANQUE MAIS — DIRETRIZ ESTRATÉGICA DE PRODUTO, FOCO E SIMPLICIDADE

1. PRINCÍPIO FUNDAMENTAL

O Tanque Mais tem diversas possibilidades de evolução, mas nosso objetivo não é explorar todas ao mesmo tempo.

Queremos construir um produto que resolva muito bem um problema específico, seja fácil de entender e entregue valor real ao usuário.

Preferimos fazer poucas coisas muito bem feitas a oferecer muitas funcionalidades sem profundidade, clareza ou utilidade comprovada.

Essa diretriz deve orientar todas as análises, recomendações, decisões de produto, alterações de interface e implementações futuras.

2. ESSÊNCIA DO TANQUE MAIS

A proposta central do Tanque Mais é ajudar as pessoas a entender melhor o consumo real de seus veículos, visualizar seus gastos com combustível e tomar decisões que contribuam para a economia.

O usuário deve conseguir compreender rapidamente:

* O que precisa registrar.
* Quanto seu veículo está consumindo.
* Quanto está gastando com combustível.
* O que os indicadores apresentados significam.
* Como essas informações podem ajudá-lo a economizar.

Toda evolução deve preservar essa essência.

O Tanque Mais não deve se transformar prematuramente em um aplicativo financeiro genérico, uma rede social automotiva, uma plataforma de serviços ou um sistema completo de gestão de frotas.

Essas possibilidades podem ser estudadas, mas não devem competir automaticamente com a proposta principal.

3. PRIORIDADE ATUAL: APERFEIÇOAR O QUE JÁ EXISTE

Antes de propor novas funcionalidades, avalie como podemos melhorar o produto atual.

Dê preferência a:

* Correção de bugs e inconsistências.
* Confiabilidade dos cálculos de consumo e custos.
* Facilidade e rapidez para registrar abastecimentos.
* Clareza dos indicadores e textos.
* Melhor organização das informações.
* Navegação intuitiva.
* Experiência consistente em celulares.
* Desempenho, acessibilidade e estabilidade.
* Redução de etapas desnecessárias.
* Maior compreensão do valor entregue pelo aplicativo.

Não presuma que uma nova funcionalidade seja mais importante do que aperfeiçoar uma funcionalidade existente.

Quando uma melhoria simples resolver melhor o problema do que a criação de um novo recurso, prefira a melhoria simples.

4. SIMPLICIDADE COMO REQUISITO DE PRODUTO

A simplicidade não significa oferecer um produto limitado ou superficial. Significa apresentar a complexidade necessária de uma maneira que o usuário consiga compreender e utilizar.

Ao avaliar qualquer alteração, pergunte:

1. Essa mudança torna o aplicativo mais útil?
2. O usuário entenderá facilmente para que ela serve?
3. Ela reduz esforço ou adiciona etapas?
4. A informação apresentada é confiável e compreensível?
5. O mesmo resultado poderia ser alcançado de uma forma mais simples?
6. Essa funcionalidade merece espaço na interface principal?
7. A mudança torna o produto mais coerente ou dispersa sua proposta?

Evite criar telas, menus, indicadores, configurações e fluxos apenas porque são tecnicamente possíveis.

Não apresente todas as informações disponíveis de uma vez. Priorize aquilo que é mais relevante para a decisão do usuário e deixe detalhes adicionais em segundo plano quando fizer sentido.

Cada elemento da interface deve ter uma razão clara para existir.

5. AVALIAÇÃO DE NOVAS OPORTUNIDADES

O Tanque Mais pode explorar diferentes públicos e oportunidades, incluindo:

* Cidadãos que utilizam seus veículos no cotidiano.
* Motoristas de aplicativo.
* Entregadores e profissionais que dependem do veículo para gerar renda.
* Comunidade e compartilhamento de experiências.
* Serviços automotivos.
* Gestão de frotas empresariais.

Entretanto, a existência de uma oportunidade não significa que devemos desenvolvê-la imediatamente.

Para cada nova ideia:

* Identifique o problema real que ela pretende resolver.
* Determine qual público se beneficiaria.
* Verifique se o problema já é atendido pelo produto atual.
* Avalie se a ideia fortalece ou desvia a proposta central.
* Estime complexidade, custo de manutenção e dependências.
* Identifique os riscos de tornar o aplicativo mais confuso.
* Investigue se é possível validar a demanda antes de programar.
* Compare o benefício potencial com as melhorias pendentes no produto atual.

Se a oportunidade for promissora, mas não prioritária, registre-a para uma etapa futura em vez de descartá-la ou implementá-la imediatamente.

6. PÚBLICOS DIFERENTES, UMA EXPERIÊNCIA COERENTE

O Tanque Mais deve continuar sendo útil para o cidadão comum, mesmo que decidamos priorizar comercialmente um segmento específico, como trabalhadores que dependem do veículo para gerar renda.

Não devemos criar experiências completamente diferentes para cada público sem necessidade comprovada.

Sempre que possível, priorize uma base comum de funcionalidades que resolva o problema central e permita evoluções específicas somente quando elas demonstrarem valor.

Uma eventual ferramenta de controle de receitas e custos profissionais, por exemplo, deve ser avaliada como uma expansão possível da proposta de economia, e não como justificativa automática para reconstruir o aplicativo inteiro.

7. TRÊS CATEGORIAS PARA ORGANIZAR O DESENVOLVIMENTO

Classifique as oportunidades em três grupos:

A. Melhorar agora

Bugs, inconsistências, problemas de usabilidade e aperfeiçoamentos de funcionalidades existentes.

B. Validar primeiro

Novas funcionalidades e mudanças de posicionamento que podem gerar valor, mas ainda precisam ser testadas com usuários ou sustentadas por evidências.

C. Explorar depois

Oportunidades maiores, como integrações complexas, serviços automotivos, funcionalidades avançadas para profissionais e gestão de frotas.

A classificação deve considerar o estágio atual do beta, os recursos disponíveis, o impacto no usuário e a relação com a proposta principal.

Não transforme essa estrutura em burocracia. Ela deve facilitar decisões, não atrasar melhorias simples.

8. REGRAS PARA O CLAUDE DURANTE A ANÁLISE E IMPLEMENTAÇÃO

Sempre que receber uma solicitação relacionada ao Tanque Mais:

1. Inspecione o código e o comportamento existente antes de sugerir mudanças.
2. Identifique se a solicitação é uma correção, uma melhoria ou uma nova funcionalidade.
3. Considere primeiro as alternativas mais simples.
4. Preserve funcionalidades existentes que estejam funcionando corretamente.
5. Evite refatorações amplas quando uma alteração localizada for suficiente.
6. Não invente dados, resultados, integrações ou capacidades que não existam.
7. Não implemente funcionalidades adicionais que não foram solicitadas apenas porque parecem interessantes.
8. Não confunda uma interface visualmente atraente com uma experiência fácil de utilizar.
9. Explique os impactos relevantes de alterações estruturais antes de executá-las.
10. Quando houver várias possibilidades, recomende uma abordagem principal e justifique-a, em vez de apresentar uma lista interminável de recursos para desenvolver.

Se uma solicitação puder prejudicar a clareza, aumentar desnecessariamente a complexidade ou afastar o produto de sua essência, sinalize o risco e apresente uma alternativa mais simples.

Para correções pequenas, seguras e claramente solicitadas, não crie etapas de aprovação desnecessárias.

Para mudanças estruturais, integrações externas ou funcionalidades que alterem significativamente a experiência, apresente primeiro a proposta e seus impactos.

9. COMO AVALIAR SE ESTAMOS EVOLUINDO

Não avalie o progresso apenas pela quantidade de funcionalidades implementadas.

Considere também:

* O usuário consegue começar a utilizar o aplicativo sem dificuldade?
* Consegue registrar um abastecimento com facilidade?
* Confia nos cálculos e compreende os resultados?
* Entende rapidamente o benefício do Tanque Mais?
* Volta a utilizar o aplicativo?
* Percebe valor suficiente para recomendá-lo?
* As novas funcionalidades preservam a clareza da experiência?

Sempre que possível, utilize feedback e comportamento real dos usuários para orientar as decisões.

Não trate hipóteses como fatos comprovados.

10. DIRETRIZ FINAL

O Tanque Mais deve crescer por meio de melhorias consistentes, validação de necessidades reais e expansão gradual.

Nosso objetivo não é construir o aplicativo que faz tudo relacionado a veículos.

Nosso objetivo é construir um aplicativo que as pessoas entendam, utilizem e considerem genuinamente útil para acompanhar o consumo e os gastos com combustível.

Antes de perguntar “o que mais podemos adicionar?”, pergunte “como podemos fazer aquilo que já entregamos funcionar melhor para o usuário?”.

Use esta diretriz como referência estratégica nas próximas análises e recomendações do projeto. Ela não substitui as instruções específicas de cada tarefa, mas deve ajudar a orientar as decisões quando houver dúvidas sobre prioridades, escopo ou complexidade.