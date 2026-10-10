// Generated from data/proposals.json. Run npm run templates:build; do not edit directly.

export const PROPOSALS = {
  vox2024: {
    id: 'vox2024',
    party: 'Vox',
    title: 'Proposición de Ley 122/000084',
    date: '2024-04-12',
    url: 'https://www.congreso.es/public_oficiales/L15/CONG/BOCG/B/BOCG-15-B-98-1.PDF',
    note: 'proposalVoxNote',
    changes: {
      incomeTax: {
        brackets: [
          {
            upTo: 12450,
            rate: 24.5,
          },
          {
            upTo: 20200,
            rate: 27,
          },
          {
            upTo: 35200,
            rate: 30,
          },
          {
            upTo: 60000,
            rate: 33.5,
          },
          {
            upTo: 70000,
            rate: 37.5,
          },
          {
            upTo: null,
            rate: 47.5,
          },
        ],
        personalAllowance: 22000,
        childRateReduction: 4,
        useSeparateWithholding: true,
        withholdingBrackets: [
          {
            upTo: 70000,
            rate: 15,
          },
          {
            upTo: null,
            rate: 25,
          },
        ],
        stateOnlyAllowances: true,
      },
    },
    status: 'partial',
    verifiedAt: '2026-10-09',
    sourceType: 'official',
    limitations: [
      'Article 101 replaces the employment withholding scale with 15/25 rates and no regional component, while regional quotas remain due; the estimate therefore shows an amount to pay in the annual return. Regulatory calculation details are an estimate. Child rate relief is applied to annual state tax, not inferred for withholding.',
      "Regional scales remain unchanged. The 22,000 € minimum is applied to the state quota only, as the bill states it modifies only the state tranche; the regional quota keeps today's minima (or the community's own). Read literally, art. 56.3 LIRPF would also extend it to the regional quota of communities without their own minima.",
      'Birth cheques and other measures outside income tax are not simulated.',
    ],
    history: [
      {
        date: '2026-10-09',
        description: 'Initial source-reviewed catalogue.',
      },
      {
        date: '2026-10-09',
        description:
          'Reviewed bill pages 5–7: separate article 101 withholding scale from article 63 annual state scale; mark regulatory and regional-minimum assumptions.',
      },
      {
        date: '2026-10-11',
        description:
          'Apply the 22,000 € minimum to the state quota only and flag the withholding shortfall against regional quotas.',
      },
    ],
  },
  sumar2023: {
    id: 'sumar2023',
    party: 'Sumar',
    title: 'Programa electoral «Un programa para ti»',
    date: '2023-07',
    url: 'https://movimientosumar.es/wp-content/uploads/2023/07/Un-Programa-para-ti.pdf',
    note: 'proposalSumarNote',
    changes: {
      incomeTax: {
        brackets: [
          {
            upTo: 12450,
            rate: 19,
          },
          {
            upTo: 20200,
            rate: 24,
          },
          {
            upTo: 35200,
            rate: 30,
          },
          {
            upTo: 60000,
            rate: 37,
          },
          {
            upTo: 300000,
            rate: 45,
          },
          {
            upTo: null,
            rate: 52,
          },
        ],
        useSeparateWithholding: true,
        withholdingBrackets: [
          {
            upTo: 12450,
            rate: 19,
          },
          {
            upTo: 20200,
            rate: 24,
          },
          {
            upTo: 35200,
            rate: 30,
          },
          {
            upTo: 60000,
            rate: 37,
          },
          {
            upTo: 300000,
            rate: 45,
          },
          {
            upTo: null,
            rate: 47,
          },
        ],
      },
    },
    status: 'partial',
    verifiedAt: '2026-10-09',
    sourceType: 'official',
    limitations: [
      'Intermediate rates between 120000 and 300000 are not specified; unchanged baseline rates are assumed.',
      'Annual top-rate scenario only: the programme does not specify a replacement payroll withholding procedure, so current withholding is retained.',
    ],
    history: [
      {
        date: '2026-10-09',
        description: 'Initial source-reviewed catalogue.',
      },
      {
        date: '2026-10-09',
        description:
          'Separate annual top-rate proposal from unchanged payroll withholding; no replacement withholding procedure inferred.',
      },
    ],
  },
  podemos2019: {
    id: 'podemos2019',
    party: 'Podemos',
    title: 'Programa electoral 2019 · escenario parcial del primer tramo',
    date: '2019-10',
    url: 'https://podemos.info/wp-content/uploads/2019/10/Podemos_programa_generales_10N.pdf',
    note: 'proposalPodemos2019Note',
    changes: {
      incomeTax: {
        brackets: [
          {
            upTo: 12450,
            rate: 18,
          },
          {
            upTo: 20200,
            rate: 24,
          },
          {
            upTo: 35200,
            rate: 30,
          },
          {
            upTo: 60000,
            rate: 37,
          },
          {
            upTo: 300000,
            rate: 45,
          },
          {
            upTo: null,
            rate: 47,
          },
        ],
        useSeparateWithholding: true,
        withholdingBrackets: [
          {
            upTo: 12450,
            rate: 19,
          },
          {
            upTo: 20200,
            rate: 24,
          },
          {
            upTo: 35200,
            rate: 30,
          },
          {
            upTo: 60000,
            rate: 37,
          },
          {
            upTo: 300000,
            rate: 45,
          },
          {
            upTo: null,
            rate: 47,
          },
        ],
      },
    },
    status: 'partial',
    verifiedAt: '2026-10-10',
    sourceType: 'official',
    limitations: [
      'Historical 2019 programme, measure 263, printed pages 109–110. Date records the month of the official hosted copy; an exact original publication day is not established.',
      'Only the 18% first non-exempt band is modelled. The current first-band threshold and all remaining bands and minima are retained as explicit assumptions; proposed high-income, capital-income and deduction changes are not modelled.',
      'The programme does not split state/regional rates: this hypothetical annual component reduces the common-regime reference first rate by one point, retaining the selected regional rules. It is not a complete proposal or a foral reform.',
      'No replacement payroll withholding procedure is specified; current withholding is retained.',
    ],
    history: [
      {
        date: '2026-10-10',
        description:
          'Review official 2019 programme measure 263; model only first-band annual reduction, retain current withholding and explicitly exclude unspecified components.',
      },
    ],
  },
};

