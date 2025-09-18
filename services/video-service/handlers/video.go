package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"video-service/database"
	"video-service/models"
	"video-service/utils"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// UploadVideo handles video file upload
// @Summary Upload a video file
// @Description Upload a video file with metadata
// @Tags videos
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "Video file"
// @Param title formData string true "Video title"
// @Param description formData string false "Video description"
// @Param category_id formData int true "Category ID"
// @Success 201 {object} models.VideoResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/upload [post]
func UploadVideo(c *fiber.Ctx) error {
	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Failed to parse multipart form",
		})
	}

	// Get video file
	files := form.File["file"]
	if len(files) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "No video file provided",
		})
	}

	file := files[0]

	// Validate file type
	if !isValidVideoFile(file.Filename) {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid video file format. Supported formats: mp4, avi, mov, mkv",
		})
	}

	// Get form data
	title := c.FormValue("title")
	description := c.FormValue("description")
	categoryIDStr := c.FormValue("category_id")

	if title == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Title is required",
		})
	}

	categoryID, err := strconv.ParseUint(categoryIDStr, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid category ID",
		})
	}

	// Verify category exists
	var category models.Category
	if err := database.DB.First(&category, categoryID).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Category not found",
		})
	}

	// Create storage directory if it doesn't exist
	storageDir := "storage/videos"
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to create storage directory",
		})
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%d_%s%s", timestamp, strings.ReplaceAll(title, " ", "_"), ext)
	filePath := filepath.Join(storageDir, filename)

	// Save file
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to save video file",
		})
	}

	// Create video record
	video := models.Video{
		Title:       title,
		Description: description,
		FilePath:    filePath,
		FileSize:    file.Size,
		Format:      strings.TrimPrefix(ext, "."),
		CategoryID:  uint(categoryID),
		UploadedBy:  1, // TODO: Get from JWT token
	}

	if err := database.DB.Create(&video).Error; err != nil {
		// Clean up file if database insert fails
		os.Remove(filePath)
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to save video metadata",
		})
	}

	// Generate thumbnails after video is saved
	thumbnailPaths, err := utils.GenerateThumbnails(filePath, video.ID)
	if err != nil {
		// Log error but don't fail the upload - thumbnails can be generated later
		fmt.Printf("Warning: Failed to generate thumbnails for video %d: %v\n", video.ID, err)
	} else {
		// Update video record with thumbnail paths
		video.ThumbnailSmall = thumbnailPaths.Small
		video.ThumbnailMedium = thumbnailPaths.Medium
		video.ThumbnailLarge = thumbnailPaths.Large
		video.ThumbnailPath = thumbnailPaths.Large // Set legacy field to highest quality (large size)
		database.DB.Save(&video)
	}

	// Load category for response
	database.DB.Preload("Category").First(&video, video.ID)

	response := models.VideoResponse{
		ID:           video.ID,
		Title:        video.Title,
		Description:  video.Description,
		ThumbnailPath: video.ThumbnailPath,
		Thumbnails: models.Thumbnails{
			Small:  video.ThumbnailSmall,
			Medium: video.ThumbnailMedium,
			Large:  video.ThumbnailLarge,
		},
		Duration:     video.Duration,
		FileSize:     video.FileSize,
		Format:       video.Format,
		CategoryID:   video.CategoryID,
		CategoryName: video.Category.Name,
		UploadedBy:   video.UploadedBy,
		ViewCount:    video.ViewCount,
		CreatedAt:    video.CreatedAt,
		UpdatedAt:    video.UpdatedAt,
	}

	return c.Status(201).JSON(response)
}

