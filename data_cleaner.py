import csv
import json
import statistics
from datetime import datetime
import re
from typing import List, Dict, Union, Optional, Any
import math

class DataCleaner:
    def __init__(self):
        self.data: List[Dict] = []
        self.columns: List[str] = []
        self.summary: Dict = {}

    def load_csv(self, filepath: str, delimiter: str = ',') -> None:
        """Load data from CSV file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file, delimiter=delimiter)
                self.columns = reader.fieldnames or []
                self.data = [row for row in reader]
            print(f"Loaded {len(self.data)} rows and {len(self.columns)} columns")
        except Exception as e:
            print(f"Error loading CSV: {str(e)}")

    def save_csv(self, filepath: str, delimiter: str = ',') -> None:
        """Save data to CSV file"""
        try:
            with open(filepath, 'w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.columns, delimiter=delimiter)
                writer.writeheader()
                writer.writerows(self.data)
            print(f"Saved {len(self.data)} rows to {filepath}")
        except Exception as e:
            print(f"Error saving CSV: {str(e)}")

    def handle_missing_values(self, columns: List[str], method: str = 'mean') -> None:
        """Fill missing values using specified method (mean/median/mode)"""
        for column in columns:
            values = [float(row[column]) for row in self.data if row[column].strip()]
            if not values:
                continue

            if method == 'mean':
                fill_value = str(statistics.mean(values))
            elif method == 'median':
                fill_value = str(statistics.median(values))
            elif method == 'mode':
                fill_value = str(statistics.mode(values))
            else:
                raise ValueError("Method must be 'mean', 'median', or 'mode'")

            for row in self.data:
                if not row[column].strip():
                    row[column] = fill_value

    def remove_high_missing_rows(self, threshold: float = 0.5) -> None:
        """Remove rows with missing values above threshold"""
        initial_count = len(self.data)
        self.data = [
            row for row in self.data
            if sum(1 for v in row.values() if not v.strip()) / len(row) <= threshold
        ]
        print(f"Removed {initial_count - len(self.data)} rows with high missing values")

    def remove_duplicates(self, columns: Optional[List[str]] = None) -> None:
        """Remove duplicate rows based on specified columns"""
        if columns is None:
            columns = self.columns

        seen = set()
        unique_data = []
        
        for row in self.data:
            key = tuple(row[col] for col in columns)
            if key not in seen:
                seen.add(key)
                unique_data.append(row)
        
        removed = len(self.data) - len(unique_data)
        self.data = unique_data
        print(f"Removed {removed} duplicate rows")

    def fix_data_types(self, column_types: Dict[str, str]) -> None:
        """Convert columns to specified types"""
        for column, type_name in column_types.items():
            if column not in self.columns:
                continue

            for row in self.data:
                value = row[column].strip()
                if not value:
                    continue

                try:
                    if type_name == 'int':
                        row[column] = str(int(float(value)))
                    elif type_name == 'float':
                        row[column] = str(float(value))
                    elif type_name == 'date':
                        # Attempt to parse date - adjust format as needed
                        date = datetime.strptime(value, '%Y-%m-%d')
                        row[column] = date.strftime('%Y-%m-%d')
                except (ValueError, TypeError):
                    print(f"Could not convert value '{value}' to {type_name}")

    def clean_text(self, columns: List[str]) -> None:
        """Clean text in specified columns"""
        for column in columns:
            if column not in self.columns:
                continue

            for row in self.data:
                # Remove special characters and extra spaces
                text = row[column]
                text = re.sub(r'[^\w\s]', '', text)
                text = ' '.join(text.split())
                text = text.lower()
                row[column] = text

    def remove_outliers(self, columns: List[str], threshold: float = 1.5) -> None:
        """Remove outliers using IQR method"""
        initial_count = len(self.data)
        rows_to_keep = []

        for row in self.data:
            keep = True
            for column in columns:
                try:
                    value = float(row[column])
                    values = [float(r[column]) for r in self.data]
                    q1 = statistics.quantiles(values, n=4)[0]
                    q3 = statistics.quantiles(values, n=4)[2]
                    iqr = q3 - q1
                    lower_bound = q1 - (threshold * iqr)
                    upper_bound = q3 + (threshold * iqr)
                    
                    if value < lower_bound or value > upper_bound:
                        keep = False
                        break
                except (ValueError, TypeError):
                    continue
            
            if keep:
                rows_to_keep.append(row)

        self.data = rows_to_keep
        print(f"Removed {initial_count - len(self.data)} outliers")

    def normalize_data(self, columns: List[str], method: str = 'minmax') -> None:
        """Normalize numerical columns using min-max or standard scaling"""
        for column in columns:
            try:
                values = [float(row[column]) for row in self.data]
                if method == 'minmax':
                    min_val = min(values)
                    max_val = max(values)
                    range_val = max_val - min_val
                    for row in self.data:
                        if range_val != 0:
                            normalized = (float(row[column]) - min_val) / range_val
                            row[column] = str(normalized)
                elif method == 'standard':
                    mean = statistics.mean(values)
                    stdev = statistics.stdev(values)
                    for row in self.data:
                        if stdev != 0:
                            normalized = (float(row[column]) - mean) / stdev
                            row[column] = str(normalized)
            except (ValueError, TypeError):
                print(f"Could not normalize column {column}")

    def generate_summary(self) -> Dict:
        """Generate summary statistics for the dataset"""
        summary = {
            'row_count': len(self.data),
            'column_count': len(self.columns),
            'columns': {}
        }

        for column in self.columns:
            col_summary = {
                'missing_count': 0,
                'missing_percentage': 0,
                'numeric_stats': None
            }

            # Count missing values
            missing = sum(1 for row in self.data if not row[column].strip())
            col_summary['missing_count'] = missing
            col_summary['missing_percentage'] = (missing / len(self.data)) * 100 if self.data else 0

            # Try numeric statistics
            try:
                numeric_values = [float(row[column]) for row in self.data if row[column].strip()]
                if numeric_values:
                    col_summary['numeric_stats'] = {
                        'mean': statistics.mean(numeric_values),
                        'median': statistics.median(numeric_values),
                        'min': min(numeric_values),
                        'max': max(numeric_values),
                        'std': statistics.stdev(numeric_values) if len(numeric_values) > 1 else 0
                    }
            except (ValueError, TypeError):
                pass  # Not numeric data

            summary['columns'][column] = col_summary

        self.summary = summary
        return summary

    def print_summary(self) -> None:
        """Print summary statistics in a readable format"""
        summary = self.generate_summary()
        
        print("\n=== Dataset Summary ===")
        print(f"Total Rows: {summary['row_count']}")
        print(f"Total Columns: {summary['column_count']}")
        
        print("\n=== Column Statistics ===")
        for column, stats in summary['columns'].items():
            print(f"\nColumn: {column}")
            print(f"Missing Values: {stats['missing_count']} ({stats['missing_percentage']:.2f}%)")
            
            if stats['numeric_stats']:
                ns = stats['numeric_stats']
                print("Numeric Statistics:")
                print(f"  Mean: {ns['mean']:.2f}")
                print(f"  Median: {ns['median']:.2f}")
                print(f"  Min: {ns['min']:.2f}")
                print(f"  Max: {ns['max']:.2f}")
                print(f"  Std Dev: {ns['std']:.2f}")