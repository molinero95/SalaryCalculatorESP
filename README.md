# Simulador de salario neto

Calculadora de nómina para España y simulador de propuestas fiscales. Calcula tu salario neto con la normativa vigente y compáralo con cualquier cambio en los tramos del IRPF, los mínimos o las cotizaciones a la Seguridad Social.

**[Abrir el simulador →](https://molinero95.github.io/SalaryCalculatorESP/)**

**Castellano** · [Català](README.ca.md) · [Euskara](README.eu.md) · [Galego](README.gl.md) · [English](README.en.md)

## Características

- **Nómina completa**: cotizaciones del trabajador (contingencias comunes, desempleo, formación, MEI y cotización de solidaridad), retención de IRPF según el procedimiento general del Reglamento y coste para la empresa.
- **Comparación lado a lado** entre el escenario actual y una simulación, con desglose línea a línea y diferencias.
- **Tramos editables**: añade, quita o modifica tramos; aplica plantillas autonómicas o deflacta todos los límites de una vez.
- **Todos los parámetros personalizables**: mínimos personales y familiares, reducción por rendimientos del trabajo, deducción SMI, bases de cotización, tipos de la empresa…
- **Retribución flexible**: tarjeta restaurante, transporte, seguro médico, guardería y formación, con sus límites exentos.
- **Plan de pensiones**: plan individual y de empresa, con el ahorro estimado en la renta.
- **Gráfico por nivel de salario** para ver a quién beneficia o perjudica una propuesta.
- **Escenarios guardados**, enlaces para compartir e importación/exportación en JSON.
- **Cinco idiomas**: castellano, català, euskara, galego e English.
- Sin dependencias, sin backend, sin cookies: todo se calcula en el navegador.
  Las visitas se cuentan de forma anónima con [GoatCounter](https://www.goatcounter.com/).

## Cómo calcula

1. **Seguridad Social**: base de cotización = bruto anual / 12, acotada entre la base mínima y la máxima. Por encima de la base máxima se aplica la cotización de solidaridad por tramos.
2. **Rendimiento neto** = bruto − cotizaciones.
3. **Base de retención** = rendimiento neto − otros gastos deducibles (2.000 €, más los de discapacidad) − reducción por rendimientos del trabajo (art. 20 LIRPF).
4. **Cuota** = escala(base) − escala(mínimo personal y familiar) , con el límite del 43 % sobre el exceso del mínimo exento de retención.
5. **Tipo de retención** = cuota / bruto, redondeado a dos decimales (mínimo 2 % en contratos temporales).
6. Con **14 pagas**, la Seguridad Social se reparte en 12 meses y las pagas extra solo soportan IRPF.
7. La **deducción SMI** no se aplica en la nómina: se muestra como devolución estimada en la renta.
8. La **retribución flexible** está exenta de IRPF hasta sus límites, pero cotiza a la Seguridad Social.

### Valores por defecto (2026)

| Parámetro | Valor |
| --- | --- |
| Escala de retención | 19 % · 24 % · 30 % · 37 % · 45 % · 47 % |
| Cotización trabajador | 4,70 % CC + 1,55 % desempleo + 0,10 % FP + 0,15 % MEI |
| Base máxima / mínima | 5.101,20 € / 1.424,50 € al mes |
| Mínimo personal | 5.550 € |
| Reducción máxima rendimientos del trabajo | 7.302 € |
| Deducción SMI (en la renta) | 590,89 € hasta 17.094 €, se anula en 20.048,45 € |
| Mínimo exento de retención | 15.876 € – 19.262 € según situación familiar |
| Plan de pensiones (reducción) | 1.500 € individual + 8.500 € de empleo, máx. 30 % de rendimientos netos |
| Retribución flexible exenta | Restaurante 11 €/día · transporte 1.500 €/año · seguro médico 500 €/persona |

> [!IMPORTANT]
> Es una herramienta orientativa. Algunos parámetros (deducción SMI, mínimo exento de retención, escalas autonómicas) pueden cambiar durante el año; todos se pueden ajustar desde la interfaz o en [`js/defaults.js`](js/defaults.js). No aplica a los territorios forales (País Vasco y Navarra).

### Fuentes

- [Ley 35/2006 del IRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764) — arts. 19, 20, 57-61, 63, 80 bis y 101.
- [Reglamento del IRPF (RD 439/2007)](https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820) — arts. 80-86 (procedimiento de retención).
- [Real Decreto-ley 5/2026](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-3810) — deducción para rentas bajas (DA 61ª LIRPF).
- Orden PJC/297/2026 — bases y tipos de cotización para 2026.
- [Agencia Tributaria — retenciones sobre rendimientos del trabajo](https://sede.agenciatributaria.gob.es/).
- [Seguridad Social — bases y tipos de cotización](https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537).

## Desarrollo

No hace falta compilar nada: es HTML, CSS y JavaScript con módulos ES.

```bash
npm start   # servidor local en http://localhost:8000
npm test    # tests del motor de cálculo (Node 18+)
```

```
├── index.html
├── css/styles.css
├── js/
│   ├── app.js          # estado y orquestación de la interfaz
│   ├── calc.js         # motor de cálculo (funciones puras)
│   ├── defaults.js     # parámetros vigentes y plantillas de tramos
│   ├── settings.js     # editor de ajustes y tramos
│   ├── results.js      # tarjetas de resultado y desglose
│   ├── chart.js        # gráfico SVG
│   ├── format.js       # formato de números
│   ├── storage.js      # localStorage y enlaces compartidos
│   └── i18n/           # traducciones (una por idioma)
└── tests/
```

### Publicar en GitHub Pages

En **Settings → Pages** del repositorio, elige _Deploy from a branch_, rama `main` y carpeta `/ (root)`.

### Contribuir

Se agradecen correcciones de la normativa y revisiones de las traducciones (sobre todo euskara y galego). Para añadir un idioma, crea `js/i18n/<código>.js` con las mismas claves que `es.js`, regístralo en `js/i18n/index.js` y añade su `README.<código>.md`.

## Licencia

[MIT](LICENSE) © 2026 Jaime Molinero Lacave
