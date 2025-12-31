import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import SignatureModal from '../components/SignatureModal';
import PDFPage from '../components/PDFPage';
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
  
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const [showSignModal, setShowSignModal] = useState(false);

  const canvasMap = useRef(new Map());
  const observerRef = useRef(null);
  const pagesContainerRef = useRef(null);

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
          
          // Reset
          canvasMap.current.clear();
          setActivePage(1);

      } catch (err) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF.");
      } finally {
          setLoading(false);
      }
  };


  useEffect(() => {
      if (!numPages || !pagesContainerRef.current) return;

      const options = {
          root: pagesContainerRef.current,
          rootMargin: '0px',
          threshold: 0.5
      };

      const callback = (entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  const page = parseInt(entry.target.getAttribute('data-page'));
                  if (page) setActivePage(page);
              }
          });
      };

      const observer = new IntersectionObserver(callback, options);
      observerRef.current = observer;


      const pages = pagesContainerRef.current.querySelectorAll('[data-page]');
      pages.forEach(p => observer.observe(p));

      return () => observer.disconnect();
  }, [numPages]);

  // Dynamic Scale
  useEffect(() => {
      const calcScale = async () => {
         if (!pdfDoc || !pagesContainerRef.current) return;
         try {
             // Get first page to determine width fit
             const page = await pdfDoc.getPage(1);
             const viewport = page.getViewport({ scale: 1 });
             const containerWidth = pagesContainerRef.current.clientWidth - 48; // -48 for padding
             if (containerWidth > 0) {
                 const newScale = containerWidth / viewport.width;
                 setScale(newScale);
             }
         } catch (e) {
             console.error("Scale error:", e);
         }
      };
      
      calcScale();
      window.addEventListener('resize', calcScale);
      return () => window.removeEventListener('resize', calcScale);
  }, [pdfDoc]);

  const handleCanvasReady = (pageNumber, canvas) => {
      if (canvas) {
        canvasMap.current.set(pageNumber, canvas);

        if (observerRef.current) {
            const el = pagesContainerRef.current?.querySelector(`[data-page="${pageNumber}"]`);
            if (el) observerRef.current.observe(el);
        }
      } else {
        canvasMap.current.delete(pageNumber);
      }
  };

  const addSignature = (dataUrl) => {

      const canvas = canvasMap.current.get(activePage);
      if (!canvas) {
          alert("Active page not ready.");
          return;
      }

      const ImageClass = fabric.FabricImage || fabric.Image;
      ImageClass.fromURL(dataUrl).then(img => {
          img.scaleToWidth(150);
          canvas.add(img);
          canvas.centerObject(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
      });
  };

  const savePdf = async () => {
    if (!file || canvasMap.current.size === 0) return;
    setProcessing(true);
    
    try {
        const operations = [];

        // Collect operations from all pages
        for (const [pageIndex, canvas] of canvasMap.current.entries()) {
            const objects = canvas.getObjects();
            
            for (const obj of objects) {
                if (obj.type === 'image' || obj.type === 'fabric-image') {
                     const dataUrl = obj.toDataURL({ format: 'png', multiplier: 2 });
                     
                     const originalBg = canvas.backgroundImage;
                     canvas.backgroundImage = null; // Hide PDF
                     const overlay = canvas.toDataURL({ format: 'png', multiplier: 2 });
                     canvas.backgroundImage = originalBg; // Restore
                     
                     if (canvas.getObjects().length > 0) {
                         operations.push({
                             page: pageIndex - 1, // 0-based
                             type: 'image',
                             data: overlay,
                             x: 0,
                             y: 0
                         });
                     }
                }
            }
        }
        
        for (let i = 0; i < operations.length; i++) {
             const op = operations[i];
             const page = await pdfDoc.getPage(op.page + 1);
             const vp = page.getViewport({ scale: 1 });
             op.width = vp.width;
             op.height = vp.height;
        }
        
        if (operations.length === 0) {
             alert("No signatures/changes found to save.");
             setProcessing(false);
             return;
        }

        const opsJson = JSON.stringify(operations);

        // 1. Upload
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

        // 2. Trigger Process
        const response = await axios.post('/api/process/edit', { key, operations: opsJson });

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
      
      <p className="text-gray-400 mb-6 text-center">
        Sign yourself or request electronic signatures.
      </p>

      {/* File Loaded View */}
      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col relative">
            
             {/* Close File Button */}
             <div className="absolute top-4 right-4 z-20">
                 <button 
                    onClick={() => setFile(null)}
                    className="bg-black/50 hover:bg-red-500/80 p-2 rounded-full backdrop-blur-md text-white border border-white/10 transition-all shadow-lg"
                    title="Close file"
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden relative">
                
                {/* PDF Viewer Container */}
                <div ref={pagesContainerRef} className="flex-1 bg-[#0f0f0f] rounded-xl overflow-auto p-4 flex flex-col items-center border border-white/10 relative custom-scrollbar shadow-inner">
                     {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                         <div key={page} className="shadow-2xl mb-4">
                            <PDFPage 
                                pageNumber={page} 
                                pdfDoc={pdfDoc}
                                onCanvasReady={handleCanvasReady}
                                scale={scale}
                            />
                         </div>
                     ))}
                     
                     {loading && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                            <div className="flex flex-col items-center">
                                <Loader2 className="animate-spin w-12 h-12 text-marvel-red mb-4" />
                                <span className="text-white font-medium">Loading PDF...</span>
                            </div>
                        </div>
                     )}
                </div>

                {/* Right Sidebar - Tools */}
                <div className="w-full md:w-80 flex flex-col gap-6 overflow-y-auto">
                    <div className="bg-[#1a1a1a] p-5 rounded-xl shadow-xl border border-white/10 relative overflow-hidden backdrop-blur-md">
                        {/* Glass Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        
                        <h3 className="font-bold text-white mb-4 flex items-center justify-between relative z-10">
                            <div className="flex items-center">
                                <PenTool className="w-5 h-5 mr-2 text-marvel-red" /> Signature Tools
                            </div>
                            <span className="text-xs font-normal text-gray-300 bg-white/10 px-2 py-1 rounded border border-white/5">Page {activePage}</span>
                        </h3>
                        
                        <button 
                            onClick={() => setShowSignModal(true)}
                            className="w-full bg-marvel-red text-white font-bold py-4 rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 mb-4 relative z-10"
                        >
                            <Plus className="w-5 h-5" /> Add Signature
                        </button>
                        
                        <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed relative z-10">
                            Signature will be added to <b className="text-gray-200">Page {activePage}</b>.
                            <br/>
                            Drag to position/resize.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/20 text-red-200 text-sm font-medium rounded-lg text-center border border-red-500/20">
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


            <div className="mt-6 pt-4 border-t border-white/5 flex justify-center sticky bottom-0 bg-[#0a0a0a]/95 backdrop-blur-xl -mx-6 px-6 pb-2 z-30">
                 <button 
                    onClick={savePdf}
                    disabled={processing || loading}
                    className={`bg-marvel-red text-white text-xl font-bold py-4 px-12 rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 w-full md:w-auto
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
        </div>
      )}
    </ToolModal>
  );
};

export default SignPDF;