// GetVideos retrieves a paginated list of videos
// @Summary Get videos list
// @Description Get paginated list of videos with advanced filtering and sorting
// @Tags videos
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Param category query int false "Filter by category ID"
// @Param search query string false "Search in title and description"
// @Param duration_min query int false "Minimum duration in seconds"
// @Param duration_max query int false "Maximum duration in seconds"
// @Param upload_date_from query string false "Upload date from (YYYY-MM-DD)"
// @Param upload_date_to query string false "Upload date to (YYYY-MM-DD)"
// @Param view_count_min query int false "Minimum view count"
// @Param view_count_max query int false "Maximum view count"
// @Param sort_by query string false "Sort by: newest, oldest, most_viewed, duration" default(newest)
// @Param order query string false "Sort order: asc, desc" default(desc)
// @Success 200 {object} models.PaginatedVideoResponse
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos [get]
func GetVideos(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	categoryID := c.Query("category")
	search := c.Query("search")
	
	// Advanced filter parameters
	durationMinStr := c.Query("duration_min")
	durationMaxStr := c.Query("duration_max")
	uploadDateFrom := c.Query("upload_date_from")
	uploadDateTo := c.Query("upload_date_to")
	viewCountMinStr := c.Query("view_count_min")
	viewCountMaxStr := c.Query("view_count_max")
	sortBy := c.Query("sort_by", "newest")
	order := c.Query("order", "desc")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	// Build query
	query := database.DB.Model(&models.Video{}).Preload("Category")

	// Apply basic filters
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("title LIKE ? OR description LIKE ?", searchTerm, searchTerm)
	}

	// Apply duration filters
	if durationMinStr != "" {
		if durationMin, err := strconv.Atoi(durationMinStr); err == nil {
			query = query.Where("duration >= ?", durationMin)
		}
	}
	if durationMaxStr != "" {
		if durationMax, err := strconv.Atoi(durationMaxStr); err == nil {
			query = query.Where("duration <= ?", durationMax)
		}
	}

	// Apply upload date filters
	if uploadDateFrom != "" {
		if dateFrom, err := time.Parse("2006-01-02", uploadDateFrom); err == nil {
			query = query.Where("created_at >= ?", dateFrom)
		}
	}
	if uploadDateTo != "" {
		if dateTo, err := time.Parse("2006-01-02", uploadDateTo); err == nil {
			// Add 24 hours to include the entire day
			dateTo = dateTo.Add(24 * time.Hour)
			query = query.Where("created_at <= ?", dateTo)
		}
	}

	// Apply view count filters
	if viewCountMinStr != "" {
		if viewCountMin, err := strconv.Atoi(viewCountMinStr); err == nil {
			query = query.Where("view_count >= ?", viewCountMin)
		}
	}
	if viewCountMaxStr != "" {
		if viewCountMax, err := strconv.Atoi(viewCountMaxStr); err == nil {
			query = query.Where("view_count <= ?", viewCountMax)
		}
	}

	// Apply sorting
	var orderClause string
	switch sortBy {
	case "oldest":
		orderClause = "created_at ASC"
	case "most_viewed":
		if order == "asc" {
			orderClause = "view_count ASC"
		} else {
			orderClause = "view_count DESC"
		}
	case "duration":
		if order == "asc" {
			orderClause = "duration ASC"
		} else {
			orderClause = "duration DESC"
		}
	default: // newest
		if order == "asc" {
			orderClause = "created_at ASC"
		} else {
			orderClause = "created_at DESC"
		}
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get videos
	var videos []models.Video
	if err := query.Offset(offset).Limit(limit).Order(orderClause).Find(&videos).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to retrieve videos",
		})
	}

	// Collect unique user IDs for batch fetching display names
	userIDs := make([]uint, 0)
	userIDSet := make(map[uint]bool)
	for _, video := range videos {
		if !userIDSet[video.UploadedBy] {
			userIDs = append(userIDs, video.UploadedBy)
			userIDSet[video.UploadedBy] = true
		}
	}

	// Fetch display names for all users
	displayNames := utils.FetchMultipleUserDisplayNames(userIDs)

	// Convert to response format
	videoResponses := make([]models.VideoResponse, len(videos))
	for i, video := range videos {
		categoryName := ""
		if video.Category != nil {
			categoryName = video.Category.Name
		}

		uploaderDisplayName := displayNames[video.UploadedBy]
		if uploaderDisplayName == "" {
			uploaderDisplayName = fmt.Sprintf("User %d", video.UploadedBy)
		}

		videoResponses[i] = models.VideoResponse{
			ID:                  video.ID,
			Title:               video.Title,
			Description:         video.Description,
			ThumbnailPath:       video.ThumbnailPath,
			Thumbnails: models.Thumbnails{
				Small:  video.ThumbnailSmall,
				Medium: video.ThumbnailMedium,
				Large:  video.ThumbnailLarge,
			},
			Duration:            video.Duration,
			FileSize:            video.FileSize,
			Format:              video.Format,
			CategoryID:          video.CategoryID,
			CategoryName:        categoryName,
			UploadedBy:          video.UploadedBy,
			UploaderDisplayName: uploaderDisplayName,
			ViewCount:           video.ViewCount,
			CreatedAt:           video.CreatedAt,
			UpdatedAt:           video.UpdatedAt,
		}
	}

	pages := int(math.Ceil(float64(total) / float64(limit)))

	response := models.PaginatedVideoResponse{
		Videos: videoResponses,
		Total:  total,
		Page:   page,
		Limit:  limit,
		Pages:  pages,
	}

	return c.JSON(response)
}

