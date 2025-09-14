package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"streaming-service/database"
	"streaming-service/models"
	"streaming-service/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

// VideoInfo represents video information from video service
type VideoInfo struct {
	ID    uint   `json:"id"`
	Title string `json:"title"`
}

// fetchVideoTitle gets video title from video service
func fetchVideoTitle(videoID string) string {
	// Make HTTP request to video service
	resp, err := http.Get(fmt.Sprintf("http://localhost:8003/api/v1/videos/%s", videoID))
	if err != nil {
		return "Unknown Video"
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "Unknown Video"
	}

	var video VideoInfo
	if err := json.NewDecoder(resp.Body).Decode(&video); err != nil {
		return "Unknown Video"
	}

	return video.Title
}

// formatFileSize converts bytes to human readable format
func formatFileSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

// ProcessVideo handles video processing requests
// @Summary Process video for adaptive streaming
// @Description Start transcoding a video to HLS/DASH format with multiple quality variants
// @Tags streaming
// @Accept json
// @Produce json
// @Param request body models.ProcessVideoRequest true "Processing request"
// @Success 202 {object} models.ProcessVideoResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/streaming/process [post]
func ProcessVideo(c *fiber.Ctx) error {
	var req models.ProcessVideoRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if req.VideoID == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Video ID is required",
		})
	}

	if req.InputPath == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Input path is required",
		})
	}

	if req.Format != "hls" && req.Format != "dash" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Format must be 'hls' or 'dash'",
		})
	}

	if len(req.Qualities) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "At least one quality level is required",
		})
	}

	// Validate qualities
	for _, quality := range req.Qualities {
		if _, exists := utils.QualityPresets[quality]; !exists {
			return c.Status(400).JSON(fiber.Map{
				"error": fmt.Sprintf("Invalid quality level: %s. Valid options: 480p, 720p, 1080p", quality),
			})
		}
	}

	// Check if input file exists
	if _, err := os.Stat(req.InputPath); os.IsNotExist(err) {
		return c.Status(400).JSON(fiber.Map{
			"error": "Input video file not found",
		})
	}

	// Check if there's already a processing job for this video
	var existingJob models.ProcessingJob
	if err := database.DB.Where("video_id = ? AND status IN ?", req.VideoID, []string{"pending", "processing"}).First(&existingJob).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Video is already being processed",
			"job_id": existingJob.ID,
		})
	}

	// Create processing job
	qualitiesJSON, _ := json.Marshal(req.Qualities)
	outputDir := filepath.Join("storage", "streaming", fmt.Sprintf("video_%d", req.VideoID))

	job := models.ProcessingJob{
		VideoID:   req.VideoID,
		Status:    "pending",
		InputPath: req.InputPath,
		OutputPath: outputDir,
		Format:    req.Format,
		Qualities: string(qualitiesJSON),
	}

	if err := database.DB.Create(&job).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create processing job",
		})
	}

	// Start processing in background
	go processVideoAsync(job.ID)

	// Estimate processing time
	estimatedTime := utils.EstimateTranscodingTime(300, len(req.Qualities)) // Assume 5 min video for estimation

	response := models.ProcessVideoResponse{
		JobID:         job.ID,
		Status:        "pending",
		Message:       "Video processing started",
		EstimatedTime: estimatedTime,
	}

	return c.Status(202).JSON(response)
}

// GetProcessingStatus returns the status of a processing job
// @Summary Get processing job status
// @Description Get the current status and progress of a video processing job
// @Tags streaming
// @Produce json
// @Param job_id path int true "Job ID"
// @Success 200 {object} models.ProcessingStatusResponse
// @Failure 404 {object} map[string]string
// @Router /api/v1/streaming/status/{job_id} [get]
func GetProcessingStatus(c *fiber.Ctx) error {
	jobID := c.Params("job_id")

	var job models.ProcessingJob
	if err := database.DB.First(&job, jobID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Processing job not found",
		})
	}

	// Get variants if job is completed
	var variants []models.StreamingVariant
	if job.Status == "completed" {
		database.DB.Where("job_id = ?", job.ID).Find(&variants)
	}

	var message string
	switch job.Status {
	case "pending":
		message = "Job is queued for processing"
	case "processing":
		message = fmt.Sprintf("Processing video... %.1f%% complete", job.Progress)
	case "completed":
		message = "Video processing completed successfully"
	case "failed":
		message = fmt.Sprintf("Processing failed: %s", job.ErrorMsg)
	}

	response := models.ProcessingStatusResponse{
		Job:      job,
		Variants: variants,
		Message:  message,
	}

	return c.JSON(response)
}

