import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { 
    File, Loader2, Edit3, Type, Image as ImageIcon, Download, 
    Square, Circle, MousePointer, X, ChevronLeft, ChevronRight,
    ZoomIn, ZoomOut, Trash2
} from 'lucide-react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import * as fabric from 'fabric';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

const EditPDF = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [thumbnails, setThumbnails] = useState({}); // { [pageIndex]: dataUrl }

  // Canvas State
  const canvasRef = useRef(null); // Container for Fabric
  const fabricCanvasRef = useRef(null);
  const [tool, setTool] = useState('select'); // select, text, draw, rect, circle
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  // Data State
  // Map pageIndex (1-based) to fabric JSON string
  const pageStates = useRef({}); 

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
          setCurrentPage(1);
          
          // Generate thumbnails (optional optimization: do this lazily or in background)
          generateThumbnails(loadedPdf);
          
      } catch (err) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF.");
      } finally {
          setLoading(false);
      }
  };

  const generateThumbnails = async (pdf) => {
      const thumbs = {};
      // Limit to first 10 pages for initial speed if very large PDF
      const maxThumbs = Math.min(pdf.numPages, 20); 
      
      for (let i = 1; i <= maxThumbs; i++) {
          try {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            thumbs[i] = canvas.toDataURL();
          } catch (e) {
              console.warn(`Failed to generate thumb for page ${i}`, e);
          }
      }
      setThumbnails(thumbs);
  };

  // Save current page state before switching
  const saveCurrentPageState = () => {
    if (fabricCanvasRef.current) {
        const json = fabricCanvasRef.current.toJSON();
        console.log(`Saving state for page ${currentPage}`, json);
        pageStates.current[currentPage] = json;
    }
  };
  
  // Effect to render page when currentPage or pdfDoc changes
  useEffect(() => {
      if (!pdfDoc) return;
      
      const render = async () => {
          setLoading(true);
          try {
             const page = await pdfDoc.getPage(currentPage);
             const viewport = page.getViewport({ scale: 1.5 * scale }); // Base quality + zoom
             
             // Setup Canvas wrapper size
             const wrapper = document.getElementById('canvas-wrapper');
             if (wrapper) {
                 wrapper.style.width = `${viewport.width}px`;
                 wrapper.style.height = `${viewport.height}px`;
             }

             // Render PDF to an image/canvas for background
             const canvas = document.createElement('canvas');
             const context = canvas.getContext('2d');
             canvas.height = viewport.height;
             canvas.width = viewport.width;
             await page.render({ canvasContext: context, viewport: viewport }).promise;
             
             const bgDataUrl = canvas.toDataURL();

             // Init Fabric
             initFabric(viewport.width, viewport.height, bgDataUrl);

          } catch (err) {
              console.error("Render error:", err);
              setError("Failed to render page.");
          } finally {
              setLoading(false);
          }
      };

      render();
      
      return () => {
          // Cleanup handled in initFabric mostly, but good to ensure
      };
  }, [pdfDoc, currentPage, scale]);

  const initFabric = (width, height, bgDataUrl) => {
      console.log("Initializing Fabric with dimensions:", width, height);

      try {
        if (fabricCanvasRef.current) {
            console.log("Disposing existing fabric canvas");
            fabricCanvasRef.current.dispose();
        }

        const canvas = new fabric.Canvas('fabric-canvas', {
            width: width,
            height: height,
        });
        fabricCanvasRef.current = canvas;
        console.log("Fabric canvas created");

        // Robust Image Class Detection
        const ImageClass = fabric.FabricImage || fabric.Image;
        if (!ImageClass) {
            console.error("Fabric Image class not found in exports:", Object.keys(fabric));
            setError("Could not load PDF page (Fabric Image missing).");
            return;
        }

        // Set background
        ImageClass.fromURL(bgDataUrl).then(img => {
            console.log("Background image loaded from URL");
            img.set({
                originX: 'left',
                originY: 'top',
                scaleX: 1,
                scaleY: 1
            });
            canvas.setBackgroundImage(img, canvas.requestRenderAll.bind(canvas));
            console.log("Background image set on canvas");
        }).catch(err => {
            console.error("Error loading background image:", err);
            setError("Failed to render page background.");
        });

        // Restore state if exists
        if (pageStates.current[currentPage]) {
            console.log("Restoring page state");
            canvas.loadFromJSON(pageStates.current[currentPage], () => {
                canvas.requestRenderAll();
                console.log("Page state restored");
            });
        }

        // Event listeners
        canvas.on('path:created', () => {
           // Auto-save logic could go here
        });
        
        // Apply current tool
        updateCanvasTool(canvas);
      } catch (err) {
          console.error("Error in initFabric:", err);
          setError("Failed to initialize canvas.");
      }
  };

  // Update tool settings when tool/color changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
        updateCanvasTool(fabricCanvasRef.current);
    }
  }, [tool, color, strokeWidth]);

  const updateCanvasTool = (canvas) => {
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    if (tool === 'draw') {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = strokeWidth;
        canvas.freeDrawingBrush.color = color;
    } else if (tool === 'text') {
        // Text is usually click-to-add, handled by click handler or button
        canvas.selection = false;
        canvas.defaultCursor = 'text';
    } else {
        canvas.defaultCursor = 'default';
    }
  };

  const startDrawShape = (type) => {
      if (!fabricCanvasRef.current) return;
      const canvas = fabricCanvasRef.current;
      
      let shape;
      const center = canvas.getCenter();
      
      if (type === 'rect') {
          shape = new fabric.Rect({
              left: center.left - 50,
              top: center.top - 50,
              width: 100,
              height: 100,
              fill: 'transparent',
              stroke: color,
              strokeWidth: strokeWidth
          });
      } else if (type === 'circle') {
          shape = new fabric.Circle({
              left: center.left - 50,
              top: center.top - 50,
              radius: 50,
              fill: 'transparent',
              stroke: color,
              strokeWidth: strokeWidth
          });
      }

      if (shape) {
          canvas.add(shape);
          canvas.setActiveObject(shape);
          setTool('select');
      }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    
    const text = new fabric.IText('Type here', {
        left: 100,
        top: 100,
        fontFamily: 'Arial',
        fill: color,
        fontSize: 20
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    setTool('select');
  };

  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file || !fabricCanvasRef.current) return;
      
      const reader = new FileReader();
      reader.onload = (f) => {
          const data = f.target.result;
          fabric.FabricImage.fromURL(data).then(img => {
              img.scaleToWidth(200);
              fabricCanvasRef.current.add(img);
              fabricCanvasRef.current.centerObject(img);
              fabricCanvasRef.current.setActiveObject(img);
              setTool('select');
          });
      };
      reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
      if (!fabricCanvasRef.current) return;
      const activeObjects = fabricCanvasRef.current.getActiveObjects();
      if (activeObjects.length) {
          fabricCanvasRef.current.discardActiveObject();
          activeObjects.forEach((obj) => {
              fabricCanvasRef.current.remove(obj);
          });
      }
  };
  
  // Handle Page Change
  const changePage = (newPage) => {
      if (newPage < 1 || newPage > numPages) return;
      saveCurrentPageState();
      setCurrentPage(newPage);
  };

  const savePdf = async () => {
    setProcessing(true);
    // Ensure current page is saved
    saveCurrentPageState();

    try {
        const operations = [];
        
        // 1. Upload original PDF
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

        // 2. Iterate pages and generate overlays
        // NOTE: pageStates.current keys are strings "1", "2" etc.
        for (const [pIndexStr, json] of Object.entries(pageStates.current)) {
            const pIndex = parseInt(pIndexStr);
            const fabricState = json;
            
            // Skip empty states check properly? 
            // fabric JSON always has "objects": [] if empty.
            if (!fabricState.objects || fabricState.objects.length === 0) continue;

            // Reconstruct canvas off-screen to export image
            // We need dimensions. 
            const page = await pdfDoc.getPage(pIndex);
            const viewport = page.getViewport({ scale: 1.5 }); // Match export scale
            
            const tempCanvas = new fabric.StaticCanvas(null, {
                width: viewport.width,
                height: viewport.height
            });
            
            await new Promise(resolve => tempCanvas.loadFromJSON(fabricState, resolve));
            
            // Remove background image from export
            tempCanvas.backgroundImage = null;
            tempCanvas.backgroundColor = null;
            
            const overlayDataUrl = tempCanvas.toDataURL({ format: 'png', enableRetinaScaling: true });
            
            // Upload Overlay
            const overlayBlob = await (await fetch(overlayDataUrl)).blob();
            const overlayName = `overlay_p${pIndex}_${Date.now()}.png`;
             
             const overlayUploadRes = await axios.post('/api/s3/upload-url', {
                filename: overlayName,
                contentType: 'image/png'
            });
            const { uploadUrl: overlayUrl, key: overlayKey } = overlayUploadRes.data;

            await fetch(overlayUrl, {
                method: 'PUT',
                body: overlayBlob,
                headers: { 'Content-Type': 'image/png' }
            });

            // Add Operation
            operations.push({
                page: pIndex - 1, // backend is 0-indexed
                type: "image",
                key: overlayKey,
                x: 0,
                y: 0,
                width: viewport.width,
                height: viewport.height
            });
            
            tempCanvas.dispose();
        }

        if (operations.length === 0) {
            alert("No changes to save!");
            setProcessing(false);
            return;
        }

        // 3. Trigger Process
        const response = await axios.post('/api/process/edit', { 
            key: pdfKey, 
            operations: JSON.stringify(operations) 
        });
        
        const { downloadUrl } = response.data;
        window.open(downloadUrl, '_blank');

    } catch (err) {
        console.error("Save Error:", err);
        setError("Failed to save PDF. " + err.message);
    } finally {
        setProcessing(false);
    }
  };

  const jsonLd = { /* ... keep existing ... */ };

  if (!file) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Simple Header for file select */}
             <div className="bg-white shadow-sm p-4 flex justify-between items-center px-8">
                <div className="font-bold text-xl flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <ChevronLeft /> Back to Home
                </div>
             </div>
             <div className="flex-1 flex flex-col items-center justify-center p-8">
                 <div className="max-w-2xl w-full text-center">
                    <h1 className="text-4xl font-bold mb-4 text-gray-900">Edit PDF</h1>
                    <p className="text-gray-600 mb-8 text-lg">Upload your PDF to start editing. Add text, shapes, and images.</p>
                    <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden flex-col">
       <Helmet>
        <title>Edit PDF | MarvelPDF</title>
       </Helmet>

       {/* Top Toolbar */}
       <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20 shadow-sm">
           <div className="flex items-center gap-4">
               <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                   <ChevronLeft className="w-6 h-6" />
               </button>
               <h1 className="font-bold text-lg text-gray-800 hidden sm:block">Edit PDF</h1>
               <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>
               <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                    <button 
                        onClick={() => setTool('select')} 
                        className={`p-2 rounded ${tool === 'select' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                        title="Select"
                    >
                        <MousePointer className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={addText}
                         className={`p-2 rounded ${tool === 'text' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                        title="Add Text"
                    >
                        <Type className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setTool('draw')}
                        className={`p-2 rounded ${tool === 'draw' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                        title="Free Draw"
                    >
                        <Edit3 className="w-5 h-5" />
                    </button>
                    <button 
                         onClick={() => startDrawShape('rect')}
                         className="p-2 rounded text-gray-600 hover:bg-gray-200"
                         title="Rectangle"
                    >
                        <Square className="w-5 h-5" />
                    </button>
                     <button 
                         onClick={() => startDrawShape('circle')}
                         className="p-2 rounded text-gray-600 hover:bg-gray-200"
                         title="Circle"
                    >
                        <Circle className="w-5 h-5" />
                    </button>
                     <label className="p-2 rounded text-gray-600 hover:bg-gray-200 cursor-pointer" title="Add Image">
                         <ImageIcon className="w-5 h-5" />
                         <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                     </label>
               </div>
               
               {/* Properties */}
                <div className="flex items-center gap-2 ml-4">
                   <input 
                      type="color" 
                      value={color} 
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden"
                   />
                   <div className="flex items-center gap-2 bg-gray-50 p-1 rounded border border-gray-200">
                        <span className="text-xs text-gray-500 font-medium px-1">Width:</span>
                        <input 
                            type="number" 
                            min="1" max="20" 
                            value={strokeWidth} 
                            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                            className="w-12 p-1 text-sm border rounded"
                        />
                   </div>
                   <button onClick={deleteSelected} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Delete Selected">
                       <Trash2 className="w-5 h-5" />
                   </button>
                </div>
           </div>

           <div className="flex items-center gap-3">
               <button 
                 onClick={savePdf} 
                 disabled={processing}
                 className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold shadow-md disabled:opacity-50 disabled:cursor-wait"
               >
                   {processing ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                   Download
               </button>
           </div>
       </div>

       {/* Main Content */}
       <div className="flex-1 flex overflow-hidden">
           
           {/* Thumbnails Sidebar */}
           <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto hidden md:flex flex-col p-4 gap-4">
               <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider">Pages ({numPages})</h3>
               <div className="flex flex-col gap-3">
                   {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                       <div 
                         key={page}
                         onClick={() => changePage(page)}
                         className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition hover:shadow-md ${
                             currentPage === page ? 'border-purple-600 ring-2 ring-purple-100' : 'border-gray-200'
                         }`}
                       >
                           {thumbnails[page] ? (
                               <img src={thumbnails[page]} className="w-full h-auto" />
                           ) : (
                               <div className="aspect-[1/1.4] bg-gray-100 flex items-center justify-center text-gray-400">
                                   <Loader2 className="w-6 h-6 animate-spin" />
                               </div>
                           )}
                           <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 rounded">
                               {page}
                           </div>
                       </div>
                   ))}
               </div>
           </div>

           {/* Canvas Area */}
           <div className="flex-1 bg-gray-100 overflow-auto relative flex justify-center p-8">
               <div className="relative shadow-2xl transition-transform" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                    <div id="canvas-wrapper" className="bg-white">
                        <canvas id="fabric-canvas" />
                    </div>
               </div>
           </div>
           
           {/* Zoom Controls Overlay */}
           <div className="absolute bottom-8 right-8 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg border border-gray-200 z-30">
               <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-2 hover:bg-gray-100 rounded text-gray-700">
                   <ZoomIn className="w-5 h-5" />
               </button>
                <div className="text-center text-xs font-medium text-gray-500 py-1">{Math.round(scale * 100)}%</div>
               <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 hover:bg-gray-100 rounded text-gray-700">
                   <ZoomOut className="w-5 h-5" />
               </button>
           </div>

       </div>
    </div>
  );
};

export default EditPDF;