// GetVideo retrieves a specific video by ID
// @Summary Get video by ID
// @Description Get detailed information about a specific video
// @Tags videos
// @Produce json
// @Param id path int true "Video ID"
// @Success 200 {object} models.VideoResponse
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id} [get]
func GetVideo(c *fiber.Ctx) error {
	id := c.Params("id")

	var video models.Video
	if err := database.DB.Preload("Category").First(&video, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Increment view count
	database.DB.Model(&video).Update("view_count", video.ViewCount+1)

	categoryName := ""
	if video.Category != nil {
		categoryName = video.Category.Name
	}

	// Fetch uploader display name
	uploaderDisplayName := utils.FetchUserDisplayName(video.UploadedBy)

	response := models.VideoResponse{
		ID:                  video.ID,
		Title:               video.Title,
		Description:         video.Description,
		ThumbnailPath:       video.ThumbnailPath,
		Thumbnails: models.Thumbnails{
			Small:  video.ThumbnailSmall,
			Medium: video.ThumbnailMedium,
			Large:  video.ThumbnailLarge,
		},
		Duration:            video.Duration,
		FileSize:            video.FileSize,
		Format:              video.Format,
		CategoryID:          video.CategoryID,
		CategoryName:        categoryName,
		UploadedBy:          video.UploadedBy,
		UploaderDisplayName: uploaderDisplayName,
		ViewCount:           video.ViewCount + 1, // Return updated count
		CreatedAt:           video.CreatedAt,
		UpdatedAt:           video.UpdatedAt,
	}

	return c.JSON(response)
}

// UpdateVideo updates video metadata
// @Summary Update video
// @Description Update video metadata (admin only)
// @Tags videos
// @Accept json
// @Produce json
// @Param id path int true "Video ID"
// @Param video body models.VideoUpdateRequest true "Video update data"
// @Success 200 {object} models.VideoResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id} [put]
func UpdateVideo(c *fiber.Ctx) error {
	id := c.Params("id")

	var video models.Video
	if err := database.DB.First(&video, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	var req models.VideoUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Update fields if provided
	if req.Title != "" {
		video.Title = req.Title
	}
	if req.Description != "" {
		video.Description = req.Description
	}
	if req.CategoryID != 0 {
		// Verify category exists
		var category models.Category
		if err := database.DB.First(&category, req.CategoryID).Error; err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "Category not found",
			})
		}
		video.CategoryID = req.CategoryID
	}

	if err := database.DB.Save(&video).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to update video",
		})
	}

	// Load category for response
	database.DB.Preload("Category").First(&video, video.ID)

	categoryName := ""
	if video.Category != nil {
		categoryName = video.Category.Name
	}

	response := models.VideoResponse{
		ID:            video.ID,
		Title:         video.Title,
		Description:   video.Description,
		ThumbnailPath: video.ThumbnailPath,
		Duration:      video.Duration,
		FileSize:      video.FileSize,
		Format:        video.Format,
		CategoryID:    video.CategoryID,
		CategoryName:  categoryName,
		UploadedBy:    video.UploadedBy,
		ViewCount:     video.ViewCount,
		CreatedAt:     video.CreatedAt,
		UpdatedAt:     video.UpdatedAt,
	}

	return c.JSON(response)
}

