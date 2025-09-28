package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	ffmpeg "github.com/u2takey/ffmpeg-go"
)

// GenerateLowQualityVideo creates a 240p version of the input video for slow networks
func GenerateLowQualityVideo(inputVideoPath string, videoID uint) (string, error) {
	// Validate input video file exists
	if _, err := os.Stat(inputVideoPath); os.IsNotExist(err) {
		return "", fmt.Errorf("input video file does not exist: %s", inputVideoPath)
	}

	// Create low quality videos directory if it doesn't exist
	lowQualityDir := "storage/videos/low"
	if err := os.MkdirAll(lowQualityDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create low quality video directory: %v", err)
	}

	// Generate output filename based on input file
	inputExt := filepath.Ext(inputVideoPath)
	baseInputName := filepath.Base(inputVideoPath)
	baseInputName = strings.TrimSuffix(baseInputName, inputExt)
	
	// Create low quality filename with original format
	lowQualityFilename := fmt.Sprintf("%s_240p%s", baseInputName, inputExt)
	outputPath := filepath.Join(lowQualityDir, lowQualityFilename)

	fmt.Printf("Generating 240p video for video %d\n", videoID)
	fmt.Printf("Input: %s\n", inputVideoPath)
	fmt.Printf("Output: %s\n", outputPath)

	// Start timing the process
	startTime := time.Now()

	// Generate 240p video using ffmpeg with optimized settings for mobile networks
	err := ffmpeg.Input(inputVideoPath).
		Output(outputPath, ffmpeg.KwArgs{
			// Video settings for 240p
			"vf":      "scale=426:240:force_original_aspect_ratio=decrease,pad=426:240:(ow-iw)/2:(oh-ih)/2:black", // 16:9 aspect ratio at 240p
			"c:v":     "libx264",   // H.264 codec for compatibility
			"b:v":     "400k",      // 400kbps video bitrate for mobile networks
			"maxrate": "450k",      // Maximum bitrate
			"bufsize": "800k",      // Buffer size
			"preset":  "fast",      // Fast encoding preset
			"crf":     "28",        // Constant Rate Factor for good quality/size balance
			
			// Audio settings
			"c:a":     "aac",       // AAC audio codec
			"b:a":     "64k",       // 64kbps audio bitrate
			"ar":      "44100",     // 44.1 kHz sample rate
			
			// General settings
			"movflags": "+faststart", // Enable fast start for web streaming
			"f":        "mp4",        // Ensure MP4 format
		}).
		OverWriteOutput().
		Run()

	if err != nil {
		// Clean up partial file on error
		os.Remove(outputPath)
		return "", fmt.Errorf("failed to generate 240p video: %v", err)
	}

	// Log completion time
	duration := time.Since(startTime)
	fmt.Printf("Successfully generated 240p video in %v: %s\n", duration, outputPath)

	// Verify output file was created and has reasonable size
	if stat, err := os.Stat(outputPath); err != nil {
		return "", fmt.Errorf("output file was not created properly: %v", err)
	} else if stat.Size() == 0 {
		os.Remove(outputPath)
		return "", fmt.Errorf("output file is empty")
	} else {
		sizeMB := float64(stat.Size()) / (1024 * 1024)
		fmt.Printf("Low quality video size: %.2f MB\n", sizeMB)
	}

	return outputPath, nil
}

// CleanupLowQualityVideo removes the low quality video file for a video
func CleanupLowQualityVideo(lowQualityPath string) error {
	if lowQualityPath == "" {
		return nil // Nothing to clean up
	}

	if err := os.Remove(lowQualityPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to remove low quality video file %s: %v", lowQualityPath, err)
	}

	fmt.Printf("Cleaned up low quality video: %s\n", lowQualityPath)
	return nil
}

// LowQualityVideoExists checks if a low quality video file exists at the given path
func LowQualityVideoExists(lowQualityPath string) bool {
	if lowQualityPath == "" {
		return false
	}

	if _, err := os.Stat(lowQualityPath); err == nil {
		return true
	}

	return false
}

// GetLowQualityVideoSize returns the file size of the low quality video in bytes
func GetLowQualityVideoSize(lowQualityPath string) (int64, error) {
	if lowQualityPath == "" {
		return 0, fmt.Errorf("no low quality video path provided")
	}

	stat, err := os.Stat(lowQualityPath)
	if err != nil {
		return 0, fmt.Errorf("failed to get file info: %v", err)
	}

	return stat.Size(), nil
}
