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

  // Data Quality Overview
  doc.addPage();
  doc.setFontSize(20);
  doc.text('Data Quality Overview', 20, 20);

  const dataQualityMetrics = [
    ['Total Records', stats.rowCount.toString()],
    ['Total Fields', stats.columnCount.toString()],
    ['Duplicate Records', stats.duplicateRows.toString()],
    ['Data Completeness', `${(100 - getAverageMissingPercentage(stats)).toFixed(1)}%`]
  ];

  doc.autoTable({
    startY: 30,
    head: [['Metric', 'Value']],
    body: dataQualityMetrics,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 12 }
  });

  // Missing Values Summary
  const missingValuesSummary = Object.entries(stats.columns)
    .filter(([, colStats]) => colStats.missingCount > 0)
    .map(([column, colStats]) => [
      column,
      colStats.missingCount.toString(),
      `${colStats.missingPercentage.toFixed(1)}%`
    ]);

  if (missingValuesSummary.length > 0) {
    doc.addPage();
    doc.setFontSize(20);
    doc.text('Missing Values Analysis', 20, 20);

    doc.autoTable({
      startY: 30,
      head: [['Column', 'Missing Count', 'Missing %']],
      body: missingValuesSummary,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 12 }
    });
  }

  // Business Insights
  doc.addPage();
  doc.setFontSize(20);
  doc.text('Business Insights & Recommendations', 20, 20);

  let yPosition = 40;
  insights.forEach((insight, index) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Insight Title with Impact Indicator
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    const impactColor = getImpactColor(insight.impact);
    doc.setTextColor(impactColor[0], impactColor[1], impactColor[2]);
    doc.text(`${index + 1}. ${insight.title} [Impact: ${insight.impact.toUpperCase()}]`, 20, yPosition);
    
    // Insight Description
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    const descriptionLines = doc.splitTextToSize(insight.description, 170);
    doc.text(descriptionLines, 25, yPosition + 10);
    
    // Recommendations
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    doc.text('Recommendations:', 25, yPosition + 25);
    
    insight.recommendations.forEach((rec, i) => {
      doc.text(`• ${rec}`, 30, yPosition + 35 + (i * 10));
    });

    yPosition += 60 + (insight.recommendations.length * 10);
  });

  // Detailed Column Analysis
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text('Detailed Column Analysis', 20, 20);

  let columnY = 40;
  Object.entries(stats.columns).forEach(([columnName, columnStats]) => {
    if (columnY > 250) {
      doc.addPage();
      columnY = 20;
    }

    // Column Header
    doc.setFontSize(14);
    doc.setTextColor(41, 128, 185);
    doc.text(columnName, 20, columnY);

    // Column Details
    const details = [];
    details.push(['Type', columnStats.type]);
    details.push(['Missing Values', `${columnStats.missingPercentage.toFixed(1)}%`]);
    details.push(['Unique Values', columnStats.uniqueValues.toString()]);

    if (columnStats.type === 'numeric' && columnStats.numericStats) {
      details.push(
        ['Mean', columnStats.numericStats.mean.toFixed(2)],
        ['Median', columnStats.numericStats.median.toFixed(2)],
        ['Std Dev', columnStats.numericStats.std.toFixed(2)],
        ['Range', `${columnStats.numericStats.min.toFixed(2)} - ${columnStats.numericStats.max.toFixed(2)}`],
        ['Outliers', columnStats.numericStats.outliers.length.toString()]
      );
    }

    if (columnStats.type === 'categorical' && columnStats.categoricalStats) {
      const topCategories = columnStats.categoricalStats.topCategories
        .map(cat => `${cat.value} (${cat.count})`)
        .join(', ');
      details.push(['Top Categories', topCategories]);
    }

    doc.autoTable({
      startY: columnY + 5,
      body: details,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 130 }
      }
    });

    columnY = doc.lastAutoTable?.finalY! + 20;
  });

  // Correlations Analysis (if applicable)
  if (Object.keys(stats.correlations).length > 0) {
    doc.addPage();
    doc.setFontSize(20);
    doc.text('Correlation Analysis', 20, 20);

    const correlationData = Object.entries(stats.correlations).map(([col1, correlations]) => {
      return [col1, ...Object.values(correlations).map(v => v.toFixed(2))];
    });

    doc.autoTable({
      startY: 30,
      head: [['', ...Object.keys(stats.correlations)]],
      body: correlationData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const value = parseFloat(data.cell.text[0]);
          if (Math.abs(value) > 0.7) {
            data.cell.styles.fillColor = [41, 128, 185, 0.3];
          }
        }
      }
    });
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

function getImpactColor(impact: 'high' | 'medium' | 'low'): [number, number, number] {
  switch (impact) {
    case 'high':
      return [231, 76, 60]; // Red
    case 'medium':
      return [243, 156, 18]; // Orange
    case 'low':
      return [46, 204, 113]; // Green
    default:
      return [52, 73, 94]; // Default gray
  }
}