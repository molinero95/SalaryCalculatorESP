# Simulador de salario neto

> [!WARNING]
> Este proxecto xerouse e desenvolveuse coa axuda da intelixencia artificial. O código, os datos fiscais, as traducións e os resultados poden conter erros ou non estar completamente actualizados. Os tests comproban determinados comportamentos, pero non garanten a exactitude fiscal. Usa os resultados como estimacións e contrástaos con fontes oficiais ou asesoramento profesional antes de tomar decisións.

Calculadora de nómina para España e simulador de propostas fiscais. Calcula o teu salario neto coa normativa vixente e compárao con calquera cambio nos tramos do IRPF, os mínimos ou as cotizacións á Seguridade Social.

**[Abrir o simulador →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · [Català](README.ca.md) · [Euskara](README.eu.md) · **Galego** · [English](README.en.md)

## Características

- **Nómina completa**: cotizacións do traballador (continxencias comúns, desemprego, formación, MEI e cotización de solidariedade), retención de IRPF segundo o procedemento xeral do Regulamento e custo para a empresa.
- **Comparación lado a lado** entre o escenario actual e unha simulación, con desagregación liña a liña e diferenzas.
- **Tramos editables**: engade, quita ou modifica tramos; aplica modelos autonómicos ou deflacta todos os límites dunha vez.
- **Todos os parámetros personalizables**: mínimos persoais e familiares, redución por rendementos do traballo, dedución SMI, bases de cotización, tipos da empresa…
- **Retribución flexible**: tarxeta restaurante, transporte, seguro médico, escola infantil e formación, cos seus límites exentos.
- **Plan de pensións**: plan individual e de empresa, co aforro estimado na renda.
- **Gráfico por nivel de salario** para ver a quen beneficia ou prexudica unha proposta.
- **Escenarios gardados**, ligazóns para compartir e importación/exportación en JSON.
- **Cinco idiomas**: castellano, català, euskara, galego e English.
- Sen dependencias, sen backend, sen cookies: todo se calcula no navegador.
  As visitas cóntanse de forma anónima con [GoatCounter](https://www.goatcounter.com/).

## Como calcula

1. **Seguridade Social**: base de cotización = bruto anual / 12, limitada entre a base mínima e a máxima. Por riba da base máxima aplícase a cotización de solidariedade por tramos.
2. **Rendemento neto** = bruto − cotizacións.
3. **Base de retención** = rendemento neto − outros gastos deducibles (2.000 €, máis os de discapacidade) − redución por rendementos do traballo (art. 20 LIRPF).
4. **Cota** = escala(base) − escala(mínimo persoal e familiar) , co límite do 43 % sobre o exceso do mínimo exento de retención, só ata 35.200 € brutos.
5. **Tipo de retención** = cota / bruto, truncado a dous decimais (mínimo 2 % en contratos temporais).
6. Con **14 pagas**, a Seguridade Social repártese en 12 meses e as pagas extra só soportan IRPF.
7. A **dedución SMI** non se aplica na nómina: amósase como devolución estimada na renda.
8. A **retribución flexible** está exenta de IRPF ata os seus límites, pero cotiza á Seguridade Social.

### Valores por defecto (2026)

| Parámetro                                   | Valor                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Escala de retención                         | 19 % · 24 % · 30 % · 37 % · 45 % · 47 %                                    |
| Cotización traballador                      | 4,70 % CC + 1,55 % desemprego + 0,10 % FP + 0,15 % MEI                     |
| Base máxima / mínima                        | 5.101,20 € / 1.424,40 € ao mes                                             |
| Mínimo persoal                              | 5.550 €                                                                    |
| Redución máxima por rendementos do traballo | 7.302 €                                                                    |
| Dedución SMI (na renda)                     | 590,89 € ata 17.094 €, anúlase en 20.048,45 €                              |
| Mínimo exento de retención                  | 15.876 € – 19.262 € segundo a situación familiar                           |
| Plan de pensións (redución)                 | 1.500 € individual + 8.500 € de emprego, máx. 30 % dos rendementos netos   |
| Retribución flexible exenta                 | Restaurante 11 €/día · transporte 1.500 €/ano · seguro médico 500 €/persoa |

> [!IMPORTANT]
> É unha ferramenta orientativa. Algúns parámetros (dedución SMI, mínimo exento de retención, escalas autonómicas) poden cambiar durante o ano; todos se poden axustar desde a interface ou en [`js/defaults.js`](js/defaults.js). Inclúe un modelo foral limitado para o País Vasco e Navarra; consulta [o alcance por residencia](docs/locations.md).

### Fontes

- [Lei 35/2006 do IRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) — arts. 19, 20, 57-61, 63, 80 bis e 101.
- [Regulamento do IRPF (RD 439/2007)](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820) — arts. 80-86 (procedemento de retención).
- [Real decreto lei 5/2026](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-3810) — dedución para rendas baixas (DA 61ª LIRPF).
- Orde PJC/297/2026 — bases e tipos de cotización para 2026.
- [Axencia Tributaria — retencións sobre rendementos do traballo](https://sede.agenciatributaria.gob.es/).
- [Seguridade Social — bases e tipos de cotización](https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537).

## Desenvolvemento

Non fai falta compilar nada: é HTML, CSS e JavaScript con módulos ES.

```bash
npm start   # servidor local en http://localhost:8000
npm test    # tests do motor de cálculo (Node 18+)
```

```
├── index.html
├── css/styles.css
├── js/
│   ├── app.js          # estado e orquestración da interface
│   ├── calc.js         # motor de cálculo (funcións puras)
│   ├── defaults.js     # parámetros vixentes e modelos de tramos
│   ├── settings.js     # editor de axustes e tramos
│   ├── results.js      # tarxetas de resultado e desagregación
│   ├── chart.js        # gráfico SVG
│   ├── format.js       # formato de números
│   ├── storage.js      # localStorage e ligazóns compartidas
│   └── i18n/           # traducións (unha por idioma)
└── tests/
```

### Publicar en GitHub Pages

En **Settings → Pages** do repositorio, escolle _Deploy from a branch_, rama `main` e cartafol `/ (root)`.

### Contribuír

Agradécense correccións da normativa e revisións das traducións (sobre todo euskara e galego). Para engadir un idioma, crea `js/i18n/<código>.js` coas mesmas claves que `es.js`, rexístrao en `js/i18n/index.js` e engade o seu `README.<código>.md`.

## Licenza

[MIT](LICENSE) © 2026 Jaime Molinero Lacave

## Simulacións e uso sen conexión

Ata cinco simulacións aparecen automaticamente nos gráficos e na táboa. As lapelas escollen cal editar. As propostas son modelos editables. A rebaixa estatal por fillo é configurable: Vox aplica 4 puntos, cun mínimo do 0 %, mantendo a parte autonómica. A retención é estimada. Tras unha visita con conexión, funciona sen conexión.

A base de retención inclúe unha redución adicional de 600 € por máis de dous descendentes. O cálculo anual separa as cotas estatal e autonómica e os seus mínimos. Consulta a [matriz de validación fiscal e as fontes oficiais](docs/fiscal-validation.md) para coñecer as probas e os supostos cubertos.

## Documentación para axentes de IA

[AGENTS.md](AGENTS.md) · [Contexto do proxecto](docs/AI_CONTEXT.md) · [Desenvolvemento](CONTRIBUTING.md) · [Decisións e próximos pasos](docs/ROADMAP.md)

[Scope of reviewed policy templates](docs/proposal-scope.md): annual assessment and payroll withholding are distinct; reload a saved proposal to adopt its reviewed template.

O selector único de residencia agrupa as cidades por comunidade/territorio. O modelo foral inclúe fillos elixibles confirmados e discapacidade propia; consulta [regras e límites](docs/foral-family.md).
