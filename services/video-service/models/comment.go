package models

import (
	"time"

	"gorm.io/gorm"
)

// Comment represents a comment on a video
type Comment struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	VideoID         uint      `json:"video_id" gorm:"not null"`
	UserID          uint      `json:"user_id" gorm:"not null"`
	ParentCommentID *uint     `json:"parent_comment_id,omitempty"` // For nested replies
	Content         string    `json:"content" gorm:"not null"`
	IsDeleted       bool      `json:"is_deleted" gorm:"default:false"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
	
	// Relationships
	Video    Video     `json:"video,omitempty" gorm:"foreignKey:VideoID"`
	Replies  []Comment `json:"replies,omitempty" gorm:"foreignKey:ParentCommentID"`
}

// CommentRequest represents the request payload for creating/updating comments
type CommentRequest struct {
	Content         string `json:"content" validate:"required,min=1,max=1000"`
	ParentCommentID *uint  `json:"parent_comment_id,omitempty"`
}

// CommentResponse represents the response format for comment data
type CommentResponse struct {
	ID                uint                `json:"id"`
	VideoID           uint                `json:"video_id"`
	UserID            uint                `json:"user_id"`
	AuthorDisplayName string              `json:"author_display_name"`
	ParentCommentID   *uint               `json:"parent_comment_id,omitempty"`
	Content           string              `json:"content"`
	CreatedAt         time.Time           `json:"created_at"`
	UpdatedAt         time.Time           `json:"updated_at"`
	Replies           []CommentResponse   `json:"replies,omitempty"`
	ReplyCount        int                 `json:"reply_count"`
}

// PaginatedCommentResponse represents paginated comment list response
type PaginatedCommentResponse struct {
	Comments   []CommentResponse `json:"comments"`
	Total      int64             `json:"total"`
	Page       int               `json:"page"`
	Limit      int               `json:"limit"`
	Pages      int               `json:"pages"`
	VideoID    uint              `json:"video_id"`
}

// CommentUpdateRequest represents the request payload for updating comments
type CommentUpdateRequest struct {
	Content string `json:"content" validate:"required,min=1,max=1000"`
}
