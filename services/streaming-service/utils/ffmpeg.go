package utils

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

// QualityPreset defines video quality settings
type QualityPreset struct {
	Name       string
	Resolution string
	Bitrate    int    // kbps
	MaxRate    int    // kbps
	BufSize    int    // kbps
	Width      int
	Height     int
}

// Standard quality presets for adaptive streaming
var QualityPresets = map[string]QualityPreset{
	"480p": {
		Name:       "480p",
		Resolution: "854x480",
		Bitrate:    1000,
		MaxRate:    1100,
		BufSize:    1500,
		Width:      854,
		Height:     480,
	},
	"720p": {
		Name:       "720p",
		Resolution: "1280x720",
		Bitrate:    2500,
		MaxRate:    2750,
		BufSize:    3750,
		Width:      1280,
		Height:     720,
	},
	"1080p": {
		Name:       "1080p",
		Resolution: "1920x1080",
		Bitrate:    5000,
		MaxRate:    5500,
		BufSize:    7500,
		Width:      1920,
		Height:     1080,
	},
}

// TranscodeOptions contains options for video transcoding
type TranscodeOptions struct {
	InputPath    string
	OutputDir    string
	Format       string   // "hls" or "dash"
	Qualities    []string // quality levels to generate
	SegmentTime  int      // segment duration in seconds
	PlaylistType string   // "vod" or "live"
}

// TranscodeResult contains the results of transcoding
type TranscodeResult struct {
	Success      bool
	ManifestPath string
	Variants     []VariantResult
	Error        string
}

type VariantResult struct {
	Quality      string
	Resolution   string
	Bitrate      int
	ManifestPath string
	SegmentPath  string
	Duration     float64
	FileSize     int64
}

// CheckFFmpegInstallation verifies FFmpeg is available
func CheckFFmpegInstallation() error {
	cmd := exec.Command("ffmpeg", "-version")
	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("FFmpeg not found. Please install FFmpeg: %v", err)
	}
	return nil
}

// GetVideoInfo extracts video information using FFprobe
func GetVideoInfo(inputPath string) (map[string]interface{}, error) {
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		inputPath,
	)

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get video info: %v", err)
	}

	// Parse JSON output (simplified - in production, use proper JSON parsing)
	info := make(map[string]interface{})
	info["raw_output"] = string(output)
	
	return info, nil
}

// TranscodeToHLS transcodes video to HLS format with multiple qualities
func TranscodeToHLS(options TranscodeOptions) (*TranscodeResult, error) {
	result := &TranscodeResult{
		Variants: make([]VariantResult, 0),
	}

	// Create output directory
	if err := os.MkdirAll(options.OutputDir, 0755); err != nil {
		result.Error = fmt.Sprintf("Failed to create output directory: %v", err)
		return result, err
	}

	// Generate master playlist path
	masterPlaylistPath := filepath.Join(options.OutputDir, "master.m3u8")
	
	// Build FFmpeg command for multi-bitrate HLS
	args := []string{
		"-i", options.InputPath,
		"-c:v", "libx264",
		"-c:a", "aac",
		"-preset", "medium",
		"-g", "48", // GOP size
		"-keyint_min", "48",
		"-sc_threshold", "0",
		"-hls_time", strconv.Itoa(options.SegmentTime),
		"-hls_playlist_type", options.PlaylistType,
		"-hls_segment_filename", filepath.Join(options.OutputDir, "%v_segment_%03d.ts"),
	}

	// Add quality-specific arguments
	var filterComplex []string
	var mapArgs []string
	var hlsArgs []string

	for i, quality := range options.Qualities {
		preset, exists := QualityPresets[quality]
		if !exists {
			continue
		}

		// Video filter for this quality
		filterComplex = append(filterComplex,
			fmt.Sprintf("[0:v]scale=%d:%d[v%d]", preset.Width, preset.Height, i),
		)

		// Map video and audio
		mapArgs = append(mapArgs,
			"-map", fmt.Sprintf("[v%d]", i),
			"-map", "0:a",
		)

		// Video encoding settings
		mapArgs = append(mapArgs,
			fmt.Sprintf("-b:v:%d", i), fmt.Sprintf("%dk", preset.Bitrate),
			fmt.Sprintf("-maxrate:%d", i), fmt.Sprintf("%dk", preset.MaxRate),
			fmt.Sprintf("-bufsize:%d", i), fmt.Sprintf("%dk", preset.BufSize),
		)

		// HLS variant playlist
		variantPlaylist := filepath.Join(options.OutputDir, fmt.Sprintf("%s.m3u8", quality))
		hlsArgs = append(hlsArgs,
			fmt.Sprintf("-hls_segment_filename:%d", i),
			filepath.Join(options.OutputDir, fmt.Sprintf("%s_segment_%%03d.ts", quality)),
			fmt.Sprintf("-f:%d", i), "hls",
			variantPlaylist,
		)

		// Add to result variants
		result.Variants = append(result.Variants, VariantResult{
			Quality:      quality,
			Resolution:   preset.Resolution,
			Bitrate:      preset.Bitrate,
			ManifestPath: variantPlaylist,
			SegmentPath:  filepath.Join(options.OutputDir, fmt.Sprintf("%s_segment_", quality)),
		})
	}

	// Combine all arguments
	if len(filterComplex) > 0 {
		args = append(args, "-filter_complex", strings.Join(filterComplex, ";"))
	}
	args = append(args, mapArgs...)
	args = append(args, hlsArgs...)

	// Execute FFmpeg command
	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		result.Error = fmt.Sprintf("FFmpeg transcoding failed: %v\nOutput: %s", err, string(output))
		return result, err
	}

	// Generate master playlist
	if err := generateHLSMasterPlaylist(masterPlaylistPath, result.Variants); err != nil {
		result.Error = fmt.Sprintf("Failed to generate master playlist: %v", err)
		return result, err
	}

	result.Success = true
	result.ManifestPath = masterPlaylistPath

	// Calculate file sizes and durations for each variant
	for i := range result.Variants {
		if info, err := os.Stat(result.Variants[i].ManifestPath); err == nil {
			result.Variants[i].FileSize = info.Size()
		}
		// Duration would be extracted from video info
		result.Variants[i].Duration = 0 // TODO: Extract from video info
	}

	return result, nil
}

