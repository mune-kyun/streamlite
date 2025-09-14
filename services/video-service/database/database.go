package database

import (
	"log"
	"video-service/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

var DB *gorm.DB

// Connect initializes the database connection
func Connect() {
	var err error
	
	// Connect to SQLite database
	DB, err = gorm.Open(sqlite.Dialector{
		DriverName: "sqlite",
		DSN:        "video.db?_pragma=foreign_keys(1)",
	}, &gorm.Config{})
	
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to video database")

	// Auto-migrate the schema
	err = DB.AutoMigrate(
		&models.Category{},
		&models.Video{},
		&models.VideoMetadata{},
		&models.Comment{},
		&models.SearchQuery{},
	)
	
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed")

	// Create default categories
	createDefaultCategories()
}

// createDefaultCategories creates some default video categories
func createDefaultCategories() {
	defaultCategories := []models.Category{
		{Name: "Entertainment", Description: "Entertainment and fun videos"},
		{Name: "Education", Description: "Educational and learning content"},
		{Name: "Music", Description: "Music videos and audio content"},
		{Name: "Sports", Description: "Sports and fitness videos"},
		{Name: "Technology", Description: "Tech reviews and tutorials"},
		{Name: "Gaming", Description: "Gaming content and walkthroughs"},
		{Name: "News", Description: "News and current events"},
		{Name: "Documentary", Description: "Documentary and informational content"},
	}

	for _, category := range defaultCategories {
		var existingCategory models.Category
		result := DB.Where("name = ?", category.Name).First(&existingCategory)
		if result.Error != nil {
			// Category doesn't exist, create it
			if err := DB.Create(&category).Error; err != nil {
				log.Printf("Failed to create category %s: %v", category.Name, err)
			} else {
				log.Printf("Created default category: %s", category.Name)
			}
		}
	}
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
