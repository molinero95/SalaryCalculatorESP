# Simulador de salario neto

> [!WARNING]
> Este proyecto se ha generado y desarrollado con ayuda de inteligencia artificial. El código, los datos fiscales, las traducciones y los resultados pueden contener errores o no estar completamente actualizados. Los tests verifican determinados comportamientos, pero no garantizan la exactitud fiscal. Usa los resultados como estimaciones y contrástalos con fuentes oficiales o asesoramiento profesional antes de tomar decisiones.

Calculadora de nómina para España y simulador de propuestas fiscales. Calcula tu salario neto con la normativa vigente y compáralo con cualquier cambio en los tramos del IRPF, los mínimos o las cotizaciones a la Seguridad Social.

**[Abrir el simulador →](https://molinero95.github.io/SalaryCalculatorESP/)**

**Castellano** · [Català](README.ca.md) · [Euskara](README.eu.md) · [Galego](README.gl.md) · [English](README.en.md)

## Qué puedes hacer

- **Tu salario:** estimar la nómina, la retención de IRPF, las cotizaciones del trabajador y el coste empresarial; distinguir 12 y 14 pagas y el neto anual de nómina del neto tras la renta estimada.
- **Residencia y familia:** seleccionar las 17 comunidades, territorio histórico en País Vasco y ciudad opcional; introducir edad, hijos, ascendientes, discapacidad y las confirmaciones de elegibilidad disponibles.
- **Retribución flexible y pensiones:** valorar restaurante, transporte, seguro médico, guardería y formación, además de aportaciones individuales y de empresa, dentro del alcance documentado.
- **Simular cambios:** editar parámetros y escalas, comparar hasta cinco escenarios con tarjetas, tabla, desglose y gráficos por salario; aplicar deflactación en el régimen común.
- **Propuestas políticas:** cargar plantillas parciales editables y consultar sus fuentes, fechas, supuestos y medidas pendientes.
- **Compartir y continuar:** compartir reglas de una simulación sin incluir datos personales; restaurar automáticamente entradas y pestañas guardadas en ese navegador.
- **Instalación y uso sin conexión:** después de una primera carga completa con conexión, usar la app sin conexión e instalarla si el navegador lo permite.
- **Cinco idiomas:** castellano, català, euskara, galego e English.

## Nómina y renta son cálculos distintos

La retención de nómina es un pago a cuenta. La estimación anual separa las cuotas estatal y autonómica y sus mínimos, y muestra el saldo estimado a pagar o devolver. Cambiar de comunidad en régimen común puede modificar la renta anual sin cambiar la nómina. Una devolución no está garantizada.

País Vasco y Navarra usan reglas territoriales propias para los perfiles soportados. Una propuesta del régimen común o una edición fiscal no modelada para esos territorios se muestra como no disponible; no se presenta un neto idéntico como resultado de la propuesta. Consulta [residencia](docs/locations.md), [alcance foral](docs/foral-payroll.md) y [validación fiscal](docs/fiscal-validation.md).

## Propuestas disponibles

| Plantilla calculable | Alcance                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| VOX 2024             | Escenarios parciales con escalas anual y de retención separadas; reducción estatal por hijo. No representa todo el programa. |
| Sumar 2023           | Escenario parcial del tipo marginal superior anual; mantiene la retención actual.                                            |
| Podemos 2019         | Escenario histórico parcial del primer tramo anual; mantiene la retención actual y el resto de supuestos documentados.       |

PP, PSOE, Podemos 2025 y Ciudadanos incluyen entradas informativas sin cálculo cuando faltan parámetros o condiciones verificadas. No son modelos completos ni un catálogo exhaustivo. Las plantillas anteriores guardadas no se reescriben automáticamente: vuelve a aplicar una propuesta para adoptar sus reglas revisadas. [Alcance y fuentes](docs/proposal-scope.md) · [Catálogo](data/proposals.json).

## Alcance y trabajo pendiente

El perfil salarial principal supone un pagador y un año completo. No hay un modelo completo de varios pagadores, autónomos, pluriactividad o declaración conjunta. El modelo foral admite determinadas rentas adicionales, pero eso no equivale a una calculadora completa de actividad autónoma. Las condiciones no soportadas deben consultarse en la documentación fiscal.

**Vivienda:** calcula los regímenes transitorios estatales (alquiler anterior a 2015 y compra anterior a 2013) y la deducción autonómica por alquiler de los perfiles generales en 11 comunidades; el resto de reglas se explica como omitida. Las ampliaciones se implementan por fases verificadas. [Plan de vivienda](https://github.com/molinero95/SalaryCalculatorESP/pull/22) · [Backlog priorizado](docs/BACKLOG.md).

## Datos y alertas de mantenimiento

El catálogo fiscal registra ejercicio, fuentes y fechas de verificación. Un workflow semanal (lunes) y manual comprueba las URLs conocidas y detecta cambios, fuentes inaccesibles y grupos de parámetros pendientes de revisión. Los casos persisten con historial y requieren revisión explícita con evidencia; recuperar una fuente o aceptar su huella no los cierra.

Los informes aparecen en **GitHub Actions → Template source review**, con archivos descargables y estado guardado en la rama `monitor-state`. Las notificaciones de GitHub dependen de los ajustes de la cuenta: no hay envíos dedicados ni avisos de mantenimiento dentro de la calculadora. El monitor descubre candidatos en títulos del BOE dentro de una ventana de 14 días; no cubre todavía los índices de AEAT, boletines autonómicos/forales originales ni partidos, y no actualiza automáticamente las reglas fiscales. [Funcionamiento del monitor](docs/template-maintenance.md) · [Fuentes fiscales](data/fiscal-sources.json).

## Privacidad y arquitectura

Los cálculos y datos personales se procesan en el navegador; la sesión se guarda localmente. Los enlaces compartidos contienen reglas de simulación, no el salario ni los datos familiares. La app es estática, con HTML, CSS y módulos JavaScript, sin backend para los cálculos ni dependencias externas de ejecución de la aplicación. [GoatCounter](https://www.goatcounter.com/) registra visitas anónimas; sí existen peticiones externas de analítica.

## Desarrollo y comprobaciones

Usa Node.js 22, npm y Python 3. No hay compilación de la aplicación.

```bash
npm ci
npm start                  # http://localhost:8000
npm test
npm run lint
npm run templates:check
npx playwright install --with-deps chromium
npm run test:e2e
```

CI ejecuta pruebas unitarias, comprobaciones de catálogo, navegador/accesibilidad y referencias visuales seleccionadas en macOS. Las pruebas no certifican la exactitud fiscal. Al cambiar el catálogo canónico, ejecuta `npm run templates:build`; al cambiar archivos de la app cacheados, revisa la versión de `sw.js`. [Guía de desarrollo](CONTRIBUTING.md) · [Arquitectura](docs/architecture.md).

GitHub Pages publica desde `main`, carpeta raíz. Consulta la configuración actual del repositorio antes de cambiar el despliegue.

## Backlog: próximos pasos

El [backlog completo](docs/BACKLOG.md) registra prioridades, estado, responsables, dependencias y criterios de aceptación. Las alertas persistentes ya están implementadas; lo siguiente sigue pendiente:

- **P0 — actualidad fiscal:** descubrir publicaciones oficiales nuevas, mostrar ejercicio y verificación en resultados, y reforzar los plazos de revisión y la salud del monitor.
- **P1 — cobertura y pruebas:** desarrollar vivienda por fases (Claude), probar el cambio de ejercicio y las actualizaciones de caché, mejorar la trazabilidad y ampliar propuestas verificadas.
- **P1 — perfiles laborales:** varios pagadores y cambios de empresa, períodos parciales por cuenta ajena, autónomos y pluriactividad.
- **P2 — evolución:** refactor de presentación y enlaces, cobertura visual, borradores de actualización fiscal revisados, ampliaciones forales, comparación de ofertas y estimaciones de permisos/bajas.

Una tarea del backlog no implica que la función esté disponible. Consulta su estado y la PR correspondiente antes de usarla como capacidad de la app.

## Documentación y contribuciones

[AGENTS.md](AGENTS.md) · [Contexto](docs/AI_CONTEXT.md) · [Decisiones](docs/ROADMAP.md) · [Backlog](docs/BACKLOG.md).

Se agradecen revisiones fiscales y de traducciones. Cada actualización fiscal necesita fuentes originales, período y elegibilidad claros, ejemplos independientes y pruebas. Los cambios de interfaz deben mantener los cinco idiomas y el uso sin conexión.

## Licencia

[MIT](LICENSE) © 2026 Jaime Molinero Lacave