// TranscodeToDASH transcodes video to DASH format with multiple qualities
func TranscodeToDASH(options TranscodeOptions) (*TranscodeResult, error) {
	result := &TranscodeResult{
		Variants: make([]VariantResult, 0),
	}

	// Create output directory
	if err := os.MkdirAll(options.OutputDir, 0755); err != nil {
		result.Error = fmt.Sprintf("Failed to create output directory: %v", err)
		return result, err
	}

	// Generate manifest path
	manifestPath := filepath.Join(options.OutputDir, "manifest.mpd")

	// Build FFmpeg command for DASH
	args := []string{
		"-i", options.InputPath,
		"-c:v", "libx264",
		"-c:a", "aac",
		"-preset", "medium",
		"-keyint_min", "48",
		"-g", "48",
		"-sc_threshold", "0",
		"-f", "dash",
		"-seg_duration", strconv.Itoa(options.SegmentTime),
		"-adaptation_sets", "id=0,streams=v id=1,streams=a",
	}

	// Add quality-specific arguments
	var filterComplex []string
	var mapArgs []string

	for i, quality := range options.Qualities {
		preset, exists := QualityPresets[quality]
		if !exists {
			continue
		}

		// Video filter for this quality
		filterComplex = append(filterComplex,
			fmt.Sprintf("[0:v]scale=%d:%d[v%d]", preset.Width, preset.Height, i),
		)

		// Map video
		mapArgs = append(mapArgs,
			"-map", fmt.Sprintf("[v%d]", i),
		)

		// Video encoding settings
		mapArgs = append(mapArgs,
			fmt.Sprintf("-b:v:%d", i), fmt.Sprintf("%dk", preset.Bitrate),
			fmt.Sprintf("-maxrate:%d", i), fmt.Sprintf("%dk", preset.MaxRate),
			fmt.Sprintf("-bufsize:%d", i), fmt.Sprintf("%dk", preset.BufSize),
		)

		// Add to result variants
		result.Variants = append(result.Variants, VariantResult{
			Quality:      quality,
			Resolution:   preset.Resolution,
			Bitrate:      preset.Bitrate,
			ManifestPath: manifestPath,
			SegmentPath:  filepath.Join(options.OutputDir, fmt.Sprintf("%s_", quality)),
		})
	}

	// Map audio
	mapArgs = append(mapArgs, "-map", "0:a")

	// Combine all arguments
	if len(filterComplex) > 0 {
		args = append(args, "-filter_complex", strings.Join(filterComplex, ";"))
	}
	args = append(args, mapArgs...)
	args = append(args, manifestPath)

	// Execute FFmpeg command
	cmd := exec.Command("ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	
	if err != nil {
		result.Error = fmt.Sprintf("FFmpeg DASH transcoding failed: %v\nOutput: %s", err, string(output))
		return result, err
	}

	result.Success = true
	result.ManifestPath = manifestPath

	return result, nil
}

// generateHLSMasterPlaylist creates the master playlist for HLS
func generateHLSMasterPlaylist(masterPath string, variants []VariantResult) error {
	file, err := os.Create(masterPath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Write HLS master playlist header
	file.WriteString("#EXTM3U\n")
	file.WriteString("#EXT-X-VERSION:3\n\n")

	// Write variant streams
	for _, variant := range variants {
		file.WriteString(fmt.Sprintf("#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%s\n",
			variant.Bitrate*1000, variant.Resolution))
		file.WriteString(fmt.Sprintf("%s.m3u8\n\n", variant.Quality))
	}

	return nil
}

// CleanupTranscodingFiles removes temporary transcoding files
func CleanupTranscodingFiles(outputDir string) error {
	return os.RemoveAll(outputDir)
}

// EstimateTranscodingTime estimates processing time based on video duration and quality count
func EstimateTranscodingTime(videoDurationSeconds float64, qualityCount int) int {
	// Rough estimation: 1 minute of video takes 2-5 minutes to transcode per quality
	baseTimePerMinute := 3.0 // minutes
	videoMinutes := videoDurationSeconds / 60.0
	estimatedMinutes := videoMinutes * baseTimePerMinute * float64(qualityCount)
	
	// Add overhead for setup and cleanup
	estimatedMinutes += 2.0
	
	return int(estimatedMinutes)
}
