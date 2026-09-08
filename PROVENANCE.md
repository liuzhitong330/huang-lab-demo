# Provenance

## Experimental data

- Perez CP et al. “ADAPT-M: a workflow for rapid, quantitative in vitro
  measurements of enriched protein libraries.” *Nature Communications* 17,
  8673 (2026). DOI: 10.1038/s41467-026-75463-1.
- Source workbook:
  `41467_2026_75463_MOESM4_ESM.xlsx`, downloaded from the publisher's Source
  Data link.
- Sheets used: `2j`, `4e`, `SI 15`, `SI 25`, `SI 28`, and `Table S3`.
- Public article: https://www.nature.com/articles/s41467-026-75463-1

## Huang Lab repository data

- Repository: https://github.com/ProteinDesignLab/caliby
- Checked commit: `41d31560c3c73d7980d94f40f3c852b90bfab5c0`
- Files used: `notebooks/data/dhfr/1rx2.cif` and
  `notebooks/data/dhfr/1rx4.cif`.
- The two structures were aligned over 159 shared C-alpha atoms with the Kabsch
  algorithm. Per-residue Euclidean displacement was calculated after
  alignment.

## Transformations

- Candidate affinity and dissociation values are per-design medians; quartiles
  are retained in the generated data.
- The 13-candidate harmonized set excludes `meGFP` and the separate
  `s19901_ch` construct so its measurements are not merged into `s19901`.
- SEC traces are baseline-clamped at zero and normalized to each trace's own
  maximum. The pre-main-peak proxy integrates positive signal earlier than 0.8
  x-axis units before the maximum.
- Ranking scores normalize features within the 13-candidate set. Scores order
  candidates only after all active evidence gates pass.

## Limits

- Cutoffs and weights are exploratory and not validated predictors.
- A pre-main-peak SEC fraction is not assigned to aggregates without fraction
  identity or calibration.
- The Caliby DHFR example illustrates repository-aware ensemble QC and is not
  evidence about the ADAPT-M monobody library.
- No new wet-lab data were generated.
