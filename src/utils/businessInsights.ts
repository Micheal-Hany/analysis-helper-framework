import { DatasetStats } from './statistics';

export interface BusinessInsight {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'revenue' | 'optimization' | 'risk' | 'opportunity';
  recommendations: string[];
}

export function generateBusinessInsights(stats: DatasetStats): BusinessInsight[] {
  const insights: BusinessInsight[] = [];

  // Data Quality Analysis
  const columnsWithHighMissing = Object.entries(stats.columns)
    .filter(([, stats]) => stats.missingPercentage > 10)
    .map(([col]) => col);

  if (columnsWithHighMissing.length > 0) {
    insights.push({
      title: 'Critical Data Quality Issues Detected',
      description: `High missing data rates in: ${columnsWithHighMissing.join(', ')}. This may impact analysis accuracy and decision-making reliability.`,
      impact: 'high',
      category: 'risk',
      recommendations: [
        'Implement data validation at collection points',
        'Set up automated data quality monitoring',
        'Review data collection processes for affected fields',
        'Consider mandatory field requirements where appropriate'
      ]
    });
  }

  // Performance Metrics Analysis
  const performanceMetrics = ['revenue_generated', 'number_of_products_sold', 'production_volumes'];
  performanceMetrics.forEach(metric => {
    const stats_metric = stats.columns[metric];
    if (stats_metric?.numeric_stats) {
      const outlierPercentage = (stats_metric.numeric_stats.outliers.length / stats.rowCount) * 100;
      
      if (outlierPercentage > 5) {
        insights.push({
          title: `Significant ${metric.replace(/_/g, ' ')} Variations`,
          description: `${outlierPercentage.toFixed(1)}% of ${metric.replace(/_/g, ' ')} values show unusual patterns. This could indicate either opportunities or risks.`,
          impact: 'high',
          category: 'opportunity',
          recommendations: [
            'Investigate high-performing instances for best practices',
            'Analyze underperforming cases for improvement opportunities',
            'Develop standardized performance metrics',
            'Set up automated anomaly detection'
          ]
        });
      }
    }
  });

  // Supply Chain Efficiency
  const efficiencyMetrics = ['lead_times', 'shipping_times', 'manufacturing_lead_time'];
  efficiencyMetrics.forEach(metric => {
    const stats_metric = stats.columns[metric];
    if (stats_metric?.numeric_stats) {
      const highValues = stats_metric.numeric_stats.outliers.filter(
        v => v > stats_metric.numeric_stats!.mean + stats_metric.numeric_stats!.std
      ).length;
      
      if (highValues > 0) {
        insights.push({
          title: `Supply Chain Bottlenecks Identified`,
          description: `${highValues} instances of extended ${metric.replace(/_/g, ' ')} detected. This impacts delivery efficiency and customer satisfaction.`,
          impact: 'medium',
          category: 'optimization',
          recommendations: [
            'Review and optimize supply chain processes',
            'Identify and address common delay causes',
            'Consider alternative suppliers or routes',
            'Implement real-time tracking and alerts'
          ]
        });
      }
    }
  });

  // Cost Analysis
  const costMetrics = ['shipping_costs', 'manufacturing_costs', 'costs'];
  costMetrics.forEach(metric => {
    const stats_metric = stats.columns[metric];
    if (stats_metric?.numeric_stats) {
      const highCosts = stats_metric.numeric_stats.outliers.filter(
        v => v > stats_metric.numeric_stats!.mean + 2 * stats_metric.numeric_stats!.std
      ).length;
      
      if (highCosts > 0) {
        insights.push({
          title: 'Cost Optimization Opportunity',
          description: `${highCosts} instances of significantly high ${metric.replace(/_/g, ' ')} identified. This represents potential savings opportunities.`,
          impact: 'high',
          category: 'revenue',
          recommendations: [
            'Conduct detailed cost analysis of high-cost instances',
            'Negotiate with suppliers for better rates',
            'Optimize routes and batch sizes',
            'Implement cost monitoring and alerting system'
          ]
        });
      }
    }
  });

  // Quality Control
  if (stats.columns['defect_rates']?.numeric_stats) {
    const defectStats = stats.columns['defect_rates'].numeric_stats!;
    if (defectStats.mean > 0.05) { // 5% defect rate threshold
      insights.push({
        title: 'Quality Control Improvement Required',
        description: `Average defect rate of ${(defectStats.mean * 100).toFixed(1)}% exceeds target threshold of 5%. This impacts customer satisfaction and increases costs.`,
        impact: 'high',
        category: 'risk',
        recommendations: [
          'Review quality control processes',
          'Implement additional inspection points',
          'Provide additional staff training',
          'Consider automated quality control systems'
        ]
      });
    }
  }

  // Inventory Management
  if (stats.columns['stock_levels']?.numeric_stats) {
    const stockStats = stats.columns['stock_levels'].numeric_stats!;
    const lowStockCount = stockStats.outliers.filter(v => v < stockStats.mean - stockStats.std).length;
    
    if (lowStockCount > 0) {
      insights.push({
        title: 'Inventory Management Risks',
        description: `${lowStockCount} instances of critically low stock levels detected. This could lead to stockouts and lost sales.`,
        impact: 'medium',
        category: 'risk',
        recommendations: [
          'Implement automated reordering system',
          'Review and adjust safety stock levels',
          'Develop better demand forecasting models',
          'Set up low-stock alerts'
        ]
      });
    }
  }

  // Correlation-based Insights
  Object.entries(stats.correlations).forEach(([col1, correlations]) => {
    Object.entries(correlations).forEach(([col2, value]) => {
      if (Math.abs(value) > 0.7 && col1 !== col2) {
        insights.push({
          title: 'Strong Relationship Discovered',
          description: `Strong correlation (${value.toFixed(2)}) found between ${col1.replace(/_/g, ' ')} and ${col2.replace(/_/g, ' ')}. This can be used for predictive modeling and optimization.`,
          impact: 'medium',
          category: 'opportunity',
          recommendations: [
            'Develop predictive models using these variables',
            'Use insights for forecasting and planning',
            'Monitor these metrics together',
            'Consider causation analysis'
          ]
        });
      }
    });
  });

  return insights;
}