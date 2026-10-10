# Soldata garbiaren simulagailua

> [!WARNING]
> Proiektu hau adimen artifizialaren laguntzaz sortu eta garatu da. Kodeak, zerga-datuek, itzulpenek eta emaitzek akatsak izan ditzakete edo guztiz eguneratuta ez egon. Test automatizatuek portaera jakin batzuk egiaztatzen dituzte, baina ez dute zerga-zehaztasuna bermatzen. Erabili emaitzak estimazio gisa eta egiaztatu iturri ofizialekin edo aholkularitza profesionalarekin erabakiak hartu aurretik.

Espainiako nomina-kalkulagailua eta proposamen fiskalen simulagailua. Kalkulatu zure soldata garbia indarreko araudiarekin eta alderatu PFEZaren tarteetan, gutxienekoetan edo Gizarte Segurantzako kotizazioetan egindako edozein aldaketarekin.

**[Ireki simulagailua →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · [Català](README.ca.md) · **Euskara** · [Galego](README.gl.md) · [English](README.en.md)

## Erabilgarri dauden funtzioak

- **Zure soldata:** nominaren, PFEZ atxikipenaren, kotizazioen eta enpresaren kostuaren estimazioa; 12/14 ordainsari, urteko nomina garbia eta errenta-aitorpenaren ondorengo estimazioa.
- **Egoitza eta familia:** 17 autonomia-erkidego, euskal lurralde historikoa eta aukerako hiria; adina, seme-alabak, aurreko ahaideak, desgaitasuna eta baldintzen baieztapenak.
- **Ordainsari malgua eta pentsioak:** jatetxea, garraioa, osasun-asegurua, haur-eskolak, prestakuntza eta norberaren/enpresaren ekarpenak, dokumentatutako irismenaren barruan.
- **Simulazioak:** parametro eta eskala editagarriak, bost agertoki arte, txartelak, taula, banakapena eta soldataren araberako grafikoak; araubide erkideko deflaktazioa.
- **Proposamen politikoak:** txantiloi partzialak, iturri, data eta hipotesiekin.
- **Partekatu eta jarraitu:** arauak partekatzeko estekak, datu pertsonalik gabe, eta sarreren/fitxen tokiko berreskuratzea.
- **Konexiorik gabe eta instalazioa:** lehen karga osoa linean egin ondoren, lineaz kanpoko erabilera eta instalazioa nabigatzaile bateragarrietan.
- **Bost hizkuntza:** gaztelania, katalana, euskara, galegoa eta ingelesa.

## Nomina, errenta eta irismena

Atxikipena aurrerakin bat da. Urteko estimazioak estatuko eta autonomia-erkidegoko kuotak eta gutxienekoak bereizten ditu, eta ordaindu edo itzultzeko saldoa kalkulatzen du; itzulketa ez dago bermatuta. Araubide erkidean egoitza aldatzeak urteko errenta alda dezake, nomina aldatu gabe.

Euskal lurraldeek eta Nafarroak beren arauak erabiltzen dituzte onartutako profiletarako. Modelatu gabeko proposamen edo aldaketa fiskalek abisua erakusten dute, ez emaitza simulatu berdina. Soldata-profil nagusiak ordaintzaile bakarra eta urte osoa suposatzen ditu. Ez dago hainbat ordaintzaile, autonomo, jarduera anitz edo baterako aitorpenaren eredu osorik; foru-profiletako urteko errenta gehigarri batzuek ez dute autonomoaren kalkulagailu osoa osatzen. [Egoitza](docs/locations.md) · [Foru-irismena](docs/foral-payroll.md) · [Baliozkotzea](docs/fiscal-validation.md).

## Proposamenak eta etxebizitza

| Kalkula daitekeen txantiloia | Irismen partziala                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| VOX 2024                     | Urteko eta atxikipeneko eskala bereiziak; seme-alabako estatuko tasa-murrizketa.           |
| Sumar 2023                   | Urteko goiko tasa marjinala; egungo atxikipena.                                            |
| Podemos 2019                 | Urteko lehen tarte historikoa; egungo atxikipena eta dokumentatutako gainerako hipotesiak. |

PP, PSOE, Podemos 2025 eta Ciudadanos informazio gisa agertzen dira egiaztatutako datuak falta direnean. Ez dira eredu osoak edo katalogo exhaustiboa. Gordetako simulazioak ez dira berridazten: aplikatu berriro txantiloia berrikusitako arauak hartzeko. [Iturriak eta irismena](docs/proposal-scope.md) · [Katalogoa](data/proposals.json).

**Etxebizitza:** estatuko araubide iragankorrak (2015 aurreko alokairua eta 2013 aurreko erosketa) eta profil orokorren alokairuagatiko kenkari autonomikoa 11 erkidegotan kalkulatzen dira; gainerako arauak aplikatu gabe gisa azaltzen dira. [Plana](https://github.com/molinero95/SalaryCalculatorESP/pull/22) · [Backlog](docs/BACKLOG.md).

## Eguneratzea eta alertak

Katalogoak zerga-ekitaldia, iturriak eta egiaztapen-datak jasotzen ditu. Asteko (astelehena) eta eskuzko monitoreak URL ezagunak egiaztatzen ditu: aldaketak, eskuraezinak diren iturriak eta berrikusi beharreko parametroak. Kasuek historia gordetzen dute eta frogadun berrikuspena behar dute; iturria berreskuratzeak edo hatz-marka onartzeak ez ditu ixten.

Txostenak **GitHub Actions → Template source review** atalean, deskargatzeko fitxategietan eta `monitor-state` adarrean daude. GitHub-en jakinarazpenak kontuaren ezarpenen araberakoak dira; ez dago mezu dedikaturik edo kalkulagailuko mantentze-alertarik. BOEko 14 eguneko titulu-bilaketak hautagaiak aurkitzen ditu; AEAT indizeak, jatorrizko autonomia/foru-buletinak, alderdien indizeak eta eguneratze fiskal automatikoak egiteko daude. [Monitorea](docs/template-maintenance.md) · [Iturri fiskalak](data/fiscal-sources.json).

## Pribatutasuna eta garapena

Kalkuluak eta datu pertsonalak nabigatzailean daude, tokiko saioarekin. Estekek arauak partekatzen dituzte, ez soldata edo familia. HTML, CSS eta JavaScript modulu estatikoak, kalkulu-backendik eta aplikazioaren kanpoko exekuzio-mendekotasunik gabe. [GoatCounter](https://www.goatcounter.com/) bisita anonimoak zenbatzen ditu eta kanpoko eskaerak egiten ditu.

Node.js 22, npm eta Python 3; aplikazioa konpilatu beharrik gabe:

```bash
npm ci
npm start
npm test
npm run lint
npm run templates:check
npx playwright install --with-deps chromium
npm run test:e2e
```

CI-k unitateak, katalogoa, nabigatzailea/irisgarritasuna eta macOSeko hautatutako irudiak egiaztatzen ditu. Testek ez dute zuzentasun fiskala ziurtatzen. Katalogoa aldatu ondoren, exekutatu `npm run templates:build`; cacheko app-fitxategiak aldatzean, berrikusi `sw.js` bertsioa. GitHub Pages-ek `main` adarreko erro-karpetatik argitaratzen du. [Garapena](CONTRIBUTING.md) · [Arkitektura](docs/architecture.md).

## Backlog: hurrengo urratsak

[Backlog osoak](docs/BACKLOG.md) lehentasunak, egoera, arduradunak, mendekotasunak eta onarpen-irizpideak jasotzen ditu. Alerta iraunkorrak ezarrita daude; egiteko daude:

- **P0 — eguneratze fiskala:** argitalpen ofizial berriak aurkitzea, ekitaldia/egiaztapena erakustea eta berrikuspen-epeak eta monitorearen egoera indartzea.
- **P1 — irismena eta probak:** etxebizitza faseka (Claude), ekitaldi-aldaketa, cache-eguneratzeak, trazabilitatea eta egiaztatutako proposamen gehiago.
- **P1 — lan-profilak:** hainbat ordaintzaile, enpresa-aldaketak, urtearen zati bateko soldatapeko lana, autonomoak eta jarduera anitzak.
- **P2 — bilakaera:** aurkezpen/esteken refaktorizazioa, ikusizko probak, berrikusitako zirriborro fiskalak, foru-irismen zabalagoa, eskaintzen konparazioa eta baimen/bajen estimazioak.

Egiteko zeregin bat ez da erabilgarri dagoen funtzioa; begiratu egoera eta ezarpenaren PRa.

## Dokumentazioa eta ekarpenak

[AGENTS.md](AGENTS.md) · [Testuingurua](docs/AI_CONTEXT.md) · [Erabakiak](docs/ROADMAP.md) · [Backlog](docs/BACKLOG.md).

Aldaketa fiskalek jatorrizko iturriak, aldia, baldintzak eta egiaztatutako adibide independenteak behar dituzte. Interfazeak bost hizkuntzak eta lineaz kanpoko erabilera mantentzen ditu.

## Lizentzia

[MIT](LICENSE) © 2026 Jaime Molinero Lacave
