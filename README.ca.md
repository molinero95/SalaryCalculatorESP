# Simulador de salari net

Calculadora de nòmina per a Espanya i simulador de propostes fiscals. Calcula el teu salari net amb la normativa vigent i compara'l amb qualsevol canvi en els trams de l'IRPF, els mínims o les cotitzacions a la Seguretat Social.

**[Obrir el simulador →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · **Català** · [Euskara](README.eu.md) · [Galego](README.gl.md) · [English](README.en.md)

## Característiques

- **Nòmina completa**: cotitzacions del treballador (contingències comunes, atur, formació, MEI i cotització de solidaritat), retenció d'IRPF segons el procediment general del Reglament i cost per a l'empresa.
- **Comparació costat a costat** entre l'escenari actual i una simulació, amb desglossament línia a línia i diferències.
- **Trams editables**: afegeix, treu o modifica trams; aplica plantilles autonòmiques o deflacta tots els límits alhora.
- **Tots els paràmetres personalitzables**: mínims personals i familiars, reducció per rendiments del treball, deducció SMI, bases de cotització, tipus de l'empresa…
- **Gràfic per nivell de salari** per veure a qui beneficia o perjudica una proposta.
- **Escenaris desats**, enllaços per compartir i importació/exportació en JSON.
- **Cinc idiomes**: castellano, català, euskara, galego i English.
- Sense dependències, sense backend, sense galetes: tot es calcula al navegador.

## Com calcula

1. **Seguretat Social**: base de cotització = brut anual / 12, limitada entre la base mínima i la màxima. Per sobre de la base màxima s'aplica la cotització de solidaritat per trams.
2. **Rendiment net** = brut − cotitzacions.
3. **Base de retenció** = rendiment net − altres despeses deduïbles (2.000 €, més les de discapacitat) − reducció per rendiments del treball (art. 20 LIRPF).
4. **Quota** = escala(base) − escala(mínim personal i familiar) − deducció SMI, amb el límit del 43 % sobre l'excés del mínim exempt de retenció.
5. **Tipus de retenció** = quota / brut, arrodonit a dos decimals (mínim 2 % en contractes temporals).
6. Amb **14 pagues**, la Seguretat Social es reparteix en 12 mesos i les pagues extres només suporten IRPF.

### Valors per defecte (2026)

| Paràmetre | Valor |
| --- | --- |
| Escala de retenció | 19 % · 24 % · 30 % · 37 % · 45 % · 47 % |
| Cotització treballador | 4,70 % CC + 1,55 % atur + 0,10 % FP + 0,15 % MEI |
| Base màxima / mínima | 5.101,20 € / 1.424,50 € al mes |
| Mínim personal | 5.550 € |
| Reducció màxima per rendiments del treball | 7.302 € |
| Deducció SMI | 340 € |

> [!IMPORTANT]
> És una eina orientativa. Alguns paràmetres (deducció SMI, mínim exempt de retenció, escales autonòmiques) poden canviar durant l'any; tots es poden ajustar des de la interfície o a [`js/defaults.js`](js/defaults.js). No s'aplica als territoris forals (País Basc i Navarra).

### Fonts

- [Llei 35/2006 de l'IRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) — arts. 19, 20, 57-61, 63, 80 bis i 101.
- [Reglament de l'IRPF (RD 439/2007)](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820) — arts. 80-86 (procediment de retenció).
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
