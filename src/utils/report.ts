import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DatasetStats } from './statistics';
import { BusinessInsight } from './businessInsights';

export function generateReport(
  stats: DatasetStats,
  insights: BusinessInsight[],
  originalFilename: string
): void {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  // Title Page
  doc.setFontSize(24);
  doc.setTextColor(44, 62, 80);
  doc.text('Data Analysis & Business Insights Report', 20, 30, { align: 'left' });
  
  doc.setFontSize(14);
  doc.setTextColor(52, 73, 94);
  doc.text(`Dataset: ${originalFilename}`, 20, 50);
  doc.text(`Generated: ${now}`, 20, 60);

  // Business Domain Overview
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text('Business Domain Overview', 20, 20);

  // Generate dynamic domain overview based on data characteristics
  const numericColumns = Object.entries(stats.columns).filter(([, stats]) => stats.type === 'numeric');
  const categoricalColumns = Object.entries(stats.columns).filter(([, stats]) => stats.type === 'categorical');
  
  const hasFinancialData = numericColumns.some(([col]) => 
    col.toLowerCase().includes('revenue') || 
    col.toLowerCase().includes('cost') || 
    col.toLowerCase().includes('price')
  );
  
  const hasSupplyChainData = Object.keys(stats.columns).some(col => 
    col.toLowerCase().includes('inventory') ||
    col.toLowerCase().includes('stock') ||
    col.toLowerCase().includes('shipping') ||
    col.toLowerCase().includes('supplier')
  );
  
  const hasManufacturingData = Object.keys(stats.columns).some(col =>
    col.toLowerCase().includes('production') ||
    col.toLowerCase().includes('manufacturing') ||
    col.toLowerCase().includes('defect')
  );

  // Construct dynamic overview
  let domainOverview = `This dataset comprises ${stats.rowCount} records across ${stats.columnCount} distinct metrics, `;
  domainOverview += `focusing on ${[
    hasFinancialData ? 'financial performance' : '',
    hasSupplyChainData ? 'supply chain operations' : '',
    hasManufacturingData ? 'manufacturing processes' : ''
  ].filter(Boolean).join(', ')}. `;
  
  domainOverview += `The data encompasses ${numericColumns.length} quantitative metrics and ${categoricalColumns.length} categorical variables, `;
  domainOverview += 'providing a comprehensive view of the business operations.';

  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  const domainLines = doc.splitTextToSize(domainOverview, 170);
  doc.text(domainLines, 20, 40);

  // Data Characteristics
  doc.setFontSize(16);
  doc.text('Key Data Characteristics', 20, 70);
  
  const dataCharacteristics = [
    ['Total Records', stats.rowCount.toString()],
    ['Total Metrics', stats.columnCount.toString()],
    ['Numeric Metrics', numericColumns.length.toString()],
    ['Categorical Metrics', categoricalColumns.length.toString()],
    ['Data Completeness', `${(100 - getAverageMissingPercentage(stats)).toFixed(1)}%`],
    ['Duplicate Rate', `${((stats.duplicateRows / stats.rowCount) * 100).toFixed(1)}%`]
  ];

  doc.autoTable({
    startY: 80,
    head: [['Characteristic', 'Value']],
    body: dataCharacteristics,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 12 }
  });

  // Column Analysis and Descriptions
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text('Data Dictionary & Analysis', 20, 20);

  let yPosition = 40;
  Object.entries(stats.columns).forEach(([columnName, columnStats]) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Column Name and Type
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text(`${columnName} (${columnStats.type})`, 20, yPosition);

    // Generate dynamic column description
    let description = '';
    if (columnStats.type === 'numeric') {
      const stats = columnStats.numericStats!;
      description = `Numerical metric with values ranging from ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)}. `;
      description += `Average value is ${stats.mean.toFixed(2)} with a standard deviation of ${stats.std.toFixed(2)}. `;
      if (stats.outliers.length > 0) {
        description += `Contains ${stats.outliers.length} outliers that may require attention. `;
      }
      if (columnStats.missingPercentage > 0) {
        description += `Missing data: ${columnStats.missingPercentage.toFixed(1)}% of records. `;
      }
    } else {
      const stats = columnStats.categoricalStats!;
      const topCats = stats.topCategories.map(c => c.value).slice(0, 3).join(', ');
      description = `Categorical variable with ${columnStats.uniqueValues} unique values. `;
      description += `Most common values: ${topCats}. `;
      if (columnStats.missingPercentage > 0) {
        description += `Missing data: ${columnStats.missingPercentage.toFixed(1)}% of records. `;
      }
    }

    // Add business context based on column name
    if (columnName.toLowerCase().includes('revenue') || columnName.toLowerCase().includes('cost')) {
      description += 'Critical financial metric for business performance analysis.';
    } else if (columnName.toLowerCase().includes('time') || columnName.toLowerCase().includes('duration')) {
      description += 'Important efficiency indicator for process optimization.';
    } else if (columnName.toLowerCase().includes('quantity') || columnName.toLowerCase().includes('level')) {
      description += 'Key operational metric for resource management.';
    }

    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    const descriptionLines = doc.splitTextToSize(description, 170);
    doc.text(descriptionLines, 25, yPosition + 10);

    // Add mini statistics table
    const statsData = [];
    if (columnStats.type === 'numeric') {
      statsData.push(
        ['Metric', 'Value'],
        ['Mean', columnStats.numericStats!.mean.toFixed(2)],
        ['Median', columnStats.numericStats!.median.toFixed(2)],
        ['Std Dev', columnStats.numericStats!.std.toFixed(2)]
      );
    } else {
      statsData.push(
        ['Metric', 'Value'],
        ['Unique Values', columnStats.uniqueValues.toString()],
        ['Top Value', columnStats.categoricalStats!.topCategories[0]?.value || 'N/A'],
        ['Missing %', `${columnStats.missingPercentage.toFixed(1)}%`]
      );
    }

    doc.autoTable({
      startY: yPosition + 10 + (descriptionLines.length * 7),
      body: statsData,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 40 }
      }
    });

    yPosition += 50 + (descriptionLines.length * 7);
  });

  // Correlations Analysis (if applicable)
  if (Object.keys(stats.correlations).length > 0) {
    doc.addPage();
    doc.setFontSize(20);
    doc.text('Correlation Analysis', 20, 20);

    // Filter significant correlations
    const significantCorrelations = [];
    Object.entries(stats.correlations).forEach(([col1, correlations]) => {
      Object.entries(correlations).forEach(([col2, value]) => {
        if (Math.abs(value) > 0.5 && col1 !== col2) {
          significantCorrelations.push([
            col1,
            col2,
            value.toFixed(2),
            getCorrelationStrength(value)
          ]);
        }
      });
    });

    if (significantCorrelations.length > 0) {
      doc.autoTable({
        startY: 30,
        head: [['Metric 1', 'Metric 2', 'Correlation', 'Strength']],
        body: significantCorrelations,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 }
      });
    }
  }

  // Save the PDF
  const cleanFilename = originalFilename.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_');
  doc.save(`data_analysis_report_${cleanFilename}.pdf`);
}

// Helper Functions
function getAverageMissingPercentage(stats: DatasetStats): number {
  const percentages = Object.values(stats.columns).map(col => col.missingPercentage);
  return percentages.reduce((a, b) => a + b, 0) / percentages.length;
}

function getCorrelationStrength(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 0.8) return 'Very Strong';
  if (absValue >= 0.6) return 'Strong';
  if (absValue >= 0.4) return 'Moderate';
  if (absValue >= 0.2) return 'Weak';
  return 'Very Weak';
}