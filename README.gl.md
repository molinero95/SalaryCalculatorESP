# Simulador de salario neto

> [!WARNING]
> Este proxecto xerouse e desenvolveuse coa axuda da intelixencia artificial. O código, os datos fiscais, as traducións e os resultados poden conter erros ou non estar completamente actualizados. Os tests comproban determinados comportamentos, pero non garanten a exactitude fiscal. Usa os resultados como estimacións e contrástaos con fontes oficiais ou asesoramento profesional antes de tomar decisións.

Calculadora de nómina para España e simulador de propostas fiscais. Calcula o teu salario neto coa normativa vixente e compárao con calquera cambio nos tramos do IRPF, os mínimos ou as cotizacións á Seguridade Social.

**[Abrir o simulador →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · [Català](README.ca.md) · [Euskara](README.eu.md) · **Galego** · [English](README.en.md)

## Funcións dispoñibles

- **O teu salario:** estimación de nómina, retención do IRPF, cotizacións e custo empresarial; 12/14 pagas, neto anual de nómina e neto tras a renda estimada.
- **Residencia e familia:** 17 comunidades, territorio histórico vasco e cidade opcional; idade, fillos, ascendentes, discapacidade e confirmacións de elixibilidade dispoñibles.
- **Retribución flexible e pensións:** restaurante, transporte, seguro médico, gardaría, formación e achegas individuais/da empresa dentro do alcance documentado.
- **Simulacións:** parámetros e escalas editables, ata cinco escenarios, tarxetas, táboa, desglose e gráficos por salario; deflactación no réxime común.
- **Propostas políticas:** modelos parciais con fontes, datas e supostos.
- **Compartir e continuar:** ligazóns con regras sen datos persoais e restauración local de entradas e lapelas.
- **Sen conexión e instalación:** tras unha primeira carga completa con conexión, uso sen conexión e instalación se o navegador o permite.
- **Cinco idiomas:** castelán, catalán, éuscaro, galego e inglés.

## Nómina, renda e alcance

A retención é un pagamento a conta. A renda estimada separa cotas e mínimos estatais/autonómicos e calcula un saldo a pagar ou devolver; non garante unha devolución. Cambiar de comunidade no réxime común pode modificar a renda sen modificar a nómina.

País Vasco e Navarra teñen regras propias para os perfís soportados. As propostas ou edicións fiscais non modeladas mostran un aviso, non un resultado simulado idéntico. O perfil salarial principal supón un pagador e un ano completo. Non hai modelos completos de varios pagadores, autónomos, pluriactividade ou declaración conxunta; determinadas rendas adicionais forais non equivalen a un modelo completo de autónomo. [Residencia](docs/locations.md) · [Alcance foral](docs/foral-payroll.md) · [Validación](docs/fiscal-validation.md).

## Propostas e vivenda

| Modelo calculable | Alcance parcial                                                                  |
| ----------------- | -------------------------------------------------------------------------------- |
| VOX 2024          | Escalas anual e de retención separadas; redución estatal por fillo.              |
| Sumar 2023        | Tipo marxinal superior anual; retención actual.                                  |
| Podemos 2019      | Primeiro tramo anual histórico; retención actual e outros supostos documentados. |

PP, PSOE, Podemos 2025 e Ciudadanos teñen entradas informativas cando faltan datos verificados. Non son modelos completos nin un catálogo exhaustivo. As simulacións antigas non se reescriben: aplica de novo a proposta para adoptar as regras revisadas. [Fontes e alcance](docs/proposal-scope.md) · [Catálogo](data/proposals.json).

**Vivenda:** calcúlanse os réximes transitorios estatais (alugueiro anterior a 2015 e compra anterior a 2013) e a dedución autonómica por alugueiro dos perfís xerais en 10 comunidades; o resto de regras explícanse como omitidas. [Plan](https://github.com/molinero95/SalaryCalculatorESP/pull/22) · [Backlog](docs/BACKLOG.md).

**Estado do desenvolvemento:** as fases 1 e 2 están en revisión nas PR [#26](https://github.com/molinero95/SalaryCalculatorESP/pull/26) e [#29](https://github.com/molinero95/SalaryCalculatorESP/pull/29), aínda sen fusionar. As referencias visuais de macOS xa pasan en CI. Para a fase 3 están preparados os [datos de poboación do INE de 2025](docs/housing-municipal-data.md), con 8.132 municipios e códigos oficiais; quedan as listas autonómicas de despoboamento e verificar a data de poboación que esixe cada regra. Estes datos non activan deducións municipais.

## Actualización e alertas

O catálogo rexistra exercicio, fontes e datas de verificación. O monitor semanal (luns) e manual comproba URLs coñecidas: cambios, fontes inaccesibles e parámetros pendentes de revisión. Os casos persisten con historial e esixen revisión con evidencia; recuperar a fonte ou aceptar a pegada non os pecha.

Informes en **GitHub Actions → Template source review**, ficheiros descargables e rama `monitor-state`. Os avisos de GitHub dependen dos axustes da conta; non hai mensaxes dedicadas nin alertas de mantemento na calculadora. Unha busca de títulos do BOE de 14 días detecta candidatos; os índices da AEAT, boletíns autonómicos/forais orixinais, partidos e actualizacións fiscais automáticas están pendentes. [Monitor](docs/template-maintenance.md) · [Fontes fiscais](data/fiscal-sources.json).

## Privacidade e desenvolvemento

Cálculos e datos persoais no navegador, con sesión local. As ligazóns só comparten regras, non salario nin familia. HTML, CSS e módulos JavaScript estáticos, sen backend de cálculo nin dependencias externas de execución da aplicación. [GoatCounter](https://www.goatcounter.com/) conta visitas anónimas e fai peticións externas.

Node.js 22, npm e Python 3; sen compilación da aplicación:

```bash
npm ci
npm start
npm test
npm run lint
npm run templates:check
npx playwright install --with-deps chromium
npm run test:e2e
```

CI comproba unidades, catálogo, navegador/accesibilidade e capturas seleccionadas en macOS. Os tests non certifican exactitude fiscal. Xera o catálogo con `npm run templates:build` tras modificalo; revisa a versión da caché de `sw.js` cando cambien ficheiros da app. GitHub Pages publica desde `main`, cartafol raíz. [Desenvolvemento](CONTRIBUTING.md) · [Arquitectura](docs/architecture.md).

## Backlog: próximos pasos

O [backlog completo](docs/BACKLOG.md) rexistra prioridades, estado, responsables, dependencias e criterios de aceptación. As alertas persistentes están implementadas; queda pendente:

- **P0 — actualidade fiscal:** descubrir publicacións oficiais novas, mostrar exercicio/verificación e reforzar prazos e saúde do monitor.
- **P1 — alcance e probas:** vivenda por fases (Claude), cambio de exercicio, actualizacións de caché, trazabilidade e máis propostas verificadas.
- **P1 — perfís laborais:** varios pagadores, cambios de empresa, traballo asalariado parcial, autónomos e pluriactividade.
- **P2 — evolución:** refactor de presentación/ligazóns, probas visuais, borradores fiscais revisados, ampliacións forais, comparación de ofertas e estimacións de permisos/baixas.

Unha tarefa pendente non é unha función dispoñible; consulta o estado e a PR de implementación.

## Documentación e contribucións

[AGENTS.md](AGENTS.md) · [Contexto](docs/AI_CONTEXT.md) · [Decisións](docs/ROADMAP.md) · [Backlog](docs/BACKLOG.md).

As correccións fiscais requiren fontes orixinais, período, elixibilidade e exemplos independentes probados. A interface mantén cinco idiomas e uso sen conexión.

## Licenza

[MIT](LICENSE) © 2026 Jaime Molinero Lacave
