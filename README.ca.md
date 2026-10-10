# Simulador de salari net

> [!WARNING]
> Aquest projecte s’ha generat i desenvolupat amb ajuda d’intel·ligència artificial. El codi, les dades fiscals, les traduccions i els resultats poden contenir errors o no estar completament actualitzats. Els tests comproven determinats comportaments, però no garanteixen l’exactitud fiscal. Utilitza els resultats com a estimacions i contrasta’ls amb fonts oficials o assessorament professional abans de prendre decisions.

Calculadora de nòmina per a Espanya i simulador de propostes fiscals. Calcula el teu salari net amb la normativa vigent i compara'l amb qualsevol canvi en els trams de l'IRPF, els mínims o les cotitzacions a la Seguretat Social.

**[Obrir el simulador →](https://molinero95.github.io/SalaryCalculatorESP/)**

[Castellano](README.md) · **Català** · [Euskara](README.eu.md) · [Galego](README.gl.md) · [English](README.en.md)

## Funcions disponibles

- **El teu salari:** estimació de nòmina, retenció d’IRPF, cotitzacions i cost empresarial; 12/14 pagues, net anual de nòmina i net després de la renda estimada.
- **Residència i família:** 17 comunitats, territori històric basc i ciutat opcional; edat, fills, ascendents, discapacitat i confirmacions d’elegibilitat disponibles.
- **Retribució flexible i pensions:** restaurant, transport, assegurança mèdica, escola bressol, formació i aportacions individuals/d’empresa dins de l’abast documentat.
- **Simulacions:** paràmetres i escales editables, fins a cinc escenaris, targetes, taula, desglossament i gràfics per salari; deflactació en règim comú.
- **Propostes polítiques:** plantilles parcials amb fonts, dates i supòsits.
- **Compartir i reprendre:** enllaços amb regles sense dades personals i restauració local d’entrades i pestanyes.
- **Sense connexió i instal·lació:** després d’una primera càrrega completa amb connexió, ús fora de línia i instal·lació si el navegador ho permet.
- **Cinc idiomes:** castellà, català, basc, gallec i anglès.

## Nòmina, renda i abast

La retenció és un pagament a compte. La renda estimada separa quotes i mínims estatals/autonòmics i calcula un saldo a pagar o retornar; no garanteix una devolució. Canviar de comunitat en règim comú pot modificar la renda sense modificar la nòmina.

País Basc i Navarra tenen regles pròpies per als perfils suportats. Les propostes o edicions fiscals no modelades mostren un avís, no un resultat simulat idèntic. El perfil salarial principal assumeix un pagador i un any complet. No hi ha models complets de diversos pagadors, autònoms, pluriactivitat o declaració conjunta; determinades rendes addicionals forals no equivalen a un model complet d’autònom. [Residència](docs/locations.md) · [Abast foral](docs/foral-payroll.md) · [Validació](docs/fiscal-validation.md).

## Propostes i habitatge

| Plantilla calculable | Abast parcial                                                              |
| -------------------- | -------------------------------------------------------------------------- |
| VOX 2024             | Escales anual i de retenció separades; reducció estatal per fill.          |
| Sumar 2023           | Tipus marginal superior anual; retenció actual.                            |
| Podemos 2019         | Primer tram anual històric; retenció actual i altres supòsits documentats. |

PP, PSOE, Podemos 2025 i Ciudadanos tenen entrades informatives quan falten dades verificades. No són models complets ni un catàleg exhaustiu. Les simulacions antigues no es reescriuen: torna a aplicar la proposta per adoptar les regles revisades. [Fonts i abast](docs/proposal-scope.md) · [Catàleg](data/proposals.json).

**Habitatge:** es calculen els règims transitoris estatals (lloguer anterior al 2015 i compra anterior al 2013) i la deducció autonòmica per lloguer dels perfils generals a 11 comunitats; la resta de regles s’expliquen com a omeses. [Pla](https://github.com/molinero95/SalaryCalculatorESP/pull/22) · [Backlog](docs/BACKLOG.md).

## Actualització i alertes

El catàleg registra exercici, fonts i dates de verificació. El monitor setmanal (dilluns) i manual comprova URLs conegudes: canvis, fonts inaccessibles i paràmetres pendents de revisió. Els casos persisteixen amb historial i exigeixen una revisió amb evidència; recuperar la font o acceptar l’empremta no els tanca.

Informes a **GitHub Actions → Template source review**, fitxers descarregables i branca `monitor-state`. Els avisos de GitHub depenen dels ajustos del compte; no hi ha missatges dedicats ni alertes de manteniment dins de la calculadora. Una cerca de títols del BOE de 14 dies detecta candidats; els índexs d’AEAT, butlletins autonòmics/forals originals, partits i actualitzacions fiscals automàtiques són pendents. [Monitor](docs/template-maintenance.md) · [Fonts fiscals](data/fiscal-sources.json).

## Privacitat i desenvolupament

Càlculs i dades personals al navegador, amb sessió local. Els enllaços només comparteixen regles, no salari ni família. HTML, CSS i mòduls JavaScript estàtics, sense backend de càlcul ni dependències externes d’execució de l’aplicació. [GoatCounter](https://www.goatcounter.com/) compta visites anònimes i fa peticions externes.

Node.js 22, npm i Python 3; sense compilació de l’aplicació:

```bash
npm ci
npm start
npm test
npm run lint
npm run templates:check
npx playwright install --with-deps chromium
npm run test:e2e
```

CI comprova unitats, catàleg, navegador/accessibilitat i captures seleccionades en macOS. Els tests no certifiquen exactitud fiscal. Genera el catàleg amb `npm run templates:build` després de modificar-lo; revisa la versió de memòria cau de `sw.js` quan canviïn fitxers de l’app. GitHub Pages publica des de `main`, carpeta arrel. [Desenvolupament](CONTRIBUTING.md) · [Arquitectura](docs/architecture.md).

## Backlog: pròxims passos

El [backlog complet](docs/BACKLOG.md) registra prioritats, estat, responsables, dependències i criteris d’acceptació. Les alertes persistents estan implementades; resta pendent:

- **P0 — actualitat fiscal:** descobrir publicacions oficials noves, mostrar exercici/verificació i reforçar terminis i salut del monitor.
- **P1 — abast i proves:** habitatge per fases (Claude), canvi d’exercici, actualitzacions de memòria cau, traçabilitat i més propostes verificades.
- **P1 — perfils laborals:** diversos pagadors, canvis d’empresa, treball assalariat parcial, autònoms i pluriactivitat.
- **P2 — evolució:** refactor de presentació/enllaços, proves visuals, esborranys fiscals revisats, ampliacions forals, comparació d’ofertes i estimacions de permisos/baixes.

Una tasca pendent no és una funció disponible; consulta l’estat i la PR d’implementació.

## Documentació i contribucions

[AGENTS.md](AGENTS.md) · [Context](docs/AI_CONTEXT.md) · [Decisions](docs/ROADMAP.md) · [Backlog](docs/BACKLOG.md).

Les correccions fiscals requereixen fonts originals, període, elegibilitat i exemples independents provats. La interfície manté cinc idiomes i ús sense connexió.

## Llicència

[MIT](LICENSE) © 2026 Jaime Molinero Lacave
