import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Script to process Modi soft Excel files and convert to CSV format
function processModiSoftFile(filePath) {
  try {
    console.log(`Processing file: ${filePath}`);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON first to inspect structure
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log('Sample data structure:');
    console.log(jsonData.slice(0, 3));
    
    // Convert to CSV
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    
    // Save as CSV
    const outputPath = filePath.replace('.xls', '.csv');
    fs.writeFileSync(outputPath, csvData);
    
    console.log(`Converted to CSV: ${outputPath}`);
    console.log(`Total rows: ${jsonData.length}`);
    
    return { jsonData, csvPath: outputPath };
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

// Process the uploaded file
const inputFile = 'attached_assets/Sale-Transactions-(Jul-08--2025---Jul-08--2025)_1752114344853.xls';
processModiSoftFile(inputFile);