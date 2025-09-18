package handlers

import (
	"fmt"
	"math"
	"strconv"
	"video-service/database"
	"video-service/models"
	"video-service/utils"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// CreateComment creates a new comment on a video
// @Summary Create a comment
// @Description Create a new comment on a video
// @Tags comments
// @Accept json
// @Produce json
// @Param id path int true "Video ID"
// @Param comment body models.CommentRequest true "Comment data"
// @Success 201 {object} models.CommentResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /videos/{id}/comments [post]
func CreateComment(c *fiber.Ctx) error {
	// Get video ID from URL parameter
	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Check if video exists
	var video models.Video
	if err := database.DB.First(&video, videoID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Video not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	// Parse request body
	var req models.CommentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// TODO: Get user ID from JWT token
	// For now, using a placeholder user ID
	userID := uint(1) // This should come from JWT middleware

	// If this is a reply, check if parent comment exists
	if req.ParentCommentID != nil {
		var parentComment models.Comment
		if err := database.DB.First(&parentComment, *req.ParentCommentID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "Parent comment not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Database error",
			})
		}

		// Ensure parent comment belongs to the same video
		if parentComment.VideoID != uint(videoID) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Parent comment does not belong to this video",
			})
		}
	}

	// Create comment
	comment := models.Comment{
		VideoID:         uint(videoID),
		UserID:          userID,
		ParentCommentID: req.ParentCommentID,
		Content:         req.Content,
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create comment",
		})
	}

	// Fetch author display name
	authorDisplayName := utils.FetchUserDisplayName(comment.UserID)

	// Return comment response
	response := models.CommentResponse{
		ID:                comment.ID,
		VideoID:           comment.VideoID,
		UserID:            comment.UserID,
		AuthorDisplayName: authorDisplayName,
		ParentCommentID:   comment.ParentCommentID,
		Content:           comment.Content,
		CreatedAt:         comment.CreatedAt,
		UpdatedAt:         comment.UpdatedAt,
		Replies:           make([]models.CommentResponse, 0), // Empty slice instead of nil
		ReplyCount:        0,
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// GetComments retrieves comments for a video with pagination
// @Summary Get video comments
// @Description Get paginated comments for a video
// @Tags comments
// @Produce json
// @Param id path int true "Video ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} models.PaginatedCommentResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /videos/{id}/comments [get]
func GetComments(c *fiber.Ctx) error {
	// Get video ID from URL parameter
	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Check if video exists
	var video models.Video
	if err := database.DB.First(&video, videoID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Video not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Get total count of top-level comments (not replies)
	var total int64
	database.DB.Model(&models.Comment{}).
		Where("video_id = ? AND parent_comment_id IS NULL AND is_deleted = ?", videoID, false).
		Count(&total)

	// Get top-level comments with their replies
	var comments []models.Comment
	err = database.DB.Where("video_id = ? AND parent_comment_id IS NULL AND is_deleted = ?", videoID, false).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&comments).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch comments",
		})
	}

	// Collect unique user IDs for batch fetching display names
	userIDs := make([]uint, 0)
	userIDSet := make(map[uint]bool)
	
	// Add comment authors
	for _, comment := range comments {
		if !userIDSet[comment.UserID] {
			userIDs = append(userIDs, comment.UserID)
			userIDSet[comment.UserID] = true
		}
	}
	
	// Get all replies and add their authors
	allReplies := make(map[uint][]models.Comment)
	for _, comment := range comments {
		var replies []models.Comment
		database.DB.Where("parent_comment_id = ? AND is_deleted = ?", comment.ID, false).
			Order("created_at ASC").
			Find(&replies)
		allReplies[comment.ID] = replies
		
		// Add reply authors to user ID list
		for _, reply := range replies {
			if !userIDSet[reply.UserID] {
				userIDs = append(userIDs, reply.UserID)
				userIDSet[reply.UserID] = true
			}
		}
	}

	// Fetch display names for all users
	displayNames := utils.FetchMultipleUserDisplayNames(userIDs)

	// Build response with nested replies
	// Initialize as empty slice to ensure JSON array instead of null
	commentResponses := make([]models.CommentResponse, 0)
	
	for _, comment := range comments {
		// Get author display name
		authorDisplayName := displayNames[comment.UserID]
		if authorDisplayName == "" {
			authorDisplayName = fmt.Sprintf("User %d", comment.UserID)
		}

		// Build reply responses
		// Initialize as empty slice to ensure JSON array instead of null
		replyResponses := make([]models.CommentResponse, 0)
		replies := allReplies[comment.ID]
		for _, reply := range replies {
			replyAuthorDisplayName := displayNames[reply.UserID]
			if replyAuthorDisplayName == "" {
				replyAuthorDisplayName = fmt.Sprintf("User %d", reply.UserID)
			}
			
			replyResponses = append(replyResponses, models.CommentResponse{
				ID:                reply.ID,
				VideoID:           reply.VideoID,
				UserID:            reply.UserID,
				AuthorDisplayName: replyAuthorDisplayName,
				ParentCommentID:   reply.ParentCommentID,
				Content:           reply.Content,
				CreatedAt:         reply.CreatedAt,
				UpdatedAt:         reply.UpdatedAt,
				Replies:           make([]models.CommentResponse, 0), // Empty slice instead of nil
				ReplyCount:        0,
			})
		}

		commentResponses = append(commentResponses, models.CommentResponse{
			ID:                comment.ID,
			VideoID:           comment.VideoID,
			UserID:            comment.UserID,
			AuthorDisplayName: authorDisplayName,
			ParentCommentID:   comment.ParentCommentID,
			Content:           comment.Content,
			CreatedAt:         comment.CreatedAt,
			UpdatedAt:         comment.UpdatedAt,
			Replies:           replyResponses,
			ReplyCount:        len(replyResponses),
		})
	}

	// Calculate total pages
	pages := int(math.Ceil(float64(total) / float64(limit)))

	response := models.PaginatedCommentResponse{
		Comments: commentResponses,
		Total:    total,
		Page:     page,
		Limit:    limit,
		Pages:    pages,
		VideoID:  uint(videoID),
	}

	return c.JSON(response)
}

