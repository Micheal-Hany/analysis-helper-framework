import { read, utils } from 'xlsx';

export async function parseFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        
        if (file.name.endsWith('.csv')) {
          const text = data as string;
          const rows = text.split('\n').map(row => row.split(','));
          resolve(rows);
        } else {
          const workbook = read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = utils.sheet_to_json(firstSheet, { header: 1 });
          resolve(jsonData as string[][]);
        }
      } catch (error) {
        reject(new Error('Failed to parse file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}