export const UNMODELLED_PROPOSALS = [
  {
    id: 'psoe2023',
    party: 'PSOE',
    title: 'Programa electoral 2023',
    url: 'https://www.psoe.es/media-content/2023/07/PROGRAMA_ELECTORAL-GENERALES-2023.pdf',
    note: 'proposalPsoeNote',
    date: '2023-07-07',
    status: 'unmodelled',
    verifiedAt: '2026-10-09',
    sourceType: 'official',
    limitations: ['Not enough supported parameters or eligibility inputs to calculate this proposal.'],
    history: [
      {
        date: '2026-10-09',
        description: 'Initial catalogue; secondary documents require primary-source replacement.',
      },
      {
        date: '2026-10-09',
        description: 'Replace inaccessible secondary copy with official party programme.',
      },
    ],
  },
  {
    id: 'pp2024',
    party: 'PP',
    title: 'Bonificaciones para jóvenes en los primeros cuatro años de vida laboral',
    url: 'https://www.pp.es/actualidad/articulos/pp-proponebonificaciones-fiscales-jovenes-primeros-cuatro-anos-su-vida-laboral/',
    note: 'proposalPpNote',
    date: '2024-05-28',
    status: 'unmodelled',
    verifiedAt: '2026-10-09',
    sourceType: 'official',
    limitations: ['Not enough supported parameters or eligibility inputs to calculate this proposal.'],
    history: [
      {
        date: '2026-10-09',
        description: 'Initial catalogue; secondary documents require primary-source replacement.',
      },
    ],
  },
  {
    id: 'podemos2025',
    party: 'Podemos',
    title: 'Proposición de Ley de modificación del IRPF (2025)',
    url: 'https://www.newtral.es/wp-content/uploads/2025/02/PL_MODIFICACION_LEY_IRPF_Podemos.pdf',
    note: 'proposalPodemosNote',
    date: '2025-02',
    status: 'unmodelled',
    verifiedAt: '2026-10-09',
    sourceType: 'secondary',
    limitations: ['Not enough supported parameters or eligibility inputs to calculate this proposal.'],
    history: [
      {
        date: '2026-10-09',
        description: 'Initial catalogue; secondary documents require primary-source replacement.',
      },
    ],
  },
  {
    id: 'pp2025deflation',
    party: 'PP',
    title: 'Proposición de Ley 622/000059 · deflactación del IRPF',
    date: '2025-02-20',
    url: 'https://www.congreso.es/public_oficiales/L15/SEN/BOCG/2025/BOCG_D_15_219_2014.PDF',
    note: 'proposalPpDeflationNote',
    status: 'unmodelled',
    verifiedAt: '2026-10-10',
    sourceType: 'official',
    limitations: [
      'Historical parliamentary proposal, not enacted law. The additional provision requests deflation of at least the first three bands, minima and personal deductions without specifying percentages or final amounts; no numerical scenario can be derived.',
    ],
    history: [
      {
        date: '2026-10-10',
        description:
          'Record Senate proposal published 20 February 2025, additional provision; do not invent a deflation factor.',
      },
    ],
  },
  {
    id: 'ciudadanos2023families',
    party: 'Ciudadanos',
    title: 'A por el segundo hijo · anuncio de deducciones familiares (2023)',
    date: '2023-05-04',
    url: 'https://www.ciudadanos-cs.org/prensa/ciudadanos-propone-el-plan-mas-ambicioso-de-fomento-de-la-natalidad-con-ayudas-directas-y-deducciones-fiscales-por-el-segundo-hijo/13363',
    note: 'proposalCiudadanosFamiliesNote',
    status: 'unmodelled',
    verifiedAt: '2026-10-10',
    sourceType: 'official',
    limitations: [
      'Historical announcement, not enacted law. The ten-point family deduction has no defined tax base, quota mechanism, limits or full eligibility rules. School expenses and employer contributions cannot be inferred from employee payroll inputs.',
    ],
    history: [
      {
        date: '2026-10-10',
        description:
          'Review official press release dated 4 May 2023; retain as informational without invented parameters.',
      },
    ],
  },
];
