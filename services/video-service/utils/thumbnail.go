package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	ffmpeg "github.com/u2takey/ffmpeg-go"
)

// ThumbnailSizes defines the different thumbnail sizes
type ThumbnailSizes struct {
	Small  string // 160x90 (16:9 aspect ratio)
	Medium string // 320x180
	Large  string // 640x360
}

// GenerateThumbnails creates thumbnails of different sizes from a video file
func GenerateThumbnails(videoPath string, videoID uint) (*ThumbnailSizes, error) {
	// Validate video file exists
	if _, err := os.Stat(videoPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("video file does not exist: %s", videoPath)
	}

	// Create thumbnails directory if it doesn't exist
	thumbnailDir := "storage/thumbnails"
	if err := os.MkdirAll(thumbnailDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create thumbnail directory: %v", err)
	}

	// Create subdirectories for different sizes
	sizes := []string{"small", "medium", "large"}
	for _, size := range sizes {
		sizeDir := filepath.Join(thumbnailDir, size)
		if err := os.MkdirAll(sizeDir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create %s thumbnail directory: %v", size, err)
		}
	}

	// Generate base filename from video ID
	baseFilename := fmt.Sprintf("video_%d.jpg", videoID)

	// Define thumbnail paths
	thumbnailPaths := &ThumbnailSizes{
		Small:  filepath.Join(thumbnailDir, "small", baseFilename),
		Medium: filepath.Join(thumbnailDir, "medium", baseFilename),
		Large:  filepath.Join(thumbnailDir, "large", baseFilename),
	}

	// Generate thumbnails at different sizes
	thumbnailConfigs := []struct {
		path string
		size string
	}{
		{thumbnailPaths.Small, "160x90"},
		{thumbnailPaths.Medium, "320x180"},
		{thumbnailPaths.Large, "640x360"},
	}

	for _, config := range thumbnailConfigs {
		// Parse width and height from size string (e.g., "320x180")
		dimensions := strings.Split(config.size, "x")
		if len(dimensions) != 2 {
			return nil, fmt.Errorf("invalid size format: %s", config.size)
		}
		width, height := dimensions[0], dimensions[1]
		
		// Create filter_complex with proper syntax
		filterComplex := fmt.Sprintf("[0]scale=%s:%s:force_original_aspect_ratio=decrease[s0];[s0]pad=%s:%s:(ow-iw)/2:(oh-ih)/2:black[s1]", 
			width, height, width, height)
		
		fmt.Printf("Generating %s thumbnail for video %d with filter: %s\n", config.size, videoID, filterComplex)
		
		err := ffmpeg.Input(videoPath).
			Output(config.path, ffmpeg.KwArgs{
				"filter_complex": filterComplex,
				"map":           "[s1]",
				"vframes":       1,
				"ss":            "00:00:10", // Extract frame at 10 seconds
				"q:v":           1,          // High quality
			}).
			OverWriteOutput().
			Run()

		if err != nil {
			fmt.Printf("Failed at 10s for %s thumbnail: %v, trying 1s\n", config.size, err)
			// If extraction at 10 seconds fails, try at 1 second
			err = ffmpeg.Input(videoPath).
				Output(config.path, ffmpeg.KwArgs{
					"filter_complex": filterComplex,
					"map":           "[s1]",
					"vframes":       1,
					"ss":            "00:00:01",
					"q:v":           1,
				}).
				OverWriteOutput().
				Run()

			if err != nil {
				fmt.Printf("Failed at 1s for %s thumbnail: %v, trying 0s\n", config.size, err)
				// If that also fails, try at the very beginning
				err = ffmpeg.Input(videoPath).
					Output(config.path, ffmpeg.KwArgs{
						"filter_complex": filterComplex,
						"map":           "[s1]",
						"vframes":       1,
						"ss":            "00:00:00",
						"q:v":           1,
					}).
					OverWriteOutput().
					Run()

				if err != nil {
					return nil, fmt.Errorf("failed to generate %s thumbnail: %v", config.size, err)
				}
			}
		}
		
		fmt.Printf("Successfully generated %s thumbnail: %s\n", config.size, config.path)
	}

	return thumbnailPaths, nil
}

// GetVideoDuration extracts the duration of a video file in seconds
func GetVideoDuration(videoPath string) (int, error) {
	// Use ffprobe to get video duration
	probe, err := ffmpeg.Probe(videoPath)
	if err != nil {
		return 0, fmt.Errorf("failed to probe video: %v", err)
	}

	// Parse duration from probe result
	// This is a simplified approach - in production you might want more robust parsing
	if strings.Contains(probe, "Duration:") {
		// Extract duration string and convert to seconds
		// For now, return 0 as a placeholder - you can implement proper parsing
		return 0, nil
	}

	return 0, nil
}

// CleanupThumbnails removes all thumbnail files for a video
func CleanupThumbnails(videoID uint) error {
	thumbnailDir := "storage/thumbnails"
	baseFilename := fmt.Sprintf("video_%d.jpg", videoID)
	
	sizes := []string{"small", "medium", "large"}
	for _, size := range sizes {
		thumbnailPath := filepath.Join(thumbnailDir, size, baseFilename)
		if err := os.Remove(thumbnailPath); err != nil && !os.IsNotExist(err) {
			// Log error but don't fail the operation
			fmt.Printf("Warning: failed to remove %s thumbnail: %v\n", size, err)
		}
	}
	
	return nil
}

// GetThumbnailPaths returns the thumbnail paths for a video ID
func GetThumbnailPaths(videoID uint) *ThumbnailSizes {
	thumbnailDir := "storage/thumbnails"
	baseFilename := fmt.Sprintf("video_%d.jpg", videoID)
	
	return &ThumbnailSizes{
		Small:  filepath.Join(thumbnailDir, "small", baseFilename),
		Medium: filepath.Join(thumbnailDir, "medium", baseFilename),
		Large:  filepath.Join(thumbnailDir, "large", baseFilename),
	}
}

// ThumbnailExists checks if thumbnail files exist for a video
func ThumbnailExists(videoID uint) bool {
	paths := GetThumbnailPaths(videoID)
	
	// Check if at least the medium thumbnail exists
	if _, err := os.Stat(paths.Medium); err == nil {
		return true
	}
	
	return false
}
