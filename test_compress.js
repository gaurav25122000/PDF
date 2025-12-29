
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const { PDFDocument } = require('pdf-lib');

const API_URL = 'http://localhost:3000';

async function createLargePdf() {
    const pdfDoc = await PDFDocument.create();
    // Add many pages to make it somewhat "large" (though vector is small, it's a valid PDF)
    // To truly test compression we'd need high-res images, but this verifies the flow.
    for (let i = 0; i < 50; i++) {
        const page = pdfDoc.addPage();
        page.drawText(`Page ${i + 1}`, { x: 50, y: 500, size: 50 });
    }
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('test_large.pdf', pdfBytes);
    return 'test_large.pdf';
}

async function run() {
    try {
        console.log('1. Creating Test PDF...');
        const filename = await createLargePdf();
        const stats = fs.statSync(filename);
        console.log(`   FileSize: ${stats.size} bytes`);

        console.log('2. Getting S3 Upload URL...');
        const initRes = await axios.post(`${API_URL}/api/s3/upload-url`, {
            filename: 'test.pdf',
            contentType: 'application/pdf'
        });
        const { uploadUrl, key } = initRes.data;
        console.log(`   Key: ${key}`);

        console.log('3. Uploading to Fake S3 (or real if env set)...');
        // Note: If S3 credentials aren't set in backend, this upload might fail or be mocked?
        // Wait, the backend uses 's3.js'. If AWS env vars aren't set, it fails or uses mock?
        // The implementation uses @aws-sdk. Without creds, getSignedUrl returns a URL but PUT might fail "Forbidden" unless bucket is public-write?
        // Let's assume we can PUT to the URL if it's correct.
        
        await axios.put(uploadUrl, fs.readFileSync(filename), {
            headers: { 'Content-Type': 'application/pdf' }
        });

        console.log('4. Triggering Compression...');
        const compressRes = await axios.post(`${API_URL}/api/process/compress`, { key });
        const { downloadUrl } = compressRes.data;
        console.log(`   Success! Result: ${downloadUrl}`);

    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

run();
