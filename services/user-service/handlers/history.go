package handlers

import (
	"strconv"
	"time"
	"user-service/database"
	"user-service/models"

	"github.com/gofiber/fiber/v2"
)

// GetWatchHistory godoc
// @Summary Get user watch history
// @Description Get watch history for a specific user
// @Tags history
// @Accept json
// @Produce json
// @Param userId path int true "User ID"
// @Param limit query int false "Limit number of results" default(50)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {array} models.WatchHistory
// @Failure 400 {object} map[string]string
// @Router /api/v1/history/{userId} [get]
func GetWatchHistory(c *fiber.Ctx) error {
	userIdStr := c.Params("userId")
	userId, err := strconv.ParseUint(userIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse query parameters
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	var history []models.WatchHistory
	result := database.DB.Where("user_id = ?", uint(userId)).
		Order("watched_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&history)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch watch history",
		})
	}

	return c.JSON(fiber.Map{
		"data":   history,
		"count":  len(history),
		"limit":  limit,
		"offset": offset,
	})
}

// AddWatchHistory godoc
// @Summary Add watch history entry
// @Description Add a new watch history entry for a user
// @Tags history
// @Accept json
// @Produce json
// @Param history body models.CreateWatchHistoryRequest true "Watch history data"
// @Success 201 {object} models.WatchHistory
// @Failure 400 {object} map[string]string
// @Router /api/v1/history [post]
func AddWatchHistory(c *fiber.Ctx) error {
	var req models.CreateWatchHistoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Check if entry already exists for this user and video
	var existingHistory models.WatchHistory
	result := database.DB.Where("user_id = ? AND video_id = ?", req.UserID, req.VideoID).First(&existingHistory)
	
	if result.Error == nil {
		// Update existing entry
		existingHistory.Progress = req.Progress
		existingHistory.Duration = req.Duration
		existingHistory.Completed = req.Progress >= req.Duration*0.9 // 90% completion
		existingHistory.WatchedAt = time.Now()
		existingHistory.UpdatedAt = time.Now()

		result = database.DB.Save(&existingHistory)
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update watch history",
			})
		}
		return c.Status(fiber.StatusOK).JSON(existingHistory)
	}

	// Create new entry
	history := models.WatchHistory{
		UserID:    req.UserID,
		VideoID:   req.VideoID,
		Progress:  req.Progress,
		Duration:  req.Duration,
		Completed: req.Progress >= req.Duration*0.9, // 90% completion
		WatchedAt: time.Now(),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result = database.DB.Create(&history)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create watch history",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(history)
}

// UpdateWatchHistory godoc
// @Summary Update watch history entry
// @Description Update an existing watch history entry
// @Tags history
// @Accept json
// @Produce json
// @Param historyId path int true "History ID"
// @Param history body models.UpdateWatchHistoryRequest true "Watch history data"
// @Success 200 {object} models.WatchHistory
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/history/{historyId} [put]
func UpdateWatchHistory(c *fiber.Ctx) error {
	historyIdStr := c.Params("historyId")
	historyId, err := strconv.ParseUint(historyIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid history ID",
		})
	}

	var req models.UpdateWatchHistoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	var history models.WatchHistory
	result := database.DB.First(&history, uint(historyId))
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Watch history not found",
		})
	}

	// Update fields
	history.Progress = req.Progress
	history.Duration = req.Duration
	history.Completed = req.Completed
	history.WatchedAt = time.Now()
	history.UpdatedAt = time.Now()

	result = database.DB.Save(&history)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update watch history",
		})
	}

	return c.JSON(history)
}

// DeleteWatchHistory godoc
// @Summary Delete watch history entry
// @Description Delete a watch history entry
// @Tags history
// @Accept json
// @Produce json
// @Param historyId path int true "History ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/history/{historyId} [delete]
func DeleteWatchHistory(c *fiber.Ctx) error {
	historyIdStr := c.Params("historyId")
	historyId, err := strconv.ParseUint(historyIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid history ID",
		})
	}

	result := database.DB.Delete(&models.WatchHistory{}, uint(historyId))
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete watch history",
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Watch history not found",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Watch history deleted successfully",
	})
}
