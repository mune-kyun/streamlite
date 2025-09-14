package models

import (
	"time"

	"gorm.io/gorm"
)

// SearchQuery represents a search query for analytics
type SearchQuery struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	Query        string         `json:"query" gorm:"not null"`
	SearchCount  int            `json:"search_count" gorm:"default:1"`
	LastSearched time.Time      `json:"last_searched" gorm:"default:CURRENT_TIMESTAMP"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName overrides the table name for SearchQuery
func (SearchQuery) TableName() string {
	return "search_queries"
}
