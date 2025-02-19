# Advanced Data Cleaning & Analysis Platform

A powerful web-based platform for data cleaning, analysis, and business insights generation. Built with React, TypeScript, and modern data processing libraries.

![Data Analysis Platform](https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000)

## 🚀 Features

### Data Import & Processing
- Support for CSV and Excel files (`.csv`, `.xlsx`, `.xls`)
- Automatic data type detection
- Real-time data preview
- Handles large datasets efficiently

### Advanced Data Cleaning
- **Missing Value Handling**
  - Multiple strategies for numeric data (mean, median, zero, remove)
  - Categorical data handling (mode, custom value, remove)
  - Configurable per column type

- **Outlier Detection & Treatment**
  - IQR (Interquartile Range) method
  - Z-score method
  - Configurable thresholds
  - Automatic replacement with median values

- **Data Normalization**
  - Min-Max scaling
  - Z-score standardization
  - Selective column normalization

### Comprehensive Analysis
- **Statistical Analysis**
  - Descriptive statistics (mean, median, std dev)
  - Distribution analysis
  - Outlier detection
  - Missing value analysis

- **Correlation Analysis**
  - Automatic correlation detection
  - Strength assessment
  - Visual correlation matrix

- **Data Quality Assessment**
  - Completeness metrics
  - Duplicate detection
  - Data type validation
  - Value distribution analysis

### Visualization & Reporting
- **Interactive Charts**
  - Distribution plots
  - Bar charts for categorical data
  - Correlation heatmaps

- **PDF Report Generation**
  - Comprehensive data dictionary
  - Statistical summaries
  - Business domain analysis
  - Data quality metrics
  - Correlation insights

### Business Insights
- Automatic business domain detection
- Critical metric identification
- Performance indicators
- Optimization opportunities
- Risk assessment

## 🛠️ Technology Stack

- **Frontend Framework**: React 18.x
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with React-Chartjs-2
- **PDF Generation**: jsPDF with jsPDF-autotable
- **Data Processing**: Simple-statistics
- **File Handling**: XLSX
- **Icons**: Lucide React
- **Build Tool**: Vite

## 📋 Requirements

- Node.js 16.x or higher
- npm 7.x or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/data-analysis-platform.git
   cd data-analysis-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 💡 Usage Guide

### 1. Data Import
1. Click "Select File" to upload your CSV or Excel file
2. The platform automatically analyzes the data and displays initial statistics

### 2. Configure Cleaning Options
1. Click "Show Options" to access cleaning settings
2. Configure missing value handling strategies
3. Set outlier detection parameters
4. Enable/disable normalization

### 3. Clean Data
1. Review the cleaning options
2. Click "Clean Data" to process the dataset
3. Download the cleaned dataset using "Download Cleaned Data"

### 4. Analysis & Insights
1. View automatic statistical analysis
2. Explore data visualizations
3. Review correlation analysis
4. Generate comprehensive PDF report

## 📊 Example Data Format

The platform accepts CSV and Excel files with the following characteristics:
- Header row with column names
- Mixed numeric and categorical data
- Missing values allowed
- No row limit (performance depends on browser capabilities)

Example structure:
```csv
date,revenue,quantity,category,region
2023-01-01,1500.50,100,Electronics,North
2023-01-02,2100.75,150,Apparel,South
...
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Chart.js for visualization capabilities
- Tailwind CSS for styling
- React team for the amazing framework
- All contributors and users of this platform

## 📧 Contact

For questions, suggestions, or issues, please:
1. Open an issue in this repository
2. Contact the maintainers
3. Join our community discussions

---

Made with ❤️ for data analysts and business professionals