
import sys
import json
import fitz # PyMuPDF
import base64
import argparse

def extract(doc):
    result = []
    for page_num, page in enumerate(doc):
        text_blocks = page.get_text("dict")["blocks"]
        
        text_blocks_out = []
        images_out = []
        
        for b in text_blocks:
            if b["type"] == 0: # Text
                lines = []
                for l in b["lines"]:
                    spans = []
                    for s in l["spans"]:
                        c = s["color"]
                        hex_color = f"{c:06X}" if isinstance(c, int) else "000000"
                        
                        spans.append({
                            "text": s["text"],
                            "size": s["size"],
                            "font": s["font"],
                            "color": hex_color,
                            "bbox": s["bbox"]
                        })
                    lines.append({"span": spans})
                text_blocks_out.append({"line": lines})
                
            elif b["type"] == 1: # Image
                img_data = b.get("image")
                if img_data:
                    b64 = base64.b64encode(img_data).decode('utf-8')
                    images_out.append({
                        "data": b64,
                        "bbox": b["bbox"],
                        "width": b["width"],
                        "height": b["height"]
                    })
        
        result.append({"block": text_blocks_out, "images": images_out})
    return json.dumps(result)

def compress(doc, output_path):
    # garbage=4: Check for duplicates, unused objects, and streams.
    # deflate=True: Compress streams.
    doc.save(output_path, garbage=4, deflate=True)
    return json.dumps({"status": "success", "file": output_path})

def protect(doc, output_path, password):
    # PyMuPDF encryption
    # owner_pw, user_pw
    # We set both to the provided password for simplicity, or just user_pw.
    # Usually user wants to restrict opening?
    # permissions: print, copy, etc.
    # encryption: fitz.PDF_ENCRYPT_AES_256 (if available) or 128
    
    # 2 = 128bit AES, 3=256bit AES (if library supports)
    # R=6 is AES 256. 
    # Let's use robust defaults.
    
    # doc.save(..., encryption=fitz.PDF_ENCRYPT_AES_128, owner_pw=..., user_pw=...)
    doc.save(output_path, encryption=fitz.PDF_ENCRYPT_AES_128, owner_pw=password, user_pw=password)
    return json.dumps({"status": "success", "file": output_path})

def main():
    parser = argparse.ArgumentParser(description="PDF Processor")
    parser.add_argument("command", choices=["extract", "compress", "protect"])
    parser.add_argument("input_path")
    parser.add_argument("--output_path", help="Output file path (for compress/protect)")
    parser.add_argument("--password", help="Password for protection")
    
    args = parser.parse_args()
    
    try:
        doc = fitz.open(args.input_path)
        
        if args.command == "extract":
            print(extract(doc))
            
        elif args.command == "compress":
            if not args.output_path:
                raise ValueError("output_path required for compress")
            print(compress(doc, args.output_path))
            
        elif args.command == "protect":
            if not args.output_path or not args.password:
                raise ValueError("output_path and password required for protect")
            print(protect(doc, args.output_path, args.password))
            
        doc.close()
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
