// Source provenance for current annual scales, not hypothetical scenario edits.
const common = {
  label: 'Hacienda · Medidas autonómicas 2026',
  url: 'https://www.hacienda.gob.es/sgfal/financiacionterritorial/autonomica/capitulo-i-tributacion-autonomica-2026.pdf',
};
const sources = {
  bizkaia: [{ label: 'Bizkaia · NF 13/2013', url: 'https://www.bizkaia.eus/documents/880307/15187815/ca_13_2013.pdf' }],
  gipuzkoa: [
    {
      label: 'Gipuzkoa · Presupuestos 2026',
      url: 'https://www7.gipuzkoa.net/presupuestos/2026/Ppto2026/pdfs/0/Disposiciones.pdf',
    },
  ],
  alava: [
    { label: 'Álava · NF 33/2013', url: 'https://web.araba.eus/documents/d/araba/indice_norma-foral_irpf_cas-7-pdf' },
  ],
  navarra: [{ label: 'Navarra · DFL 4/2008', url: 'https://www.lexnavarra.navarra.es/detalle.asp?r=29657' }],
  valencia: [common, { label: 'Ley 5/2026 · Art. 18', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2026-19331' }],
  extremadura: [common, { label: 'Ley 2/2026 · DF 2', url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2026-17839' }],
};
export function residenceSources(region) {
  return (
    sources[region] ?? [
      common,
      { label: 'LIRPF · Art. 63', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a63' },
    ]
  );
}
