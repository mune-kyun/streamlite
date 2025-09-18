package models

import (
	"time"

	"gorm.io/gorm"
)

// Profile represents a user profile
type Profile struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	UserID      uint           `json:"user_id" gorm:"uniqueIndex;not null"`
	DisplayName string         `json:"display_name" gorm:"size:100"`
	Avatar      string         `json:"avatar" gorm:"size:255"`
	Bio         string         `json:"bio" gorm:"size:500"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// WatchHistory represents a user's video watch history
type WatchHistory struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	VideoID   uint           `json:"video_id" gorm:"not null"`
	Progress  float64        `json:"progress" gorm:"default:0"` // Progress in seconds
	Duration  float64        `json:"duration" gorm:"default:0"` // Total video duration
	Completed bool           `json:"completed" gorm:"default:false"`
	WatchedAt time.Time      `json:"watched_at"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// UserPreference represents user settings and preferences
type UserPreference struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	UserID    uint           `json:"user_id" gorm:"not null;index"`
	Key       string         `json:"key" gorm:"size:100;not null"`
	Value     string         `json:"value" gorm:"size:500"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName overrides the table name for Profile
func (Profile) TableName() string {
	return "profiles"
}

// TableName overrides the table name for WatchHistory
func (WatchHistory) TableName() string {
	return "watch_history"
}

// TableName overrides the table name for UserPreference
func (UserPreference) TableName() string {
	return "user_preferences"
}

// CreateProfileRequest represents the request body for creating a profile
type CreateProfileRequest struct {
	UserID      uint   `json:"user_id" validate:"required"`
	DisplayName string `json:"display_name" validate:"required,min=2,max=100"`
	Avatar      string `json:"avatar"`
	Bio         string `json:"bio" validate:"max=500"`
}

// UpdateProfileRequest represents the request body for updating a profile
type UpdateProfileRequest struct {
	DisplayName string `json:"display_name" validate:"min=2,max=100"`
	Avatar      string `json:"avatar"`
	Bio         string `json:"bio" validate:"max=500"`
}

// CreateWatchHistoryRequest represents the request body for adding watch history
type CreateWatchHistoryRequest struct {
	UserID   uint    `json:"user_id" validate:"required"`
	VideoID  uint    `json:"video_id" validate:"required"`
	Progress float64 `json:"progress" validate:"min=0"`
	Duration float64 `json:"duration" validate:"min=0"`
}

// UpdateWatchHistoryRequest represents the request body for updating watch history
type UpdateWatchHistoryRequest struct {
	Progress  float64 `json:"progress" validate:"min=0"`
	Duration  float64 `json:"duration" validate:"min=0"`
	Completed bool    `json:"completed"`
}

// UserPreferenceRequest represents the request body for user preferences
type UserPreferenceRequest struct {
	Key   string `json:"key" validate:"required,min=1,max=100"`
	Value string `json:"value" validate:"max=500"`
}

// UserPreferencesRequest represents multiple preferences update
type UserPreferencesRequest struct {
	Preferences []UserPreferenceRequest `json:"preferences" validate:"required,dive"`
}

// Subscription represents a user subscription/following relationship
type Subscription struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	FollowerID  uint           `json:"follower_id" gorm:"not null;index"`
	FollowingID uint           `json:"following_id" gorm:"not null;index"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName overrides the table name for Subscription
func (Subscription) TableName() string {
	return "subscriptions"
}

// CreateSubscriptionRequest represents the request body for creating a subscription
type CreateSubscriptionRequest struct {
	FollowerID  uint `json:"follower_id" validate:"required"`
	FollowingID uint `json:"following_id" validate:"required"`
}

// SubscriptionResponse represents subscription data with user information
type SubscriptionResponse struct {
	ID          uint      `json:"id"`
	FollowerID  uint      `json:"follower_id"`
	FollowingID uint      `json:"following_id"`
	DisplayName string    `json:"display_name"`
	Avatar      string    `json:"avatar"`
	CreatedAt   time.Time `json:"created_at"`
}

// SubscriptionStatsResponse represents subscription statistics
type SubscriptionStatsResponse struct {
	SubscriberCount   int `json:"subscriber_count"`
	SubscriptionCount int `json:"subscription_count"`
}
