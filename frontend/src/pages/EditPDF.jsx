import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Edit3, Type, Image as ImageIcon, Download, Square } from 'lucide-react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import * as fabric from 'fabric';

// Configure PDF.js worker
// Using CDN for worker to avoid build complexity with vite for now
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

const EditPDF = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [tool, setTool] = useState('text'); // text, draw
  const [color, setColor] = useState('#000000');

  const handleFiles = (fileList) => {
    if (fileList.length > 0) {
        setFile(fileList[0]);
        setError(null);
        loadPDF(fileList[0]);
    }
  };

  const loadPDF = async (pdfFile) => {
      setLoading(true);
      try {
          const arrayBuffer = await pdfFile.arrayBuffer();
          const loadedPdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          setPdfDoc(loadedPdf);
          setNumPages(loadedPdf.numPages);
          renderPage(loadedPdf, 1);
      } catch (err) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF.");
      } finally {
          setLoading(false);
      }
  };

  const renderPage = async (pdf, pageNum) => {
    if (!canvasRef.current) return;
    
    try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const bgImage = canvas.toDataURL("image/png");
        
        if (!fabricCanvasRef.current) {
            const fCanvas = new fabric.Canvas('fabric-canvas', {
                height: viewport.height,
                width: viewport.width,
            });
            fabricCanvasRef.current = fCanvas;
            
            // Set background (Fabric v6+)
            try {
                const img = await fabric.FabricImage.fromURL(bgImage);
                fCanvas.backgroundImage = img;
                fCanvas.backgroundImage.scaleX = fCanvas.width / img.width;
                fCanvas.backgroundImage.scaleY = fCanvas.height / img.height;
                fCanvas.requestRenderAll();
            } catch (err) {
                 // Fallback if FabricImage is not available (older versions or different export)
                 try {
                     const img = await fabric.Image.fromURL(bgImage);
                     fCanvas.backgroundImage = img;
                     fCanvas.backgroundImage.scaleX = fCanvas.width / img.width;
                     fCanvas.backgroundImage.scaleY = fCanvas.height / img.height;
                     fCanvas.requestRenderAll();
                 } catch (e) {
                     console.error("Fabric Image Error:", e);
                 }
            }
        } else {
             const fCanvas = fabricCanvasRef.current;
             fCanvas.clear();
             fCanvas.setDimensions({ width: viewport.width, height: viewport.height });
             
             try {
                const img = await fabric.FabricImage.fromURL(bgImage);
                fCanvas.backgroundImage = img;
                fCanvas.backgroundImage.scaleX = fCanvas.width / img.width;
                fCanvas.backgroundImage.scaleY = fCanvas.height / img.height;
                fCanvas.requestRenderAll();
             } catch (err) {
                 try {
                     const img = await fabric.Image.fromURL(bgImage);
                     fCanvas.backgroundImage = img;
                     fCanvas.backgroundImage.scaleX = fCanvas.width / img.width;
                     fCanvas.backgroundImage.scaleY = fCanvas.height / img.height;
                     fCanvas.requestRenderAll();
                 } catch (e) {
                      console.error("Fabric Image Error loop:", e);
                 }
             }
        }
    } catch (err) {
        console.error("Render Page Error:", err);
    }
  };

  // Tool handling
  useEffect(() => {
      if (!fabricCanvasRef.current) return;
      const canvas = fabricCanvasRef.current;
      
      canvas.isDrawingMode = (tool === 'draw');
      if (tool === 'draw') {
          canvas.freeDrawingBrush.width = 5;
          canvas.freeDrawingBrush.color = color;
      }
      
      // If tool is text, we add text on click or just add a text box immediately?
      // For simplicity, let's just add a text box when clicking the tool if needed, 
      // or button "Add Text"
  }, [tool, color]);

  const addText = () => {
    if (fabricCanvasRef.current) {
        const text = new fabric.IText('Type here', {
            left: 100,
            top: 100,
            fontFamily: 'Helvetica',
            fill: color,
            fontSize: 24
        });
        fabricCanvasRef.current.add(text);
        fabricCanvasRef.current.setActiveObject(text);
        setTool('select'); // Switch back to select/move
    }
  };
  
  const savePdf = async () => {
    if (!file || !fabricCanvasRef.current) return;
    setProcessing(true);
    
    // Collect objects
    // Use Overlay Strategy
    const originalBg = fabricCanvasRef.current.backgroundImage;
    const originalColor = fabricCanvasRef.current.backgroundColor;
    fabricCanvasRef.current.backgroundImage = null;
    fabricCanvasRef.current.backgroundColor = null; // Ensure transparent
    const overlayDataUrl = fabricCanvasRef.current.toDataURL({ format: 'png', multiplier: 2, enableRetinaScaling: true });
    fabricCanvasRef.current.backgroundImage = originalBg; 
    fabricCanvasRef.current.backgroundColor = originalColor; 
    
    try {
        // 1. Upload Original PDF to S3
        const pdfUploadRes = await axios.post('/api/s3/upload-url', {
             filename: file.name,
             contentType: file.type
        });
        const { uploadUrl: pdfUploadUrl, key: pdfKey } = pdfUploadRes.data;
        
        await fetch(pdfUploadUrl, {
             method: 'PUT',
             body: file,
             headers: { 'Content-Type': file.type }
        });

        // 2. Upload Overlay Image to S3 (Avoids 6MB body limit)
        // Convert Base64 to Blob
        const base64Response = await fetch(overlayDataUrl);
        const overlayBlob = await base64Response.blob();

        const overlayFilename = `overlay_${Date.now()}.png`;
        const overlayUploadRes = await axios.post('/api/s3/upload-url', {
            filename: overlayFilename,
            contentType: 'image/png'
        });
        const { uploadUrl: overlayUploadUrl, key: overlayKey } = overlayUploadRes.data;

        await fetch(overlayUploadUrl, {
            method: 'PUT',
            body: overlayBlob,
            headers: { 'Content-Type': 'image/png' }
        });

        // 3. Prepare Operations
        const op = {
            page: currentPage - 1,
            type: "image",
            key: overlayKey, // Send KEY instead of DATA
            x: 0,
            y: 0,
            width: fabricCanvasRef.current.width / 1.5,
            height: fabricCanvasRef.current.height / 1.5
        };
        const operations = JSON.stringify([op]);

        // 4. Trigger Edit
        const response = await axios.post('/api/process/edit', { key: pdfKey, operations });
        
        // 5. Download
        const { downloadUrl } = response.data;
        window.open(downloadUrl, '_blank');
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("Edit PDF Error:", err);
        setError("Failed to save edited PDF.");
    } finally {
        setProcessing(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Edit PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Edit your PDF files online for free. Add text, images, shapes, and annotations easily.",
    "featureList": "PDF Editor, Add Text, Draw, Annotate"
  };

  return (
    <ToolModal title="Edit PDF">
      <SEO 
        title="Edit PDF - Free Online PDF Editor" 
        description="Add text, shapes, comments and highlights to a PDF file online for free. Edit PDF documents easily without installation. Secure and fast."
        keywords="edit pdf, pdf editor, online pdf editor, free pdf editor, annotate pdf"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Add text, shapes, comments and highlights to a PDF file.
      </p>

        {!file ? (
            <div className="w-full">
                <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
            </div>
        ) : (
            <div className="w-full h-full flex flex-col">
                {/* Toolbar */}
                 <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                         <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={addText} 
                                className={`p-2 rounded-md flex items-center gap-1 transition ${tool === 'text' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                                title="Add Text"
                            >
                                <Type className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setTool('draw')} 
                                className={`p-2 rounded-md flex items-center gap-1 transition ${tool === 'draw' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                                title="Free Draw"
                            >
                                <Edit3 className="w-5 h-5" />
                            </button>
                        </div>

                         <div className="h-8 w-px bg-gray-300 mx-2"></div>

                        <div className="flex gap-1">
                            {['#000000', '#EC1D24', '#2563EB', '#16A34A', '#F59E0B'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-6 h-6 rounded-full border-2 transition ${color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={savePdf}
                            disabled={processing}
                            className={`bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 transition shadow-md flex items-center gap-2
                                ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {processing ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                            Save PDF
                        </button>
                         <button 
                            onClick={() => setFile(null)}
                            className="text-gray-400 hover:text-marvel-red p-2"
                        >
                            ✕
                        </button>
                    </div>
                 </div>

                 {error && (
                    <div className="mb-4 text-marvel-red font-medium text-center">
                        {error}
                    </div>
                 )}

                {/* Canvas Area */}
                <div className="flex-1 bg-gray-100 rounded-xl overflow-auto p-8 flex justify-center items-start border border-gray-200 min-h-0">
                    <div className="relative shadow-xl border bg-white">
                        {/* Hidden canvas for PDFjs render */}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <canvas id="fabric-canvas" className="bg-white" />
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                <Loader2 className="animate-spin w-10 h-10 text-purple-600" />
                            </div>
                        )}
                    </div>
                </div>
                
            </div>
        )}
    </ToolModal>
  );
};

export default EditPDF;
