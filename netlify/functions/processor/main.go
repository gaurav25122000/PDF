package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/ledongthuc/pdf"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

type RequestBody struct {
	Command   string `json:"command"`
	InputURL  string `json:"inputUrl"`
	OutputURL string `json:"outputUrl"`
	Password  string `json:"password"`
	// Additional Params
	InputURLs []string    `json:"inputUrls"` // For Merge/JpgToPdf
	Range     string      `json:"range"`     // For Split
	Angle     int         `json:"angle"`     // For Rotate
	Text      string      `json:"text"`      // For Watermark
	Position  string      `json:"position"`  // For Page Numbers
	// For Edit:
	Operations []Operation `json:"operations"`
}

type Operation struct {
	Type   string  `json:"type"`
	Page   int     `json:"page"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Text   string  `json:"text"`
	Color  string  `json:"color"`
}

type ResponseBody struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func downloadFile(url string, filepath string) error {
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	_, err = io.Copy(out, resp.Body)
	return err
}

func uploadFile(url string, filepath string) error {
	f, err := os.Open(filepath)
	if err != nil {
		return err
	}
	defer f.Close()

	req, err := http.NewRequest(http.MethodPut, url, f)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/pdf")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed: %s - %s", resp.Status, string(body))
	}
	return nil
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	if request.HTTPMethod != "POST" {
		return events.APIGatewayProxyResponse{StatusCode: 405, Body: "Method Not Allowed"}, nil
	}

	var body RequestBody
	err := json.Unmarshal([]byte(request.Body), &body)
	if err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 400, Body: "Invalid JSON"}, nil
	}

	tmpDir := os.TempDir()
	// Use RequestID (correct case)
	inputFile := filepath.Join(tmpDir, fmt.Sprintf("in_%s.pdf", request.RequestContext.RequestID))
	outputFile := filepath.Join(tmpDir, fmt.Sprintf("out_%s.pdf", request.RequestContext.RequestID))
	defer os.Remove(inputFile)
	defer os.Remove(outputFile)

	// Download Input(s)
	// For Merge/JpgToPdf, we have multiple inputs
	var inputFiles []string

	if len(body.InputURLs) > 0 {
		for i, url := range body.InputURLs {
			f := filepath.Join(tmpDir, fmt.Sprintf("in_%s_%d.pdf", request.RequestContext.RequestID, i))
			if body.Command == "jpg_to_pdf" {
				f = filepath.Join(tmpDir, fmt.Sprintf("in_%s_%d.jpg", request.RequestContext.RequestID, i))
			}
			if err := downloadFile(url, f); err != nil {
				return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Download %d failed: %v", i, err)}, nil
			}
			inputFiles = append(inputFiles, f)
			defer os.Remove(f)
		}
		// For single input commands that might receive InputURL
	} else if body.InputURL != "" {
		if err := downloadFile(body.InputURL, inputFile); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Download failed: %v", err)}, nil
		}
		inputFiles = append(inputFiles, inputFile)
	}

	// Process
	conf := model.NewDefaultConfiguration()
	if body.Password != "" {
		conf.UserPW = body.Password
		conf.OwnerPW = body.Password
	}

	var resultData interface{}

	switch body.Command {
	case "merge":
		if len(inputFiles) < 2 {
			return events.APIGatewayProxyResponse{StatusCode: 400, Body: "At least 2 files required for merge"}, nil
		}
		// MergeCreateFile takes output, input[], config
		if err := api.MergeCreateFile(inputFiles, outputFile, false, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Merge failed: %v", err)}, nil
		}

	case "split":
		// pdfcpu split creates directory of files. We want specific range?
		// api.SplitFile splits INTO a directory.
		// If we want to extract a sub-pdf (range), we use Trim?
		// api.TrimFile generates a file with selected pages.
		// Range format in pdfcpu: "1-3,5"
		// If body.Range is set, use Trim.

		// If range is provided, we treat it as Extract Pages (Trim).
		if body.Range == "" {
			return events.APIGatewayProxyResponse{StatusCode: 400, Body: "Range required"}, nil
		}

		// pdfcpu expects pages as []string
		pages := []string{body.Range}
		if err := api.TrimFile(inputFile, outputFile, pages, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Split/Trim failed: %v", err)}, nil
		}

	case "rotate":
		// RotateFile(inFile, outFile, rotation, pages, conf)
		// rotation is int degrees.
		if err := api.RotateFile(inputFile, outputFile, body.Angle, nil, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Rotate failed: %v", err)}, nil
		}

	case "unlock":
		// DecryptFile(inFile, outFile, conf)
		// Password must be in conf
		conf.UserPW = body.Password
		conf.OwnerPW = body.Password
		if err := api.DecryptFile(inputFile, outputFile, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Unlock failed: %v", err)}, nil
		}

	case "watermark":
		// AddTextWatermarksFile(inFile, outFile, selectedPages, onTop, mode, desc, conf)
		// desc is string configuration (e.g. "text:Hello, points:48, ...")
		// We construct desc from body.Text
		desc := fmt.Sprintf("text:%s, points:48, color: 0.5 0.5 0.5, rot:45, opacity: 0.3", body.Text)
		// Pass "text" as mode
		if err := api.AddTextWatermarksFile(inputFile, outputFile, nil, true, "text", desc, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Watermark failed: %v", err)}, nil
		}

	case "page_numbers":
		// AddTextWatermarksFile
		// Position logic: "bottom", "top", "bottom-left", "bottom-right"
		// pdfcpu anchoring: "pos:bc" (bottom center), "pos:tl", etc.
		// desc: "text:%p, ..." (%p is page number)

		pos := "bc" // default bottom center
		switch body.Position {
		case "top": pos = "tc"
		case "bottom-left": pos = "bl"
		case "bottom-right": pos = "br"
		}

		desc := fmt.Sprintf("text:%%p, points:12, pos:%s, offset:0 10", pos)
		if err := api.AddTextWatermarksFile(inputFile, outputFile, nil, true, "text", desc, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Page numbers failed: %v", err)}, nil
		}

	case "jpg_to_pdf":
		// ImportImagesFile(inputFiles, outFile, importConf, conf)
		// inputFiles is array of images
		// importConf is null for default
		if err := api.ImportImagesFile(inputFiles, outputFile, nil, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Image import failed: %v", err)}, nil
		}

	case "compress":
		// pdfcpu Optimize
		if err := api.OptimizeFile(inputFile, outputFile, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Compress failed: %v", err)}, nil
		}

	case "protect":
		conf.UserPW = body.Password
		conf.OwnerPW = body.Password
		if err := api.EncryptFile(inputFile, outputFile, conf); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Protect failed: %v", err)}, nil
		}

	case "extract":
		// Extract Text using ledongthuc/pdf
		f, r, err := pdf.Open(inputFile)
		if err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Open failed: %v", err)}, nil
		}
		defer f.Close()

		pages := make([]map[string]interface{}, r.NumPage())
		for i := 1; i <= r.NumPage(); i++ {
			p := r.Page(i)
			if p.V.IsNull() {
				continue
			}

			rows, _ := p.GetTextByRow()
			var blocks []interface{}

			for _, row := range rows {
				for _, word := range row.Content {
					// word.S is string, word.X, word.Y
					// Approximate a span
					span := map[string]interface{}{
						"text": word.S,
						"bbox": []float64{word.X, word.Y, word.X + float64(len(word.S)*5), word.Y + 10}, // Mock BBox
						"size": 12, // Mock size
						"font": "Helvetica", // Mock
						"color": "000000",
					}
					line := map[string]interface{}{"span": []interface{}{span}}
					blocks = append(blocks, map[string]interface{}{"line": []interface{}{line}})
				}
			}
			pages[i-1] = map[string]interface{}{"block": blocks}
		}
		resultData = pages

	case "edit":
		// Native Edit is handled by Node.js now, so this is unused or reserved.
		// If we wanted to implement it here, we'd need complex pdfcpu stamp logic.
		return events.APIGatewayProxyResponse{StatusCode: 400, Body: "Edit handled in Node.js"}, nil

	default:
		return events.APIGatewayProxyResponse{StatusCode: 400, Body: "Unknown command"}, nil
	}

	// Upload Output if exists
	if body.Command != "extract" && outputFile != "" {
		if err := uploadFile(body.OutputURL, outputFile); err != nil {
			return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Upload result failed: %v", err)}, nil
		}
	}

	respBody := ResponseBody{Status: "success", Data: resultData}
	jsonBytes, _ := json.Marshal(respBody)

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(jsonBytes),
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}

func main() {
	lambda.Start(handler)
}
