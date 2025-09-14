package handlers

import (
	"strconv"
	"time"
	"user-service/database"
	"user-service/models"

	"github.com/gofiber/fiber/v2"
)

// GetPreferences godoc
// @Summary Get user preferences
// @Description Get all preferences for a specific user
// @Tags preferences
// @Accept json
// @Produce json
// @Param userId path int true "User ID"
// @Success 200 {array} models.UserPreference
// @Failure 400 {object} map[string]string
// @Router /api/v1/preferences/{userId} [get]
func GetPreferences(c *fiber.Ctx) error {
	userIdStr := c.Params("userId")
	userId, err := strconv.ParseUint(userIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var preferences []models.UserPreference
	result := database.DB.Where("user_id = ?", uint(userId)).Find(&preferences)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch preferences",
		})
	}

	// Convert to key-value map for easier frontend consumption
	prefMap := make(map[string]string)
	for _, pref := range preferences {
		prefMap[pref.Key] = pref.Value
	}

	return c.JSON(fiber.Map{
		"user_id":     uint(userId),
		"preferences": prefMap,
		"count":       len(preferences),
	})
}

// UpdatePreferences godoc
// @Summary Update user preferences
// @Description Update multiple preferences for a user
// @Tags preferences
// @Accept json
// @Produce json
// @Param userId path int true "User ID"
// @Param preferences body models.UserPreferencesRequest true "Preferences data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Router /api/v1/preferences/{userId} [put]
func UpdatePreferences(c *fiber.Ctx) error {
	userIdStr := c.Params("userId")
	userId, err := strconv.ParseUint(userIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req models.UserPreferencesRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Process each preference
	updatedPrefs := make(map[string]string)
	for _, prefReq := range req.Preferences {
		var preference models.UserPreference
		result := database.DB.Where("user_id = ? AND key = ?", uint(userId), prefReq.Key).First(&preference)
		
		if result.Error != nil {
			// Create new preference
			preference = models.UserPreference{
				UserID:    uint(userId),
				Key:       prefReq.Key,
				Value:     prefReq.Value,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}
			result = database.DB.Create(&preference)
		} else {
			// Update existing preference
			preference.Value = prefReq.Value
			preference.UpdatedAt = time.Now()
			result = database.DB.Save(&preference)
		}

		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update preference: " + prefReq.Key,
			})
		}

		updatedPrefs[prefReq.Key] = prefReq.Value
	}

	return c.JSON(fiber.Map{
		"user_id":     uint(userId),
		"preferences": updatedPrefs,
		"message":     "Preferences updated successfully",
	})
}