// DeleteVideo deletes a video and its file
// @Summary Delete video
// @Description Delete video and its associated file (admin only)
// @Tags videos
// @Produce json
// @Param id path int true "Video ID"
// @Success 200 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id} [delete]
func DeleteVideo(c *fiber.Ctx) error {
	id := c.Params("id")

	var video models.Video
	if err := database.DB.First(&video, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Delete file from storage
	if video.FilePath != "" {
		if err := os.Remove(video.FilePath); err != nil {
			// Log error but don't fail the request
			fmt.Printf("Failed to delete video file %s: %v\n", video.FilePath, err)
		}
	}

	// Delete thumbnail if exists
	if video.ThumbnailPath != "" {
		if err := os.Remove(video.ThumbnailPath); err != nil {
			// Log error but don't fail the request
			fmt.Printf("Failed to delete thumbnail file %s: %v\n", video.ThumbnailPath, err)
		}
	}

	// Delete from database
	if err := database.DB.Delete(&video).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to delete video",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Video deleted successfully",
	})
}

// StreamVideo serves video files for streaming
// @Summary Stream video file
// @Description Stream video file by ID
// @Tags videos
// @Produce application/octet-stream
// @Param id path int true "Video ID"
// @Success 200 {file} binary
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id}/stream [get]
func StreamVideo(c *fiber.Ctx) error {
	id := c.Params("id")

	var video models.Video
	if err := database.DB.First(&video, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Check if file exists
	info, err := os.Stat(video.FilePath)
	if os.IsNotExist(err) {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video file not found",
		})
	}

	// Log file size in MB
	sizeMB := float64(info.Size()) / (1024 * 1024)
	fmt.Printf("(Stream Video) Video size: %.2f MB\n", sizeMB)

	// Set appropriate headers for video streaming
	c.Set("Content-Type", "video/"+video.Format)
	c.Set("Accept-Ranges", "bytes")
	c.Set("Cache-Control", "public, max-age=3600")

	// Send the file
	return c.SendFile(video.FilePath)
}

// GetThumbnail serves thumbnail images for videos
// @Summary Get video thumbnail
// @Description Get thumbnail image for a video in specified size
// @Tags videos
// @Produce image/jpeg
// @Param id path int true "Video ID"
// @Param size path string true "Thumbnail size (small, medium, large)"
// @Success 200 {file} binary
// @Failure 404 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /api/v1/videos/{id}/thumbnail/{size} [get]
func GetThumbnail(c *fiber.Ctx) error {
	id := c.Params("id")
	size := c.Params("size")

	// Validate size parameter
	validSizes := []string{"small", "medium", "large"}
	isValidSize := false
	for _, validSize := range validSizes {
		if size == validSize {
			isValidSize = true
			break
		}
	}

	if !isValidSize {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid thumbnail size. Valid sizes: small, medium, large",
		})
	}

	var video models.Video
	if err := database.DB.First(&video, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Get thumbnail path based on size
	var thumbnailPath string
	switch size {
	case "small":
		thumbnailPath = video.ThumbnailSmall
	case "medium":
		thumbnailPath = video.ThumbnailMedium
	case "large":
		thumbnailPath = video.ThumbnailLarge
	}

	// Check if thumbnail exists
	if thumbnailPath == "" {
		return c.Status(404).JSON(fiber.Map{
			"error": "Thumbnail not available for this video",
		})
	}

	// Check if file exists
	if _, err := os.Stat(thumbnailPath); os.IsNotExist(err) {
		return c.Status(404).JSON(fiber.Map{
			"error": "Thumbnail file not found",
		})
	}

	// Set appropriate headers for image
	c.Set("Content-Type", "image/jpeg")
	c.Set("Cache-Control", "public, max-age=86400") // Cache for 24 hours

	// Send the thumbnail file
	return c.SendFile(thumbnailPath)
}

