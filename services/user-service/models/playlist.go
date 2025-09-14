package models

import (
	"time"

	"gorm.io/gorm"
)

// Playlist represents a user's video playlist
type Playlist struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	UserID      uint           `json:"user_id" gorm:"not null;index"`
	Name        string         `json:"name" gorm:"size:100;not null"`
	Description string         `json:"description" gorm:"size:500"`
	IsPublic    bool           `json:"is_public" gorm:"default:false"`
	VideoCount  int            `json:"video_count" gorm:"default:0"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	
	// Relationships
	Videos []PlaylistVideo `json:"videos,omitempty" gorm:"foreignKey:PlaylistID;constraint:OnDelete:CASCADE"`
}

// PlaylistVideo represents the relationship between playlists and videos
type PlaylistVideo struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	PlaylistID uint           `json:"playlist_id" gorm:"not null;index"`
	VideoID    uint           `json:"video_id" gorm:"not null"`
	Position   int            `json:"position" gorm:"not null;default:0"`
	AddedAt    time.Time      `json:"added_at"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
	
	// Relationships
	Playlist Playlist `json:"playlist,omitempty" gorm:"foreignKey:PlaylistID"`
}

// PlaylistWithVideos represents a playlist with video metadata
type PlaylistWithVideos struct {
	ID          uint                    `json:"id"`
	UserID      uint                    `json:"user_id"`
	Name        string                  `json:"name"`
	Description string                  `json:"description"`
	IsPublic    bool                    `json:"is_public"`
	VideoCount  int                     `json:"video_count"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
	Videos      []PlaylistVideoWithMeta `json:"videos"`
}

// PlaylistVideoWithMeta represents a playlist video with video metadata
type PlaylistVideoWithMeta struct {
	ID         uint      `json:"id"`
	PlaylistID uint      `json:"playlist_id"`
	VideoID    uint      `json:"video_id"`
	Position   int       `json:"position"`
	AddedAt    time.Time `json:"added_at"`
	
	// Video metadata (fetched from Video Service)
	VideoTitle       string `json:"video_title,omitempty"`
	VideoDescription string `json:"video_description,omitempty"`
	VideoDuration    int    `json:"video_duration,omitempty"`
	VideoThumbnail   string `json:"video_thumbnail,omitempty"`
	VideoCategoryID  uint   `json:"video_category_id,omitempty"`
	VideoViewCount   int    `json:"video_view_count,omitempty"`
}

// TableName overrides the table name for Playlist
func (Playlist) TableName() string {
	return "playlists"
}

// TableName overrides the table name for PlaylistVideo
func (PlaylistVideo) TableName() string {
	return "playlist_videos"
}

// Request/Response types

// CreatePlaylistRequest represents the request body for creating a playlist
type CreatePlaylistRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"max=500"`
	IsPublic    bool   `json:"is_public"`
}

// UpdatePlaylistRequest represents the request body for updating a playlist
type UpdatePlaylistRequest struct {
	Name        string `json:"name" validate:"min=1,max=100"`
	Description string `json:"description" validate:"max=500"`
	IsPublic    *bool  `json:"is_public"`
}

// AddVideoToPlaylistRequest represents the request body for adding a video to playlist
type AddVideoToPlaylistRequest struct {
	VideoID  uint `json:"video_id" validate:"required"`
	Position *int `json:"position"` // Optional, will append to end if not specified
}

// ReorderPlaylistVideosRequest represents the request body for reordering playlist videos
type ReorderPlaylistVideosRequest struct {
	VideoOrders []VideoOrder `json:"video_orders" validate:"required,dive"`
}

// VideoOrder represents the new order for a video in playlist
type VideoOrder struct {
	VideoID  uint `json:"video_id" validate:"required"`
	Position int  `json:"position" validate:"min=0"`
}

// PlaylistListResponse represents the response for listing playlists
type PlaylistListResponse struct {
	Playlists []Playlist `json:"playlists"`
	Total     int        `json:"total"`
	Page      int        `json:"page"`
	Limit     int        `json:"limit"`
	Pages     int        `json:"pages"`
}

// PlaylistVideosResponse represents the response for playlist videos
type PlaylistVideosResponse struct {
	Playlist PlaylistWithVideos `json:"playlist"`
	Total    int                `json:"total"`
	Page     int                `json:"page"`
	Limit    int                `json:"limit"`
	Pages    int                `json:"pages"`
}
