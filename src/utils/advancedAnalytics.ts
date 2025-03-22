import { mean, standardDeviation, quantile, linearRegression } from 'simple-statistics';
import regression from 'regression';
import { kmeans } from 'kmeans-js';
import { SimpleLinearRegression, PolynomialRegression } from 'ml-regression';

export interface TimeSeriesAnalysis {
  seasonality: {
    detected: boolean;
    period: number;
    strength: number;
  };
  trend: {
    slope: number;
    intercept: number;
    equation: string;
    points: number[];
  };
  movingAverages: {
    weekly: number[];
    monthly: number[];
  };
}

export interface AdvancedStats {
  tTest: {
    statistic: number;
    pValue: number;
    significant: boolean;
  };
  anova: {
    fStatistic: number;
    pValue: number;
    significant: boolean;
  };
  chiSquare: {
    statistic: number;
    pValue: number;
    significant: boolean;
  };
}

export interface ClusterAnalysis {
  clusters: number[][];
  centroids: number[][];
  labels: number[];
  silhouetteScore: number;
}

export interface RegressionAnalysis {
  equation: string;
  r2: number;
  points: number[][];
  predictions: number[];
  coefficients: number[];
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  correlation: number;
}

export function performTimeSeriesAnalysis(data: number[], timestamps: Date[]): TimeSeriesAnalysis {
  // Detect seasonality using autocorrelation
  const autocorr = calculateAutocorrelation(data);
  const seasonalityPeriod = findSeasonalityPeriod(autocorr);
  const seasonalityStrength = Math.max(...autocorr);

  // Calculate trend using linear regression
  const points = timestamps.map((_, i) => [i, data[i]]);
  const trend = regression.linear(points);

  // Calculate moving averages
  const weeklyMA = calculateMovingAverage(data, 7);
  const monthlyMA = calculateMovingAverage(data, 30);

  return {
    seasonality: {
      detected: seasonalityStrength > 0.7,
      period: seasonalityPeriod,
      strength: seasonalityStrength
    },
    trend: {
      slope: trend.equation[0],
      intercept: trend.equation[1],
      equation: trend.string,
      points: trend.points.map(p => p[1])
    },
    movingAverages: {
      weekly: weeklyMA,
      monthly: monthlyMA
    }
  };
}

export function performAdvancedStats(
  group1: number[],
  group2: number[],
  alpha: number = 0.05
): AdvancedStats {
  // Perform t-test
  const tTestResult = tTest(group1, group2);
  
  // Perform ANOVA
  const anovaResult = oneWayANOVA([group1, group2]);
  
  // Perform chi-square test
  const chiSquareResult = chiSquareTest(group1, group2);

  return {
    tTest: {
      statistic: tTestResult.statistic,
      pValue: tTestResult.pValue,
      significant: tTestResult.pValue < alpha
    },
    anova: {
      fStatistic: anovaResult.fStatistic,
      pValue: anovaResult.pValue,
      significant: anovaResult.pValue < alpha
    },
    chiSquare: {
      statistic: chiSquareResult.statistic,
      pValue: chiSquareResult.pValue,
      significant: chiSquareResult.pValue < alpha
    }
  };
}

export function performClustering(data: number[][], k: number): ClusterAnalysis {
  const { clusters, centroids, labels } = kmeans(data, k);
  const silhouetteScore = calculateSilhouetteScore(data, labels, centroids);

  return {
    clusters,
    centroids,
    labels,
    silhouetteScore
  };
}

export function performRegression(
  x: number[],
  y: number[],
  type: 'linear' | 'polynomial' | 'exponential' = 'linear'
): RegressionAnalysis {
  let result;
  let predictions: number[] = [];
  let coefficients: number[] = [];

  if (type === 'linear') {
    const model = new SimpleLinearRegression(x, y);
    coefficients = [model.slope, model.intercept];
    predictions = x.map(xi => model.predict(xi));
    result = {
      equation: `y = ${model.slope.toFixed(4)}x + ${model.intercept.toFixed(4)}`,
      r2: model.score(x, y),
      points: x.map((xi, i) => [xi, y[i]]),
      predictions,
      coefficients
    };
  } else if (type === 'polynomial') {
    const degree = 2;
    const model = new PolynomialRegression(x, y, degree);
    coefficients = model.coefficients;
    predictions = x.map(xi => model.predict(xi));
    result = {
      equation: model.toString(3),
      r2: model.score(x, y),
      points: x.map((xi, i) => [xi, y[i]]),
      predictions,
      coefficients
    };
  } else {
    const points = x.map((xi, i) => [xi, y[i]]);
    const expReg = regression.exponential(points);
    predictions = x.map(xi => expReg.predict(xi)[1]);
    result = {
      equation: expReg.string,
      r2: expReg.r2,
      points: expReg.points,
      predictions,
      coefficients: expReg.equation
    };
  }

  return result;
}

