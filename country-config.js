/* =========================================================
   Country configuration — the plug-in seam for Module 5
   (and the regulator lookups in Modules 7 and 8).

   Adding a country is a DATA task: copy the "generic" object,
   fill in the real rates from the official source, set
   `verified` to the date you checked them, and add it to
   FL_COUNTRIES under a short key. The interactives read this
   file and contain no hardcoded rates.

   All amounts are ANNUAL. Rates are percentages.
   ========================================================= */
window.FL_COUNTRIES = {

  generic: {
    key: 'generic',
    name: 'Generic (illustrative)',
    currency: '€',
    verified: '2026-09-05',
    /* Official source for the numbers. null = illustrative, not any real country. */
    source: null,
    sourceLabel: 'Illustrative rates for education — not any real country.',

    /* Income tax */
    taxBase: 'gross',            /* 'gross' or 'afterContributions' */
    allowance: 0,                /* tax-free amount deducted from the tax base */
    bands: [                     /* progressive slices; upTo null = no ceiling */
      { upTo: 12000, rate: 20, rule: 'Income up to €12,000 is taxed at 20%.' },
      { upTo: null,  rate: 30, rule: 'Only the euros above €12,000 are taxed at 30%.' }
    ],

    /* Social contributions taken from the employee's gross */
    employee: [
      { name: 'pension contribution',      rate: 4, cap: null, rule: 'Illustrative 4% of gross towards the state pension (Pillar 1).' },
      { name: 'health contribution',       rate: 4, cap: null, rule: 'Illustrative 4% of gross towards public health cover.' },
      { name: 'unemployment contribution', rate: 1, cap: null, rule: 'Illustrative 1% of gross towards unemployment insurance.' }
    ],

    /* Social contributions the employer pays on top of gross */
    employer: [
      { name: 'employer pension contribution', rate: 14, cap: null, rule: 'Illustrative 14% of gross paid by the employer — part of what you cost, never money you see.' },
      { name: 'employer health contribution',  rate: 6,  cap: null, rule: 'Illustrative 6% of gross paid by the employer.' }
    ],

    /* Names of the retirement layers, in the order used by Module 5 Part 3 */
    pillars: ['Pillar 1 — State', 'Pillar 2 — Occupational / funded', 'Pillar 3 — Private / voluntary'],

    /* Public register of licensed investment firms / insurers (Modules 7 & 8). null = not configured yet. */
    regulatorName: null,
    regulatorRegister: null
  }

  /* ---- template for a real country (copy, rename the key, fill in, verify) ----
  xx: {
    key: 'xx', name: 'Country name', currency: '€', verified: 'YYYY-MM-DD',
    source: 'https://official-tax-authority.example/rates', sourceLabel: 'National tax authority — rates for tax year YYYY',
    taxBase: 'afterContributions', allowance: 0,
    bands: [ { upTo: 20000, rate: 19, rule: '…' }, { upTo: null, rate: 25, rule: '…' } ],
    employee: [ { name: 'pension', rate: 4, cap: 60000, rule: '…' } ],
    employer:  [ { name: 'employer pension', rate: 14, cap: 60000, rule: '…' } ],
    pillars: ['…', '…', '…'],
    regulatorName: 'National financial regulator', regulatorRegister: 'https://…/register'
  }
  ---------------------------------------------------------------------------- */
};
