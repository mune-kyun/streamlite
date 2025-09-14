package models

import (
	"time"

	"gorm.io/gorm"
)

// ProcessingJob represents a video processing job
type ProcessingJob struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	VideoID     uint           `json:"video_id" gorm:"not null;index"`
	Status      string         `json:"status" gorm:"not null;default:'pending'"` // pending, processing, completed, failed
	Progress    float64        `json:"progress" gorm:"default:0"`                // 0-100
	ErrorMsg    string         `json:"error_msg,omitempty"`
	InputPath   string         `json:"input_path" gorm:"not null"`
	OutputPath  string         `json:"output_path"`
	Format      string         `json:"format" gorm:"not null"` // hls, dash
	Qualities   string         `json:"qualities"`              // JSON array of quality levels
	StartedAt   *time.Time     `json:"started_at"`
	CompletedAt *time.Time     `json:"completed_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// StreamingVariant represents different quality variants of a video
type StreamingVariant struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	VideoID    uint           `json:"video_id" gorm:"not null;index"`
	JobID      uint           `json:"job_id" gorm:"not null"`
	Quality    string         `json:"quality" gorm:"not null"`    // 480p, 720p, 1080p
	Resolution string         `json:"resolution" gorm:"not null"` // 854x480, 1280x720, 1920x1080
	Bitrate    int            `json:"bitrate" gorm:"not null"`    // kbps
	Framerate  float64        `json:"framerate" gorm:"not null"`  // fps
	Codec      string         `json:"codec" gorm:"not null"`      // h264, h265
	Format     string         `json:"format" gorm:"not null"`     // hls, dash
	ManifestPath string       `json:"manifest_path"`              // path to .m3u8 or .mpd file
	SegmentPath  string       `json:"segment_path"`               // base path for segments
	Duration     float64      `json:"duration"`                   // seconds
	FileSize     int64        `json:"file_size"`                  // bytes
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// PlaybackEvent represents streaming analytics events
type PlaybackEvent struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	VideoID       uint      `json:"video_id" gorm:"not null;index"`
	UserID        uint      `json:"user_id" gorm:"index"`
	SessionID     string    `json:"session_id" gorm:"not null;index"`
	EventType     string    `json:"event_type" gorm:"not null"` // play, pause, seek, quality_change, buffer, error
	Quality       string    `json:"quality"`                    // current quality level
	Position      float64   `json:"position"`                   // playback position in seconds
	BufferHealth  float64   `json:"buffer_health"`              // buffer level in seconds
	Bandwidth     int       `json:"bandwidth"`                  // estimated bandwidth in kbps
	UserAgent     string    `json:"user_agent"`
	IPAddress     string    `json:"ip_address"`
	Platform      string    `json:"platform"`     // ios, android, web
	NetworkType   string    `json:"network_type"` // wifi, cellular, ethernet
	EventData     string    `json:"event_data"`   // JSON for additional event-specific data
	Timestamp     time.Time `json:"timestamp" gorm:"not null;index"`
	CreatedAt     time.Time `json:"created_at"`
}

// BandwidthSample represents bandwidth measurement data
type BandwidthSample struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	SessionID   string    `json:"session_id" gorm:"not null;index"`
	VideoID     uint      `json:"video_id" gorm:"not null;index"`
	UserID      uint      `json:"user_id" gorm:"index"`
	Bandwidth   int       `json:"bandwidth" gorm:"not null"`   // measured bandwidth in kbps
	Latency     int       `json:"latency"`                     // network latency in ms
	PacketLoss  float64   `json:"packet_loss"`                 // packet loss percentage
	Quality     string    `json:"quality"`                     // quality level during measurement
	NetworkType string    `json:"network_type"`                // wifi, cellular, ethernet
	Platform    string    `json:"platform"`                    // ios, android, web
	Timestamp   time.Time `json:"timestamp" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at"`
}

// Request/Response models

type ProcessVideoRequest struct {
	VideoID    uint     `json:"video_id" validate:"required"`
	InputPath  string   `json:"input_path" validate:"required"`
	Format     string   `json:"format" validate:"required,oneof=hls dash"`
	Qualities  []string `json:"qualities" validate:"required,min=1"`
	Priority   int      `json:"priority" validate:"min=1,max=10"`
}

type ProcessVideoResponse struct {
	JobID     uint   `json:"job_id"`
	Status    string `json:"status"`
	Message   string `json:"message"`
	EstimatedTime int `json:"estimated_time_minutes"`
}

type ProcessingStatusResponse struct {
	Job       ProcessingJob      `json:"job"`
	Variants  []StreamingVariant `json:"variants,omitempty"`
	Message   string             `json:"message"`
}

type QualityInfo struct {
	Quality    string  `json:"quality"`
	Resolution string  `json:"resolution"`
	Bitrate    int     `json:"bitrate"`
	Available  bool    `json:"available"`
	ManifestURL string `json:"manifest_url,omitempty"`
}

type AvailableQualitiesResponse struct {
	VideoID   uint          `json:"video_id"`
	Format    string        `json:"format"`
	Qualities []QualityInfo `json:"qualities"`
	DefaultQuality string   `json:"default_quality"`
}

type PlaybackEventRequest struct {
	VideoID      uint    `json:"video_id" validate:"required"`
	UserID       uint    `json:"user_id"`
	SessionID    string  `json:"session_id" validate:"required"`
	EventType    string  `json:"event_type" validate:"required"`
	Quality      string  `json:"quality"`
	Position     float64 `json:"position"`
	BufferHealth float64 `json:"buffer_health"`
	Bandwidth    int     `json:"bandwidth"`
	Platform     string  `json:"platform"`
	NetworkType  string  `json:"network_type"`
	EventData    string  `json:"event_data"`
}

type StreamingStatsResponse struct {
	VideoID        uint                   `json:"video_id"`
	TotalViews     int64                  `json:"total_views"`
	TotalDuration  float64                `json:"total_watch_time_hours"`
	AvgBandwidth   float64                `json:"avg_bandwidth_kbps"`
	QualityDistribution map[string]int64  `json:"quality_distribution"`
	PlatformStats  map[string]int64       `json:"platform_stats"`
	NetworkStats   map[string]int64       `json:"network_stats"`
	BufferEvents   int64                  `json:"buffer_events"`
	ErrorEvents    int64                  `json:"error_events"`
	Period         string                 `json:"period"`
}

type BandwidthStatsResponse struct {
	AvgBandwidth    float64            `json:"avg_bandwidth_kbps"`
	MedianBandwidth float64            `json:"median_bandwidth_kbps"`
	P95Bandwidth    float64            `json:"p95_bandwidth_kbps"`
	P99Bandwidth    float64            `json:"p99_bandwidth_kbps"`
	NetworkBreakdown map[string]float64 `json:"network_breakdown"`
	PlatformBreakdown map[string]float64 `json:"platform_breakdown"`
	SampleCount     int64              `json:"sample_count"`
	Period          string             `json:"period"`
}
