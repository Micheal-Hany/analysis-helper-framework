import { mean, median, standardDeviation, quantile, linearRegression } from 'simple-statistics';

export interface ColumnStats {
  type: 'numeric' | 'categorical';
  uniqueValues: number;
  missingCount: number;
  missingPercentage: number;
  numericStats?: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    outliers: number[];
  };
  categoricalStats?: {
    frequencies: { [key: string]: number };
    topCategories: { value: string; count: number }[];
  };
}

export interface DatasetStats {
  rowCount: number;
  columnCount: number;
  duplicateRows: number;
  columns: { [key: string]: ColumnStats };
  correlations: { [key: string]: { [key: string]: number } };
}

export function analyzeDataset(data: string[][]): DatasetStats {
  const headers = data[0];
  const rows = data.slice(1);
  
  // Check for duplicates
  const stringifiedRows = rows.map(row => JSON.stringify(row));
  const uniqueRows = new Set(stringifiedRows);
  const duplicateRows = rows.length - uniqueRows.size;

  // Initialize column statistics
  const columns: { [key: string]: ColumnStats } = {};
  const correlations: { [key: string]: { [key: string]: number } } = {};

  // Analyze each column
  headers.forEach((header, colIndex) => {
    const values = rows.map(row => row[colIndex]);
    const nonEmptyValues = values.filter(v => v !== '');
    
    // Check if column is numeric
    const numericValues = nonEmptyValues
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));
    
    const isNumeric = numericValues.length > 0.5 * nonEmptyValues.length;
    
    const missingCount = values.length - nonEmptyValues.length;
    const missingPercentage = (missingCount / values.length) * 100;
    
    if (isNumeric) {
      const q1 = quantile(numericValues, 0.25);
      const q3 = quantile(numericValues, 0.75);
      const iqr = q3 - q1;
      const outlierThreshold = 1.5 * iqr;
      const outliers = numericValues.filter(
        v => v < q1 - outlierThreshold || v > q3 + outlierThreshold
      );

      columns[header] = {
        type: 'numeric',
        uniqueValues: new Set(numericValues).size,
        missingCount,
        missingPercentage,
        numericStats: {
          mean: mean(numericValues),
          median: median(numericValues),
          std: standardDeviation(numericValues),
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          q1,
          q3,
          outliers
        }
      };
    } else {
      const frequencies: { [key: string]: number } = {};
      nonEmptyValues.forEach(value => {
        frequencies[value] = (frequencies[value] || 0) + 1;
      });

      const topCategories = Object.entries(frequencies)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));

      columns[header] = {
        type: 'categorical',
        uniqueValues: Object.keys(frequencies).length,
        missingCount,
        missingPercentage,
        categoricalStats: {
          frequencies,
          topCategories
        }
      };
    }
  });

  // Calculate correlations between numeric columns
  const numericColumns = headers.filter(header => columns[header].type === 'numeric');
  numericColumns.forEach(col1 => {
    correlations[col1] = {};
    numericColumns.forEach(col2 => {
      if (col1 === col2) {
        correlations[col1][col2] = 1;
      } else {
        const values1 = rows.map(row => parseFloat(row[headers.indexOf(col1)])).filter(v => !isNaN(v));
        const values2 = rows.map(row => parseFloat(row[headers.indexOf(col2)])).filter(v => !isNaN(v));
        
        // Calculate correlation only if we have matching pairs
        if (values1.length === values2.length && values1.length > 0) {
          const regression = linearRegression(values1.map((v, i) => [v, values2[i]]));
          correlations[col1][col2] = regression.r2 || 0;
        } else {
          correlations[col1][col2] = 0;
        }
      }
    });
  });

  return {
    rowCount: rows.length,
    columnCount: headers.length,
    duplicateRows,
    columns,
    correlations
  };
}