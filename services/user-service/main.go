package main

import (
	"log"
	"user-service/database"
	"user-service/handlers"
	"user-service/middleware"

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
	
	// User profile routes - GET is public for service-to-service, PUT is protected
	profiles := api.Group("/profiles")
	profiles.Get("/:userId", handlers.GetProfile) // Public for service-to-service communication
	profiles.Put("/:userId", middleware.JWTMiddleware(), handlers.UpdateProfile) // Protected for user updates
	
	// Watch history routes (protected)
	history := api.Group("/watch-history", middleware.JWTMiddleware())
	history.Get("/:userId", handlers.GetWatchHistory)
	history.Post("/", handlers.AddWatchHistory)
	history.Put("/:historyId", handlers.UpdateWatchHistory)
	history.Delete("/:historyId", handlers.DeleteWatchHistory)
	
	// User preferences routes (protected)
	preferences := api.Group("/preferences", middleware.JWTMiddleware())
	preferences.Get("/:userId", handlers.GetPreferences)
	preferences.Put("/:userId", handlers.UpdatePreferences)

	// Playlist routes (protected)
	playlists := api.Group("/playlists", middleware.JWTMiddleware())
	playlists.Get("/:userId", handlers.GetUserPlaylists)           // Get user's playlists
	playlists.Post("/:userId", handlers.CreatePlaylist)           // Create new playlist
	playlists.Put("/update/:playlistId", handlers.UpdatePlaylist) // Update playlist
	playlists.Delete("/:playlistId", handlers.DeletePlaylist)     // Delete playlist
	
	// Playlist video management routes (protected)
	playlists.Get("/:playlistId/videos", handlers.GetPlaylistVideos)        // Get playlist videos
	playlists.Post("/:playlistId/videos", handlers.AddVideoToPlaylist)      // Add video to playlist
	playlists.Delete("/:playlistId/videos/:videoId", handlers.RemoveVideoFromPlaylist) // Remove video from playlist
	playlists.Put("/:playlistId/reorder", handlers.ReorderPlaylistVideos)   // Reorder playlist videos

	// Subscription routes (protected)
	subscriptions := api.Group("/subscriptions", middleware.JWTMiddleware())
	subscriptions.Post("/", handlers.CreateSubscription)                                    // Subscribe to user
	subscriptions.Delete("/:follower_id/:following_id", handlers.DeleteSubscription)       // Unsubscribe from user
	subscriptions.Get("/user/:user_id", handlers.GetUserSubscriptions)                     // Get user's subscriptions
	subscriptions.Get("/status/:follower_id/:following_id", handlers.CheckSubscriptionStatus) // Check subscription status
	subscriptions.Get("/stats/:user_id", handlers.GetSubscriptionStats)                    // Get subscription stats
	
	// Subscriber routes (protected)
	subscribers := api.Group("/subscribers", middleware.JWTMiddleware())
	subscribers.Get("/user/:user_id", handlers.GetUserSubscribers) // Get user's subscribers

	// Start server
	log.Println("User Service starting on port 8002...")
	log.Fatal(app.Listen("0.0.0.0:8002"))
}
