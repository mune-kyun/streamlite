package main

import (
	"log"
	"user-service/database"
	"user-service/handlers"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/swagger"

	_ "user-service/docs" // Import generated docs
)

// @title User Service API
// @version 1.0
// @description User profile management and watch history service for StreamLite
// @host localhost:8002
// @BasePath /
func main() {
	// Initialize database
	database.InitDatabase()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:8081,http://localhost:8082,http://localhost:3000",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "user-service",
			"version": "1.0.0",
		})
	})

	// Swagger documentation
	app.Get("/swagger/*", swagger.HandlerDefault)

	// API routes
	api := app.Group("/api/v1")
	
	// User profile routes
	profiles := api.Group("/profiles")
	profiles.Get("/:userId", handlers.GetProfile)
	profiles.Put("/:userId", handlers.UpdateProfile)
	
	// Watch history routes
	history := api.Group("/watch-history")
	history.Get("/:userId", handlers.GetWatchHistory)
	history.Post("/", handlers.AddWatchHistory)
	history.Put("/:historyId", handlers.UpdateWatchHistory)
	history.Delete("/:historyId", handlers.DeleteWatchHistory)
	
	// User preferences routes
	preferences := api.Group("/preferences")
	preferences.Get("/:userId", handlers.GetPreferences)
	preferences.Put("/:userId", handlers.UpdatePreferences)

	// Playlist routes
	playlists := api.Group("/playlists")
	playlists.Get("/:userId", handlers.GetUserPlaylists)           // Get user's playlists
	playlists.Post("/:userId", handlers.CreatePlaylist)           // Create new playlist
	playlists.Put("/update/:playlistId", handlers.UpdatePlaylist) // Update playlist
	playlists.Delete("/:playlistId", handlers.DeletePlaylist)     // Delete playlist
	
	// Playlist video management routes
	playlists.Get("/:playlistId/videos", handlers.GetPlaylistVideos)        // Get playlist videos
	playlists.Post("/:playlistId/videos", handlers.AddVideoToPlaylist)      // Add video to playlist
	playlists.Delete("/:playlistId/videos/:videoId", handlers.RemoveVideoFromPlaylist) // Remove video from playlist
	playlists.Put("/:playlistId/reorder", handlers.ReorderPlaylistVideos)   // Reorder playlist videos

	// Start server
	log.Println("User Service starting on port 8002...")
	log.Fatal(app.Listen("0.0.0.0:8002"))
}