export function calculateFeatureImportance(
  features: { [key: string]: number[] },
  target: number[]
): FeatureImportance[] {
  const importance: FeatureImportance[] = [];

  Object.entries(features).forEach(([feature, values]) => {
    // Calculate correlation
    const correlation = calculateCorrelation(values, target);
    
    // Calculate feature importance using variance
    const varianceImportance = calculateVarianceImportance(values, target);
    
    importance.push({
      feature,
      importance: varianceImportance,
      correlation: correlation
    });
  });

  // Sort by importance
  return importance.sort((a, b) => b.importance - a.importance);
}

// Helper functions

function calculateAutocorrelation(data: number[]): number[] {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b) / n;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  
  const autocorr = [];
  for (let lag = 0; lag < Math.floor(n / 2); lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += (data[i] - mean) * (data[i + lag] - mean);
    }
    autocorr.push(sum / (n * variance));
  }
  
  return autocorr;
}

function findSeasonalityPeriod(autocorr: number[]): number {
  const peaks = [];
  for (let i = 1; i < autocorr.length - 1; i++) {
    if (autocorr[i] > autocorr[i - 1] && autocorr[i] > autocorr[i + 1]) {
      peaks.push(i);
    }
  }
  
  if (peaks.length > 1) {
    return peaks[1] - peaks[0];
  }
  return 0;
}

function calculateMovingAverage(data: number[], window: number): number[] {
  const result = [];
  for (let i = 0; i < data.length - window + 1; i++) {
    const windowSlice = data.slice(i, i + window);
    result.push(windowSlice.reduce((a, b) => a + b) / window);
  }
  return result;
}

function tTest(group1: number[], group2: number[]): { statistic: number; pValue: number } {
  const n1 = group1.length;
  const n2 = group2.length;
  const mean1 = mean(group1);
  const mean2 = mean(group2);
  const var1 = Math.pow(standardDeviation(group1), 2);
  const var2 = Math.pow(standardDeviation(group2), 2);
  
  const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
  const statistic = (mean1 - mean2) / Math.sqrt(pooledVar * (1/n1 + 1/n2));
  
  // Approximate p-value using normal distribution
  const pValue = 2 * (1 - normalCDF(Math.abs(statistic)));
  
  return { statistic, pValue };
}

function oneWayANOVA(groups: number[][]): { fStatistic: number; pValue: number } {
  const allValues = groups.flat();
  const grandMean = mean(allValues);
  const n = allValues.length;
  const k = groups.length;
  
  // Between-group sum of squares
  const ssb = groups.reduce((sum, group) => {
    const groupMean = mean(group);
    return sum + group.length * Math.pow(groupMean - grandMean, 2);
  }, 0);
  
  // Within-group sum of squares
  const ssw = groups.reduce((sum, group) => {
    const groupMean = mean(group);
    return sum + group.reduce((s, val) => s + Math.pow(val - groupMean, 2), 0);
  }, 0);
  
  const dfb = k - 1;
  const dfw = n - k;
  
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  
  const fStatistic = msb / msw;
  const pValue = 1 - fDistribution(fStatistic, dfb, dfw);
  
  return { fStatistic, pValue };
}

function chiSquareTest(
  observed1: number[],
  observed2: number[]
): { statistic: number; pValue: number } {
  const observed = [observed1, observed2];
  const rowSums = observed.map(row => row.reduce((a, b) => a + b));
  const colSums = observed[0].map((_, i) => observed.reduce((sum, row) => sum + row[i], 0));
  const total = rowSums.reduce((a, b) => a + b);
  
  let statistic = 0;
  for (let i = 0; i < observed.length; i++) {
    for (let j = 0; j < observed[i].length; j++) {
      const expected = (rowSums[i] * colSums[j]) / total;
      statistic += Math.pow(observed[i][j] - expected, 2) / expected;
    }
  }
  
  const df = (observed.length - 1) * (observed[0].length - 1);
  const pValue = 1 - chiSquareDistribution(statistic, df);
  
  return { statistic, pValue };
}

function calculateSilhouetteScore(
  data: number[][],
  labels: number[],
  centroids: number[][]
): number {
  const n = data.length;
  let totalScore = 0;
  
  for (let i = 0; i < n; i++) {
    const a = calculateIntraClusterDistance(data[i], data, labels, labels[i]);
    const b = calculateInterClusterDistance(data[i], data, labels, labels[i], centroids);
    const s = (b - a) / Math.max(a, b);
    totalScore += s;
  }
  
  return totalScore / n;
}

