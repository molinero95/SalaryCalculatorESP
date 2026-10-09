# Soldata garbiaren simulagailua

Espainiako nomina-kalkulagailua eta proposamen fiskalen simulagailua. Kalkulatu zure soldata garbia indarreko araudiarekin eta alderatu PFEZaren tarteetan, gutxienekoetan edo Gizarte Segurantzako kotizazioetan egindako edozein aldaketarekin.

**[Ireki simulagailua →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · [Català](README.ca.md) · **Euskara** · [Galego](README.gl.md) · [English](README.en.md)

## Ezaugarriak

- **Nomina osoa**: langilearen kotizazioak (continjentzia arruntak, langabezia, lanbide-heziketa, MEI eta elkartasun-kotizazioa), PFEZ atxikipena Erregelamenduaren prozedura orokorraren arabera, eta enpresaren kostua.
- **Alderaketa alboz albo** egungo agertokiaren eta simulazio baten artean, lerroz lerroko xehapenarekin eta aldeekin.
- **Tarte editagarriak**: gehitu, kendu edo aldatu tarteak; aplikatu autonomia-erkidegoetako txantiloiak edo deflaktatu muga guztiak batera.
- **Parametro guztiak pertsonalizagarriak**: gutxieneko pertsonal eta familiarrak, lan-etekinengatiko murrizketa, LGS kenkaria, kotizazio-oinarriak, enpresaren tasak…
- **Ordainsari malgua**: jatetxe-txartela, garraioa, osasun-asegurua, haurtzaindegia eta prestakuntza, salbuetsitako mugekin.
- **Pentsio-plana**: banakako plana eta enpresakoa, errentan lortuko den aurrezkiarekin.
- **Grafikoa soldata-mailaren arabera**, proposamen batek nori mesede edo kalte egiten dion ikusteko.
- **Gordetako agertokiak**, partekatzeko estekak eta JSON inportazioa/esportazioa.
- **Bost hizkuntza**: castellano, català, euskara, galego eta English.
- Mendekotasunik gabe, backendik gabe, cookierik gabe: dena nabigatzailean kalkulatzen da.
  Bisitak modu anonimoan zenbatzen dira [GoatCounter](https://www.goatcounter.com/) bidez.

## Nola kalkulatzen du

1. **Gizarte Segurantza**: kotizazio-oinarria = urteko gordina / 12, gutxieneko eta gehieneko oinarrien artean mugatuta. Gehieneko oinarritik gora elkartasun-kotizazioa aplikatzen da tarteka.
2. **Etekin garbia** = gordina − kotizazioak.
3. **Atxikipen-oinarria** = etekin garbia − beste gastu kengarri batzuk (2.000 €, gehi desgaitasunarenak) − lan-etekinengatiko murrizketa (PFEZL 20. art.).
4. **Kuota** = eskala(oinarria) − eskala(gutxieneko pertsonal eta familiarra) , atxikipenetik salbuetsitako gutxienekoaren gaineko gehiegizkoaren % 43ko mugarekin.
5. **Atxikipen-tasa** = kuota / gordina, bi hamartarretara biribilduta (gutxienez % 2 aldi baterako kontratuetan).
6. **14 ordainsarirekin**, Gizarte Segurantza 12 hilabetetan banatzen da eta aparteko ordainsariek PFEZ bakarrik dute.
7. **LGS kenkaria** ez da nominan aplikatzen: errentan itzuliko den zenbateko gisa erakusten da.
8. **Ordainsari malgua** PFEZetik salbuetsita dago bere mugetaraino, baina Gizarte Segurantzan kotizatzen du.

### Balio lehenetsiak (2026)

| Parametroa | Balioa |
| --- | --- |
| Atxikipen-eskala | % 19 · % 24 · % 30 · % 37 · % 45 · % 47 |
| Langilearen kotizazioa | % 4,70 CA + % 1,55 langabezia + % 0,10 LH + % 0,15 MEI |
| Gehieneko / gutxieneko oinarria | 5.101,20 € / 1.424,50 € hilean |
| Gutxieneko pertsonala | 5.550 € |
| Lan-etekinengatiko gehieneko murrizketa | 7.302 € |
| LGS kenkaria (errentan) | 590,89 € 17.094 €-raino; 20.048,45 €-an desagertzen da |
| Atxikipenetik salbuetsitako gutxienekoa | 15.876 € – 19.262 €, familia-egoeraren arabera |
| Pentsio-plana (murrizketa) | 1.500 € banakakoa + 8.500 € enplegukoa, gehienez etekin garbien % 30 |
| Ordainsari malgu salbuetsia | Jatetxea 11 €/egun · garraioa 1.500 €/urte · osasun-asegurua 500 €/pertsona |

> [!IMPORTANT]
> Tresna orientagarria da. Parametro batzuk (LGS kenkaria, atxikipenetik salbuetsitako gutxienekoa, autonomia-erkidegoetako eskalak) urtean zehar alda daitezke; denak interfazetik edo [`js/defaults.js`](js/defaults.js) fitxategian doi daitezke. Ez da lurralde foraletan aplikatzen (Euskadi eta Nafarroa).

### Iturriak

- [PFEZaren 35/2006 Legea](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) — 19., 20., 57-61., 63., 80 bis eta 101. art.
- [PFEZaren Erregelamendua (439/2007 ED)](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820) — 80-86. art. (atxikipen-prozedura).
- [5/2026 Errege Lege-dekretua](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-3810) — errenta baxuetarako kenkaria (PFEZL 61. XG).
- PJC/297/2026 Agindua — 2026ko kotizazio-oinarriak eta -tasak.
- [Zerga Agentzia — lan-etekinen gaineko atxikipenak](https://sede.agenciatributaria.gob.es/).
- [Gizarte Segurantza — kotizazio-oinarriak eta -tasak](https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537).

## Garapena

Ez da ezer konpilatu behar: HTML, CSS eta JavaScript (ES moduluak) hutsa da.

```bash
npm start   # zerbitzari lokala http://localhost:8000 helbidean
npm test    # kalkulu-motorraren testak (Node 18+)
```

```
├── index.html
├── css/styles.css
├── js/
│   ├── app.js          # egoera eta interfazearen orkestrazioa
│   ├── calc.js         # kalkulu-motorra (funtzio hutsak)
│   ├── defaults.js     # indarreko parametroak eta tarte-txantiloiak
│   ├── settings.js     # ezarpen- eta tarte-editorea
│   ├── results.js      # emaitza-txartelak eta xehapena
│   ├── chart.js        # SVG grafikoa
│   ├── format.js       # zenbakien formatua
│   ├── storage.js      # localStorage eta partekatzeko estekak
│   └── i18n/           # itzulpenak (bat hizkuntza bakoitzeko)
└── tests/
```

### GitHub Pages-en argitaratu

Biltegiaren **Settings → Pages** atalean, aukeratu _Deploy from a branch_, `main` adarra eta `/ (root)` karpeta.

### Lagundu

Eskertzen dira araudiaren zuzenketak eta itzulpenen berrikuspenak (batez ere euskara eta galegoa). Hizkuntza bat gehitzeko, sortu `js/i18n/<kodea>.js` `es.js`-ren gako berberekin, erregistratu `js/i18n/index.js`-en eta gehitu bere `README.<kodea>.md`.

## Lizentzia

[MIT](LICENSE) © 2026 Jaime Molinero Lacave
