package handlers

import (
	"net/http"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"

	"user-service/database"
	"user-service/middleware"
	"user-service/models"
)

// CreateSubscription creates a new subscription
// @Summary Create subscription
// @Description Subscribe to a user
// @Tags subscriptions
// @Accept json
// @Produce json
// @Param subscription body models.CreateSubscriptionRequest true "Subscription data"
// @Success 201 {object} models.Subscription
// @Failure 400 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/subscriptions [post]
func CreateSubscription(c *fiber.Ctx) error {
	// Get authenticated user ID from JWT middleware
	authenticatedUserID, exists := middleware.GetUserID(c)
	if !exists {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Authentication required",
		})
	}

	var req models.CreateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Use authenticated user as follower (the user making the subscription)
	followerID := authenticatedUserID
	followingID := req.FollowingID

	// Validate that user is not subscribing to themselves
	if followerID == followingID {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot subscribe to yourself",
		})
	}

	// Check if subscription already exists
	var existingSubscription models.Subscription
	if err := database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingID).First(&existingSubscription).Error; err == nil {
		return c.Status(http.StatusConflict).JSON(fiber.Map{
			"error": "Already subscribed to this user",
		})
	}

	// Create new subscription
	subscription := models.Subscription{
		FollowerID:  followerID,
		FollowingID: followingID,
	}

	if err := database.DB.Create(&subscription).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create subscription",
		})
	}

	return c.Status(http.StatusCreated).JSON(subscription)
}

// DeleteSubscription removes a subscription
// @Summary Delete subscription
// @Description Unsubscribe from a user
// @Tags subscriptions
// @Produce json
// @Param follower_id path int true "Follower ID"
// @Param following_id path int true "Following ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/subscriptions/{follower_id}/{following_id} [delete]
func DeleteSubscription(c *fiber.Ctx) error {
	followerID, err := strconv.Atoi(c.Params("follower_id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid follower ID",
		})
	}

	followingID, err := strconv.Atoi(c.Params("following_id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid following ID",
		})
	}

	// Find and delete subscription
	var subscription models.Subscription
	if err := database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingID).First(&subscription).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"error": "Subscription not found",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to find subscription",
		})
	}

	if err := database.DB.Delete(&subscription).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete subscription",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Successfully unsubscribed",
	})
}

// GetUserSubscriptions gets all subscriptions for a user
// @Summary Get user subscriptions
// @Description Get all users that a user is subscribed to
// @Tags subscriptions
// @Produce json
// @Param user_id path int true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/subscriptions/user/{user_id} [get]
func GetUserSubscriptions(c *fiber.Ctx) error {
	userID, err := strconv.Atoi(c.Params("user_id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset := (page - 1) * limit

	// Get subscriptions with profile information
	var subscriptions []models.SubscriptionResponse
	query := `
		SELECT s.id, s.follower_id, s.following_id, s.created_at,
			   COALESCE(p.display_name, '') as display_name,
			   COALESCE(p.avatar, '') as avatar
		FROM subscriptions s
		LEFT JOIN profiles p ON s.following_id = p.user_id
		WHERE s.follower_id = ? AND s.deleted_at IS NULL
		ORDER BY s.created_at DESC
		LIMIT ? OFFSET ?
	`

	if err := database.DB.Raw(query, userID, limit, offset).Scan(&subscriptions).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch subscriptions",
		})
	}

	// Get total count
	var total int64
	if err := database.DB.Model(&models.Subscription{}).Where("follower_id = ?", userID).Count(&total).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count subscriptions",
		})
	}

	return c.JSON(fiber.Map{
		"subscriptions": subscriptions,
		"pagination": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetUserSubscribers gets all subscribers for a user
// @Summary Get user subscribers
// @Description Get all users that are subscribed to a user
// @Tags subscriptions
// @Produce json
// @Param user_id path int true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/subscribers/user/{user_id} [get]
func GetUserSubscribers(c *fiber.Ctx) error {
	userID, err := strconv.Atoi(c.Params("user_id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset := (page - 1) * limit

	// Get subscribers with profile information
	var subscribers []models.SubscriptionResponse
	query := `
		SELECT s.id, s.follower_id, s.following_id, s.created_at,
			   COALESCE(p.display_name, '') as display_name,
			   COALESCE(p.avatar, '') as avatar
		FROM subscriptions s
		LEFT JOIN profiles p ON s.follower_id = p.user_id
		WHERE s.following_id = ? AND s.deleted_at IS NULL
		ORDER BY s.created_at DESC
		LIMIT ? OFFSET ?
	`

	if err := database.DB.Raw(query, userID, limit, offset).Scan(&subscribers).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch subscribers",
		})
	}

	// Get total count
	var total int64
	if err := database.DB.Model(&models.Subscription{}).Where("following_id = ?", userID).Count(&total).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count subscribers",
		})
	}

	return c.JSON(fiber.Map{
		"subscribers": subscribers,
		"pagination": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetSubscriptionStats gets subscription statistics for a user
// @Summary Get subscription statistics
// @Description Get subscriber count and subscription count for a user
// @Tags subscriptions
// @Produce json
// @Param user_id path int true "User ID"
// @Success 200 {object} models.SubscriptionStatsResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/subscriptions/stats/{user_id} [get]
func GetSubscriptionStats(c *fiber.Ctx) error {
	userID, err := strconv.Atoi(c.Params("user_id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var stats models.SubscriptionStatsResponse

	// Get subscriber count (users following this user)
	var subscriberCount int64
	if err := database.DB.Model(&models.Subscription{}).Where("following_id = ?", userID).Count(&subscriberCount).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count subscribers",
		})
	}
	stats.SubscriberCount = int(subscriberCount)

	// Get subscription count (users this user is following)
	var subscriptionCount int64
	if err := database.DB.Model(&models.Subscription{}).Where("follower_id = ?", userID).Count(&subscriptionCount).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count subscriptions",
		})
	}
	stats.SubscriptionCount = int(subscriptionCount)

	return c.JSON(stats)
}

// CheckSubscriptionStatus checks if a user is subscribed to another user
// @Summary Check subscription status
// @Description Check if follower is subscribed to following user
// @Tags subscriptions
// @Produce json
// @Param follower_id path int true "Follower ID"
// @Param following_id path int true "Following ID"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/subscriptions/status/{follower_id}/{following_id} [get]
func CheckSubscriptionStatus(c *fiber.Ctx) error {
	followerID, err := strconv.Atoi(c.Params("follower_id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid follower ID",
		})
	}

	followingID, err := strconv.Atoi(c.Params("following_id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid following ID",
		})
	}

	var subscription models.Subscription
	err = database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingID).First(&subscription).Error
	
	isSubscribed := err == nil

	return c.JSON(fiber.Map{
		"is_subscribed": isSubscribed,
	})
}