function calculateIntraClusterDistance(
  point: number[],
  data: number[][],
  labels: number[],
  cluster: number
): number {
  const clusterPoints = data.filter((_, i) => labels[i] === cluster);
  if (clusterPoints.length <= 1) return 0;
  
  const distances = clusterPoints.map(p => euclideanDistance(point, p));
  return mean(distances);
}

function calculateInterClusterDistance(
  point: number[],
  data: number[][],
  labels: number[],
  cluster: number,
  centroids: number[][]
): number {
  const otherClusters = Array.from(new Set(labels)).filter(l => l !== cluster);
  const distances = otherClusters.map(c => {
    const clusterPoints = data.filter((_, i) => labels[i] === c);
    return mean(clusterPoints.map(p => euclideanDistance(point, p)));
  });
  return Math.min(...distances);
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, _, i) => sum + Math.pow(a[i] - b[i], 2), 0));
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominatorX += Math.pow(x[i] - meanX, 2);
    denominatorY += Math.pow(y[i] - meanY, 2);
  }
  
  return numerator / Math.sqrt(denominatorX * denominatorY);
}

function calculateVarianceImportance(feature: number[], target: number[]): number {
  const correlation = Math.abs(calculateCorrelation(feature, target));
  const variance = Math.pow(standardDeviation(feature), 2);
  return correlation * Math.sqrt(variance);
}

// Statistical distribution functions
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x: number): number {
  const t = 1.0 / (1.0 + 0.5 * Math.abs(x));
  const tau = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? 1 - tau : tau - 1;
}

function fDistribution(x: number, d1: number, d2: number): number {
  // Approximation of F-distribution CDF
  const z = d2 / (d2 + d1 * x);
  return 1 - betaIncomplete(d2/2, d1/2, z);
}

function chiSquareDistribution(x: number, df: number): number {
  // Approximation of chi-square distribution CDF
  return gammaIncomplete(df/2, x/2);
}

function betaIncomplete(a: number, b: number, x: number): number {
  // Approximation of incomplete beta function
  if (x < 0 || x > 1) return 0;
  const bt = (x === 0 || x === 1) ? 0 : Math.exp(
    gammaLn(a + b) - gammaLn(a) - gammaLn(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2)
    ? bt * betaContinuedFraction(a, b, x) / a
    : 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
}

function gammaIncomplete(a: number, x: number): number {
  // Approximation of incomplete gamma function
  if (x < 0) return 0;
  if (x < a + 1) return gammaSeriesExpansion(a, x);
  return 1 - gammaContinuedFraction(a, x);
}

function gammaLn(x: number): number {
  // Approximation of log gamma function
  const c = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.1208650973866179e-2,
    -0.5395239384953e-5
  ];
  let sum = 1.000000000190015;
  for (let i = 0; i < 6; i++) {
    sum += c[i] / (x + i + 1);
  }
  return (Math.log(2.5066282746310005 * sum) - 5.5) + (x + 0.5) * Math.log(x + 5.5) - (x + 5.5);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 3e-7;
  let am = 1;
  let bm = 1;
  let az = 1;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let bz = 1 - qab * x / qap;
  
  for (let m = 0; m < maxIterations; m++) {
    const em = m + 1;
    const tem = em + em;
    const d = em * (b - em) * x / ((qam + tem) * (a + tem));
    const ap = az + d * am;
    const bp = bz + d * bm;
    const d2 = -(a + em) * (qab + em) * x / ((qap + tem) * (a + tem));
    const app = ap + d2 * az;
    const bpp = bp + d2 * bz;
    const aold = az;
    am = ap / bpp;
    bm = bp / bpp;
    az = app / bpp;
    bz = 1;
    if (Math.abs(az - aold) < epsilon * Math.abs(az)) break;
  }
  return az;
}

function gammaSeriesExpansion(a: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 3e-7;
  let sum = 1/a;
  let ap = a;
  let del = sum;
  
  for (let n = 1; n < maxIterations; n++) {
    ap++;
    del *= x/ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * epsilon) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
}

function gammaContinuedFraction(a: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 3e-7;
  let b = x + 1 - a;
  let c = 1/Number.MIN_VALUE;
  let d = 1/b;
  let h = d;
  
  for (let i = 1; i < maxIterations; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < Number.MIN_VALUE) d = Number.MIN_VALUE;
    c = b + an/c;
    if (Math.abs(c) < Number.MIN_VALUE) c = Number.MIN_VALUE;
    d = 1/d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < epsilon) break;
  }
  return Math.exp(-x + a * Math.log(x) - gammaLn(a)) * h;
}