// GetSearchSuggestions provides search suggestions based on partial query
// @Summary Get search suggestions
// @Description Get search suggestions for autocomplete functionality
// @Tags videos
// @Produce json
// @Param q query string true "Partial search query"
// @Param limit query int false "Maximum number of suggestions" default(10)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Router /api/v1/videos/search/suggestions [get]
func GetSearchSuggestions(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "Query parameter 'q' is required",
		})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if limit < 1 || limit > 50 {
		limit = 10
	}

	var suggestions []string

	// Get video title suggestions
	var videos []models.Video
	searchTerm := "%" + query + "%"
	database.DB.Select("title").Where("title LIKE ?", searchTerm).Limit(limit).Find(&videos)
	
	for _, video := range videos {
		suggestions = append(suggestions, video.Title)
	}

	// Get category name suggestions
	var categories []models.Category
	database.DB.Select("name").Where("name LIKE ?", searchTerm).Limit(5).Find(&categories)
	
	for _, category := range categories {
		suggestions = append(suggestions, category.Name)
	}

	// Remove duplicates and limit results
	uniqueSuggestions := make([]string, 0)
	seen := make(map[string]bool)
	
	for _, suggestion := range suggestions {
		if !seen[suggestion] && len(uniqueSuggestions) < limit {
			seen[suggestion] = true
			uniqueSuggestions = append(uniqueSuggestions, suggestion)
		}
	}

	return c.JSON(fiber.Map{
		"suggestions": uniqueSuggestions,
		"query":       query,
		"count":       len(uniqueSuggestions),
	})
}

// GetTrendingVideos returns trending videos based on recent view activity
// @Summary Get trending videos
// @Description Get videos that are currently trending based on view count and recency
// @Tags videos
// @Produce json
// @Param limit query int false "Number of trending videos to return" default(20)
// @Param days query int false "Number of days to consider for trending calculation" default(7)
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/trending [get]
func GetTrendingVideos(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	days, _ := strconv.Atoi(c.Query("days", "7"))

	if limit < 1 || limit > 100 {
		limit = 20
	}
	if days < 1 || days > 30 {
		days = 7
	}

	// Calculate date threshold
	dateThreshold := time.Now().AddDate(0, 0, -days)

	// Get trending videos - simple algorithm based on view count and recency
	var videos []models.Video
	err := database.DB.Preload("Category").
		Where("created_at >= ?", dateThreshold).
		Order("view_count DESC, created_at DESC").
		Limit(limit).
		Find(&videos).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to retrieve trending videos",
		})
	}

	// Convert to response format
	videoResponses := make([]models.VideoResponse, len(videos))
	for i, video := range videos {
		categoryName := ""
		if video.Category != nil {
			categoryName = video.Category.Name
		}

		videoResponses[i] = models.VideoResponse{
			ID:            video.ID,
			Title:         video.Title,
			Description:   video.Description,
			ThumbnailPath: video.ThumbnailPath,
			Thumbnails: models.Thumbnails{
				Small:  video.ThumbnailSmall,
				Medium: video.ThumbnailMedium,
				Large:  video.ThumbnailLarge,
			},
			Duration:      video.Duration,
			FileSize:      video.FileSize,
			Format:        video.Format,
			CategoryID:    video.CategoryID,
			CategoryName:  categoryName,
			UploadedBy:    video.UploadedBy,
			ViewCount:     video.ViewCount,
			CreatedAt:     video.CreatedAt,
			UpdatedAt:     video.UpdatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"videos":     videoResponses,
		"count":      len(videoResponses),
		"days":       days,
		"generated_at": time.Now(),
	})
}

