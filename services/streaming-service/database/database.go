package database

import (
	"log"
	"streaming-service/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

var DB *gorm.DB

func InitDatabase() {
	var err error
	
	// Connect to SQLite database using pure Go driver
	DB, err = gorm.Open(sqlite.Dialector{
		DriverName: "sqlite",
		DSN:        "streaming.db?_pragma=foreign_keys(1)",
	}, &gorm.Config{})
	
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to streaming database")

	// Auto-migrate the schema
	err = DB.AutoMigrate(
		&models.ProcessingJob{},
		&models.StreamingVariant{},
		&models.PlaybackEvent{},
		&models.BandwidthSample{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("✅ Database connected and migrated successfully")
}
