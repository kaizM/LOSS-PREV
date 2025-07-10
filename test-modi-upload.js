import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test uploading the Modi soft data
async function testModiSoftUpload() {
  try {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    
    const filePath = path.join(__dirname, 'attached_assets', 'Sale-Transactions-(Jul-08--2025---Jul-08--2025)_1752114344853.xls');
    
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return;
    }
    
    form.append('posFile', fs.createReadStream(filePath));
    
    const response = await fetch('http://localhost:5000/api/upload/pos', {
      method: 'POST',
      body: form,
    });
    
    const result = await response.json();
    console.log('Upload result:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log(`Successfully processed ${result.transactions?.length || 0} transactions`);
    } else {
      console.log('Upload failed:', result.message);
    }
    
  } catch (error) {
    console.error('Error testing upload:', error);
  }
}

testModiSoftUpload();