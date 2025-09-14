package handlers

import (
	"strconv"
	"time"
	"user-service/database"
	"user-service/models"

	"github.com/gofiber/fiber/v2"
)

// GetProfile godoc
// @Summary Get user profile
// @Description Get user profile by user ID
// @Tags profiles
// @Accept json
// @Produce json
// @Param userId path int true "User ID"
// @Success 200 {object} models.Profile
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/profiles/{userId} [get]
func GetProfile(c *fiber.Ctx) error {
	userIdStr := c.Params("userId")
	userId, err := strconv.ParseUint(userIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var profile models.Profile
	result := database.DB.Where("user_id = ?", uint(userId)).First(&profile)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Profile not found",
		})
	}

	return c.JSON(profile)
}

// UpdateProfile godoc
// @Summary Update user profile
// @Description Update user profile by user ID
// @Tags profiles
// @Accept json
// @Produce json
// @Param userId path int true "User ID"
// @Param profile body models.UpdateProfileRequest true "Profile data"
// @Success 200 {object} models.Profile
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/profiles/{userId} [put]
func UpdateProfile(c *fiber.Ctx) error {
	userIdStr := c.Params("userId")
	userId, err := strconv.ParseUint(userIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req models.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	var profile models.Profile
	result := database.DB.Where("user_id = ?", uint(userId)).First(&profile)
	if result.Error != nil {
		// Create new profile if it doesn't exist
		profile = models.Profile{
			UserID:      uint(userId),
			DisplayName: req.DisplayName,
			Avatar:      req.Avatar,
			Bio:         req.Bio,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		result = database.DB.Create(&profile)
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create profile",
			})
		}
	} else {
		// Update existing profile
		if req.DisplayName != "" {
			profile.DisplayName = req.DisplayName
		}
		if req.Avatar != "" {
			profile.Avatar = req.Avatar
		}
		if req.Bio != "" {
			profile.Bio = req.Bio
		}
		profile.UpdatedAt = time.Now()

		result = database.DB.Save(&profile)
		if result.Error != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update profile",
			})
		}
	}

	return c.JSON(profile)
}
