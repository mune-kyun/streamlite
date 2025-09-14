package handlers

import (
	"strconv"
	"streaming-service/database"
	"streaming-service/models"
	"time"

	"github.com/gofiber/fiber/v2"
)

// RecordPlaybackEvent records streaming analytics events
// @Summary Record playback event
// @Description Record a streaming analytics event for monitoring and optimization
// @Tags analytics
// @Accept json
// @Produce json
// @Param request body models.PlaybackEventRequest true "Playback event data"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/analytics/playback [post]
func RecordPlaybackEvent(c *fiber.Ctx) error {
	var req models.PlaybackEventRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.VideoID == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "Video ID is required",
		})
	}

	if req.SessionID == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Session ID is required",
		})
	}

	if req.EventType == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Event type is required",
		})
	}

	// Get client info from headers
	userAgent := c.Get("User-Agent")
	ipAddress := c.IP()

	// Create playback event
	event := models.PlaybackEvent{
		VideoID:      req.VideoID,
		UserID:       req.UserID,
		SessionID:    req.SessionID,
		EventType:    req.EventType,
		Quality:      req.Quality,
		Position:     req.Position,
		BufferHealth: req.BufferHealth,
		Bandwidth:    req.Bandwidth,
		UserAgent:    userAgent,
		IPAddress:    ipAddress,
		Platform:     req.Platform,
		NetworkType:  req.NetworkType,
		EventData:    req.EventData,
		Timestamp:    time.Now(),
	}

	if err := database.DB.Create(&event).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to record playback event",
		})
	}

	// If this is a bandwidth measurement, also record it separately
	if req.Bandwidth > 0 && req.EventType == "quality_change" {
		bandwidthSample := models.BandwidthSample{
			SessionID:   req.SessionID,
			VideoID:     req.VideoID,
			UserID:      req.UserID,
			Bandwidth:   req.Bandwidth,
			Quality:     req.Quality,
			NetworkType: req.NetworkType,
			Platform:    req.Platform,
			Timestamp:   time.Now(),
		}

		database.DB.Create(&bandwidthSample)
	}

	return c.Status(201).JSON(fiber.Map{
		"message": "Event recorded successfully",
		"event_id": event.ID,
	})
}

// GetStreamingStats returns streaming statistics for a video
// @Summary Get streaming statistics
// @Description Get detailed streaming analytics for a specific video
// @Tags analytics
// @Produce json
// @Param video_id path int true "Video ID"
// @Param period query string false "Time period (24h, 7d, 30d)" default(7d)
// @Success 200 {object} models.StreamingStatsResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/analytics/stats/{video_id} [get]
func GetStreamingStats(c *fiber.Ctx) error {
	videoID := c.Params("video_id")
	period := c.Query("period", "7d")

	videoIDInt, err := strconv.ParseUint(videoID, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Calculate time range
	var startTime time.Time
	switch period {
	case "24h":
		startTime = time.Now().Add(-24 * time.Hour)
	case "7d":
		startTime = time.Now().Add(-7 * 24 * time.Hour)
	case "30d":
		startTime = time.Now().Add(-30 * 24 * time.Hour)
	default:
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid period. Valid options: 24h, 7d, 30d",
		})
	}

	// Get total views (unique sessions)
	var totalViews int64
	database.DB.Model(&models.PlaybackEvent{}).
		Where("video_id = ? AND event_type = ? AND timestamp >= ?", videoIDInt, "play", startTime).
		Distinct("session_id").
		Count(&totalViews)

	// Get total watch time
	var watchTimeEvents []models.PlaybackEvent
	database.DB.Where("video_id = ? AND event_type IN ? AND timestamp >= ?", 
		videoIDInt, []string{"play", "pause", "seek"}, startTime).
		Order("session_id, timestamp").
		Find(&watchTimeEvents)

	// Calculate total watch time (simplified calculation)
	totalWatchTimeSeconds := 0.0
	sessionWatchTime := make(map[string]float64)
	
	for _, event := range watchTimeEvents {
		if event.EventType == "play" {
			sessionWatchTime[event.SessionID] = event.Position
		} else if event.EventType == "pause" && sessionWatchTime[event.SessionID] > 0 {
			watchTime := event.Position - sessionWatchTime[event.SessionID]
			if watchTime > 0 {
				totalWatchTimeSeconds += watchTime
			}
			sessionWatchTime[event.SessionID] = 0
		}
	}

	// Get average bandwidth
	var avgBandwidth float64
	database.DB.Model(&models.PlaybackEvent{}).
		Where("video_id = ? AND bandwidth > 0 AND timestamp >= ?", videoIDInt, startTime).
		Select("AVG(bandwidth)").
		Scan(&avgBandwidth)

	// Get quality distribution
	qualityDistribution := make(map[string]int64)
	var qualityStats []struct {
		Quality string
		Count   int64
	}
	database.DB.Model(&models.PlaybackEvent{}).
		Where("video_id = ? AND quality != '' AND timestamp >= ?", videoIDInt, startTime).
		Select("quality, COUNT(*) as count").
		Group("quality").
		Scan(&qualityStats)

	for _, stat := range qualityStats {
		qualityDistribution[stat.Quality] = stat.Count
	}

	// Get platform distribution
	platformStats := make(map[string]int64)
	var platformStatsData []struct {
		Platform string
		Count    int64
	}
	database.DB.Model(&models.PlaybackEvent{}).
		Where("video_id = ? AND platform != '' AND timestamp >= ?", videoIDInt, startTime).
		Select("platform, COUNT(DISTINCT session_id) as count").
		Group("platform").
		Scan(&platformStatsData)

	for _, stat := range platformStatsData {
		platformStats[stat.Platform] = stat.Count
	}

	// Get network distribution
	networkStats := make(map[string]int64)
	var networkStatsData []struct {
		NetworkType string
		Count       int64
	}
	database.DB.Model(&models.PlaybackEvent{}).
		Where("video_id = ? AND network_type != '' AND timestamp >= ?", videoIDInt, startTime).
		Select("network_type, COUNT(DISTINCT session_id) as count").
		Group("network_type").
		Scan(&networkStatsData)

	for _, stat := range networkStatsData {
		networkStats[stat.NetworkType] = stat.Count
	}

	// Get buffer events count
	var bufferEvents int64
	database.DB.Model(&models.PlaybackEvent{}).
		Where("video_id = ? AND event_type = ? AND timestamp >= ?", videoIDInt, "buffer", startTime).
		Count(&bufferEvents)

	// Get error events count
	var errorEvents int64
	database.DB.Model(&models.PlaybackEvent{}).
		Where("video_id = ? AND event_type = ? AND timestamp >= ?", videoIDInt, "error", startTime).
		Count(&errorEvents)

	response := models.StreamingStatsResponse{
		VideoID:             uint(videoIDInt),
		TotalViews:          totalViews,
		TotalDuration:       totalWatchTimeSeconds / 3600.0, // Convert to hours
		AvgBandwidth:        avgBandwidth,
		QualityDistribution: qualityDistribution,
		PlatformStats:       platformStats,
		NetworkStats:        networkStats,
		BufferEvents:        bufferEvents,
		ErrorEvents:         errorEvents,
		Period:              period,
	}

	return c.JSON(response)
}

