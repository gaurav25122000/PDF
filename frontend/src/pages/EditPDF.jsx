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
  const [selectedObject, setSelectedObject] = useState(null); // Track selected object for properties panel
  
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

  // Helper: Consolidate PDF text items into lines
  const consolidateTextItems = (items, viewport) => {
      const parsedItems = items.map(item => {
          const tx = multiplyTransformMatrices(viewport.transform, item.transform);
          // tx = [scaleX, skewY, skewX, scaleY, posX, posY]
          // PDF Space (User) -> Canvas Space (Device)
          
          const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
          const width = item.width * viewport.scale; 
          
          return {
              str: item.str,
              x: tx[4], 
              y: tx[5], // BASELINE Y in Canvas Coords
              width: width,
              height: fontHeight,
              fontHeight: fontHeight,
              fontName: item.fontName,
              hasEOL: item.hasEOL
          };
      });

      // Sort: Top-to-Bottom (Y), then Left-to-Right (X)
      // Note: Canvas Y increases Downwards.
      parsedItems.sort((a, b) => {
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff < (Math.min(a.fontHeight, b.fontHeight) * 0.5)) {
              return a.x - b.x;
          }
          return a.y - b.y;
      });

      const lines = [];
      let currentLine = null;

      parsedItems.forEach(item => {
          if (!currentLine) {
              currentLine = { ...item, items: [item] };
              return;
          }

          // Check alignment
          const yDiff = Math.abs(item.y - currentLine.y);
          const sameLine = yDiff < (currentLine.fontHeight * 0.5);
          
          // Check adjacency
          // Calculate expected position of next char
          const expectedNextX = currentLine.x + currentLine.width;
          const dist = item.x - expectedNextX;
          
          // Allow merge if:
          // 1. Same line
          // 2. Distance is reasonable (not a new column)
          // 3. Or if negative overlap is small (kerning)
          const isAdjacent = sameLine && (dist < (currentLine.fontHeight * 3)) && (dist > -(currentLine.fontHeight * 0.5));

          if (isAdjacent) {
              const gap = item.x - (currentLine.x + currentLine.width);
              if (gap > (currentLine.fontHeight * 0.2) && !currentLine.str.endsWith(' ') && !item.str.startsWith(' ')) {
                  currentLine.str += ' ';
              } // Add space if gap makes sense
              
              currentLine.str += item.str;
              // Width should extend to the end of the new item
              currentLine.width = (item.x + item.width) - currentLine.x;
              currentLine.items.push(item);
          } else {
              lines.push(currentLine);
              currentLine = { ...item, items: [item] };
          }
      });
      if (currentLine) lines.push(currentLine);

      return lines.map(line => {
          // Alignment Fix:
          // line.y is Baseline.
          // fabric Rect/IText 'top' is Top-Left corner.
          // We need to shift UP by Ascent.
          // Standard Approx: Ascent ~= 0.8 * fontSize.
          const ascent = line.fontHeight * 0.9; // Adjust this if still off
          
          return {
            text: line.str,
            x: line.x,
            y: line.y - ascent, 
            width: line.width,
            height: line.fontHeight * 1.1, // Slight padding for easier selection
            fontSize: line.fontHeight,
            fontFamily: line.fontName
          };
      });
  };

  const extractTextLayout = async (page, viewport) => {
      try {
          const textContent = await page.getTextContent();
          const items = textContent.items.filter(item => item.str.trim().length > 0);
          
          // Debug First Item
          if (items.length > 0) {
              const testItem = items[0];
              const tx = multiplyTransformMatrices(viewport.transform, testItem.transform);
              console.log("Debug Layout Item 0:", {
                  str: testItem.str,
                  origX: testItem.transform[4],
                  origY: testItem.transform[5],
                  canvasX: tx[4],
                  canvasY: tx[5]
              });
          }

          const blocks = consolidateTextItems(items, viewport);
          setTextBlocks(blocks);
          return blocks; 

      } catch (e) {
          console.error("Failed to extract text:", e);
          return [];
      }
  };

  // Save current page state before switching
  const saveCurrentPageState = () => {
    if (fabricCanvasRef.current) {
        // Essential: Include 'data' in export so we save type info (redact, link, etc.)
        const json = fabricCanvasRef.current.toJSON(['data', 'selectable', 'evented', 'hoverCursor']);
        
        // Filter out ghosts so we don't save/restore them (they are re-generated)
        if (json.objects) {
            json.objects = json.objects.filter(obj => !obj.data || obj.data.type !== 'text_ghost');
        }

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

             // Extract Text Layout for Snapping & Interactive Layer
             const blocks = await extractTextLayout(page, viewport);

             // Init Fabric
             initFabric(viewport.width, viewport.height, bgDataUrl, blocks);

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

  const initFabric = (width, height, bgDataUrl, blocks = []) => {
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
        
        // Add functionality to handle Object selection events
        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', () => setSelectedObject(null));
        
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
            img.set({
                originX: 'left',
                originY: 'top',
                scaleX: 1,
                scaleY: 1
            });
            
            canvas.backgroundImage = img;
            canvas.requestRenderAll();
        }).catch(err => {
            console.error("Error loading background image:", err);
            setError("Failed to render page background.");
        });

        // 1. Create Interactive Text Zones (Ghosts)
        // These are invisible rects over text. On click/select, they convert to editable text.
        if (blocks && blocks.length > 0) {
            blocks.forEach((block, index) => {
                // Ensure reasonable bounds
                if (block.width <= 0 || block.height <= 0) return;

                const ghost = new fabric.Rect({
                    left: block.x,
                    top: block.y,
                    width: block.width,
                    height: block.height,
                    fill: 'transparent',
                    hoverCursor: 'text',
                    selectable: true, // Must be selectable to receive events properly in Fabric 2+
                    lockRotation: true,
                    lockScalingX: true,
                    lockScalingY: true,
                    data: { 
                        type: 'text_ghost', 
                        text: block.text,
                        fontSize: block.fontSize,
                        fontFamily: block.fontFamily,
                        blockIndex: index
                    }
                });
                
                // Add hover effect via event listeners (see below)
                
                canvas.add(ghost);
            });
        }

        // Hover Effects Removed as per user request (Seamless Native Feel)
        // We rely on the cursor changing to 'text' (I-beam) to indicate clickability.
        
        // Restore state if exists
        if (pageStates.current[currentPage]) {
            console.log("Restoring page state");
            const { json, scale: savedScale } = pageStates.current[currentPage];

            canvas.loadFromJSON(json).then(() => {
                if (savedScale && savedScale !== scale) {
                     const ratio = scale / savedScale;
                     console.log(`Scaling objects by ratio ${ratio} (from ${savedScale} to ${scale})`);

                     canvas.getObjects().forEach(obj => {
                         // Don't scale ghosts again if we just re-added them? 
                         // Actually loadFromJSON wipes the canvas usually, so ghosts would be gone?
                         // NO: canvas.loadFromJSON replaces everything. 
                         // So we should merge logic: 
                         // Check if JSON includes 'text_ghost' objects? 
                         // If we saved them, they are in JSON. If we want fresh ones (maybe new resolution), we should handle that.
                         // Current logic: We just re-extract text every render (extractTextLayout called in useEffect).
                         // So we should Add ghosts AFTER loadFromJSON?
                         // OR filters objects in JSON that are ghosts and remove them?
                         
                         // Fix: Ghost objects usually shouldn't be saved in PDF state if we regenerate them.
                         // But if user didn't edit them, we need them back.
                         // Let's rely on re-generation.
                         if (obj.data && obj.data.type === 'text_ghost') {
                             // If we reload from JSON, we might have old ghosts. 
                             // We can remove them and let the new 'blocks' loop (above) add fresh ones?
                             // But wait, loadFromJSON is async and happens AFTER we added blocks above (if we don't await).
                             // We should move block addition INSIDE or AFTER loadFromJSON.
                         }
                         
                         obj.scaleX = obj.scaleX * ratio;
                         obj.scaleY = obj.scaleY * ratio;
                         obj.left = obj.left * ratio;
                         obj.top = obj.top * ratio;
                         obj.setCoords();
                     });
                     
                }
                
                // Remove any saved ghosts from JSON to avoid duplicates with newly generated ones?
                // Or just proceed.
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

  // Handle converting ghost to editable
  const handleSelection = (e) => {
      const selected = e.selected ? e.selected[0] : null;
      if (!selected || !fabricCanvasRef.current) {
          setSelectedObject(null);
          return;
      }
      
      if (selected.data && selected.data.type === 'text_ghost') {
          convertGhostToText(selected);
      } else {
          setSelectedObject(selected);
      }
  };

  const convertGhostToText = (ghost) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const { text, fontSize, fontFamily } = ghost.data;
      
      // Basic Font Mapping
      let mappedFont = 'Helvetica'; // Default
      if (fontFamily) {
          const lower = fontFamily.toLowerCase();
          if (lower.includes('times') || lower.includes('serif')) mappedFont = 'Times New Roman';
          else if (lower.includes('courier') || lower.includes('mono')) mappedFont = 'Courier New';
          else if (lower.includes('arial')) mappedFont = 'Arial';
      }

      // 1. Create Whiteout (Redaction) to cover original text
      // We add padding to ensure we fully cover the underlying pixels (preventing "replication" or double-vision)
      const paddingX = 2;
      const paddingY = 2;
      
      const whiteout = new fabric.Rect({
          left: ghost.left - paddingX,
          top: ghost.top - paddingY,
          width: ghost.width + (paddingX * 2),
          height: ghost.height + (paddingY * 2),
          fill: 'white',
          selectable: false,
          evented: false,
          data: { type: 'redact' }
      });

      // 2. Create Editable Text
      const editableText = new fabric.IText(text, {
          left: ghost.left,
          top: ghost.top, 
          fontSize: fontSize,
          fontFamily: mappedFont, // Use mapped font
          fill: 'black',
          width: ghost.width,
          data: { type: 'edited_text', original: text }
      });
      
      // Remove ghost
      canvas.remove(ghost);
      
      // Add new objects
      canvas.add(whiteout);
      canvas.add(editableText);
      
      // Select and enter editing
      canvas.setActiveObject(editableText);
      editableText.enterEditing();
      editableText.selectAll();
      canvas.requestRenderAll();
  };

  const handleMouseMove = (e, canvas) => {
       // Handle dragging for rectangle creation
      if (isDragging.current && activeShape.current) {
          const pointer = canvas.getScenePoint(e.e);
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
  };

  const handleMouseDown = (e, canvas) => {
      // Handle Rectangle Drawing Tools (Link, Form)
      const currentTool = toolRef.current;

      if (['link', 'form_text', 'form_checkbox'].includes(currentTool)) {
          isDragging.current = true;
          const pointer = canvas.getScenePoint(e.e);
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

      // Explicit Highlight/Strikeout tools
      // These could now work on the "ghost" objects too if we want?
      // For now, let's keep them working if they intersect with ghosts, 
      // OR we can rely on standard fabric selection?
      
      if (['highlight', 'strikeout'].includes(currentTool)) {
          const pointer = canvas.getScenePoint(e.e);
          // Find intersecting ghost
          const ghost = canvas.getObjects().find(obj => 
              obj.data && obj.data.type === 'text_ghost' && 
              obj.containsPoint(pointer)
          );
          
          if (ghost) {
               if (currentTool === 'highlight') {
                   const rect = new fabric.Rect({
                        left: ghost.left,
                        top: ghost.top,
                        width: ghost.width,
                        height: ghost.height,
                        fill: 'yellow',
                        opacity: 0.4,
                        selectable: true
                   });
                   canvas.add(rect);
               } else if (currentTool === 'strikeout') {
                   const line = new fabric.Line([
                       ghost.left,
                       ghost.top + (ghost.height / 2),
                       ghost.left + ghost.width,
                       ghost.top + (ghost.height / 2)
                   ], {
                       stroke: 'red',
                       strokeWidth: 2,
                       selectable: true
                   });
                   canvas.add(line);
               }
               canvas.requestRenderAll();
          }
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

                if (obj.data && obj.data.type === 'text_ghost') {
                    // Skip ghosts in PDF generation
                    continue;
                } else if (obj.data && obj.data.type === 'redact') {
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
                
                {/* Properties Panel */}
                 <div className="flex items-center gap-4 ml-4 px-4 border-l border-gray-200">
                    {/* Common Properties (Color/Stroke) */}
                    <div className="flex items-center gap-2">
                       <label className="text-xs text-gray-500 font-medium">Color:</label>
                       <input 
                          type="color" 
                          value={color} 
                          onChange={(e) => {
                              setColor(e.target.value);
                              if (fabricCanvasRef.current) {
                                  const active = fabricCanvasRef.current.getActiveObject();
                                  if (active) {
                                      active.set(active.type === 'i-text' ? 'fill' : 'stroke', e.target.value);
                                      if (active.type !== 'i-text') active.set('fill', 'transparent'); // For shapes, usually fill transparent
                                      fabricCanvasRef.current.requestRenderAll();
                                  }
                              }
                          }}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden shadow-sm"
                          title="Color"
                       />
                    </div>

                    {selectedObject && (selectedObject.type === 'i-text' || selectedObject.data?.type === 'edited_text') && (
                        <>
                            <div className="h-8 w-px bg-gray-300"></div>
                            
                            {/* Font Family */}
                            <select 
                                value={selectedObject.fontFamily}
                                onChange={(e) => {
                                    if (fabricCanvasRef.current) {
                                        selectedObject.set('fontFamily', e.target.value);
                                        fabricCanvasRef.current.requestRenderAll();
                                        setSelectedObject({...selectedObject}); // Force re-render
                                    }
                                }}
                                className="border rounded p-1 text-sm w-32"
                            >
                                <option value="Helvetica">Helvetica</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Arial">Arial</option>
                                <option value="Verdana">Verdana</option>
                            </select>

                            {/* Font Size */}
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded border border-gray-200">
                                <span className="text-xs text-gray-500 font-medium px-1">Size:</span>
                                <input 
                                    type="number" 
                                    min="8" max="120" 
                                    value={selectedObject.fontSize} 
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (fabricCanvasRef.current) {
                                            selectedObject.set('fontSize', val);
                                            fabricCanvasRef.current.requestRenderAll();
                                            setSelectedObject({...selectedObject});
                                        }
                                    }}
                                    className="w-12 p-1 text-sm border-0 bg-transparent"
                                />
                            </div>

                             {/* Text Align */}
                             <button
                                onClick={() => {
                                    if(fabricCanvasRef.current) {
                                        const current = selectedObject.textAlign || 'left';
                                        const next = current === 'left' ? 'center' : (current === 'center' ? 'right' : 'left');
                                        selectedObject.set('textAlign', next);
                                        fabricCanvasRef.current.requestRenderAll();
                                    }
                                }}
                                className="p-1 hover:bg-gray-200 rounded text-xs font-bold w-6 text-center text-gray-600 border border-gray-300"
                                title="Align Text"
                             >
                                {(selectedObject.textAlign || 'left').substring(0,1).toUpperCase()}
                             </button>

                             {/* Text BG */}
                             <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500 font-medium">BG:</span>
                                <input 
                                    type="color" 
                                    value={selectedObject.backgroundColor || '#ffffff'} 
                                    onChange={(e) => {
                                        if (fabricCanvasRef.current) {
                                            // Handling transparent?
                                            selectedObject.set('backgroundColor', e.target.value);
                                            fabricCanvasRef.current.requestRenderAll();
                                        }
                                    }}
                                    className="w-6 h-6 rounded cursor-pointer border shadow-sm"
                                    title="Background Color"
                                />
                                <button 
                                    onClick={() => {
                                        if (fabricCanvasRef.current) {
                                            selectedObject.set('backgroundColor', '');
                                            fabricCanvasRef.current.requestRenderAll();
                                        }
                                    }}
                                    className="text-[10px] text-red-500 hover:underline"
                                >
                                    Clear
                                </button>
                             </div>
                        </>
                    )}

                    {!selectedObject || (selectedObject.type !== 'i-text' && selectedObject.type !== 'text') && (
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded border border-gray-200">
                            <span className="text-xs text-gray-500 font-medium px-1">Stroke:</span>
                            <input 
                                type="number" 
                                min="1" max="20" 
                                value={strokeWidth} 
                                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                                className="w-12 p-1 text-sm border rounded"
                            />
                        </div>
                    )}
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
