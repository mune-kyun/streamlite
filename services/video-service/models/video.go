package models

import (
	"time"

	"gorm.io/gorm"
)

// Video represents a video file with metadata
type Video struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	Title           string    `json:"title" gorm:"not null"`
	Description     string    `json:"description"`
	FilePath        string    `json:"file_path" gorm:"not null"`
	LowQualityPath  *string   `json:"low_quality_path,omitempty" gorm:"type:varchar(500)"` // 240p version for slow networks
	ThumbnailPath   string    `json:"thumbnail_path"` // Legacy field for backward compatibility
	ThumbnailSmall  string    `json:"thumbnail_small"`
	ThumbnailMedium string    `json:"thumbnail_medium"`
	ThumbnailLarge  string    `json:"thumbnail_large"`
	Duration        int       `json:"duration"` // in seconds
	FileSize        int64     `json:"file_size"` // in bytes
	Format          string    `json:"format"`
	CategoryID      uint      `json:"category_id"`
	UploadedBy      uint      `json:"uploaded_by"` // User ID from auth service
	ViewCount       int       `json:"view_count" gorm:"default:0"`
	Tags            string    `json:"tags"` // Comma-separated tags
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
	
	// Relationships
	Category *Category `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	Metadata []VideoMetadata `json:"metadata,omitempty" gorm:"foreignKey:VideoID"`
}

// Category represents video categories/genres
type Category struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;unique"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	
	// Relationships
	Videos []Video `json:"videos,omitempty" gorm:"foreignKey:CategoryID"`
}

// VideoMetadata represents additional video metadata for streaming
type VideoMetadata struct {
	ID         uint   `json:"id" gorm:"primaryKey"`
	VideoID    uint   `json:"video_id" gorm:"not null"`
	Resolution string `json:"resolution"` // e.g., "1920x1080"
	Bitrate    int    `json:"bitrate"`    // in kbps
	Codec      string `json:"codec"`      // e.g., "h264"
	FilePath   string `json:"file_path"`  // path to processed file
	CreatedAt  time.Time `json:"created_at"`
	
	// Relationships
	Video Video `json:"video,omitempty" gorm:"foreignKey:VideoID"`
}

// VideoLike represents a like or dislike on a video
type VideoLike struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	VideoID   uint      `json:"video_id" gorm:"not null;index"`
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	IsLike    bool      `json:"is_like"` // true for like, false for dislike
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
	
	// Relationships
	Video Video `json:"video,omitempty" gorm:"foreignKey:VideoID"`
}

// VideoUploadRequest represents the request payload for video upload
type VideoUploadRequest struct {
	Title       string `json:"title" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=1000"`
	CategoryID  uint   `json:"category_id" validate:"required"`
	Tags        string `json:"tags" validate:"max=500"` // Comma-separated tags
}

// VideoUpdateRequest represents the request payload for video update
type VideoUpdateRequest struct {
	Title       string `json:"title" validate:"min=1,max=255"`
	Description string `json:"description" validate:"max=1000"`
	CategoryID  uint   `json:"category_id"`
	Tags        string `json:"tags" validate:"max=500"` // Comma-separated tags
}

// CategoryRequest represents the request payload for category operations
type CategoryRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"max=500"`
}

// VideoResponse represents the response format for video data
type VideoResponse struct {
	ID                  uint      `json:"id"`
	Title               string    `json:"title"`
	Description         string    `json:"description"`
	ThumbnailPath       string    `json:"thumbnail_path"` // Legacy field for backward compatibility
	Thumbnails          Thumbnails `json:"thumbnails"`
	LowQualityAvailable bool      `json:"low_quality_available"`
	Duration            int       `json:"duration"`
	FileSize            int64     `json:"file_size"`
	Format              string    `json:"format"`
	CategoryID          uint      `json:"category_id"`
	CategoryName        string    `json:"category_name,omitempty"`
	UploadedBy          uint      `json:"uploaded_by"`
	UploaderDisplayName string    `json:"uploader_display_name"`
	ViewCount           int       `json:"view_count"`
	LikeCount           int       `json:"like_count"`
	DislikeCount        int       `json:"dislike_count"`
	UserLikeStatus      *string   `json:"user_like_status,omitempty"` // "like", "dislike", or null
	Tags                string    `json:"tags"` // Comma-separated tags
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// Thumbnails represents the different thumbnail sizes for API responses
type Thumbnails struct {
	Small  string `json:"small"`
	Medium string `json:"medium"`
	Large  string `json:"large"`
}

// PaginatedVideoResponse represents paginated video list response
type PaginatedVideoResponse struct {
	Videos []VideoResponse `json:"videos"`
	Total  int64           `json:"total"`
	Page   int             `json:"page"`
	Limit  int             `json:"limit"`
	Pages  int             `json:"pages"`
}

// VideoLikeRequest represents the request payload for liking/disliking a video
type VideoLikeRequest struct {
	IsLike bool `json:"is_like"` // true for like, false for dislike
}

// VideoLikeResponse represents the response format for video like operations
type VideoLikeResponse struct {
	VideoID        uint   `json:"video_id"`
	UserID         uint   `json:"user_id"`
	LikeCount      int    `json:"like_count"`
	DislikeCount   int    `json:"dislike_count"`
	UserLikeStatus string `json:"user_like_status"` // "like", "dislike", or "none"
	Message        string `json:"message"`
}

// VideoLikeStatsResponse represents the response format for video like statistics
type VideoLikeStatsResponse struct {
	VideoID        uint    `json:"video_id"`
	LikeCount      int     `json:"like_count"`
	DislikeCount   int     `json:"dislike_count"`
	UserLikeStatus *string `json:"user_like_status,omitempty"` // "like", "dislike", or null
}