// GetBandwidthStats returns bandwidth statistics across all videos
// @Summary Get bandwidth statistics
// @Description Get bandwidth analytics across all streaming sessions
// @Tags analytics
// @Produce json
// @Param period query string false "Time period (24h, 7d, 30d)" default(7d)
// @Success 200 {object} models.BandwidthStatsResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/analytics/bandwidth [get]
func GetBandwidthStats(c *fiber.Ctx) error {
	period := c.Query("period", "7d")

	// Calculate time range
	var startTime time.Time
	switch period {
	case "24h":
		startTime = time.Now().Add(-24 * time.Hour)
	case "7d":
		startTime = time.Now().Add(-7 * 24 * time.Hour)
	case "30d":
		startTime = time.Now().Add(-30 * 24 * time.Hour)
	default:
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid period. Valid options: 24h, 7d, 30d",
		})
	}

	// Get bandwidth samples
	var bandwidthSamples []models.BandwidthSample
	database.DB.Where("timestamp >= ?", startTime).Find(&bandwidthSamples)

	if len(bandwidthSamples) == 0 {
		return c.JSON(models.BandwidthStatsResponse{
			AvgBandwidth:      0,
			MedianBandwidth:   0,
			P95Bandwidth:      0,
			P99Bandwidth:      0,
			NetworkBreakdown:  make(map[string]float64),
			PlatformBreakdown: make(map[string]float64),
			SampleCount:       0,
			Period:            period,
		})
	}

	// Calculate statistics
	var totalBandwidth int64
	bandwidths := make([]int, len(bandwidthSamples))
	networkCounts := make(map[string]int)
	networkBandwidths := make(map[string]int64)
	platformCounts := make(map[string]int)
	platformBandwidths := make(map[string]int64)

	for i, sample := range bandwidthSamples {
		totalBandwidth += int64(sample.Bandwidth)
		bandwidths[i] = sample.Bandwidth

		// Network breakdown
		networkCounts[sample.NetworkType]++
		networkBandwidths[sample.NetworkType] += int64(sample.Bandwidth)

		// Platform breakdown
		platformCounts[sample.Platform]++
		platformBandwidths[sample.Platform] += int64(sample.Bandwidth)
	}

	// Sort bandwidths for percentile calculations
	for i := 0; i < len(bandwidths)-1; i++ {
		for j := i + 1; j < len(bandwidths); j++ {
			if bandwidths[i] > bandwidths[j] {
				bandwidths[i], bandwidths[j] = bandwidths[j], bandwidths[i]
			}
		}
	}

	avgBandwidth := float64(totalBandwidth) / float64(len(bandwidthSamples))
	medianBandwidth := float64(bandwidths[len(bandwidths)/2])
	p95Index := int(float64(len(bandwidths)) * 0.95)
	p99Index := int(float64(len(bandwidths)) * 0.99)
	p95Bandwidth := float64(bandwidths[p95Index])
	p99Bandwidth := float64(bandwidths[p99Index])

	// Calculate network breakdown percentages
	networkBreakdown := make(map[string]float64)
	for networkType, bandwidth := range networkBandwidths {
		networkBreakdown[networkType] = float64(bandwidth) / float64(totalBandwidth) * 100
	}

	// Calculate platform breakdown percentages
	platformBreakdown := make(map[string]float64)
	for platform, bandwidth := range platformBandwidths {
		platformBreakdown[platform] = float64(bandwidth) / float64(totalBandwidth) * 100
	}

	response := models.BandwidthStatsResponse{
		AvgBandwidth:      avgBandwidth,
		MedianBandwidth:   medianBandwidth,
		P95Bandwidth:      p95Bandwidth,
		P99Bandwidth:      p99Bandwidth,
		NetworkBreakdown:  networkBreakdown,
		PlatformBreakdown: platformBreakdown,
		SampleCount:       int64(len(bandwidthSamples)),
		Period:            period,
	}

	return c.JSON(response)
}
