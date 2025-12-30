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

	// Download Input
	if err := downloadFile(body.InputURL, inputFile); err != nil {
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: fmt.Sprintf("Download failed: %v", err)}, nil
	}

	// Process
	conf := model.NewDefaultConfiguration()
	if body.Password != "" {
		conf.UserPW = body.Password
		conf.OwnerPW = body.Password
	}

	var resultData interface{}

	switch body.Command {
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
