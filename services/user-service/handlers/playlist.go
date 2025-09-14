package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"time"
	"user-service/database"
	"user-service/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// VideoMetadata represents video data from Video Service
type VideoMetadata struct {
	ID          uint   `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Duration    int    `json:"duration"`
	Thumbnail   string `json:"thumbnail_path"`
	CategoryID  uint   `json:"category_id"`
	ViewCount   int    `json:"view_count"`
}

// GetUserPlaylists godoc
// @Summary Get user playlists
// @Description Get all playlists for a specific user with pagination
// @Tags playlists
// @Accept json
// @Produce json
// @Param userId path int true "User ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} models.PlaylistListResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/playlists/{userId} [get]
func GetUserPlaylists(c *fiber.Ctx) error {
	userIdStr := c.Params("userId")
	userId, err := strconv.ParseUint(userIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	var playlists []models.Playlist
	var total int64

	// Count total playlists
	database.DB.Model(&models.Playlist{}).Where("user_id = ?", uint(userId)).Count(&total)

	// Get playlists with pagination
	result := database.DB.Where("user_id = ?", uint(userId)).
		Order("updated_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&playlists)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch playlists",
		})
	}

	pages := int(math.Ceil(float64(total) / float64(limit)))

	response := models.PlaylistListResponse{
		Playlists: playlists,
		Total:     int(total),
		Page:      page,
		Limit:     limit,
		Pages:     pages,
	}

	return c.JSON(response)
}

// CreatePlaylist godoc
// @Summary Create new playlist
// @Description Create a new playlist for a user
// @Tags playlists
// @Accept json
// @Produce json
// @Param userId path int true "User ID"
// @Param playlist body models.CreatePlaylistRequest true "Playlist data"
// @Success 201 {object} models.Playlist
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/playlists/{userId} [post]
func CreatePlaylist(c *fiber.Ctx) error {
	userIdStr := c.Params("userId")
	userId, err := strconv.ParseUint(userIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	var req models.CreatePlaylistRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	playlist := models.Playlist{
		UserID:      uint(userId),
		Name:        req.Name,
		Description: req.Description,
		IsPublic:    req.IsPublic,
		VideoCount:  0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	result := database.DB.Create(&playlist)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create playlist",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(playlist)
}

// UpdatePlaylist godoc
// @Summary Update playlist
// @Description Update an existing playlist
// @Tags playlists
// @Accept json
// @Produce json
// @Param playlistId path int true "Playlist ID"
// @Param playlist body models.UpdatePlaylistRequest true "Playlist data"
// @Success 200 {object} models.Playlist
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/playlists/update/{playlistId} [put]
func UpdatePlaylist(c *fiber.Ctx) error {
	playlistIdStr := c.Params("playlistId")
	playlistId, err := strconv.ParseUint(playlistIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid playlist ID",
		})
	}

	var req models.UpdatePlaylistRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	var playlist models.Playlist
	result := database.DB.First(&playlist, uint(playlistId))
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Playlist not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch playlist",
		})
	}

	// Update fields if provided
	if req.Name != "" {
		playlist.Name = req.Name
	}
	if req.Description != "" {
		playlist.Description = req.Description
	}
	if req.IsPublic != nil {
		playlist.IsPublic = *req.IsPublic
	}
	playlist.UpdatedAt = time.Now()

	result = database.DB.Save(&playlist)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update playlist",
		})
	}

	return c.JSON(playlist)
}

// DeletePlaylist godoc
// @Summary Delete playlist
// @Description Delete a playlist and all its videos
// @Tags playlists
// @Accept json
// @Produce json
// @Param playlistId path int true "Playlist ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/playlists/{playlistId} [delete]
func DeletePlaylist(c *fiber.Ctx) error {
	playlistIdStr := c.Params("playlistId")
	playlistId, err := strconv.ParseUint(playlistIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid playlist ID",
		})
	}

	// Check if playlist exists
	var playlist models.Playlist
	result := database.DB.First(&playlist, uint(playlistId))
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Playlist not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch playlist",
		})
	}

	// Delete playlist (cascade will delete playlist_videos)
	result = database.DB.Delete(&playlist)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete playlist",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Playlist deleted successfully",
	})
}

// GetPlaylistVideos godoc
// @Summary Get playlist videos
// @Description Get all videos in a playlist with video metadata
// @Tags playlists
// @Accept json
// @Produce json
// @Param playlistId path int true "Playlist ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} models.PlaylistVideosResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/playlists/{playlistId}/videos [get]
func GetPlaylistVideos(c *fiber.Ctx) error {
	playlistIdStr := c.Params("playlistId")
	playlistId, err := strconv.ParseUint(playlistIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid playlist ID",
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

	// Get playlist
	var playlist models.Playlist
	result := database.DB.First(&playlist, uint(playlistId))
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Playlist not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch playlist",
		})
	}

	// Get playlist videos
	var playlistVideos []models.PlaylistVideo
	var total int64

	// Count total videos in playlist
	database.DB.Model(&models.PlaylistVideo{}).Where("playlist_id = ?", uint(playlistId)).Count(&total)

	// Get playlist videos with pagination
	result = database.DB.Where("playlist_id = ?", uint(playlistId)).
		Order("position ASC").
		Offset(offset).
		Limit(limit).
		Find(&playlistVideos)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch playlist videos",
		})
	}

	// Fetch video metadata from Video Service
	videosWithMeta := make([]models.PlaylistVideoWithMeta, 0, len(playlistVideos))
	for _, pv := range playlistVideos {
		videoMeta := fetchVideoMetadata(pv.VideoID)
		
		playlistVideoWithMeta := models.PlaylistVideoWithMeta{
			ID:         pv.ID,
			PlaylistID: pv.PlaylistID,
			VideoID:    pv.VideoID,
			Position:   pv.Position,
			AddedAt:    pv.AddedAt,
		}

		if videoMeta != nil {
			playlistVideoWithMeta.VideoTitle = videoMeta.Title
			playlistVideoWithMeta.VideoDescription = videoMeta.Description
			playlistVideoWithMeta.VideoDuration = videoMeta.Duration
			playlistVideoWithMeta.VideoThumbnail = videoMeta.Thumbnail
			playlistVideoWithMeta.VideoCategoryID = videoMeta.CategoryID
			playlistVideoWithMeta.VideoViewCount = videoMeta.ViewCount
		}

		videosWithMeta = append(videosWithMeta, playlistVideoWithMeta)
	}

	pages := int(math.Ceil(float64(total) / float64(limit)))

	playlistWithVideos := models.PlaylistWithVideos{
		ID:          playlist.ID,
		UserID:      playlist.UserID,
		Name:        playlist.Name,
		Description: playlist.Description,
		IsPublic:    playlist.IsPublic,
		VideoCount:  playlist.VideoCount,
		CreatedAt:   playlist.CreatedAt,
		UpdatedAt:   playlist.UpdatedAt,
		Videos:      videosWithMeta,
	}

	response := models.PlaylistVideosResponse{
		Playlist: playlistWithVideos,
		Total:    int(total),
		Page:     page,
		Limit:    limit,
		Pages:    pages,
	}

	return c.JSON(response)
}

// AddVideoToPlaylist godoc
// @Summary Add video to playlist
// @Description Add a video to a playlist at specified position
// @Tags playlists
// @Accept json
// @Produce json
// @Param playlistId path int true "Playlist ID"
// @Param video body models.AddVideoToPlaylistRequest true "Video data"
// @Success 201 {object} models.PlaylistVideo
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/playlists/{playlistId}/videos [post]
func AddVideoToPlaylist(c *fiber.Ctx) error {
	playlistIdStr := c.Params("playlistId")
	playlistId, err := strconv.ParseUint(playlistIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid playlist ID",
		})
	}

	var req models.AddVideoToPlaylistRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Check if playlist exists
	var playlist models.Playlist
	result := database.DB.First(&playlist, uint(playlistId))
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Playlist not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch playlist",
		})
	}

	// Check if video already exists in playlist
	var existingVideo models.PlaylistVideo
	result = database.DB.Where("playlist_id = ? AND video_id = ?", uint(playlistId), req.VideoID).First(&existingVideo)
	if result.Error == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Video already exists in playlist",
		})
	}

	// Determine position
	position := 0
	if req.Position != nil {
		position = *req.Position
	} else {
		// Append to end
		database.DB.Model(&models.PlaylistVideo{}).
			Where("playlist_id = ?", uint(playlistId)).
			Select("COALESCE(MAX(position), -1) + 1").
			Scan(&position)
	}

	// If inserting at specific position, shift other videos
	if req.Position != nil {
		database.DB.Model(&models.PlaylistVideo{}).
			Where("playlist_id = ? AND position >= ?", uint(playlistId), position).
			Update("position", gorm.Expr("position + 1"))
	}

	// Create playlist video
	playlistVideo := models.PlaylistVideo{
		PlaylistID: uint(playlistId),
		VideoID:    req.VideoID,
		Position:   position,
		AddedAt:    time.Now(),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	result = database.DB.Create(&playlistVideo)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to add video to playlist",
		})
	}

	// Update playlist video count
	database.DB.Model(&playlist).Update("video_count", gorm.Expr("video_count + 1"))
	database.DB.Model(&playlist).Update("updated_at", time.Now())

	return c.Status(fiber.StatusCreated).JSON(playlistVideo)
}

// RemoveVideoFromPlaylist godoc
// @Summary Remove video from playlist
// @Description Remove a video from a playlist
// @Tags playlists
// @Accept json
// @Produce json
// @Param playlistId path int true "Playlist ID"
// @Param videoId path int true "Video ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/playlists/{playlistId}/videos/{videoId} [delete]
func RemoveVideoFromPlaylist(c *fiber.Ctx) error {
	playlistIdStr := c.Params("playlistId")
	videoIdStr := c.Params("videoId")
	
	playlistId, err := strconv.ParseUint(playlistIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid playlist ID",
		})
	}
	
	videoId, err := strconv.ParseUint(videoIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid video ID",
		})
	}

	// Find and delete playlist video
	var playlistVideo models.PlaylistVideo
	result := database.DB.Where("playlist_id = ? AND video_id = ?", uint(playlistId), uint(videoId)).First(&playlistVideo)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Video not found in playlist",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch playlist video",
		})
	}

	// Delete the playlist video
	result = database.DB.Delete(&playlistVideo)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to remove video from playlist",
		})
	}

	// Shift positions of videos after the deleted one
	database.DB.Model(&models.PlaylistVideo{}).
		Where("playlist_id = ? AND position > ?", uint(playlistId), playlistVideo.Position).
		Update("position", gorm.Expr("position - 1"))

	// Update playlist video count
	var playlist models.Playlist
	database.DB.First(&playlist, uint(playlistId))
	database.DB.Model(&playlist).Update("video_count", gorm.Expr("video_count - 1"))
	database.DB.Model(&playlist).Update("updated_at", time.Now())

	return c.JSON(fiber.Map{
		"message": "Video removed from playlist successfully",
	})
}

// ReorderPlaylistVideos godoc
// @Summary Reorder playlist videos
// @Description Reorder videos in a playlist
// @Tags playlists
// @Accept json
// @Produce json
// @Param playlistId path int true "Playlist ID"
// @Param reorder body models.ReorderPlaylistVideosRequest true "Reorder data"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/playlists/{playlistId}/reorder [put]
func ReorderPlaylistVideos(c *fiber.Ctx) error {
	playlistIdStr := c.Params("playlistId")
	playlistId, err := strconv.ParseUint(playlistIdStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid playlist ID",
		})
	}

	var req models.ReorderPlaylistVideosRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Check if playlist exists
	var playlist models.Playlist
	result := database.DB.First(&playlist, uint(playlistId))
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Playlist not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch playlist",
		})
	}

	// Update positions for each video
	for _, videoOrder := range req.VideoOrders {
		database.DB.Model(&models.PlaylistVideo{}).
			Where("playlist_id = ? AND video_id = ?", uint(playlistId), videoOrder.VideoID).
			Update("position", videoOrder.Position)
	}

	// Update playlist updated_at
	database.DB.Model(&playlist).Update("updated_at", time.Now())

	return c.JSON(fiber.Map{
		"message": "Playlist videos reordered successfully",
	})
}

// Helper function to fetch video metadata from Video Service
func fetchVideoMetadata(videoID uint) *VideoMetadata {
	// Make HTTP request to Video Service
	url := fmt.Sprintf("http://localhost:8003/api/v1/videos/%d", videoID)
	
	resp, err := http.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	var video VideoMetadata
	if err := json.Unmarshal(body, &video); err != nil {
		return nil
	}

	return &video
}
