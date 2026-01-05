import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import SignatureModal from '../components/SignatureModal';
import {
    Loader2, Edit3, Type, Image as ImageIcon, Download,
    Square, Circle, MousePointer, ChevronLeft,
    ZoomIn, ZoomOut, Trash2, Highlighter, Strikethrough, PenTool
} from 'lucide-react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import {
    Canvas,
    StaticCanvas,
    Rect,
    IText,
    Ellipse,
    FabricImage,
    PencilBrush,
    util as fabricUtil
} from 'fabric';

// Use the worker from your public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const EditPDF = () => {
    const navigate = useNavigate();

    // -- Core State --
    const [file, setFile] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [thumbnails, setThumbnails] = useState({});
    const [scale, setScale] = useState(1.5);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    // -- Canvas / Editor State --
    const canvasRef = useRef(null);
    const fabricCanvas = useRef(null);
    const [tool, setTool] = useState('select');
    const toolRef = useRef('select');
    const [color, setColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(2);

    // -- Font Controls --
    const [selectedFontSize, setSelectedFontSize] = useState(16);
    const [selectedFontFamily, setSelectedFontFamily] = useState('Times New Roman');
    const [selectedTextColor, setSelectedTextColor] = useState('#000000');

    // -- Data Storage --
    const pageStates = useRef({});
    const pageTextMaps = useRef({});
    const editedTextAreas = useRef({});  // Track edited text positions to skip hover
    const [showSignModal, setShowSignModal] = useState(false);

    // 1. Load File & PDF
    const handleFiles = (files) => {
        if (files[0]) {
            setFile(files[0]);
            loadPDF(files[0]);
        }
    };

    const loadPDF = async (f) => {
        try {
            const buff = await f.arrayBuffer();
            const doc = await pdfjsLib.getDocument(buff).promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setCurrentPage(1);
            generateThumbnails(doc);
        } catch (err) {

            setError("Failed to load PDF. Check file format.");
        }
    };

    const generateThumbnails = async (doc) => {
        const thumbs = {};
        const max = Math.min(doc.numPages, 10);
        for (let i = 1; i <= max; i++) {
            try {
                const page = await doc.getPage(i);
                const vp = page.getViewport({ scale: 0.2 });
                const cvs = document.createElement('canvas');
                cvs.width = vp.width; cvs.height = vp.height;
                await page.render({ canvasContext: cvs.getContext('2d'), viewport: vp }).promise;
                thumbs[i] = cvs.toDataURL();
            } catch (e) { }
        }
        setThumbnails(thumbs);
    };

    // Helper function to map PDF fonts to web-safe fonts
    const mapPdfFontToWebFont = (pdfFontName) => {
        if (!pdfFontName) return 'Times New Roman, serif';
        
        const fontLower = pdfFontName.toLowerCase();
        
        // Common PDF font mappings
        if (fontLower.includes('times')) return 'Times New Roman, serif';
        if (fontLower.includes('arial')) return 'Arial, Helvetica, sans-serif';
        if (fontLower.includes('helvetica')) return 'Arial, Helvetica, sans-serif';
        if (fontLower.includes('courier')) return 'Courier New, monospace';
        if (fontLower.includes('georgia')) return 'Georgia, serif';
        if (fontLower.includes('verdana')) return 'Verdana, sans-serif';
        if (fontLower.includes('comic')) return 'Comic Sans MS, cursive';
        if (fontLower.includes('trebuchet')) return 'Trebuchet MS, sans-serif';
        
        // Default fallback
        return 'Times New Roman, serif';
    };

    // 2. Extract Text Data (Grouped by Line)
    const extractPageText = async (page, viewport) => {
        const key = `${page.pageNumber}-${scale}`;


        try {
            const textContent = await page.getTextContent();
            if (!textContent || !textContent.items) return [];

            // Filter empty items
            const items = textContent.items.filter(i => {
                if (i.str.trim().length > 0) {
                    return true;
                }
                return false;
            });

            // 1. Map to transformed coordinates using Projective Transform
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            const rawItems = items.map(item => {
                // PDF.js Text Item Transform: [scaleX, skewY, skewX, scaleY, x, y]
                const pdfX = item.transform[4];
                const pdfY = item.transform[5];

                const [px, py] = viewport.convertToViewportPoint(pdfX, pdfY);
                const [endPx, endPy] = viewport.convertToViewportPoint(pdfX + item.width, pdfY);
                const pixelWidth = Math.hypot(endPx - px, endPy - py);



                const scaledFontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]);
                const finalFontSize = scaledFontSize * scale;

                // Map PDF font to web font
                const webFont = mapPdfFontToWebFont(item.fontName);

                tempCtx.font = `${finalFontSize}px ${webFont}`;
                const metrics = tempCtx.measureText(item.str);

                let ascent = metrics.actualBoundingBoxAscent || metrics.fontBoundingBoxAscent;
                let descent = metrics.actualBoundingBoxDescent || metrics.fontBoundingBoxDescent;

                // Fallback if measurement fails (approx for Times New Roman)
                if (!ascent) ascent = finalFontSize * 0.8;
                if (!descent) descent = finalFontSize * 0.2;



                return {
                    str: item.str,
                    x: px,
                    y: py - ascent,
                    w: pixelWidth,
                    h: ascent + descent,
                    fontSize: finalFontSize,
                    fontFamily: webFont,  // Store mapped web font
                    pdfFontName: item.fontName,  // Store original PDF font name
                    baselineY: py,
                    measuredAscent: ascent,
                    measuredDescent: descent
                };
            });



            // 2. Sort by Y (top) then X
            rawItems.sort((a, b) => {
                const diffY = Math.abs(a.y - b.y);
                if (diffY < a.h / 2) { // Same line threshold
                    return a.x - b.x;
                }
                return a.y - b.y;
            });

            // 3. Group into lines
            const userLines = [];
            let currentLine = null;

            for (const item of rawItems) {
                if (!currentLine) {
                    currentLine = { ...item, text: item.str };
                    continue;
                }

                const verticalOverlap = Math.abs(item.y - currentLine.y) < (Math.min(item.h, currentLine.h) * 0.5);

                if (verticalOverlap) {
                    const gap = item.x - (currentLine.x + currentLine.w);
                    if (gap > (currentLine.fontSize * 0.15)) {
                        currentLine.text += ' ' + item.str;
                    } else {
                        currentLine.text += item.str;
                    }
                    const newMaxX = Math.max(currentLine.x + currentLine.w, item.x + item.w);
                    currentLine.w = newMaxX - currentLine.x;
                    currentLine.h = Math.max(currentLine.h, item.h);
                    currentLine.y = Math.min(currentLine.y, item.y);
                } else {
                    userLines.push(currentLine);
                    currentLine = { ...item, text: item.str };
                }
            }
            if (currentLine) userLines.push(currentLine);



            pageTextMaps.current[key] = userLines;
            return userLines;
        } catch (e) {
            return [];
        }
    };

    // 3. Initialize Canvas for Page
    const renderPage = useCallback(async () => {
        if (!pdfDoc) return;

        setProcessing(true);

        try {
            // Cleanup old canvas
            if (fabricCanvas.current) {
                // Save state of previous page
                pageStates.current[currentPage] = fabricCanvas.current.toJSON();
                await fabricCanvas.current.dispose();
                fabricCanvas.current = null;
            }

            const page = await pdfDoc.getPage(currentPage);


            const viewport = page.getViewport({ scale });

            // Prepare background canvas
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = viewport.width;
            bgCanvas.height = viewport.height;

            await page.render({ canvasContext: bgCanvas.getContext('2d'), viewport }).promise;
            const bgDataURL = bgCanvas.toDataURL();

            extractPageText(page, viewport)
                .then(text => { })
                .catch(err => { });

            // Init Fabric Canvas
            if (!canvasRef.current) {

                return;
            }


            const canvas = new Canvas(canvasRef.current, {
                width: viewport.width,
                height: viewport.height,
                selection: true,
                preserveObjectStacking: true
            });
            fabricCanvas.current = canvas;


            canvas.calcOffset();


            const canvasContainer = canvas.getElement().parentNode;
            if (canvasContainer) {
                canvasContainer.style.zIndex = '10';
                canvasContainer.style.pointerEvents = 'auto';
                canvasContainer.style.position = 'relative';
            }

            // Set Background

            const img = await FabricImage.fromURL(bgDataURL);
            img.set({ originX: 'left', originY: 'top', selectable: false, evented: false });
            canvas.backgroundImage = img;
            canvas.requestRenderAll();

            // Load previous state
            if (pageStates.current[currentPage]) {
                await canvas.loadFromJSON(pageStates.current[currentPage]);
            } else {
                // Add a default TEST OBJECT to verify interactivity
                const testRect = new Rect({
                    left: 100, top: 100, width: 100, height: 100, fill: 'red',
                    selectable: true, evented: true,
                    data: { type: 'test_rect' }
                });
                canvas.add(testRect);
            }

            setupEvents(canvas);
            setProcessing(false);

        } catch (error) {
            setProcessing(false);
        }
    }, [pdfDoc, currentPage, scale]);

    useEffect(() => {
        renderPage();
        return () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.dispose();
                fabricCanvas.current = null;
            }
        };
    }, [renderPage]);

    // 4. Tool & Event Management
    useEffect(() => {
        toolRef.current = tool;
        if (fabricCanvas.current) applyTool(fabricCanvas.current, tool);
    }, [tool, color, strokeWidth]);

    const applyTool = (canvas, currentTool) => {
        canvas.isDrawingMode = (currentTool === 'draw');
        if (canvas.isDrawingMode) {
            canvas.freeDrawingBrush = new PencilBrush(canvas);
            canvas.freeDrawingBrush.width = strokeWidth;
            canvas.freeDrawingBrush.color = color;
        }

        canvas.selection = (currentTool === 'select');
        canvas.defaultCursor = currentTool === 'select' ? 'default' : 'crosshair';

        canvas.forEachObject(obj => {
            // Lock interaction if not selecting
            obj.selectable = (currentTool === 'select');
            obj.evented = (currentTool === 'select');
        });
    };

    // Update selected IText when font controls change
    useEffect(() => {
        if (!fabricCanvas.current) return;
        
        const active = fabricCanvas.current.getActiveObject();
        
        if (active && (active.type === 'i-text' || active.type === 'IText')) {
            // Update font even when editing - allows changing font while typing
            active.set({
                fontFamily: selectedFontFamily,
                fontSize: selectedFontSize,
                fill: selectedTextColor
            });
            fabricCanvas.current.requestRenderAll();
        }
    }, [selectedFontSize, selectedFontFamily, selectedTextColor]);

    // Keydown listener for nudging objects (not when editing text)
    useEffect(() => {
        const handleKey = (e) => {
            // Only handle arrow keys
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                return;
            }

            // Don't interfere with text editing in textarea/input (Fabric's hidden input)
            if (e.target.tagName === 'TEXTAREA' || 
                e.target.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                document.activeElement?.tagName === 'INPUT') {
                return;
            }

            if (!fabricCanvas.current) return;
            const active = fabricCanvas.current.getActiveObject();

            if (!active || active.data?.type !== 'native_text') return;

            // Check isEditing first and return WITHOUT preventDefault
            if (active.isEditing) {
                return; // Let browser/Fabric handle it
            }

            // Only move object if not editing
            let dx = 0, dy = 0;
            if (e.key === 'ArrowUp') dy = -1;
            if (e.key === 'ArrowDown') dy = 1;
            if (e.key === 'ArrowLeft') dx = -1;
            if (e.key === 'ArrowRight') dx = 1;

            if (dx !== 0 || dy !== 0) {
                e.preventDefault(); // Only prevent when actually moving object
                active.set({ left: active.left + dx, top: active.top + dy });
                active.setCoords();
                fabricCanvas.current.requestRenderAll();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    const setupEvents = (canvas) => {
        canvas.on('object:modified', (e) => {
            const target = e.target;
            // Logic for modified objects
        });

        let hoverHighlight = null;
        let draggingObj = null; // Track object directly
        let lastPointer = null;

        // Variables for shape creation tools
        let isDragging = false;
        let startPoint = null;
        let activeShape = null;

        // Helper to check if area is edited
        const isAreaEdited = (x, y, pageKey) => {
            const editedAreas = editedTextAreas.current[pageKey] || [];
            return editedAreas.some(area => 
                x >= area.x && x <= area.x + area.w &&
                y >= area.y && y <= area.y + area.h
            );
        };

        // NATIVE FALLBACK SETUP
        const upperEl = canvas.upperCanvasEl;
        if (upperEl) {
            upperEl.onpointermove = (e) => {
                // Use clientX/clientY with getBoundingClientRect() to match viewport coordinates
                const rect = upperEl.getBoundingClientRect();
                const pointer = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };

                // 1. Manual Dragging Logic (Robust)
                if (draggingObj && lastPointer) {
                    const dx = pointer.x - lastPointer.x;
                    const dy = pointer.y - lastPointer.y;
                    draggingObj.set({
                        left: draggingObj.left + dx,
                        top: draggingObj.top + dy
                    });
                    draggingObj.setCoords();
                    canvas.requestRenderAll();
                    lastPointer = pointer;
                    return; // Skip highlight if dragging
                }

                if (toolRef.current !== 'select') return;

                // 2. Highlight Logic - Skip edited areas
                const pageKey = `${currentPage}-${scale}`;
                const textMap = pageTextMaps.current[pageKey] || [];
                const hit = textMap.find(item =>
                    pointer.x >= item.x && pointer.x <= item.x + item.w &&
                    pointer.y >= item.y && pointer.y <= item.y + item.h &&
                    !isAreaEdited(pointer.x, pointer.y, pageKey)  // Skip edited areas
                );

                if (hit) {
                    canvas.defaultCursor = 'text';
                    if (hoverHighlight &&
                        Math.abs(hoverHighlight.left - hit.x) < 0.1 &&
                        Math.abs(hoverHighlight.top - hit.y) < 0.1) {
                        return;
                    }
                    if (hoverHighlight) canvas.remove(hoverHighlight);

                    const fabricTopPadding = hit.fontSize * 0.15;
                    const adjustedTop = hit.y - fabricTopPadding;

                    hoverHighlight = new Rect({
                        left: hit.x, top: adjustedTop, width: hit.w, height: hit.h,
                        originX: 'left',
                        originY: 'top',
                        fill: 'transparent', stroke: 'red', strokeWidth: 1, strokeDashArray: [4, 4],
                        selectable: false, evented: false, opacity: 0.7
                    });
                    canvas.add(hoverHighlight);
                    canvas.requestRenderAll();
                } else {
                    canvas.defaultCursor = 'default';
                    if (hoverHighlight) {
                        canvas.remove(hoverHighlight);
                        hoverHighlight = null;
                        canvas.requestRenderAll();
                    }
                }
            };

            upperEl.onpointerdown = (e) => {
                if (toolRef.current !== 'select') return;

                // Use offsetX/offsetY which are relative to the target element (canvas)
                // This automatically handles scroll, transforms, and positioning
                const rect = upperEl.getBoundingClientRect();
                const pointer = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };



                // 1. Check for Existing Fabric Object (Manual Hit Test)
                // Iterate top-down to find clicked object
                const objects = canvas.getObjects().reverse();
                const target = objects.find(obj =>
                    obj.visible && obj.evented && obj !== hoverHighlight && obj.containsPoint(pointer)
                );

                if (target) {
                    draggingObj = target;
                    lastPointer = pointer;

                    try {
                        // Try to activate, but don't crash if it fails
                        canvas.setActiveObject(target);
                        // DON'T auto-enter editing - let Fabric handle it
                        // Single click = select object, double click = enter editing
                    } catch (err) {
                        // setActiveObject failed silently
                    }

                    canvas.requestRenderAll();
                    return; // Stop here!
                }

                // 2. Create Ghost Text - Skip if area already edited
                const pageKey = `${currentPage}-${scale}`;
                const textMap = pageTextMaps.current[pageKey] || [];
                const hit = textMap.find(item =>
                    pointer.x >= item.x && pointer.x <= item.x + item.w &&
                    pointer.y >= item.y && pointer.y <= item.y + item.h &&
                    !isAreaEdited(pointer.x, pointer.y, pageKey)
                );

                if (hit) {
                    const fabricTopPadding = hit.fontSize * 0.15;
                    const adjustedTop = hit.y - fabricTopPadding;

                    // Whiteout box
                    const whiteout = new Rect({
                        left: hit.x,
                        top: hit.y,
                        width: hit.w,
                        height: hit.h,
                        originX: 'left',
                        originY: 'top',
                        fill: 'white',
                        selectable: false,
                        evented: false,
                        data: { type: 'redact' }
                    });

                    // Use predicted font from PDF or user-selected font
                    const useFontFamily = hit.fontFamily || selectedFontFamily;
                    const useFontSize = hit.fontSize || selectedFontSize;

                    // Update font control dropdowns to match the inserted text
                    const fontNameOnly = useFontFamily.split(',')[0].trim();
                    
                    setSelectedFontFamily(fontNameOnly);
                    setSelectedFontSize(Math.round(useFontSize));

                    // Editable Text Object
                    const iText = new IText(hit.text, {
                        left: hit.x,
                        top: hit.y,
                        originX: 'left',
                        originY: 'top',
                        fontSize: useFontSize,
                        fontFamily: useFontFamily,
                        fill: selectedTextColor,
                        data: { type: 'native_text' },
                        selectable: true,
                        evented: true,
                        lockMovementX: false,
                        lockMovementY: false,
                        padding: 0,
                        lineHeight: 1,
                        textAlign: 'left',
                        charSpacing: 0,
                        strokeWidth: 0
                    });

                    iText.set('top', adjustedTop);

                    canvas.add(whiteout);
                    canvas.add(iText);

                    // Track this edited area
                    if (!editedTextAreas.current[pageKey]) {
                        editedTextAreas.current[pageKey] = [];
                    }
                    editedTextAreas.current[pageKey].push({
                        x: hit.x, y: hit.y, w: hit.w, h: hit.h
                    });

                    draggingObj = iText;
                    lastPointer = pointer;

                    try {
                        canvas.setActiveObject(iText);
                        // Let user double-click to edit - single click just selects
                    } catch (err) {
                        // Failed to select
                    }

                    canvas.requestRenderAll();
                }
            };

            upperEl.onpointerup = () => {
                // Snap to grid or just finish drag
                if (draggingObj) {
                    draggingObj.setCoords();
                    draggingObj = null;
                    lastPointer = null;
                }
            };
        }


        // Helper to get pointer safely in Fabric v7/v6
        const getPointer = (opt) => {
            if (opt.scenePoint) return opt.scenePoint;
            if (opt.pointer) return opt.pointer; // Fallback
            // Last resort if canvas instance is available
            return canvas.getScenePoint ? canvas.getScenePoint(opt.e) : { x: 0, y: 0 };
        };

        canvas.on('mouse:down', (opt) => {
            try {
                const pointer = getPointer(opt);
                const t = toolRef.current;

                // 2. Shape / Text Creation Logic
                if (['rect', 'circle', 'text'].includes(t)) {
                    isDragging = true;
                    startPoint = pointer;

                    if (t === 'rect') {
                        activeShape = new Rect({
                            left: pointer.x, top: pointer.y, width: 0, height: 0,
                            fill: 'transparent', stroke: color, strokeWidth: strokeWidth
                        });
                    } else if (t === 'circle') {
                        activeShape = new Ellipse({
                            left: pointer.x, top: pointer.y, rx: 0, ry: 0,
                            fill: 'transparent', stroke: color, strokeWidth: strokeWidth
                        });
                    } else if (t === 'text') {
                        const itext = new IText('Type Here', {
                            left: pointer.x, top: pointer.y, fontSize: 20, fill: color
                        });
                        canvas.add(itext);
                        canvas.setActiveObject(itext);
                        setTool('select');
                        return;
                    }
                    if (activeShape) canvas.add(activeShape);
                }
            } catch (error) {
                // Ignore error
            }
        });

        canvas.on('mouse:move', (opt) => {
            if (!isDragging || !activeShape) {
                // Handle hover logic here too if needed to avoid dup listeners
                // But we have a separate listener below.
            } else {
                const pointer = getPointer(opt);

                if (activeShape.type === 'rect') { // Fabric v7 type check might be 'rect' or class instance
                    activeShape.set({
                        width: Math.abs(pointer.x - startPoint.x),
                        height: Math.abs(pointer.y - startPoint.y),
                        left: Math.min(pointer.x, startPoint.x),
                        top: Math.min(pointer.y, startPoint.y)
                    });
                } else if (activeShape.type === 'ellipse') {
                    activeShape.set({
                        rx: Math.abs(pointer.x - startPoint.x) / 2,
                        ry: Math.abs(pointer.y - startPoint.y) / 2,
                        left: Math.min(pointer.x, startPoint.x),
                        top: Math.min(pointer.y, startPoint.y)
                    });
                }
                canvas.requestRenderAll();
            }
        });

        canvas.on('mouse:up', () => {
            if (isDragging) {
                isDragging = false;
                if (activeShape) {
                    activeShape.setCoords();
                    canvas.setActiveObject(activeShape);
                }
                activeShape = null;
                setTool('select');
            }
        });

        // Handle double-click to edit IText
        canvas.on('mouse:dblclick', (opt) => {
            const target = opt.target;
            if (target && (target.type === 'i-text' || target.type === 'IText')) {
                target.enterEditing();
                target.selectAll();
                canvas.requestRenderAll();
            }
        });

        // Hover Cursor & Highlight Logic
        // hoverHighlight is defined at top of setupEvents


        canvas.on('mouse:move', (opt) => {
            // If dragging shape, ignore this handler (or let it pass)
            if (isDragging) return;

            if (toolRef.current === 'select' && !opt.target) {
                const pageKey = `${currentPage}-${scale}`;
                const textMap = pageTextMaps.current[pageKey] || [];
                const pointer = getPointer(opt);
                const hit = textMap.find(item =>
                    pointer.x >= item.x && pointer.x <= item.x + item.w &&
                    pointer.y >= item.y && pointer.y <= item.y + item.h &&
                    !isAreaEdited(pointer.x, pointer.y, pageKey)  // Skip edited areas
                );

                if (hit) {
                    canvas.defaultCursor = 'text';

                    // If we already have a highlight for this item, skip
                    if (hoverHighlight &&
                        Math.abs(hoverHighlight.left - hit.x) < 0.1 &&
                        Math.abs(hoverHighlight.top - hit.y) < 0.1) {
                        return;
                    }

                    // Remove existing
                    if (hoverHighlight) {
                        canvas.remove(hoverHighlight);
                    }

                    // Add new highlight with same adjustment as IText
                    const fabricTopPadding = hit.fontSize * 0.15;
                    const adjustedTop = hit.y - fabricTopPadding;

                    hoverHighlight = new Rect({
                        left: hit.x,
                        top: adjustedTop,
                        originX: 'left',  // MUST set this - defaults to 'center'!
                        originY: 'top',   // MUST set this - defaults to 'center'!
                        width: hit.w,
                        height: hit.h,
                        fill: 'transparent',
                        stroke: 'red',
                        strokeWidth: 1,
                        strokeDashArray: [4, 4],
                        selectable: false,
                        evented: false,
                        opacity: 0.7
                    });
                    canvas.add(hoverHighlight);
                    canvas.requestRenderAll();

                } else {
                    canvas.defaultCursor = 'default';
                    if (hoverHighlight) {
                        canvas.remove(hoverHighlight);
                        hoverHighlight = null;
                        canvas.requestRenderAll();
                    }
                }
            } else {
                // If hovering over an object or different tool, clear highlight
                if (hoverHighlight) {
                    canvas.remove(hoverHighlight);
                    hoverHighlight = null;
                    canvas.requestRenderAll();
                }
            }
        });

        // Clear highlight on mouse out of canvas
        canvas.on('mouse:out', () => {
            if (hoverHighlight) {
                canvas.remove(hoverHighlight);
                hoverHighlight = null;
                canvas.requestRenderAll();
            }
        });
    };

    // 5. External Actions
    const addSignature = async (dataUrl) => {
        const canvas = fabricCanvas.current;
        if (!canvas) return;

        const img = await FabricImage.fromURL(dataUrl);
        const center = canvas.getCenterPoint();
        img.set({
            left: center.x - 75,
            top: center.y - 25,
            scaleX: 0.5,
            scaleY: 0.5,
            selectable: true,
            evented: true
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
    };

    const deleteSelected = () => {
        const canvas = fabricCanvas.current;
        const active = canvas.getActiveObjects();
        if (active.length) {
            canvas.discardActiveObject();
            active.forEach(obj => canvas.remove(obj));
            canvas.requestRenderAll();
        }
    };

    const savePdf = async () => {
        setProcessing(true);
        if (fabricCanvas.current) pageStates.current[currentPage] = fabricCanvas.current.toJSON();

        try {
            const operations = [];
            const pdfUploadRes = await axios.post('/api/s3/upload-url', { filename: file.name, contentType: file.type });
            const { uploadUrl: pdfUploadUrl, key: pdfKey } = pdfUploadRes.data;
            await fetch(pdfUploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

            for (const [pIndexStr, state] of Object.entries(pageStates.current)) {
                const pIndex = parseInt(pIndexStr);
                if (!state.objects || state.objects.length === 0) continue;

                const page = await pdfDoc.getPage(pIndex);
                const viewport = page.getViewport({ scale: 1.5 });

                const tempCanvas = new StaticCanvas(null, { width: viewport.width, height: viewport.height });
                await tempCanvas.loadFromJSON(state);

                const conversionFactor = 1 / (scale * 1.5);
                const visualObjects = [];
                const semanticOps = [];
                const pageRawViewport = page.getViewport({ scale: 1.0 });

                for (const obj of tempCanvas.getObjects()) {
                    const pdfX = obj.left * (1 / scale);
                    const pdfY = pageRawViewport.height - ((obj.top + obj.height * obj.scaleY) * (1 / scale));
                    const pdfW = obj.width * obj.scaleX * (1 / scale);
                    const pdfH = obj.height * obj.scaleY * (1 / scale);

                    if (obj.data && obj.data.type === 'native_text') {
                        semanticOps.push({
                            page: pIndex - 1, type: 'text', text: obj.text,
                            x: pdfX, y: pdfY,
                            fontSize: obj.fontSize * (1 / scale), color: obj.fill
                        });
                    } else if (obj.data && obj.data.type === 'redact') {
                        semanticOps.push({ page: pIndex - 1, type: 'redact', x: pdfX, y: pdfY, width: pdfW, height: pdfH });
                    } else {
                        visualObjects.push(obj);
                    }
                }

                if (visualObjects.length > 0) {
                    tempCanvas.clear();
                    visualObjects.forEach(obj => tempCanvas.add(obj));
                    const overlayDataUrl = tempCanvas.toDataURL({ format: 'png' });
                    const overlayBlob = await (await fetch(overlayDataUrl)).blob();
                    const overlayName = `overlay_p${pIndex}_${Date.now()}.png`;

                    const overlayUploadRes = await axios.post('/api/s3/upload-url', { filename: overlayName, contentType: 'image/png' });
                    await fetch(overlayUploadRes.data.uploadUrl, { method: 'PUT', body: overlayBlob, headers: { 'Content-Type': 'image/png' } });
                    operations.push({ page: pIndex - 1, type: "image", key: overlayUploadRes.data.key, x: 0, y: 0, width: viewport.width, height: viewport.height });
                }
                operations.push(...semanticOps);
                tempCanvas.dispose();
            }

            if (operations.length === 0) {
                alert("No changes to save!");
                setProcessing(false);
                return;
            }

            const response = await axios.post('/api/process/edit', { key: pdfKey, operations: JSON.stringify(operations) });
            window.open(response.data.downloadUrl, '_blank');

        } catch (err) {
            setError("Failed to save PDF: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (!file) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-4">Edit PDF</h1>
                    <FileUploader onFilesSelected={handleFiles} />
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <SEO title="Edit PDF" />
            <div className="h-16 bg-white border-b flex items-center px-4 justify-between shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                    <div className="h-6 w-px bg-gray-300 mx-2" />

                    <button onClick={() => setTool('select')} className={`p-2 rounded ${tool === 'select' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`} title="Select / Edit Text"><MousePointer className="w-5 h-5" /></button>
                    <button onClick={() => setTool('draw')} className={`p-2 rounded ${tool === 'draw' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}><Edit3 className="w-5 h-5" /></button>
                    <button onClick={() => setTool('text')} className={`p-2 rounded ${tool === 'text' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}><Type className="w-5 h-5" /></button>
                    <button onClick={() => setTool('rect')} className={`p-2 rounded ${tool === 'rect' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}><Square className="w-5 h-5" /></button>
                    <button onClick={() => setTool('circle')} className={`p-2 rounded ${tool === 'circle' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'}`}><Circle className="w-5 h-5" /></button>
                    <button onClick={() => setShowSignModal(true)} className="p-2 rounded hover:bg-gray-100"><PenTool className="w-5 h-5" /></button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Text Controls - Only show for select/text tools */}
                    {(tool === 'select' || tool === 'text') && (
                        <>
                            <select 
                                value={selectedFontFamily} 
                                onChange={e => setSelectedFontFamily(e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                title="Font Family"
                            >
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Arial">Arial</option>
                                <option value="Helvetica">Helvetica</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Verdana">Verdana</option>
                                <option value="Comic Sans MS">Comic Sans MS</option>
                                <option value="Trebuchet MS">Trebuchet MS</option>
                            </select>
                            
                            {/* Font Size Input with +/- Controls */}
                            <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                                <button 
                                    onClick={() => setSelectedFontSize(Math.max(1, selectedFontSize - 1))}
                                    className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border-r border-gray-300 text-sm font-bold"
                                    title="Decrease font size"
                                >
                                    −
                                </button>
                                <input 
                                    type="number"
                                    value={selectedFontSize}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val > 0) {
                                            setSelectedFontSize(val);
                                        }
                                    }}
                                    className="w-16 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    title="Font Size"
                                    min="1"
                                    max="200"
                                />
                                <button 
                                    onClick={() => setSelectedFontSize(Math.min(200, selectedFontSize + 1))}
                                    className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border-l border-gray-300 text-sm font-bold"
                                    title="Increase font size"
                                >
                                    +
                                </button>
                            </div>

                            {/* Text Color Picker */}
                            <input 
                                type="color" 
                                value={selectedTextColor} 
                                onChange={e => setSelectedTextColor(e.target.value)} 
                                className="w-8 h-8 rounded border cursor-pointer" 
                                title="Text Color"
                            />

                            <div className="h-6 w-px bg-gray-300 mx-1" />
                        </>
                    )}
                    
                    {/* Drawing Color & Stroke for Pen/Shapes - Only show for drawing tools */}
                    {(tool === 'draw' || tool === 'rect' || tool === 'circle') && (
                        <>
                            <input 
                                type="color" 
                                value={color} 
                                onChange={e => setColor(e.target.value)} 
                                className="w-8 h-8 rounded border cursor-pointer" 
                                title="Drawing/Shape Color" 
                            />
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                value={strokeWidth} 
                                onChange={e => setStrokeWidth(parseInt(e.target.value))} 
                                className="w-24" 
                                title="Stroke Width"
                            />
                            
                            <div className="h-6 w-px bg-gray-300 mx-1" />
                        </>
                    )}
                    
                    <button onClick={deleteSelected} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-5 h-5" /></button>
                    <button onClick={savePdf} disabled={processing} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700">
                        {processing ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />} Save
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-64 bg-white border-r overflow-y-auto p-4 hidden md:block">
                    {Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
                        <div key={p} onClick={() => setCurrentPage(p)} className={`mb-4 border-2 rounded cursor-pointer overflow-hidden ${currentPage === p ? 'border-purple-600' : 'border-transparent'}`}>
                            {thumbnails[p] ? <img src={thumbnails[p]} className="w-full" /> : <div className="h-32 bg-gray-100 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
                            <div className="text-center text-xs text-gray-500 py-1">Page {p}</div>
                        </div>
                    ))}
                </div>



                <div className="flex-1 bg-gray-100 overflow-auto flex justify-center items-center">
                    <div className="shadow-2xl bg-white origin-top" style={{ position: 'relative' }}>
                        <canvas ref={canvasRef} />
                    </div>
                </div>

                <div className="absolute bottom-8 right-8 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg border border-gray-200 z-30">
                    <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-2 hover:bg-gray-100 rounded text-gray-700"><ZoomIn className="w-5 h-5" /></button>
                    <div className="text-center text-xs font-medium text-gray-500 py-1">{Math.round(scale * 100)}%</div>
                    <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 hover:bg-gray-100 rounded text-gray-700"><ZoomOut className="w-5 h-5" /></button>
                </div>
            </div>

            <SignatureModal isOpen={showSignModal} onClose={() => setShowSignModal(false)} onSave={addSignature} />
        </div>
    );
};

export default EditPDF;