import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import SignatureModal from '../components/SignatureModal';
import { File, Loader2, PenTool, ShieldCheck, Plus } from 'lucide-react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as fabric from 'fabric';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SignPDF = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSignModal, setShowSignModal] = useState(false);

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
          renderPage(loadedPdf, 1);
      } catch (err) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF.");
      } finally {
          setLoading(false);
      }
  };

  // Effect to render page when currentPage or pdfDoc changes
  useEffect(() => {
      if (!pdfDoc) return;
      
      const render = async () => {
          setLoading(true);
          try {
             const page = await pdfDoc.getPage(currentPage);
             const viewport = page.getViewport({ scale: 1.5 }); // High quality preview
             
             // Render to canvas
             if (!canvasRef.current) return;
             // Ensure canvas has correct dimensions
             // Using CSS for display size, logic for resolution
             const canvas = new fabric.Canvas(canvasRef.current, {
                 width: viewport.width,
                 height: viewport.height
             });
             
             // Destroy old canvas if exists
             if (fabricCanvasRef.current) {
                 fabricCanvasRef.current.dispose();
             }
             fabricCanvasRef.current = canvas;

             // Render PDF page to image
             const canvasEl = document.createElement('canvas');
             const context = canvasEl.getContext('2d');
             canvasEl.height = viewport.height;
             canvasEl.width = viewport.width;
             
             await page.render({ canvasContext: context, viewport: viewport }).promise;
             const bgDataUrl = canvasEl.toDataURL();
             
             // Set background
             const ImageClass = fabric.FabricImage || fabric.Image;
             ImageClass.fromURL(bgDataUrl).then(img => {
                 canvas.backgroundImage = img;
                 canvas.requestRenderAll();
             });

          } catch (err) {
              console.error("Render error:", err);
              setError("Failed to render page.");
          } finally {
              setLoading(false);
          }
      };

      render();
      
      return () => {
        if (fabricCanvasRef.current) {
             fabricCanvasRef.current.dispose();
             fabricCanvasRef.current = null;
        }
      };
  }, [pdfDoc, currentPage]);

  const addSignature = (dataUrl) => {
    if (!fabricCanvasRef.current) return;
    const ImageClass = fabric.FabricImage || fabric.Image;
    ImageClass.fromURL(dataUrl).then(img => {
        img.scaleToWidth(150);
        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.centerObject(img);
        fabricCanvasRef.current.setActiveObject(img);
    });
  };

  const savePdf = async () => {
    if (!file || !fabricCanvasRef.current) return;
    setProcessing(true);
    
    // Export at hi-res
    // We only need the objects (signatures), not the background PDF
    const originalBg = fabricCanvasRef.current.backgroundImage;
    fabricCanvasRef.current.backgroundImage = null;
    const overlayData = fabricCanvasRef.current.toDataURL({ format: 'png', multiplier: 2 });
    fabricCanvasRef.current.backgroundImage = originalBg; 
    
    // Current logic assumes 1 page for now as per original code structure, 
    // or we can expand to multi-page later.
    const op = {
        // ... (rest of logic same)
        page: 0, 
        type: "image",
        data: overlayData,
        x: 0,
        y: 0,
        width: fabricCanvasRef.current.width / 1.5, 
        height: fabricCanvasRef.current.height / 1.5
    };

    const operations = JSON.stringify([op]);

    try {
        // 1. Upload to S3
        const uploadConfigRes = await axios.post('/api/s3/upload-url', {
             filename: file.name,
             contentType: file.type
        });
        const { uploadUrl, key } = uploadConfigRes.data;
        
        await fetch(uploadUrl, {
             method: 'PUT',
             body: file,
             headers: { 'Content-Type': file.type }
        });

        // 2. Trigger Process (Sign is same as Edit in backend)
        const response = await axios.post('/api/process/edit', { key, operations });

        // 3. Download
        const { downloadUrl } = response.data;
        window.open(downloadUrl, '_blank');
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("Sign PDF Error:", err);
        setError("Failed to sign PDF.");
    } finally {
        setProcessing(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Sign PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Sign PDF documents online for free. Draw your signature or upload an image to sign PDFs.",
    "featureList": "PDF Signing, Electronic Signature, Secure"
  };

  return (
    <ToolModal title="Sign PDF">
      <SEO 
        title="Sign PDF - Free Online PDF Signer" 
        description="Sign yourself or electronic signatures to PDF files online for free. Draw your signature or upload a signature image. Secure and legally binding."
        keywords="sign pdf, e-sign pdf, electronic signature, free pdf signer, sign document online"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Sign yourself or request electronic signatures.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden">
                {/* Preview Area */}
                <div className="flex-1 bg-gray-100 rounded-xl overflow-auto p-4 flex justify-center items-start border border-gray-200">
                     <div className="relative shadow-xl bg-white">
                        <canvas 
                            ref={canvasRef}
                            className="hidden" // Hidden because we use fabric canvas
                        />
                        <canvas id="sign-canvas" className="bg-white" />
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                <Loader2 className="animate-spin w-8 h-8 text-marvel-red" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls Area */}
                <div className="w-full md:w-80 flex flex-col gap-6 overflow-y-auto">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <PenTool className="w-5 h-5 mr-2 text-marvel-red" /> Signature Tools
                        </h3>
                        
                        <button 
                            onClick={() => setShowSignModal(true)}
                            className="w-full bg-marvel-red text-white font-bold py-4 rounded-xl hover:bg-red-700 transition shadow-md flex items-center justify-center gap-2 mb-4"
                        >
                            <Plus className="w-5 h-5" /> Add Signature
                        </button>
                        
                        <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
                            Click above to Draw, Type, or Upload a signature.
                            <br/>
                            Drag the signature on the PDF to position/resize it.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-marvel-red text-sm font-medium rounded-lg text-center">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <SignatureModal 
                isOpen={showSignModal} 
                onClose={() => setShowSignModal(false)} 
                onSave={addSignature} 
            />
            </div>

            {/* Bottom Action Bar */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center sticky bottom-0 bg-white">
                 <button 
                    onClick={savePdf}
                    disabled={processing || loading}
                    className={`bg-marvel-red text-white text-xl font-bold py-4 px-12 rounded-xl hover:bg-red-700 transition shadow-lg flex items-center justify-center gap-2
                        ${(processing || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {processing ? (
                        <>
                            <Loader2 className="animate-spin" /> Signing...
                        </>
                    ) : (
                        <>
                            Sign & Download PDF <ShieldCheck className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
            
            <div className="absolute top-4 right-4 z-10">
                 <button 
                    onClick={() => setFile(null)}
                    className="bg-white/90 p-2 rounded-full shadow-sm hover:text-marvel-red transition"
                    title="Close file"
                >
                    ✕
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default SignPDF;
