import { runProcessor } from '../_lib/runProcessor.js';
import { getDownloadUrl, uploadBuffer, downloadToBuffer } from '../_lib/s3.js';
import { applyCors, handleOptions, logUsage } from '../_lib/middleware.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
// Note: xlsx might need to be imported differently in ESM or requires shim
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

     try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        const buffer = await downloadToBuffer(key);
        
        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);
        const jsonStrExcel = await runProcessor('extract', { inputPath });
        const pages = JSON.parse(jsonStrExcel);
        await fs.promises.unlink(inputPath).catch(() => { });

        const allRows = [];
        pages.forEach(page => {
             const spans = [];
             let blocks = page.block || [];
             blocks.forEach(block => {
                  let lines = block.line || [];
                  lines.forEach(line => {
                       let lineSpans = line.span || [];
                       lineSpans.forEach(s => {
                            if (s.text.trim()) spans.push({ text: s.text, x: s.bbox[0], y: s.bbox[1] });
                       });
                  });
             });
             // Simple heuristic for rows
             spans.sort((a,b) => (Math.abs(a.y - b.y) > 5) ? a.y - b.y : a.x - b.x);
             
             let currentRow = [];
             let currentY = -9999;
             spans.forEach(span => {
                  if (Math.abs(span.y - currentY) > 10) {
                       if (currentRow.length > 0) allRows.push(currentRow);
                       currentRow = [];
                       currentY = span.y;
                  }
                  currentRow.push(span.text);
             });
             if (currentRow.length > 0) allRows.push(currentRow);
             allRows.push([]); // Spacer
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(allRows);
        XLSX.utils.book_append_sheet(wb, ws, "PDF Data");
        const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.xlsx`;
        await uploadBuffer(resultKey, xlsxBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await logUsage(req, 'PDF to Excel');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
     } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed." });
     }
}
