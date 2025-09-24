package handlers

import (
	"strconv"
	"video-service/database"
	"video-service/models"

	"github.com/gofiber/fiber/v2"
)

// TrackVideoView increments the view count for a video
// @Summary Track video view
// @Description Increment view count when video starts playing
// @Tags videos
// @Accept json
// @Produce json
// @Param id path int true "Video ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id}/view [post]
func TrackVideoView(c *fiber.Ctx) error {
	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Check if video exists
	var video models.Video
	if err := database.DB.First(&video, videoID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Increment view count
	result := database.DB.Model(&video).Update("view_count", video.ViewCount+1)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update view count",
		})
	}

	// Get updated view count
	database.DB.First(&video, videoID)

	return c.JSON(fiber.Map{
		"message":    "View tracked successfully",
		"video_id":   video.ID,
		"view_count": video.ViewCount,
	})
}
