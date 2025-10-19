package main

import (
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Court struct {
	ID        uint    `json:"id" gorm:"primaryKey"`
	Name      string  `json:"name"`
	Sport     string  `json:"sport"`
	Indoor    bool    `json:"indoor"`
	Surface   string  `json:"surface"`
	Images    []Image `json:"images"`
	Slots     []Slot  `json:"-"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
type Image struct {
	ID      uint   `json:"id" gorm:"primaryKey"`
	CourtID uint   `json:"-"`
	URL     string `json:"url"`
}
type Slot struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	CourtID   uint   `json:"courtId" index:"idx_court_date"`
	Date      string `json:"date" index:"idx_court_date"` // YYYY-MM-DD
	StartMin  int    `json:"startMin"`                    // menit dari 00:00, contoh 7*60
	EndMin    int    `json:"endMin"`
	Price     int    `json:"price"`
	Available bool   `json:"available"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Booking struct {
	ID        uint          `json:"id" gorm:"primaryKey"`
	Code      string        `json:"code"`
	Total     int           `json:"total"`
	Status    string        `json:"status"`
	Items     []BookingItem `json:"items"`
	CreatedAt time.Time     `json:"created_at"`
}

type BookingItem struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	BookingID uint   `json:"booking_id"`
	CourtID   uint   `json:"court_id"`
	Date      string `json:"date"` // YYYY-MM-DD
	StartMin  int    `json:"start_min"`
	EndMin    int    `json:"end_min"`
	Price     int    `json:"price"`
}

// biar import midtrans & snap tidak merah (sementara)
func init() {
	_ = midtrans.Sandbox
	_ = snap.Client{}
}

func main() {
	_ = godotenv.Load()
	dsn := os.Getenv("DB_DSN")
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	if err := db.AutoMigrate(&Court{}, &Image{}, &Slot{}, &Booking{}, &BookingItem{}); err != nil {
		log.Fatal(err)
	}

	seedIfEmpty(db)

	app := fiber.New()
	app.Use(cors.New(cors.Config{
		AllowOrigins: strings.Join([]string{
			"https://arkasala.my.id",
			"https://api.arkasala.my.id",
			"http://localhost:3000",
			"https://badmintongo.arkasala.my.id",
		}, ","),
		AllowMethods:  "GET,POST,OPTIONS",
		AllowHeaders:  "Origin, Content-Type, Accept, Authorization",
		ExposeHeaders: "Content-Length",
		// AllowCredentials: true, // aktifkan kalau pakai cookie
	}))

	// health
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})

	// courts list (+images)
	app.Get("/courts", func(c *fiber.Ctx) error {
		var courts []Court
		if err := db.Preload("Images").Find(&courts).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(courts)
	})

	// slots by court + date
	app.Get("/courts/:id/slots", func(c *fiber.Ctx) error {
		id := c.Params("id")
		date := c.Query("date") // YYYY-MM-DD
		var slots []Slot
		q := db.Where("court_id = ?", id)
		if date != "" {
			q = q.Where("date = ?", date)
		}
		if err := q.Order("start_min asc").Find(&slots).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(slots)
	})

	app.Get("/bookings", func(c *fiber.Ctx) error {
		limit := 50
		if v := c.Query("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
				limit = n
			}
		}
		var rows []Booking
		if err := db.Preload("Items").Order("id DESC").Limit(limit).Find(&rows).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(rows)
	})

	// checkout (buat booking sederhana)
	type CheckoutItem struct {
		CourtID  uint   `json:"courtId"`
		Date     string `json:"date"`
		StartMin int    `json:"startMin"`
		EndMin   int    `json:"endMin"`
		Price    int    `json:"price"`
	}
	app.Post("/checkout", func(c *fiber.Ctx) error {
		var payload struct {
			Items []CheckoutItem `json:"items"`
		}
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "bad payload"})
		}
		if len(payload.Items) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "no items"})
		}

		// hitung total
		total := 0
		for _, it := range payload.Items {
			total += it.Price
		}

		booking := Booking{
			Code:   genCode(),
			Total:  total,
			Status: "pending",
		}
		if err := db.Create(&booking).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		items := make([]BookingItem, 0, len(payload.Items))
		for _, it := range payload.Items {
			items = append(items, BookingItem{
				BookingID: booking.ID,
				CourtID:   it.CourtID,
				Date:      it.Date,
				StartMin:  it.StartMin,
				EndMin:    it.EndMin,
				Price:     it.Price,
			})
		}
		if err := db.Create(&items).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		// di dalam handler POST /checkout, setelah hitung total & simpan booking:
		serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
		midtrans.ServerKey = serverKey
		midtrans.Environment = midtrans.Sandbox

		snapClient := snap.Client{}
		snapClient.New(serverKey, midtrans.Sandbox)

		req := &snap.Request{
			TransactionDetails: midtrans.TransactionDetails{
				OrderID:  booking.Code,
				GrossAmt: int64(booking.Total),
			},
			CustomerDetail: &midtrans.CustomerDetails{
				FName: "Pelanggan",
				Email: "pelanggan@example.com",
			},
			Items: &[]midtrans.ItemDetails{
				{ID: "booking", Price: int64(booking.Total), Qty: 1, Name: "Reservasi Lapangan"},
			},
		}

		snapResp, err := snapClient.CreateTransaction(req)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{
			"bookingId": booking.ID,
			"code":      booking.Code,
			"total":     booking.Total,
			"redirect":  snapResp.RedirectURL,
			"token":     snapResp.Token,
		})

	})

	app.Post("/notification", func(c *fiber.Ctx) error {
		var notif struct {
			OrderID           string `json:"order_id"`
			TransactionStatus string `json:"transaction_status"`
			FraudStatus       string `json:"fraud_status"`
		}
		if err := c.BodyParser(&notif); err != nil {
			return c.Status(400).SendString(err.Error())
		}

		// Map status Midtrans → status booking kita
		newStatus := "pending"
		switch notif.TransactionStatus {
		case "settlement":
			newStatus = "paid"
		case "capture":
			// credit card: capture + fraud_status
			if notif.FraudStatus == "accept" {
				newStatus = "paid"
			} else {
				newStatus = "pending" // challenge → anggap pending/review
			}
		case "pending":
			newStatus = "pending"
		case "deny", "cancel", "expire":
			newStatus = "failed"
		default:
			newStatus = "pending"
		}

		// Update ke DB berdasarkan order_id (kode booking)
		if err := db.Model(&Booking{}).
			Where("code = ?", notif.OrderID).
			Update("status", newStatus).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		return c.SendStatus(200)
	})

	log.Println("API running on :" + port)
	log.Fatal(app.Listen("127.0.0.1:" + port))
}