// GetRecommendations provides personalized video recommendations for a user
// @Summary Get personalized recommendations
// @Description Get video recommendations based on user's watch history
// @Tags videos
// @Produce json
// @Param user_id path int true "User ID"
// @Param limit query int false "Number of recommendations to return" default(20)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/recommendations/{user_id} [get]
func GetRecommendations(c *fiber.Ctx) error {
	userIDStr := c.Params("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Simple recommendation algorithm based on user's watch history
	// 1. Find user's most watched categories
	// 2. Get popular videos from those categories
	// 3. Exclude videos the user has already watched

	// This is a simplified implementation - in a real system, you'd call the user service
	// For now, we'll return popular videos from all categories as a fallback
	var videos []models.Video
	err = database.DB.Preload("Category").
		Order("view_count DESC, created_at DESC").
		Limit(limit).
		Find(&videos).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to retrieve recommendations",
		})
	}

	// Convert to response format
	videoResponses := make([]models.VideoResponse, len(videos))
	for i, video := range videos {
		categoryName := ""
		if video.Category != nil {
			categoryName = video.Category.Name
		}

		videoResponses[i] = models.VideoResponse{
			ID:            video.ID,
			Title:         video.Title,
			Description:   video.Description,
			ThumbnailPath: video.ThumbnailPath,
			Thumbnails: models.Thumbnails{
				Small:  video.ThumbnailSmall,
				Medium: video.ThumbnailMedium,
				Large:  video.ThumbnailLarge,
			},
			Duration:      video.Duration,
			FileSize:      video.FileSize,
			Format:        video.Format,
			CategoryID:    video.CategoryID,
			CategoryName:  categoryName,
			UploadedBy:    video.UploadedBy,
			ViewCount:     video.ViewCount,
			CreatedAt:     video.CreatedAt,
			UpdatedAt:     video.UpdatedAt,
		}
	}

	return c.JSON(fiber.Map{
		"videos":      videoResponses,
		"user_id":     uint(userID),
		"count":       len(videoResponses),
		"algorithm":   "popularity_based", // Simple fallback algorithm
		"generated_at": time.Now(),
	})
}

// ProcessVideoForStreaming triggers video processing for adaptive streaming
// @Summary Process video for streaming
// @Description Start processing a video for adaptive streaming (HLS/DASH)
// @Tags videos
// @Accept json
// @Produce json
// @Param id path int true "Video ID"
// @Param request body map[string]interface{} true "Processing options"
// @Success 202 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id}/process-streaming [post]
func ProcessVideoForStreaming(c *fiber.Ctx) error {
	id := c.Params("id")

	var video models.Video
	if err := database.DB.First(&video, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Parse request body for processing options
	var req map[string]interface{}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Set default values
	format := "hls"
	if f, ok := req["format"].(string); ok {
		format = f
	}

	qualities := []string{"480p", "720p", "1080p"}
	if q, ok := req["qualities"].([]interface{}); ok {
		qualities = make([]string, len(q))
		for i, quality := range q {
			if qualityStr, ok := quality.(string); ok {
				qualities[i] = qualityStr
			}
		}
	}

	priority := 5
	if p, ok := req["priority"].(float64); ok {
		priority = int(p)
	}

	// Prepare request for streaming service
	streamingReq := map[string]interface{}{
		"video_id":   video.ID,
		"input_path": video.FilePath,
		"format":     format,
		"qualities":  qualities,
		"priority":   priority,
	}

	// Call streaming service
	reqBody, _ := json.Marshal(streamingReq)
	resp, err := http.Post("http://localhost:8084/api/v1/streaming/process", 
		"application/json", bytes.NewBuffer(reqBody))
	
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to connect to streaming service",
		})
	}
	defer resp.Body.Close()

	// Parse response
	var streamingResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&streamingResp); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to parse streaming service response",
		})
	}

	if resp.StatusCode != 202 {
		return c.Status(resp.StatusCode).JSON(streamingResp)
	}

	return c.Status(202).JSON(fiber.Map{
		"message":     "Video processing started",
		"video_id":    video.ID,
		"job_id":      streamingResp["job_id"],
		"status":      streamingResp["status"],
		"estimated_time": streamingResp["estimated_time_minutes"],
	})
}

