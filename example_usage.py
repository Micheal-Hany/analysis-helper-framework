from data_cleaner import DataCleaner

# Create an instance of the DataCleaner
cleaner = DataCleaner()

# Load data
cleaner.load_csv('data.csv')

# Handle missing values in numeric columns
numeric_columns = ['age', 'salary']
cleaner.handle_missing_values(numeric_columns, method='mean')

# Remove rows with too many missing values
cleaner.remove_high_missing_rows(threshold=0.3)

# Remove duplicates
cleaner.remove_duplicates()

# Fix data types
column_types = {
    'age': 'int',
    'salary': 'float',
    'hire_date': 'date'
}
cleaner.fix_data_types(column_types)

# Clean text columns
text_columns = ['name', 'department']
cleaner.clean_text(text_columns)

# Remove outliers from numeric columns
cleaner.remove_outliers(numeric_columns)

# Normalize numeric columns
cleaner.normalize_data(numeric_columns, method='minmax')

# Generate and print summary
cleaner.print_summary()

# Save cleaned data
cleaner.save_csv('cleaned_data.csv')