import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import SignatureModal from '../components/SignatureModal';
import { 
    File, Loader2, Edit3, Type, Image as ImageIcon, Download, 
    Square, Circle, MousePointer, X, ChevronLeft, ChevronRight,
    ZoomIn, ZoomOut, Trash2, Highlighter, Strikethrough, Link as LinkIcon, FormInput, CheckSquare, PenTool
} from 'lucide-react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as fabric from 'fabric';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EditPDF = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null); // eslint-disable-line no-unused-vars
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [thumbnails, setThumbnails] = useState({}); // { [pageIndex]: dataUrl }

  // Canvas State
  const canvasRef = useRef(null); // The actual canvas element
  const canvasWrapperRef = useRef(null); // The wrapper div
  const fabricCanvasRef = useRef(null);
  const [tool, setTool] = useState('select'); // select, text, draw, rect, circle
  const toolRef = useRef(tool); // Ref to access tool in listeners
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  // Data State
  // Map pageIndex (1-based) to fabric JSON string
  const pageStates = useRef({});
  const [textBlocks, setTextBlocks] = useState([]);
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

  // Helper for matrix multiplication (since pdfjsLib.Util.transform is deprecated/removed in v5)
  const multiplyTransformMatrices = (m1, m2) => {
      // m1: [a, b, c, d, e, f]
      // m2: [g, h, i, j, k, l]
      // Result:
      // a*g + c*h, b*g + d*h,
      // a*i + c*j, b*i + d*j,
      // a*k + c*l + e, b*k + d*l + f
      
      const [a, b, c, d, e, f] = m1;
      const [g, h, i, j, k, l] = m2;

      return [
          a * g + c * h,
          b * g + d * h,
          a * i + c * j,
          b * i + d * j,
          a * k + c * l + e,
          b * k + d * l + f
      ];
  };

  const extractTextLayout = async (page, viewport) => {
      try {
          const textContent = await page.getTextContent();
          const items = textContent.items.filter(item => item.str.trim().length > 0);

          const blocks = items.map(item => {
              // Custom transform: viewport.transform * item.transform
              // Note: pdfjsLib.Util.transform(t1, t2) was typically t1 * t2
              const tx = multiplyTransformMatrices(viewport.transform, item.transform);

              // tx is [scaleX, skewY, skewX, scaleY, posX, posY]
              // Font size (approx height)
              const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));

              // Width needs to be scaled
              // item.width is in unscaled PDF units
              // viewport.scale is the total scale factor (1.5 * scale)
              const width = item.width * viewport.scale;

              return {
                  text: item.str,
                  x: tx[4],
                  y: tx[5] - fontHeight, // Move up from baseline
                  width: width,
                  height: fontHeight,
                  fontSize: fontHeight
              };
          });

          console.log(`Extracted ${blocks.length} text blocks for page ${page.pageNumber}`);
          setTextBlocks(blocks);

      } catch (e) {
          console.error("Failed to extract text:", e);
          // Alert user but don't blocking everything, though tools won't work
          alert(`Text extraction failed: ${e.message}. Text tools may not work.`);
      }
  };

  // Save current page state before switching
  const saveCurrentPageState = () => {
    if (fabricCanvasRef.current) {
        const json = fabricCanvasRef.current.toJSON();
        console.log(`Saving state for page ${currentPage}`, json);
        // Save the scale at which these coordinates are valid
        pageStates.current[currentPage] = { json, scale };
    }
  };
  
  // Effect to render page when currentPage or pdfDoc changes
  useEffect(() => {
      if (!pdfDoc) return;
      
      const render = async () => {
          setLoading(true);
          try {
             const page = await pdfDoc.getPage(currentPage);
             // High quality rendering: Use 1.5 multiplier for internal canvas size
             // But display it at 'scale' size on screen.
             const QUALITY = 1.5;
             const viewport = page.getViewport({ scale: scale * QUALITY });
             
             // Setup Canvas wrapper size (Display Size)
             // We want the display size to match the PDF at 'scale'
             // viewport.width is (scale * 1.5) * PDF_WIDTH
             // Display width should be (scale * 1) * PDF_WIDTH = viewport.width / 1.5
             if (canvasWrapperRef.current) {
                 canvasWrapperRef.current.style.width = `${viewport.width / QUALITY}px`;
                 canvasWrapperRef.current.style.height = `${viewport.height / QUALITY}px`;
             }

             // Render PDF to an image/canvas for background
             const canvas = document.createElement('canvas');
             const context = canvas.getContext('2d');
             canvas.height = viewport.height;
             canvas.width = viewport.width;
             await page.render({ canvasContext: context, viewport: viewport }).promise;
             
             const bgDataUrl = canvas.toDataURL();

             // Extract Text Layout for Snapping
             await extractTextLayout(page, viewport);

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
        if (fabricCanvasRef.current) {
             fabricCanvasRef.current.dispose();
             fabricCanvasRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, currentPage, scale]);

  const initFabric = (width, height, bgDataUrl) => {
      console.log("Initializing Fabric with dimensions:", width, height);

      try {
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
        }

        if (!canvasRef.current) {
            console.error("Canvas ref is null");
            return;
        }

        const canvas = new fabric.Canvas(canvasRef.current, {
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
            
            canvas.backgroundImage = img;
            canvas.requestRenderAll();
            
            console.log("Background image set on canvas");
        }).catch(err => {
            console.error("Error loading background image:", err);
            setError("Failed to render page background.");
        });

        // Restore state if exists
        if (pageStates.current[currentPage]) {
            console.log("Restoring page state");
            const { json, scale: savedScale } = pageStates.current[currentPage];

            // Calculate scale ratio if scale changed
            // New canvas dimensions are proportional to 'scale' (via viewport)
            // Saved json coordinates are proportional to 'savedScale'
            // We need to scale objects by (currentScale / savedScale)

            // Note: initFabric receives 'width' which is viewport.width
            // viewport.width = PDF_WIDTH * scale * QUALITY

            canvas.loadFromJSON(json).then(() => {
                if (savedScale && savedScale !== scale) {
                     const ratio = scale / savedScale;
                     console.log(`Scaling objects by ratio ${ratio} (from ${savedScale} to ${scale})`);

                     canvas.getObjects().forEach(obj => {
                         obj.scaleX = obj.scaleX * ratio;
                         obj.scaleY = obj.scaleY * ratio;
                         obj.left = obj.left * ratio;
                         obj.top = obj.top * ratio;
                         obj.setCoords();
                     });
                }

                canvas.requestRenderAll();
                console.log("Page state restored");
            });
        }

        // Event listeners
        canvas.on('path:created', () => {
           // Auto-save logic could go here
        });

        canvas.on('mouse:move', (e) => {
             handleMouseMove(e, canvas);
        });

        canvas.on('mouse:down', (e) => {
             handleMouseDown(e, canvas);
        });

        canvas.on('mouse:up', (e) => {
             handleMouseUp(e, canvas);
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
    toolRef.current = tool; // Sync ref
    if (fabricCanvasRef.current) {
        updateCanvasTool(fabricCanvasRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, color, strokeWidth]);

  const [hoveredTextBlock, setHoveredTextBlock] = useState(null);

  // Drag start position
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const activeShape = useRef(null);

  const handleMouseMove = (e, canvas) => {
       // Handle dragging for rectangle creation
      if (isDragging.current && activeShape.current) {
          const pointer = canvas.getPointer(e.e);
          const w = Math.abs(pointer.x - dragStart.current.x);
          const h = Math.abs(pointer.y - dragStart.current.y);
          activeShape.current.set({
              width: w,
              height: h,
              left: Math.min(pointer.x, dragStart.current.x),
              top: Math.min(pointer.y, dragStart.current.y)
          });
          canvas.requestRenderAll();
          return;
      }

      if (!['highlight', 'strikeout', 'text_edit'].includes(toolRef.current)) {
          // Clear preview if switching away
          if (hoveredTextBlock) setHoveredTextBlock(null);
          return;
      }

      const pointer = canvas.getPointer(e.e);
      // Find intersecting text block
      // textBlocks: { x, y, width, height }

      const match = textBlocks.find(block =>
          pointer.x >= block.x &&
          pointer.x <= block.x + block.width &&
          pointer.y >= block.y &&
          pointer.y <= block.y + block.height
      );

      if (match) {
           canvas.defaultCursor = 'pointer';
           setHoveredTextBlock(match);

           // Render Preview (Optional: could render a temp rect here, but maybe just cursor change is enough for now)
           // Or we can draw a temp rect on a separate upper canvas, but Fabric handles objects.
           // Let's rely on the click for the action, and maybe a subtle indication?

      } else {
           canvas.defaultCursor = 'default';
           setHoveredTextBlock(null);
      }
  };

  const handleMouseDown = (e, canvas) => {
      // Handle Rectangle Drawing Tools (Link, Form)
      const currentTool = toolRef.current;

      if (['link', 'form_text', 'form_checkbox'].includes(currentTool)) {
          isDragging.current = true;
          const pointer = canvas.getPointer(e.e);
          dragStart.current = { x: pointer.x, y: pointer.y };

          const rect = new fabric.Rect({
              left: pointer.x,
              top: pointer.y,
              width: 0,
              height: 0,
              fill: currentTool === 'link' ? 'rgba(0, 0, 255, 0.1)' : 'rgba(200, 200, 200, 0.2)',
              stroke: currentTool === 'link' ? 'blue' : 'gray',
              strokeWidth: 1,
              strokeDashArray: [5, 5]
          });

          activeShape.current = rect;
          canvas.add(rect);
          return;
      }

      if (!hoveredTextBlock) {
          if (['highlight', 'strikeout', 'text_edit'].includes(currentTool)) {
              if (textBlocks.length === 0) {
                  alert("No selectable text found on this page. These tools require text layer.");
              }
          }
          return;
      }

      if (currentTool === 'highlight') {
           const rect = new fabric.Rect({
                left: hoveredTextBlock.x,
                top: hoveredTextBlock.y,
                width: hoveredTextBlock.width,
                height: hoveredTextBlock.height,
                fill: 'yellow',
                opacity: 0.4,
                selectable: true,
                evented: true
           });
           canvas.add(rect);
           canvas.setActiveObject(rect);
      } else if (currentTool === 'strikeout') {
           const line = new fabric.Line([
               hoveredTextBlock.x,
               hoveredTextBlock.y + (hoveredTextBlock.height / 2),
               hoveredTextBlock.x + hoveredTextBlock.width,
               hoveredTextBlock.y + (hoveredTextBlock.height / 2)
           ], {
               stroke: 'red',
               strokeWidth: 2,
               selectable: true
           });
           canvas.add(line);
           canvas.setActiveObject(line);
      } else if (currentTool === 'text_edit') {
           // Whiteout original
           const whiteout = new fabric.Rect({
                left: hoveredTextBlock.x,
                top: hoveredTextBlock.y,
                width: hoveredTextBlock.width,
                height: hoveredTextBlock.height,
                fill: 'white',
                selectable: false,
                evented: false,
                data: { type: 'redact' }
           });

           const text = new fabric.IText(hoveredTextBlock.text, {
               left: hoveredTextBlock.x,
               top: hoveredTextBlock.y,
               fontSize: hoveredTextBlock.fontSize,
               fontFamily: 'Helvetica', // Try to match?
               fill: 'black'
           });

           canvas.add(whiteout);
           canvas.add(text);
           canvas.setActiveObject(text);
           text.enterEditing();
           text.selectAll();
           setTool('select');
      }
  };

  const handleMouseUp = (e, canvas) => {
      if (isDragging.current && activeShape.current) {
          const rect = activeShape.current;

          // If size is too small, make default
          if (rect.width < 10) rect.set({ width: 100 });
          if (rect.height < 10) rect.set({ height: 30 });

          canvas.setActiveObject(rect);

          // Prompt for details
          const currentTool = toolRef.current;

          if (currentTool === 'link') {
              const url = prompt("Enter Link URL:", "https://");
              if (url) {
                  rect.set({
                      data: { type: 'link', url: url },
                      stroke: 'blue',
                      strokeDashArray: null
                  });
              } else {
                  canvas.remove(rect);
              }
          } else if (currentTool === 'form_text') {
              const name = prompt("Enter Field Name:", "Text_Field");
              if (name) {
                  rect.set({
                      data: { type: 'form_text', name: name },
                      stroke: 'black',
                      strokeDashArray: null
                  });
                  // Add label text inside?
                  const text = new fabric.Text(name, {
                      left: rect.left + 5, top: rect.top + 5, fontSize: 10, fill: 'gray', selectable: false
                  });
                  canvas.add(text);
              } else {
                  canvas.remove(rect);
              }
          } else if (currentTool === 'form_checkbox') {
              const name = prompt("Enter Checkbox Name:", "Checkbox");
               if (name) {
                  rect.set({
                      width: 20, height: 20,
                      data: { type: 'form_checkbox', name: name },
                      stroke: 'black',
                      strokeDashArray: null
                  });
              } else {
                  canvas.remove(rect);
              }
          }

          isDragging.current = false;
          activeShape.current = null;
          setTool('select');
      }
  };

  const updateCanvasTool = (canvas) => {
    canvas.isDrawingMode = false;
    canvas.selection = true;
    
    if (tool === 'draw') {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = strokeWidth;
        canvas.freeDrawingBrush.color = color;
    } else if (tool === 'text') {
        canvas.selection = false;
        canvas.defaultCursor = 'text';
    } else if (['highlight', 'strikeout', 'text_edit'].includes(tool)) {
        canvas.selection = false;
        canvas.defaultCursor = 'pointer';
    } else if (['link', 'form_text', 'form_checkbox'].includes(tool)) {
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
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

  const addSignature = (dataUrl) => {
      if (!fabricCanvasRef.current) return;
      const ImageClass = fabric.FabricImage || fabric.Image;
      ImageClass.fromURL(dataUrl).then(img => {
          img.scaleToWidth(150);
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.centerObject(img);
          fabricCanvasRef.current.setActiveObject(img);
          setTool('select');
      });
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

        // 2. Iterate pages and generate overlays/ops
        for (const [pIndexStr, state] of Object.entries(pageStates.current)) {
            const pIndex = parseInt(pIndexStr);
            const { json: fabricState, scale: savedScale } = state;
            
            if (!fabricState.objects || fabricState.objects.length === 0) continue;

            const page = await pdfDoc.getPage(pIndex);
            // Use same scale as export (1.5)
            const viewport = page.getViewport({ scale: 1.5 });
            
            const tempCanvas = new fabric.StaticCanvas(null, {
                width: viewport.width,
                height: viewport.height
            });
            
            await tempCanvas.loadFromJSON(fabricState);
            
            // If the saved state was at a different scale than 1.0 (or whatever export scale), we need to handle it.
            // But wait, we just loaded JSON into a canvas of size 'viewport.width'.
            // If 'savedScale' != 1.0, the objects in JSON are scaled.
            // Our viewport is at scale 1.5 (fixed export scale).
            // We need to scale objects from 'savedScale' to '1.0' (export base).

            // Actually, let's look at export logic:
            // viewport = page.getViewport({ scale: 1.5 });
            // exportScale = 1.5;

            // The JSON coordinates are based on 'savedScale' * 1.5 (QUALITY).
            // We need to convert them to 'exportScale' * 1.5 space?
            // Or just convert from Saved Space -> PDF Points -> Export Space?

            // Simplest: Convert everything to PDF Points (72 DPI).
            // Coordinate in JSON / (savedScale * 1.5) = PDF Point.

            const savedQuality = 1.5; // Assumed constant
            const conversionFactor = 1 / (savedScale * savedQuality);

            const objects = tempCanvas.getObjects();
            const visualObjects = [];
            const semanticOps = [];

            // Separate Semantic vs Visual
            for (const obj of objects) {
                // Coordinates in PDF Points (72DPI)

                // Fabric Top-Left (Pixels in saved state)
                const fabricLeft = obj.left;
                const fabricTop = obj.top;
                const fabricWidth = obj.width * obj.scaleX;
                const fabricHeight = obj.height * obj.scaleY;

                // PDF Bottom-Left (Points)
                // Using conversionFactor to get unscaled points
                const pdfX = fabricLeft * conversionFactor;
                // PDF Height is unscaled. viewport.height is scaled by (1.5 * 1.5)?? No.
                // viewport was created with scale 1.5.
                // But we want Y relative to unscaled page height?
                // pdfY = (pageHeight - (fabricTop + fabricHeight)*conversionFactor)

                // Let's get raw page height
                const pageRawViewport = page.getViewport({ scale: 1.0 });

                const pdfY = pageRawViewport.height - ((fabricTop + fabricHeight) * conversionFactor);

                const pdfWidth = fabricWidth * conversionFactor;
                const pdfHeight = fabricHeight * conversionFactor;

                if (obj.data && obj.data.type === 'redact') {
                    semanticOps.push({
                        page: pIndex - 1,
                        type: 'redact',
                        x: pdfX,
                        y: pdfY,
                        width: pdfWidth,
                        height: pdfHeight
                    });
                } else if (obj.data && obj.data.type === 'link') {
                    semanticOps.push({
                        page: pIndex - 1,
                        type: 'link',
                        url: obj.data.url,
                        x: pdfX,
                        y: pdfY,
                        width: pdfWidth,
                        height: pdfHeight
                    });
                } else if (obj.data && (obj.data.type === 'form_text' || obj.data.type === 'form_checkbox')) {
                    semanticOps.push({
                        page: pIndex - 1,
                        type: obj.data.type,
                        name: obj.data.name,
                        x: pdfX,
                        y: pdfY,
                        width: pdfWidth,
                        height: pdfHeight
                    });
                } else if (obj.type === 'i-text') {
                     const fontSize = (obj.fontSize * obj.scaleY) * conversionFactor;

                     semanticOps.push({
                         page: pIndex - 1,
                         type: 'text',
                         text: obj.text,
                         x: pdfX,
                         y: pdfY + (pdfHeight * 0.2), // Approx baseline adjustment
                         fontSize: fontSize,
                         color: obj.fill
                     });
                } else {
                    // For visual overlay, we need to match the export viewport (scale 1.5)
                    // If savedScale != 1.0, we must scale the object to match 1.5 scale.
                    // Scale Factor = 1.5 / (savedScale * 1.5) = 1 / savedScale?
                    // No. Target scale is 1.5. Source scale is savedScale.
                    // If savedScale=2, we shrink.
                    // If savedScale=0.5, we grow.
                    // Wait, we already computed PDF points.
                    // To render on tempCanvas (scale 1.5), we need to scale up from PDF points by 1.5.

                    // Reset to unscaled then scale to 1.5
                    // obj coords are in savedScale*1.5 space.
                    // target is 1.5 space.
                    // ratio = 1.5 / (savedScale * 1.5) = 1 / savedScale.

                    if (savedScale !== 1) {
                        const ratio = 1.0 / savedScale;
                        obj.scaleX = obj.scaleX * ratio;
                        obj.scaleY = obj.scaleY * ratio;
                        obj.left = obj.left * ratio;
                        obj.top = obj.top * ratio;
                        obj.setCoords();
                    }

                    visualObjects.push(obj);
                }
            }

            // 3. Render Visual Overlay (Drawings, Images, Highlights, Whiteouts)
            // IMPORTANT: Render Overlay FIRST so it is behind text/forms (allowing whiteout to hide original content but not new content)
            if (visualObjects.length > 0) {
                tempCanvas.clear();
                // Add back only visual objects
                visualObjects.forEach(obj => tempCanvas.add(obj));

                // We use enableRetinaScaling: false because viewport is already high res (1.5)
                const overlayDataUrl = tempCanvas.toDataURL({ format: 'png', enableRetinaScaling: false });
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

                operations.push({
                    page: pIndex - 1,
                    type: "image",
                    key: overlayKey,
                    x: 0,
                    y: 0,
                    width: viewport.width,
                    height: viewport.height
                });
            }

            // Add Semantic Ops AFTER Overlay
            operations.push(...semanticOps);
            
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
                        onClick={() => setShowSignModal(true)}
                         className="p-2 rounded text-gray-600 hover:bg-gray-200"
                        title="Sign PDF"
                    >
                        <PenTool className="w-5 h-5" />
                    </button>
                    <button
                         onClick={() => setTool('text_edit')}
                         className={`p-2 rounded ${tool === 'text_edit' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                         title="Edit Text"
                    >
                        <Type className="w-5 h-5 underline" />
                    </button>
                    <button
                         onClick={() => setTool('highlight')}
                         className={`p-2 rounded ${tool === 'highlight' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                         title="Highlight"
                    >
                        <Highlighter className="w-5 h-5" />
                    </button>
                    <button
                         onClick={() => setTool('strikeout')}
                         className={`p-2 rounded ${tool === 'strikeout' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                         title="Strikeout"
                    >
                        <Strikethrough className="w-5 h-5" />
                    </button>
                    <button
                         onClick={() => setTool('link')}
                         className={`p-2 rounded ${tool === 'link' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                         title="Add Link"
                    >
                        <LinkIcon className="w-5 h-5" />
                    </button>
                    <button
                         onClick={() => setTool('form_text')}
                         className={`p-2 rounded ${tool === 'form_text' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                         title="Form Text Field"
                    >
                        <FormInput className="w-5 h-5" />
                    </button>
                    <button
                         onClick={() => setTool('form_checkbox')}
                         className={`p-2 rounded ${tool === 'form_checkbox' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-200'}`}
                         title="Form Checkbox"
                    >
                        <CheckSquare className="w-5 h-5" />
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
               {/* Removed transform: scale() to fix coordinate mapping issues. Size is controlled by canvas style. */}
               <div className="relative shadow-2xl origin-top" >
                    <div ref={canvasWrapperRef} className="bg-white">
                        <canvas ref={canvasRef} />
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

           <SignatureModal
               isOpen={showSignModal}
               onClose={() => setShowSignModal(false)}
               onSave={addSignature}
           />

       </div>
    </div>
  );
};

export default EditPDF;
