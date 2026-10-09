# Simulador de salari net

> [!WARNING]
> Aquest projecte s’ha generat i desenvolupat amb ajuda d’intel·ligència artificial. El codi, les dades fiscals, les traduccions i els resultats poden contenir errors o no estar completament actualitzats. Els tests comproven determinats comportaments, però no garanteixen l’exactitud fiscal. Utilitza els resultats com a estimacions i contrasta’ls amb fonts oficials o assessorament professional abans de prendre decisions.

Calculadora de nòmina per a Espanya i simulador de propostes fiscals. Calcula el teu salari net amb la normativa vigent i compara'l amb qualsevol canvi en els trams de l'IRPF, els mínims o les cotitzacions a la Seguretat Social.

**[Obrir el simulador →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · **Català** · [Euskara](README.eu.md) · [Galego](README.gl.md) · [English](README.en.md)

## Característiques

- **Nòmina completa**: cotitzacions del treballador (contingències comunes, atur, formació, MEI i cotització de solidaritat), retenció d'IRPF segons el procediment general del Reglament i cost per a l'empresa.
- **Comparació costat a costat** entre l'escenari actual i una simulació, amb desglossament línia a línia i diferències.
- **Trams editables**: afegeix, treu o modifica trams; aplica plantilles autonòmiques o deflacta tots els límits alhora.
- **Tots els paràmetres personalitzables**: mínims personals i familiars, reducció per rendiments del treball, deducció SMI, bases de cotització, tipus de l'empresa…
- **Retribució flexible**: targeta restaurant, transport, assegurança mèdica, llar d'infants i formació, amb els seus límits exempts.
- **Pla de pensions**: pla individual i d'empresa, amb l'estalvi estimat a la renda.
- **Gràfic per nivell de salari** per veure a qui beneficia o perjudica una proposta.
- **Escenaris desats**, enllaços per compartir i importació/exportació en JSON.
- **Cinc idiomes**: castellano, català, euskara, galego i English.
- Sense dependències, sense backend, sense galetes: tot es calcula al navegador.
  Les visites es compten de manera anònima amb [GoatCounter](https://www.goatcounter.com/).

## Com calcula

1. **Seguretat Social**: base de cotització = brut anual / 12, limitada entre la base mínima i la màxima. Per sobre de la base màxima s'aplica la cotització de solidaritat per trams.
2. **Rendiment net** = brut − cotitzacions.
3. **Base de retenció** = rendiment net − altres despeses deduïbles (2.000 €, més les de discapacitat) − reducció per rendiments del treball (art. 20 LIRPF).
4. **Quota** = escala(base) − escala(mínim personal i familiar) , amb el límit del 43 % sobre l'excés del mínim exempt de retenció, només fins a 35.200 € bruts.
5. **Tipus de retenció** = quota / brut, truncat a dos decimals (mínim 2 % en contractes temporals).
6. Amb **14 pagues**, la Seguretat Social es reparteix en 12 mesos i les pagues extres només suporten IRPF.
7. La **deducció SMI** no s'aplica a la nòmina: es mostra com a devolució estimada a la renda.
8. La **retribució flexible** està exempta d'IRPF fins als seus límits, però cotitza a la Seguretat Social.

### Valors per defecte (2026)

| Paràmetre                                  | Valor                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| Escala de retenció                         | 19 % · 24 % · 30 % · 37 % · 45 % · 47 %                                        |
| Cotització treballador                     | 4,70 % CC + 1,55 % atur + 0,10 % FP + 0,15 % MEI                               |
| Base màxima / mínima                       | 5.101,20 € / 1.424,40 € al mes                                                 |
| Mínim personal                             | 5.550 €                                                                        |
| Reducció màxima per rendiments del treball | 7.302 €                                                                        |
| Deducció SMI (a la renda)                  | 590,89 € fins a 17.094 €, s'anul·la a 20.048,45 €                              |
| Mínim exempt de retenció                   | 15.876 € – 19.262 € segons la situació familiar                                |
| Pla de pensions (reducció)                 | 1.500 € individual + 8.500 € d'ocupació, màx. 30 % dels rendiments nets        |
| Retribució flexible exempta                | Restaurant 11 €/dia · transport 1.500 €/any · assegurança mèdica 500 €/persona |

> [!IMPORTANT]
> És una eina orientativa. Alguns paràmetres (deducció SMI, mínim exempt de retenció, escales autonòmiques) poden canviar durant l'any; tots es poden ajustar des de la interfície o a [`js/defaults.js`](js/defaults.js). No s'aplica als territoris forals (País Basc i Navarra).

### Fonts

- [Llei 35/2006 de l'IRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) — arts. 19, 20, 57-61, 63, 80 bis i 101.
- [Reglament de l'IRPF (RD 439/2007)](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820) — arts. 80-86 (procediment de retenció).
- [Reial decret llei 5/2026](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-3810) — deducció per a rendes baixes (DA 61a LIRPF).
- Ordre PJC/297/2026 — bases i tipus de cotització per al 2026.
- [Agència Tributària — retencions sobre rendiments del treball](https://sede.agenciatributaria.gob.es/).
- [Seguretat Social — bases i tipus de cotització](https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537).

## Desenvolupament

No cal compilar res: és HTML, CSS i JavaScript amb mòduls ES.

```bash
npm start   # servidor local a http://localhost:8000
npm test    # tests del motor de càlcul (Node 18+)
```

```
├── index.html
├── css/styles.css
├── js/
│   ├── app.js          # estat i orquestració de la interfície
│   ├── calc.js         # motor de càlcul (funcions pures)
│   ├── defaults.js     # paràmetres vigents i plantilles de trams
│   ├── settings.js     # editor de configuració i trams
│   ├── results.js      # targetes de resultat i desglossament
│   ├── chart.js        # gràfic SVG
│   ├── format.js       # format de nombres
│   ├── storage.js      # localStorage i enllaços compartits
│   └── i18n/           # traduccions (una per idioma)
└── tests/
```

### Publicar a GitHub Pages

A **Settings → Pages** del repositori, tria _Deploy from a branch_, branca `main` i carpeta `/ (root)`.

### Contribuir

S'agraeixen correccions de la normativa i revisions de les traduccions (sobretot euskara i galego). Per afegir un idioma, crea `js/i18n/<codi>.js` amb les mateixes claus que `es.js`, registra'l a `js/i18n/index.js` i afegeix-ne el `README.<codi>.md`.

## Llicència

[MIT](LICENSE) © 2026 Jaime Molinero Lacave

## Simulacions i ús sense connexió

Fins a cinc simulacions apareixen automàticament als gràfics i a la taula. Les pestanyes trien quina edites. Les propostes són plantilles editables. La rebaixa estatal per fill és configurable: Vox aplica 4 punts, amb mínim 0 %, sense reduir la part autonòmica. La retenció és estimada. Després de visitar-la amb connexió, funciona sense connexió.

La base de retenció inclou una reducció addicional de 600 € per més de dos descendents. El càlcul anual separa les quotes estatal i autonòmica i els seus mínims. Consulta la [matriu de validació fiscal i les fonts oficials](docs/fiscal-validation.md) per conèixer les proves i els supòsits coberts.

## Documentació per a agents d’IA

[AGENTS.md](AGENTS.md) · [Context del projecte](docs/AI_CONTEXT.md) · [Desenvolupament](CONTRIBUTING.md) · [Decisions i pròxims passos](docs/ROADMAP.md)

[Scope of reviewed policy templates](docs/proposal-scope.md): annual assessment and payroll withholding are distinct; reload a saved proposal to adopt its reviewed template.
