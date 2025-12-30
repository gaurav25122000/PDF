import React, { useState } from 'react';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, FileText } from 'lucide-react';
import * as docx from 'docx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PdfToWord = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = (fileList) => {
    if (fileList.length > 0) {
        setFile(fileList[0]);
        setError(null);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        const docSections = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Sort items by Y (descending for Top-to-Bottom), then X (ascending)
            const items = textContent.items.filter(item => item.str.trim().length > 0).sort((a, b) => {
                const yA = Math.round(a.transform[5]);
                const yB = Math.round(b.transform[5]);
                if (Math.abs(yA - yB) > 4) return yB - yA; // Different lines (approx 4px tolerance)
                return a.transform[4] - b.transform[4]; // Same line, left to right
            });

            // Group into logical lines
            const lines = [];
            let currentLine = [];
            let currentY = null;

            items.forEach(item => {
                const y = Math.round(item.transform[5]);
                if (currentY === null) currentY = y;

                if (Math.abs(y - currentY) > 8) { // New Line Threshold
                    if (currentLine.length > 0) lines.push(currentLine);
                    currentLine = [];
                    currentY = y;
                }
                currentLine.push(item);
            });
            if (currentLine.length > 0) lines.push(currentLine);

            // Convert lines to DOCX Paragraphs
            const children = lines.map(line => {
                // Determine paragraph alignment or style?
                // For now, simple text runs
                const runs = line.map(span => {
                    // Font size scaling (PDF points vs Word half-points? Docx uses half-points usually, but 'size' prop in docx is complex)
                    // Check docx docs: size is in half-points (1/144 inch). PDF is points (1/72 inch).
                    // So multiply by 2.
                    // span.transform[0] is roughly font size (scaling factor)
                    const fontSize = Math.abs(span.transform[0]); 
                    
                    return new docx.TextRun({
                        text: span.str + (span.hasEOL ? "" : " "), // Add implied space? PDF text items often split words.
                        size: fontSize * 2, 
                        // font: span.fontName // Font mapping is hard
                    });
                });

                return new docx.Paragraph({
                    children: runs,
                    spacing: { after: 120 } // slight spacing
                });
            });

            docSections.push({
                properties: {},
                children: children
            });
        }

        const doc = new docx.Document({
            sections: docSections
        });

        const blob = await docx.Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        
        // Trigger Download
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace('.pdf', '.docx');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.dispatchEvent(new Event('usage-updated'));

    } catch (err) {
        console.error("PDF to Word error:", err);
        setError("Failed to convert PDF to Word locally. Please try a simpler file.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PDF to Word - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Mutate your PDFs into editable Word documents instantly. Convert PDF to Word online for free.",
    "featureList": "PDF to DOCX conversion, Accurate OCR, Secure",
  };

  return (
    <ToolModal title="PDF to Word">
      <SEO 
        title="PDF to Word Converter - Free Online Tool" 
        description="Convert PDF to Word documents online for free. Accurate conversion to editable DOCX files. No installation, fast and secure."
        keywords="pdf to word, convert pdf to word, pdf to docx, free pdf to word converter, online pdf converter"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Transform static PDFs into editable Word documents.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border rounded-xl mb-6 relative group">
                <File className="w-16 h-16 text-blue-600 mb-2" />
                <span className="font-medium text-gray-700">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 p-1"
                >
                    ✕
                </button>
            </div>
             
            {error && (
                <div className="mb-4 text-marvel-red font-medium text-center">
                    {error}
                </div>
            )}

            <div className="text-center sticky bottom-0 bg-white pt-2">
                <button 
                    onClick={processFile}
                    disabled={loading}
                    className={`bg-blue-600 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Converting...
                        </>
                    ) : (
                        <>
                            Convert to Word <FileText className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default PdfToWord;
