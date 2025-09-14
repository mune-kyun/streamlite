package main

import (
	"log"
	"streaming-service/database"
	"streaming-service/handlers"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/swagger"

	_ "streaming-service/docs"
)

// @title StreamLite Streaming Service API
// @version 1.0
// @description Adaptive video streaming service with HLS/DASH support
// @host localhost:8004
// @BasePath /
func main() {
	// Initialize database
	database.InitDatabase()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		BodyLimit: 500 * 1024 * 1024, // 500MB for video uploads
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization,X-Requested-With",
	}))

	// Swagger documentation
	app.Get("/swagger/*", swagger.HandlerDefault)

	// API routes
	api := app.Group("/api/v1")

	// Streaming routes
	streaming := api.Group("/streaming")
	streaming.Post("/process", handlers.ProcessVideo)
	streaming.Get("/status/:job_id", handlers.GetProcessingStatus)
	streaming.Get("/manifest/:video_id/:format", handlers.GetManifest)
	streaming.Get("/segment/:video_id/:quality/:segment", handlers.GetSegment)
	streaming.Get("/qualities/:video_id", handlers.GetAvailableQualities)

	// Analytics routes
	analytics := api.Group("/analytics")
	analytics.Post("/playback", handlers.RecordPlaybackEvent)
	analytics.Get("/stats/:video_id", handlers.GetStreamingStats)
	analytics.Get("/bandwidth", handlers.GetBandwidthStats)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "streaming-service",
			"version": "1.0.0",
		})
	})

	// Start server
	log.Println("🚀 Streaming Service starting on port 8004...")
	log.Fatal(app.Listen(":8004"))
}
