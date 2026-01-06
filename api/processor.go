package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/ledongthuc/pdf"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

type RequestBody struct {
	Command   string      `json:"command"`
	InputURL  string      `json:"inputUrl"`
	OutputURL string      `json:"outputUrl"`
	Password  string      `json:"password"`
	InputURLs []string    `json:"inputUrls"`
	Range     string      `json:"range"`
	Angle     int         `json:"angle"`
	Text      string      `json:"text"`
	Position  string      `json:"position"`
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

	fi, err := f.Stat()
	if err != nil {
		return err
	}
	
	req, err := http.NewRequest(http.MethodPut, url, f)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/pdf")
	req.ContentLength = fi.Size()

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

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var body RequestBody
	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	tmpDir := os.TempDir()
	// Use simplified RequestID logic since we don't have AWS context directly
	reqID := "req" 
	inputFile := filepath.Join(tmpDir, fmt.Sprintf("in_%s.pdf", reqID))
	outputFile := filepath.Join(tmpDir, fmt.Sprintf("out_%s.pdf", reqID))
	
	defer os.Remove(inputFile)
	defer os.Remove(outputFile)

	var inputFiles []string

	if len(body.InputURLs) > 0 {
		for i, url := range body.InputURLs {
			f := filepath.Join(tmpDir, fmt.Sprintf("in_%s_%d.pdf", reqID, i))
			if body.Command == "jpg_to_pdf" {
				f = filepath.Join(tmpDir, fmt.Sprintf("in_%s_%d.jpg", reqID, i))
			}
			if err := downloadFile(url, f); err != nil {
				http.Error(w, fmt.Sprintf("Download %d failed: %v", i, err), http.StatusInternalServerError)
				return
			}
			inputFiles = append(inputFiles, f)
			defer os.Remove(f)
		}
	} else if body.InputURL != "" {
		if err := downloadFile(body.InputURL, inputFile); err != nil {
			http.Error(w, fmt.Sprintf("Download failed: %v", err), http.StatusInternalServerError)
			return
		}
		inputFiles = append(inputFiles, inputFile)
	}

	conf := model.NewDefaultConfiguration()
	if body.Password != "" {
		conf.UserPW = body.Password
		conf.OwnerPW = body.Password
	}

	var resultData interface{}

	switch body.Command {
	case "merge":
		if len(inputFiles) < 2 {
			http.Error(w, "At least 2 files required for merge", http.StatusBadRequest)
			return
		}
		if err := api.MergeCreateFile(inputFiles, outputFile, false, conf); err != nil {
			http.Error(w, fmt.Sprintf("Merge failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "split":
		if body.Range == "" {
			http.Error(w, "Range required", http.StatusBadRequest)
			return
		}
		pages := []string{body.Range}
		if err := api.TrimFile(inputFile, outputFile, pages, conf); err != nil {
			http.Error(w, fmt.Sprintf("Split/Trim failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "rotate":
		if err := api.RotateFile(inputFile, outputFile, body.Angle, nil, conf); err != nil {
			http.Error(w, fmt.Sprintf("Rotate failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "unlock":
		conf.UserPW = body.Password
		conf.OwnerPW = body.Password
		if err := api.DecryptFile(inputFile, outputFile, conf); err != nil {
			http.Error(w, fmt.Sprintf("Unlock failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "watermark":
		desc := fmt.Sprintf("text:%s, points:48, color: 0.5 0.5 0.5, rot:45, opacity: 0.3", body.Text)
		if err := api.AddTextWatermarksFile(inputFile, outputFile, nil, true, "text", desc, conf); err != nil {
			http.Error(w, fmt.Sprintf("Watermark failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "page_numbers":
		pos := "bc" // default bottom center
		switch body.Position {
		case "top": pos = "tc"
		case "bottom-left": pos = "bl"
		case "bottom-right": pos = "br"
		}
		desc := fmt.Sprintf("text:%%p, points:12, pos:%s, offset:0 10", pos)
		if err := api.AddTextWatermarksFile(inputFile, outputFile, nil, true, "text", desc, conf); err != nil {
			http.Error(w, fmt.Sprintf("Page numbers failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "jpg_to_pdf":
		if err := api.ImportImagesFile(inputFiles, outputFile, nil, conf); err != nil {
			http.Error(w, fmt.Sprintf("Image import failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "compress":
		if err := api.OptimizeFile(inputFile, outputFile, conf); err != nil {
			http.Error(w, fmt.Sprintf("Compress failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "protect":
		conf.UserPW = body.Password
		conf.OwnerPW = body.Password
		if err := api.EncryptFile(inputFile, outputFile, conf); err != nil {
			http.Error(w, fmt.Sprintf("Protect failed: %v", err), http.StatusInternalServerError)
			return
		}

	case "extract":
		f, r, err := pdf.Open(inputFile)
		if err != nil {
			http.Error(w, fmt.Sprintf("Open failed: %v", err), http.StatusInternalServerError)
			return
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
					span := map[string]interface{}{
						"text": word.S,
						"bbox": []float64{word.X, word.Y, word.X + float64(len(word.S)*5), word.Y + 10},
						"size": 12,
						"font": "Helvetica",
						"color": "000000",
					}
					line := map[string]interface{}{"span": []interface{}{span}}
					blocks = append(blocks, map[string]interface{}{"line": []interface{}{line}})
				}
			}
			pages[i-1] = map[string]interface{}{"block": blocks}
		}
		resultData = pages

	default:
		http.Error(w, "Unknown command", http.StatusBadRequest)
		return
	}

	if body.Command != "extract" && outputFile != "" {
		if err := uploadFile(body.OutputURL, outputFile); err != nil {
			http.Error(w, fmt.Sprintf("Upload result failed: %v", err), http.StatusInternalServerError)
			return
		}
	}

	respBody := ResponseBody{Status: "success", Data: resultData}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respBody)
}