// GetStreamingStatus returns the streaming processing status for a video
// @Summary Get streaming processing status
// @Description Get the current status of video streaming processing
// @Tags videos
// @Produce json
// @Param id path int true "Video ID"
// @Success 200 {object} map[string]interface{}
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id}/streaming-status [get]
func GetStreamingStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var video models.Video
	if err := database.DB.First(&video, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Call streaming service to get status
	resp, err := http.Get(fmt.Sprintf("http://localhost:8084/api/v1/streaming/qualities/%s", id))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to connect to streaming service",
		})
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return c.JSON(fiber.Map{
			"video_id": video.ID,
			"status":   "not_processed",
			"message":  "Video has not been processed for streaming yet",
		})
	}

	// Parse response
	var streamingResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&streamingResp); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to parse streaming service response",
		})
	}

	if resp.StatusCode != 200 {
		return c.Status(resp.StatusCode).JSON(streamingResp)
	}

	return c.JSON(fiber.Map{
		"video_id":        video.ID,
		"status":          "completed",
		"streaming_info":  streamingResp,
		"message":         "Video is ready for adaptive streaming",
	})
}

// GetStreamingManifest proxies streaming manifest requests
// @Summary Get streaming manifest
// @Description Get HLS or DASH manifest for adaptive streaming
// @Tags videos
// @Produce text/plain
// @Param id path int true "Video ID"
// @Param format path string true "Format (hls or dash)"
// @Success 200 {string} string "Manifest content"
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id}/manifest/{format} [get]
func GetStreamingManifest(c *fiber.Ctx) error {
	id := c.Params("id")
	format := c.Params("format")

	// Verify video exists
	var video models.Video
	if err := database.DB.First(&video, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Proxy request to streaming service
	resp, err := http.Get(fmt.Sprintf("http://localhost:8084/api/v1/streaming/manifest/%s/%s", id, format))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to connect to streaming service",
		})
	}
	defer resp.Body.Close()

	// Copy headers
	for key, values := range resp.Header {
		for _, value := range values {
			c.Set(key, value)
		}
	}

	// Copy status code
	c.Status(resp.StatusCode)

	// Copy body
	body := make([]byte, resp.ContentLength)
	resp.Body.Read(body)
	
	return c.Send(body)
}

// LikeVideo handles liking or disliking a video
// @Summary Like or dislike a video
// @Description Like or dislike a video (requires authentication)
// @Tags videos
// @Accept json
// @Produce json
// @Param id path int true "Video ID"
// @Param like body models.VideoLikeRequest true "Like data"
// @Success 200 {object} models.VideoLikeResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id}/like [post]
func LikeVideo(c *fiber.Ctx) error {
	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// TODO: Get user ID from JWT token
	userID := uint(1) // This should come from JWT middleware

	// Check if video exists
	var video models.Video
	if err := database.DB.First(&video, videoID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Parse request body
	var req models.VideoLikeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Check if user already has a like/dislike for this video
	var existingLike models.VideoLike
	err = database.DB.Where("video_id = ? AND user_id = ?", videoID, userID).First(&existingLike).Error
	
	if err == nil {
		// User already has a like/dislike, update it
		existingLike.IsLike = req.IsLike
		if err := database.DB.Save(&existingLike).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to update like status",
			})
		}
	} else if err == gorm.ErrRecordNotFound {
		// Create new like/dislike
		newLike := models.VideoLike{
			VideoID: uint(videoID),
			UserID:  userID,
			IsLike:  req.IsLike,
		}
		if err := database.DB.Create(&newLike).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to create like",
			})
		}
	} else {
		return c.Status(500).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	// Get updated counts
	likeCount, dislikeCount := getLikeCounts(uint(videoID))
	
	userLikeStatus := "like"
	if !req.IsLike {
		userLikeStatus = "dislike"
	}

	response := models.VideoLikeResponse{
		VideoID:        uint(videoID),
		UserID:         userID,
		LikeCount:      likeCount,
		DislikeCount:   dislikeCount,
		UserLikeStatus: userLikeStatus,
		Message:        fmt.Sprintf("Video %s successfully", userLikeStatus+"d"),
	}

	return c.JSON(response)
}

