import json
import os
import base64
import fitz  # PyMuPDF
import requests
import tempfile

def handler(event, context):
    # Only allow POST
    if event['httpMethod'] != 'POST':
        return {'statusCode': 405, 'body': 'Method Not Allowed'}

    try:
        body = json.loads(event['body'])
        command = body.get('command')
        input_url = body.get('inputUrl')
        output_url = body.get('outputUrl')
        password = body.get('password')
        
        if not command or not input_url:
            return {'statusCode': 400, 'body': json.dumps({'error': 'Missing proper inputs'})}

        # 1. Download Input File
        # Use temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_in:
            input_path = temp_in.name
            
        print(f"Downloading from {input_url[:50]}... to {input_path}")
        with requests.get(input_url, stream=True) as r:
            r.raise_for_status()
            with open(input_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        
        # 2. Process
        result_data = None
        
        doc = fitz.open(input_path)
        if doc.is_encrypted and password:
            doc.authenticate(password)
            
        output_path = None
        
        if command == 'extract':
            # Extraction Logic
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
            
            result_data = result # List of pages

        elif command == 'compress':
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_out:
                output_path = temp_out.name
            # Garbage=4, deflate=True
            doc.save(output_path, garbage=4, deflate=True)
            
        elif command == 'protect':
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_out:
                output_path = temp_out.name
            
            # Encrypt
            perm = fitz.PDF_PERM_ACCESSIBILITY | fitz.PDF_PERM_PRINT | fitz.PDF_PERM_COPY
            owner_pw = password
            user_pw = password
            encrypt_meth = fitz.PDF_ENCRYPT_AES_128
            
            doc.save(output_path, encryption=encrypt_meth, owner_pw=owner_pw, user_pw=user_pw, permissions=perm)

        doc.close()

        # 3. Handle Output
        response_body = {'status': 'success'}
        
        if command == 'extract':
            response_body['data'] = result_data
            
        elif output_path and output_url:
            # Upload Result
            print(f"Uploading result to {output_url[:50]}...")
            with open(output_path, 'rb') as f_out:
                data = f_out.read()
                # PUT request to Presigned URL
                # content-type is usually application/pdf
                headers = {'Content-Type': 'application/pdf'}
                up_res = requests.put(output_url, data=data, headers=headers)
                up_res.raise_for_status()
                
            response_body['message'] = "Uploaded successfully"

        # Cleanup
        if os.path.exists(input_path): os.remove(input_path)
        if output_path and os.path.exists(output_path): os.remove(output_path)

        return {
            'statusCode': 200,
            'body': json.dumps(response_body),
            'headers': {'Content-Type': 'application/json'}
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        # Verify cleanup
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
