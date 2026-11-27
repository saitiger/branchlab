export interface ProportionComparison {
  controlClicks: number;
  controlVisitors: number;
  treatmentClicks: number;
  treatmentVisitors: number;
  controlRate: number;
  treatmentRate: number;
  absoluteLift: number;
  z: number;
  twoSidedP: number;
}

/**
 * Two-proportion z-test of treatment minus control, two-sided.
 * The normal tail uses Abramowitz and Stegun 7.1.26 for erf.
 */
export function compareProportions(
  controlClicks: number,
  controlVisitors: number,
  treatmentClicks: number,
  treatmentVisitors: number,
): ProportionComparison {
  if (!(controlVisitors >= 1) || !(treatmentVisitors >= 1)) {
    throw new Error("Each side needs at least one visitor.");
  }
  const controlRate = controlClicks / controlVisitors;
  const treatmentRate = treatmentClicks / treatmentVisitors;
  const absoluteLift = treatmentRate - controlRate;
  const pooled = (controlClicks + treatmentClicks) / (controlVisitors + treatmentVisitors);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / controlVisitors + 1 / treatmentVisitors));
  const z = se === 0 ? 0 : absoluteLift / se;
  return {
    controlClicks,
    controlVisitors,
    treatmentClicks,
    treatmentVisitors,
    controlRate,
    treatmentRate,
    absoluteLift,
    z,
    twoSidedP: twoSidedNormalP(z),
  };
}

/** Abramowitz and Stegun 7.1.26. Max absolute error about 1.5e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const polynomial =
    (((((1.061405429 * t) - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592;
  const y = 1 - polynomial * t * Math.exp(-ax * ax);
  return sign * y;
}

function twoSidedNormalP(z: number): number {
  const tail = 1 - 0.5 * (1 + erf(Math.abs(z) / Math.SQRT2));
  const p = 2 * tail;
  if (p < 0) return 0;
  if (p > 1) return 1;
  return p;
}
