import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Settings, BarChart as ChartBar } from 'lucide-react';
import { Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
} from 'chart.js';
import { analyzeDataset } from './utils/statistics';
import { generateReport } from './utils/report';
import { generateBusinessInsights } from './utils/businessInsights';
import { parseFile } from './utils/fileHandler';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CleaningStats {
  row_count: number;
  column_count: number;
  columns: {
    [key: string]: {
      missing_count: number;
      missing_percentage: number;
      numeric_stats?: {
        mean: number;
        median: number;
        min: number;
        max: number;
        std: number;
        distribution?: number[];
      };
      categorical_stats?: {
        unique_values: number;
        top_values: { value: string; count: number }[];
      };
    };
  };
}

interface CleaningOptions {
  missingValues: {
    numeric: 'mean' | 'median' | 'zero' | 'remove';
    categorical: 'mode' | 'remove' | 'custom';
    customValue: string;
  };
  outliers: {
    method: 'none' | 'iqr' | 'zscore';
    threshold: number;
  };
  normalization: {
    enabled: boolean;
    method: 'minmax' | 'zscore';
  };
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<CleaningStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanedData, setCleanedData] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [rawData, setRawData] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    missingValues: {
      numeric: 'mean',
      categorical: 'mode',
      customValue: '',
    },
    outliers: {
      method: 'iqr',
      threshold: 1.5,
    },
    normalization: {
      enabled: false,
      method: 'minmax',
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile);
      setError(null);
      setCleanedData(null);
      setStats(null);
      setAnalysisStats(null);
      
      try {
        const data = await parseFile(selectedFile);
        if (data && data.length > 0) {
          setRawData(data);
          const initialStats = analyzeDataset(data);
          setStats(initialStats);
        }
      } catch (err) {
        setError('Failed to parse file');
      }
    } else {
      setError('Please select a valid CSV or Excel file');
      setFile(null);
    }
  };

  const handleClean = async () => {
    if (!file || !rawData.length) return;

    setLoading(true);
    setError(null);

    try {
      const headers = rawData[0];
      const rows = rawData.slice(1);
      
      // Process all rows
      const processedRows = rows.map(row => {
        return headers.map((header, index) => {
          let value = row[index]?.toString().trim() || '';
          
          // Apply cleaning options
          if (!value) {
            const columnStats = stats?.columns[header];
            if (columnStats?.numeric_stats) {
              switch (cleaningOptions.missingValues.numeric) {
                case 'mean':
                  value = columnStats.numeric_stats.mean.toString();
                  break;
                case 'median':
                  value = columnStats.numeric_stats.median.toString();
                  break;
                case 'zero':
                  value = '0';
                  break;
              }
            } else if (columnStats?.categorical_stats) {
              switch (cleaningOptions.missingValues.categorical) {
                case 'mode':
                  value = columnStats.categorical_stats.top_values[0]?.value || '';
                  break;
                case 'custom':
                  value = cleaningOptions.missingValues.customValue;
                  break;
              }
            }
          } else if (stats?.columns[header].numeric_stats && cleaningOptions.outliers.method !== 'none') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              const columnStats = stats.columns[header].numeric_stats!;
              if (cleaningOptions.outliers.method === 'iqr') {
                const q1 = columnStats.min;
                const q3 = columnStats.max;
                const iqr = q3 - q1;
                const lowerBound = q1 - cleaningOptions.outliers.threshold * iqr;
                const upperBound = q3 + cleaningOptions.outliers.threshold * iqr;
                
                if (numValue < lowerBound || numValue > upperBound) {
                  value = columnStats.median.toString();
                }
              } else if (cleaningOptions.outliers.method === 'zscore') {
                const zscore = Math.abs((numValue - columnStats.mean) / columnStats.std);
                if (zscore > cleaningOptions.outliers.threshold) {
                  value = columnStats.median.toString();
                }
              }
            }
          }

          if (stats?.columns[header].numeric_stats && cleaningOptions.normalization.enabled) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              const columnStats = stats.columns[header].numeric_stats!;
              if (cleaningOptions.normalization.method === 'minmax') {
                const normalized = (numValue - columnStats.min) / 
                  (columnStats.max - columnStats.min);
                value = normalized.toString();
              } else if (cleaningOptions.normalization.method === 'zscore') {
                const normalized = (numValue - columnStats.mean) / columnStats.std;
                value = normalized.toString();
              }
            }
          }

          return value;
        });
      });

      const cleanedCsv = [headers.join(','), ...processedRows.map(row => row.join(','))].join('\n');
      setCleanedData(cleanedCsv);
      
      // Update analysis stats
      const newStats = analyzeDataset([headers, ...processedRows]);
      setAnalysisStats(newStats);
    } catch (err) {
      setError('An error occurred while cleaning the data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!cleanedData) return;

    const blob = new Blob([cleanedData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${file?.name || 'data.csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleAnalyze = async () => {
    if (!cleanedData) return;
    
    const rows = cleanedData.split('\n').map(row => row.split(','));
    const stats = analyzeDataset(rows);
    setAnalysisStats(stats);
  };

  const handleExportReport = () => {
    if (!analysisStats || !file) return;
    
    const insights = generateBusinessInsights(analysisStats);
    generateReport(analysisStats, insights, file.name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Advanced Data Cleaning Assistant
          </h1>
          <p className="text-xl text-gray-600">
            Upload your CSV or Excel file, configure cleaning options, and get detailed insights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center justify-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mb-4"
              >
                <Upload className="w-5 h-5" />
                <span>Select File</span>
              </button>

              {file && (
                <div className="flex items-center space-x-2 text-gray-600 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>{file.name}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center space-x-2 text-red-500 mb-4">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors mb-4"
              >
                <Settings className="w-5 h-5" />
                <span>{showOptions ? 'Hide Options' : 'Show Options'}</span>
              </button>

              {showOptions && (
                <div className="w-full space-y-6 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Missing Values</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Numeric Columns
                        </label>
                        <select
                          value={cleaningOptions.missingValues.numeric}
                          onChange={(e) => setCleaningOptions({
                            ...cleaningOptions,
                            missingValues: {
                              ...cleaningOptions.missingValues,
                              numeric: e.target.value as 'mean' | 'median' | 'zero' | 'remove'
                            }
                          })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                        >
                          <option value="mean">Replace with Mean</option>
                          <option value="median">Replace with Median</option>
                          <option value="zero">Replace with Zero</option>
                          <option value="remove">Remove Row</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Categorical Columns
                        </label>
                        <select
                          value={cleaningOptions.missingValues.categorical}
                          onChange={(e) => setCleaningOptions({
                            ...cleaningOptions,
                            missingValues: {
                              ...cleaningOptions.missingValues,
                              categorical: e.target.value as 'mode' | 'remove' | 'custom'
                            }
                          })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                        >
                          <option value="mode">Replace with Mode</option>
                          <option value="remove">Remove Row</option>
                          <option value="custom">Custom Value</option>
                        </select>
                      </div>

                      {cleaningOptions.missingValues.categorical === 'custom' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Value
                          </label>
                          <input
                            type="text"
                            value={cleaningOptions.missingValues.customValue}
                            onChange={(e) => setCleaningOptions({
                              ...cleaningOptions,
                              missingValues: {
                                ...cleaningOptions.missingValues,
                                customValue: e.target.value
                              }
                            })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Outlier Detection</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Method
                        </label>
                        <select
                          value={cleaningOptions.outliers.method}
                          onChange={(e) => setCleaningOptions({
                            ...cleaningOptions,
                            outliers: {
                              ...cleaningOptions.outliers,
                              method: e.target.value as 'none' | 'iqr' | 'zscore'
                            }
                          })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                        >
                          <option value="none">None</option>
                          <option value="iqr">IQR Method</option>
                          <option value="zscore">Z-Score Method</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Threshold
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={cleaningOptions.outliers.threshold}
                          onChange={(e) => setCleaningOptions({
                            ...cleaningOptions,
                            outliers: {
                              ...cleaningOptions.outliers,
                              threshold: parseFloat(e.target.value)
                            }
                          })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Normalization</h3>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cleaningOptions.normalization.enabled}
                          onChange={(e) => setCleaningOptions({
                            ...cleaningOptions,
                            normalization: {
                              ...cleaningOptions.normalization,
                              enabled: e.target.checked
                            }
                          })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">
                          Enable Normalization
                        </label>
                      </div>

                      {cleaningOptions.normalization.enabled && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Method
                          </label>
                          <select
                            value={cleaningOptions.normalization.method}
                            onChange={(e) => setCleaningOptions({
                              ...cleaningOptions,
                              normalization: {
                                ...cleaningOptions.normalization,
                                method: e.target.value as 'minmax' | 'zscore'
                              }
                            })}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                          >
                            <option value="minmax">Min-Max Scaling</option>
                            <option value="zscore">Z-Score Standardization</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col w-full space-y-4 mt-6">
                <button
                  onClick={handleClean}
                  disabled={!file || loading}
                  className={`w-full bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors ${
                    !file || loading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-purple-700'
                  }`}
                >
                  {loading ? 'Cleaning...' : 'Clean Data'}
                </button>

                {cleanedData && (
                  <button
                    onClick={handleDownload}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download Cleaned Data</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {stats && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Data Analysis</h2>
                <div className="space-x-4">
                  <button
                    onClick={handleAnalyze}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Analyze Data
                  </button>
                  {analysisStats && (
                    <button
                      onClick={handleExportReport}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Export Report
                    </button>
                  )}
                </div>
              </div>

              {analysisStats && (
                <div className="space-y-8">
                  {/* Dataset Overview */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Rows</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {analysisStats.rowCount}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Columns</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {analysisStats.columnCount}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Duplicate Rows</p>
                      <p className="text-2xl font-bold text-red-600">
                        {analysisStats.duplicateRows}
                      </p>
                    </div>
                  </div>

                  {/* Column Analysis */}
                  <div className="space-y-6">
                    {Object.entries(analysisStats.columns).map(([column, stats]) => (
                      <div key={column} className="border rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-4">{column}</h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-gray-600">Type</p>
                              <p className="font-medium capitalize">{stats.type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Missing Values</p>
                              <p className="font-medium">
                                {stats.missingCount} ({stats.missingPercentage.toFixed(1)}%)
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Unique Values</p>
                              <p className="font-medium">{stats.uniqueValues}</p>
                            </div>
                          </div>

                          {stats.type === 'numeric' && stats.numericStats && (
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm text-gray-600">Distribution</p>
                                <Bar
                                  data={{
                                    labels: ['Q1', 'Median', 'Q3'],
                                    datasets: [
                                      {
                                        label: 'Value Distribution',
                                        data: [
                                          stats.numericStats.q1,
                                          stats.numericStats.median,
                                          stats.numericStats.q3
                                        ],
                                        backgroundColor: 'rgba(79, 70, 229, 0.6)'
                                      }
                                    ]
                                  }}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: {
                                        display: false
                                      }
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Outliers</p>
                                <p className="font-medium">
                                  {stats.numericStats.outliers.length} detected
                                </p>
                              </div>
                            </div>
                          )}

                          {stats.type === 'categorical' && stats.categoricalStats && (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Top Categories</p>
                              <Bar
                                data={{
                                  labels: stats.categoricalStats.topCategories.map(
                                    cat => cat.value
                                  ),
                                  datasets: [
                                    {
                                      label: 'Frequency',
                                      data: stats.categoricalStats.topCategories.map(
                                        cat => cat.count
                                      ),
                                      backgroundColor: 'rgba(79, 70, 229, 0.6)'
                                    }
                                  ]
                                }}
                                options={{
                                  responsive: true,
                                  plugins: {
                                    legend: {
                                      display: false
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Correlation Matrix */}
                  {Object.keys(analysisStats.correlations).length > 0 && (
                    <div className="border rounded-lg p-6">
                      <h3 className="text-xl font-semibold mb-4">Correlation Matrix</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-2"></th>
                              {Object.keys(analysisStats.correlations).map(col => (
                                <th key={col} className="px-4 py-2 text-sm font-medium text-gray-500">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {Object.entries(analysisStats.correlations).map(([col1, correlations]) => (
                              <tr key={col1}>
                                <td className="px-4 py-2 text-sm font-medium text-gray-500">
                                  {col1}
                                </td>
                                {Object.values(correlations).map((value, i) => (
                                  <td
                                    key={i}
                                    className="px-4 py-2 text-sm"
                                    style={{
                                      backgroundColor: `rgba(79, 70, 229, ${Math.abs(value)})`
                                    }}
                                  >
                                    {value.toFixed(2)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;