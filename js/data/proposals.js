// Party proposals with concrete, modellable figures. Only measures with exact
// numbers in a primary source are included; everything else is listed in the
// note shown next to the proposal. Researched on 2026-10-09.

import { combineScales, GENERAL_REGIONAL_SCALE } from '../defaults.js';

export const PROPOSALS = {
  vox2024: {
    party: 'Vox',
    title: 'Proposición de Ley 122/000084',
    date: '2024-04-12',
    url: 'https://www.congreso.es/public_oficiales/L15/CONG/BOCG/B/BOCG-15-B-98-1.PDF',
    note: 'proposalVoxNote',
    changes: {
      incomeTax: {
        // State half at 15 % up to 70,000 € and 25 % above; regional half unchanged
        brackets: combineScales(
          [
            { upTo: 70000, rate: 15 },
            { upTo: null, rate: 25 },
          ],
          GENERAL_REGIONAL_SCALE,
        ),
        personalAllowance: 22000,
        childRateReduction: 4,
      },
    },
  },
  sumar2023: {
    party: 'Sumar',
    title: 'Programa electoral «Un programa para ti»',
    date: '2023-07',
    url: 'https://theobjective.com/wp-content/uploads/2023/07/un_programa_para_ti.pdf',
    note: 'proposalSumarNote',
    changes: {
      incomeTax: {
        brackets: [
          { upTo: 12450, rate: 19 },
          { upTo: 20200, rate: 24 },
          { upTo: 35200, rate: 30 },
          { upTo: 60000, rate: 37 },
          { upTo: 300000, rate: 45 },
          { upTo: null, rate: 52 },
        ],
      },
    },
  },
};

// Proposals not modeled: missing figures or eligibility inputs in this calculator.
export const UNMODELLED_PROPOSALS = [
  {
    party: 'PSOE',
    title: 'Programa electoral 2023',
    url: 'https://theobjective.com/wp-content/uploads/2023/07/PROGRAMA_ELECTORAL-GENERALES-2023-1.pdf',
    note: 'proposalPsoeNote',
  },
  {
    party: 'PP',
    title: 'Bonificaciones para jóvenes en los primeros cuatro años de vida laboral',
    url: 'https://www.pp.es/actualidad/articulos/pp-proponebonificaciones-fiscales-jovenes-primeros-cuatro-anos-su-vida-laboral/',
    note: 'proposalPpNote',
  },
  {
    party: 'Podemos',
    title: 'Proposición de Ley de modificación del IRPF (2025)',
    url: 'https://www.newtral.es/wp-content/uploads/2025/02/PL_MODIFICACION_LEY_IRPF_Podemos.pdf',
    note: 'proposalPodemosNote',
  },
];