// GetManifest serves HLS/DASH manifest files
// @Summary Get streaming manifest
// @Description Get HLS master playlist or DASH manifest for a video
// @Tags streaming
// @Produce text/plain
// @Param video_id path int true "Video ID"
// @Param format path string true "Format (hls or dash)"
// @Success 200 {string} string "Manifest content"
// @Failure 404 {object} map[string]string
// @Router /api/v1/streaming/manifest/{video_id}/{format} [get]
func GetManifest(c *fiber.Ctx) error {
	videoID := c.Params("video_id")
	format := c.Params("format")

	if format != "hls" && format != "dash" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Format must be 'hls' or 'dash'",
		})
	}

	// Find completed job for this video and format
	var job models.ProcessingJob
	if err := database.DB.Where("video_id = ? AND format = ? AND status = ?", videoID, format, "completed").First(&job).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "No processed video found for this format",
		})
	}

	// Determine manifest file
	var manifestPath string
	if format == "hls" {
		manifestPath = filepath.Join(job.OutputPath, "master.m3u8")
	} else {
		manifestPath = filepath.Join(job.OutputPath, "manifest.mpd")
	}

	// Check if manifest exists
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		return c.Status(404).JSON(fiber.Map{
			"error": "Manifest file not found",
		})
	}

	// Set appropriate content type
	if format == "hls" {
		c.Set("Content-Type", "application/vnd.apple.mpegurl")
	} else {
		c.Set("Content-Type", "application/dash+xml")
	}

	c.Set("Cache-Control", "public, max-age=300") // Cache for 5 minutes

	return c.SendFile(manifestPath)
}

// GetSegment serves video segments
// @Summary Get video segment
// @Description Get a specific video segment for streaming
// @Tags streaming
// @Produce application/octet-stream
// @Param video_id path int true "Video ID"
// @Param quality path string true "Quality level"
// @Param segment path string true "Segment filename"
// @Success 200 {file} binary "Video segment"
// @Failure 404 {object} map[string]string
// @Router /api/v1/streaming/segment/{video_id}/{quality}/{segment} [get]
func GetSegment(c *fiber.Ctx) error {
	videoID := c.Params("video_id")
	quality := c.Params("quality")
	segment := c.Params("segment")

	// Find the streaming variant
	var variant models.StreamingVariant
	if err := database.DB.Where("video_id = ? AND quality = ?", videoID, quality).First(&variant).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video variant not found",
		})
	}

	// Construct segment path
	segmentPath := filepath.Join(filepath.Dir(variant.SegmentPath), segment)

	// Check if segment exists
	fileInfo, err := os.Stat(segmentPath)
	if os.IsNotExist(err) {
		return c.Status(404).JSON(fiber.Map{
			"error": "Segment not found",
		})
	}

	// Get video title from video service
	videoTitle := fetchVideoTitle(videoID)
	
	// Get file size and format it
	fileSize := fileInfo.Size()
	formattedSize := formatFileSize(fileSize)
	
	// Console log the streaming info
	fmt.Printf("Streaming: \"%s\" - Segment: %s - Size: %s - Quality: %s\n", 
		videoTitle, segment, formattedSize, quality)

	// Set appropriate headers
	c.Set("Content-Type", "video/mp2t") // MPEG-TS for HLS segments
	c.Set("Cache-Control", "public, max-age=86400") // Cache for 24 hours
	c.Set("Accept-Ranges", "bytes")

	return c.SendFile(segmentPath)
}

