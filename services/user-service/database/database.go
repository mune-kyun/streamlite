package database

import (
	"log"
	"user-service/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

var DB *gorm.DB

func InitDatabase() {
	var err error
	
	// Connect to SQLite database with pure Go driver (modernc.org/sqlite)
	DB, err = gorm.Open(sqlite.Dialector{
		DriverName: "sqlite",
		DSN:        "user.db?_pragma=foreign_keys(1)",
	}, &gorm.Config{})
	
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")

	// Auto-migrate the schema
	err = DB.AutoMigrate(
		&models.Profile{},
		&models.WatchHistory{},
		&models.UserPreference{},
		&models.Playlist{},
		&models.PlaylistVideo{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed")
}

func GetDB() *gorm.DB {
	return DB
}