// UpdateComment updates an existing comment
// @Summary Update a comment
// @Description Update an existing comment (only by the comment author)
// @Tags comments
// @Accept json
// @Produce json
// @Param id path int true "Comment ID"
// @Param comment body models.CommentUpdateRequest true "Updated comment data"
// @Success 200 {object} models.CommentResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /comments/{id} [put]
func UpdateComment(c *fiber.Ctx) error {
	// Get comment ID from URL parameter
	commentID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid comment ID",
		})
	}

	// TODO: Get user ID from JWT token
	userID := uint(1) // This should come from JWT middleware

	// Find the comment
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Comment not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	// Check if user owns the comment
	if comment.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only edit your own comments",
		})
	}

	// Parse request body
	var req models.CommentUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update comment
	comment.Content = req.Content
	if err := database.DB.Save(&comment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update comment",
		})
	}

	// Fetch author display name
	authorDisplayName := utils.FetchUserDisplayName(comment.UserID)

	// Return updated comment
	response := models.CommentResponse{
		ID:                comment.ID,
		VideoID:           comment.VideoID,
		UserID:            comment.UserID,
		AuthorDisplayName: authorDisplayName,
		ParentCommentID:   comment.ParentCommentID,
		Content:           comment.Content,
		CreatedAt:         comment.CreatedAt,
		UpdatedAt:         comment.UpdatedAt,
		Replies:           make([]models.CommentResponse, 0), // Empty slice instead of nil
		ReplyCount:        0,
	}

	return c.JSON(response)
}

// DeleteComment soft deletes a comment
// @Summary Delete a comment
// @Description Soft delete a comment (only by the comment author)
// @Tags comments
// @Param id path int true "Comment ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /comments/{id} [delete]
func DeleteComment(c *fiber.Ctx) error {
	// Get comment ID from URL parameter
	commentID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid comment ID",
		})
	}

	// TODO: Get user ID from JWT token
	userID := uint(1) // This should come from JWT middleware

	// Find the comment
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Comment not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	// Check if user owns the comment
	if comment.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You can only delete your own comments",
		})
	}

	// Soft delete the comment
	comment.IsDeleted = true
	if err := database.DB.Save(&comment).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete comment",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Comment deleted successfully",
	})
}

// GetCommentCount returns the total number of comments for a video
// @Summary Get comment count
// @Description Get the total number of comments for a video
// @Tags comments
// @Produce json
// @Param id path int true "Video ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /videos/{id}/comments/count [get]
func GetCommentCount(c *fiber.Ctx) error {
	// Get video ID from URL parameter
	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Check if video exists
	var video models.Video
	if err := database.DB.First(&video, videoID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Video not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	// Count only parent comments (excluding replies)
	var total int64
	database.DB.Model(&models.Comment{}).
		Where("video_id = ? AND parent_comment_id IS NULL AND is_deleted = ?", videoID, false).
		Count(&total)

	return c.JSON(fiber.Map{
		"video_id":      videoID,
		"comment_count": total,
	})
}