// GetAvailableQualities returns available quality levels for a video
// @Summary Get available qualities
// @Description Get list of available quality levels for a video
// @Tags streaming
// @Produce json
// @Param video_id path int true "Video ID"
// @Success 200 {object} models.AvailableQualitiesResponse
// @Failure 404 {object} map[string]string
// @Router /api/v1/streaming/qualities/{video_id} [get]
func GetAvailableQualities(c *fiber.Ctx) error {
	videoID := c.Params("video_id")

	// Get all variants for this video
	var variants []models.StreamingVariant
	if err := database.DB.Where("video_id = ?", videoID).Find(&variants).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to retrieve video variants",
		})
	}

	if len(variants) == 0 {
		return c.Status(404).JSON(fiber.Map{
			"error": "No processed variants found for this video",
		})
	}

	// Group by format
	formatGroups := make(map[string][]models.StreamingVariant)
	for _, variant := range variants {
		formatGroups[variant.Format] = append(formatGroups[variant.Format], variant)
	}

	// For now, return the first format found (prefer HLS)
	var selectedFormat string
	var selectedVariants []models.StreamingVariant

	if hlsVariants, exists := formatGroups["hls"]; exists {
		selectedFormat = "hls"
		selectedVariants = hlsVariants
	} else if dashVariants, exists := formatGroups["dash"]; exists {
		selectedFormat = "dash"
		selectedVariants = dashVariants
	}

	// Build quality info
	qualities := make([]models.QualityInfo, len(selectedVariants))
	for i, variant := range selectedVariants {
		manifestURL := fmt.Sprintf("/api/v1/streaming/manifest/%s/%s", videoID, selectedFormat)
		
		qualities[i] = models.QualityInfo{
			Quality:     variant.Quality,
			Resolution:  variant.Resolution,
			Bitrate:     variant.Bitrate,
			Available:   true,
			ManifestURL: manifestURL,
		}
	}

	// Determine default quality (720p if available, otherwise the middle option)
	defaultQuality := "720p"
	found := false
	for _, q := range qualities {
		if q.Quality == "720p" {
			found = true
			break
		}
	}
	if !found && len(qualities) > 0 {
		defaultQuality = qualities[len(qualities)/2].Quality
	}

	videoIDInt, _ := strconv.ParseUint(videoID, 10, 32)
	response := models.AvailableQualitiesResponse{
		VideoID:        uint(videoIDInt),
		Format:         selectedFormat,
		Qualities:      qualities,
		DefaultQuality: defaultQuality,
	}

	return c.JSON(response)
}

// processVideoAsync handles video processing in the background
func processVideoAsync(jobID uint) {
	// Update job status to processing
	database.DB.Model(&models.ProcessingJob{}).Where("id = ?", jobID).Updates(map[string]interface{}{
		"status":     "processing",
		"started_at": time.Now(),
		"progress":   0,
	})

	// Get job details
	var job models.ProcessingJob
	if err := database.DB.First(&job, jobID).Error; err != nil {
		return
	}

	// Parse qualities
	var qualities []string
	json.Unmarshal([]byte(job.Qualities), &qualities)

	// Set up transcoding options
	options := utils.TranscodeOptions{
		InputPath:    job.InputPath,
		OutputDir:    job.OutputPath,
		Format:       job.Format,
		Qualities:    qualities,
		SegmentTime:  6, // 6-second segments
		PlaylistType: "vod",
	}

	// Update progress
	database.DB.Model(&job).Update("progress", 10)

	// Perform transcoding
	var result *utils.TranscodeResult
	var err error

	if job.Format == "hls" {
		result, err = utils.TranscodeToHLS(options)
	} else {
		result, err = utils.TranscodeToDASH(options)
	}

	if err != nil || !result.Success {
		// Mark job as failed
		errorMsg := "Unknown error"
		if err != nil {
			errorMsg = err.Error()
		} else if result.Error != "" {
			errorMsg = result.Error
		}

		database.DB.Model(&job).Updates(map[string]interface{}{
			"status":       "failed",
			"error_msg":    errorMsg,
			"completed_at": time.Now(),
			"progress":     0,
		})
		return
	}

	// Update progress
	database.DB.Model(&job).Update("progress", 90)

	// Save variants to database
	for _, variant := range result.Variants {
		streamingVariant := models.StreamingVariant{
			VideoID:      job.VideoID,
			JobID:        job.ID,
			Quality:      variant.Quality,
			Resolution:   variant.Resolution,
			Bitrate:      variant.Bitrate,
			Framerate:    30.0, // Default framerate
			Codec:        "h264",
			Format:       job.Format,
			ManifestPath: variant.ManifestPath,
			SegmentPath:  variant.SegmentPath,
			Duration:     variant.Duration,
			FileSize:     variant.FileSize,
		}

		database.DB.Create(&streamingVariant)
	}

	// Mark job as completed
	database.DB.Model(&job).Updates(map[string]interface{}{
		"status":       "completed",
		"completed_at": time.Now(),
		"progress":     100,
	})
}
