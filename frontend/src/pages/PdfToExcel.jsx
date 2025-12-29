import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, Sheet } from 'lucide-react';
import axios from 'axios';

const PdfToExcel = () => {
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

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axios.post('/api/process/pdf-to-excel', formData, {
            responseType: 'blob',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'converted.xlsx');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("PDF to Excel error:", err);
        setError("Failed to convert PDF to Excel.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PDF to Excel - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Convert PDF data into editable Excel spreadsheets. Accurate table extraction online for free.",
    "featureList": "PDF to XLSX conversion, Table Extraction, Secure"
  };

  return (
    <ToolModal title="PDF to Excel">
      <SEO 
        title="PDF to Excel Converter - Export Data to XLSX" 
        description="Convert PDF to Excel spreadsheets online for free. Extract tables and data from PDF to editable Excel (XLSX) files accurately."
        keywords="pdf to excel, convert pdf to xlsx, pdf to sheet, extract pdf tables, data scraping pdf"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Extact data tables into editable Excel sheets.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border rounded-xl mb-6 relative group">
                <File className="w-16 h-16 text-green-600 mb-2" />
                <span className="font-medium text-gray-700">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-green-600 p-1"
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
                    className={`bg-green-600 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-green-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Converting...
                        </>
                    ) : (
                        <>
                            Convert to Excel <Sheet className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default PdfToExcel;
