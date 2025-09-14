package database

import (
	"log"

	"auth-service/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	_ "modernc.org/sqlite"
)

var DB *gorm.DB

func Connect() {
	var err error
	
	// Connect to SQLite database with pure Go driver (modernc.org/sqlite)
	DB, err = gorm.Open(sqlite.Dialector{
		DriverName: "sqlite",
		DSN:        "auth.db?_pragma=foreign_keys(1)",
	}, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")

	// Auto-migrate the schema
	err = DB.AutoMigrate(&models.User{}, &models.RefreshToken{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migration completed")
}

func GetDB() *gorm.DB {
	return DB
}