// --- helpers & seed ---
func genCode() string {
	return time.Now().Format("RESV20060102150405")
}

func seedIfEmpty(db *gorm.DB) {
	var n int64
	db.Model(&Court{}).Count(&n)
	if n > 0 {
		return
	}

	c1 := Court{Name: "Lapangan Lor", Sport: "Badminton", Indoor: true, Surface: "Vinyl"}
	c2 := Court{Name: "Lapangan Kidul", Sport: "Badminton", Indoor: true, Surface: "Vinyl"}
	db.Create(&c1)
	db.Create(&c2)

	imgs := []Image{
		{CourtID: c1.ID, URL: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1600&auto=format&fit=crop"},
		{CourtID: c2.ID, URL: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1600&auto=format&fit=crop"},
	}
	db.Create(&imgs)

	// seed slot 7 hari ke depan, 07:00–22:00
	now := time.Now()
	for d := 0; d < 7; d++ {
		day := now.AddDate(0, 0, d).Format("2006-01-02")
		for h := 7; h < 22; h++ {
			db.Create(&Slot{CourtID: c1.ID, Date: day, StartMin: h * 60, EndMin: (h + 1) * 60, Price: 90000, Available: true})
			db.Create(&Slot{CourtID: c2.ID, Date: day, StartMin: h * 60, EndMin: (h + 1) * 60, Price: 90000, Available: true})
		}
	}
}