// RemoveLike handles removing a like/dislike from a video
// @Summary Remove like/dislike from a video
// @Description Remove user's like or dislike from a video (requires authentication)
// @Tags videos
// @Produce json
// @Param id path int true "Video ID"
// @Success 200 {object} models.VideoLikeResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id}/like [delete]
func RemoveLike(c *fiber.Ctx) error {
	videoID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// TODO: Get user ID from JWT token
	userID := uint(1) // This should come from JWT middleware

	// Check if video exists
	var video models.Video
	if err := database.DB.First(&video, videoID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "Video not found",
		})
	}

	// Find and delete the like/dislike
	var existingLike models.VideoLike
	err = database.DB.Where("video_id = ? AND user_id = ?", videoID, userID).First(&existingLike).Error
	
	if err == gorm.ErrRecordNotFound {
		return c.Status(404).JSON(fiber.Map{
			"error": "No like/dislike found for this video",
		})
	} else if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Database error",
		})
	}

	// Delete the like/dislike
	if err := database.DB.Delete(&existingLike).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "Failed to remove like",
		})
	}

	// Get updated counts
	likeCount, dislikeCount := getLikeCounts(uint(videoID))

	response := models.VideoLikeResponse{
		VideoID:        uint(videoID),
		UserID:         userID,
		LikeCount:      likeCount,
		DislikeCount:   dislikeCount,
		UserLikeStatus: "none",
		Message:        "Like/dislike removed successfully",
	}

	return c.JSON(response)
}

// GetVideoLikeStats returns like/dislike statistics for a video
// @Summary Get video like statistics
// @Description Get like and dislike counts for a video, and user's like status if authenticated
// @Tags videos
// @Produce json
// @Param id path int true "Video ID"
// @Success 200 {object} models.VideoLikeStatsResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/videos/{id}/likes [get]
func GetVideoLikeStats(c *fiber.Ctx) error {
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

	// Get like/dislike counts
	likeCount, dislikeCount := getLikeCounts(uint(videoID))

	// TODO: Get user ID from JWT token if authenticated
	userID := uint(1) // This should come from JWT middleware

	// Get user's like status if authenticated
	var userLikeStatus *string
	if userID > 0 {
		var userLike models.VideoLike
		err = database.DB.Where("video_id = ? AND user_id = ?", videoID, userID).First(&userLike).Error
		if err == nil {
			if userLike.IsLike {
				status := "like"
				userLikeStatus = &status
			} else {
				status := "dislike"
				userLikeStatus = &status
			}
		}
	}

	response := models.VideoLikeStatsResponse{
		VideoID:        uint(videoID),
		LikeCount:      likeCount,
		DislikeCount:   dislikeCount,
		UserLikeStatus: userLikeStatus,
	}

	return c.JSON(response)
}

// getLikeCounts is a helper function to get like and dislike counts for a video
func getLikeCounts(videoID uint) (int, int) {
	var likeCount int64
	var dislikeCount int64

	database.DB.Model(&models.VideoLike{}).Where("video_id = ? AND is_like = ?", videoID, true).Count(&likeCount)
	database.DB.Model(&models.VideoLike{}).Where("video_id = ? AND is_like = ?", videoID, false).Count(&dislikeCount)

	return int(likeCount), int(dislikeCount)
}

// isValidVideoFile checks if the file has a valid video extension
func isValidVideoFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	validExtensions := []string{".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"}
	
	for _, validExt := range validExtensions {
		if ext == validExt {
			return true
		}
	}
	return false
}
