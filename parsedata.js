import { mean, median, std, sqrt, kurtosis, skewness } from "mathjs";
import fft from "fft-js";

export function parseData(heartRates) {
  if (!Array.isArray(heartRates) || heartRates.length < 2) {
    throw new Error("Not enough heart rate data.");
  }

  const rrIntervals = [];
  for (let i = 1; i < heartRates.length; i++) {
    const dt = heartRates[i].time - heartRates[i - 1].time;
    if (dt > 250 && dt < 2000) rrIntervals.push(dt);
  }

  const meanRR = mean(rrIntervals);
  const medianRR = median(rrIntervals);
  const sdrr = std(rrIntervals);
  const rmssd = sqrt(mean(rrIntervals.map((v, i, arr) => i > 0 ? (v - arr[i - 1]) ** 2 : 0).slice(1)));
  const sdsd = std(rrIntervals.map((v, i, arr) => i > 0 ? v - arr[i - 1] : 0).slice(1));
  const sdrr_rmssd = sdrr / rmssd;

  const hr = 60000 / meanRR;
  const pNN25 = rrIntervals.filter((v, i, arr) => i > 0 && Math.abs(v - arr[i - 1]) > 25).length / rrIntervals.length;
  const pNN50 = rrIntervals.filter((v, i, arr) => i > 0 && Math.abs(v - arr[i - 1]) > 50).length / rrIntervals.length;

  const sd1 = sqrt(rmssd ** 2 / 2);
  const sd2 = sqrt(2 * sdrr ** 2 - sd1 ** 2);

  const kurt = kurtosis(rrIntervals);
  const skew = skewness(rrIntervals);

  // Relative RR intervals
  const relRR = rrIntervals.map(rr => (rr - meanRR) / meanRR);
  const meanRelRR = mean(relRR);
  const medianRelRR = median(relRR);
  const sdrrRelRR = std(relRR);
  const rmssdRelRR = sqrt(mean(relRR.map((v, i, arr) => i > 0 ? (v - arr[i - 1]) ** 2 : 0).slice(1)));
  const sdsdRelRR = std(relRR.map((v, i, arr) => i > 0 ? v - arr[i - 1] : 0).slice(1));
  const sdrr_rmssd_rel = sdrrRelRR / rmssdRelRR;
  const kurtRelRR = kurtosis(relRR);
  const skewRelRR = skewness(relRR);

  // Frequency-domain (simplified)
  const rrMeanCentered = rrIntervals.map(v => v - meanRR);
  const phasors = fft.fft(rrMeanCentered);
  const freqs = fft.util.fftFreq(phasors, 1);
  const mags = fft.util.fftMag(phasors);

  let vlf = 0, lf = 0, hf = 0;
  for (let i = 0; i < freqs.length; i++) {
    const freq = freqs[i];
    const power = mags[i] ** 2;
    if (freq > 0.003 && freq <= 0.04) vlf += power;
    else if (freq > 0.04 && freq <= 0.15) lf += power;
    else if (freq > 0.15 && freq <= 0.4) hf += power;
  }

  const tp = vlf + lf + hf;
  const lfPct = (lf / tp) * 100;
  const hfPct = (hf / tp) * 100;
  const vlfPct = (vlf / tp) * 100;
  const lfNu = lf / (lf + hf);
  const hfNu = hf / (lf + hf);
  const lf_hf = lf / hf;
  const hf_lf = hf / lf;

  // SampEn and Higuchi could be implemented via libraries; here, dummy values:
  const sampen = Math.random();  // Placeholder
  const higuci = Math.random();  // Placeholder

  return {
    MEAN_RR: meanRR,
    MEDIAN_RR: medianRR,
    SDRR: sdrr,
    RMSSD: rmssd,
    SDSD: sdsd,
    SDRR_RMSSD: sdrr_rmssd,
    HR: hr,
    pNN25: pNN25 * 100,
    pNN50: pNN50 * 100,
    SD1: sd1,
    SD2: sd2,
    KURT: kurt,
    SKEW: skew,
    MEAN_REL_RR: meanRelRR,
    MEDIAN_REL_RR: medianRelRR,
    SDRR_REL_RR: sdrrRelRR,
    RMSSD_REL_RR: rmssdRelRR,
    SDSD_REL_RR: sdsdRelRR,
    SDRR_RMSSD_REL_RR: sdrr_rmssd_rel,
    KURT_REL_RR: kurtRelRR,
    SKEW_REL_RR: skewRelRR,
    VLF: vlf,
    VLF_PCT: vlfPct,
    LF: lf,
    LF_PCT: lfPct,
    LF_NU: lfNu,
    HF: hf,
    HF_PCT: hfPct,
    HF_NU: hfNu,
    TP: tp,
    LF_HF: lf_hf,
    HF_LF: hf_lf,
    sampen,
    higuci
  };
}
