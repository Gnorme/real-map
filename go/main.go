package main

import (
	//"bufio"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	//"os"
	//"reflect"
	//"regexp"
	"strings"

	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"
	"goji.io"
	"goji.io/pat"
	"gopkg.in/guregu/null.v3/zero"
	//"gopkg.in/mgo.v2"
	//"gopkg.in/mgo.v2/bson"
)

type markers struct {
	Location string `json:"location"`
	Address  string `json:"address"`
	Lot      string `json:"lot"`
	Value    int    `json:"value"`
}

type details struct {
	History          []year      `json:"history"`
	BuildingValue    zero.Int    `json:"building_value"`
	LandValue        zero.Int    `json:"land_value"`
	Owner            zero.String `json:"owner"`
	LandArea         zero.String `json:"land_area"`
	FloorArea        zero.String `json:"floor_area"`
	ConstructionYear zero.String `json:"year_constructed"`
	PhysicalLink     zero.String `json:"physical_link"`
}

/*type details struct {
	History          []year `json:"history"`
	BuildingValue    int    `json:"building_value"`
	LandValue        int    `json:"land_value"`
	Owner            string `json:"owner"`
	LandArea         string `json:"land_area"`
	FloorArea        string `json:"floor_area"`
	ConstructionYear string `json:"construction_year"`
	PhysicalLink     string `json:"physical_link"`
}*/

type year struct {
	Value int    `json:"value"`
	Year  int    `json:"year"`
	Owner string `json:"owner"`
}

type location struct {
	Location []float64 `json:"loc"`
	Title    string    `json:"title"`
}

func ErrorWithJSON(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	fmt.Fprintf(w, "{message: %q}", message)
}

func ResponseWithJSON(w http.ResponseWriter, json []byte, code int) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	w.Write(json)
}

const (
	DB_USER     = "xxxx"
	DB_PASSWORD = "xxxx"
	DB_NAME     = "Addresses"
	DB_HOST     = "xxxx"
	DB_PORT     = 5432
)

func main() {
	//dbinfo := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%d sslmode=disable",
	//	DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT)
	//db, err := sql.Open("postgres", dbinfo)
	db, err := sql.Open("sqlite3", "./Data.db")

	checkErr(err)
	defer db.Close()

	mux := goji.NewMux()
	mux.HandleFunc(pat.Post("/getMarkers"), getMarkers(db))
	mux.HandleFunc(pat.Post("/getDetails"), getDetails(db))
	mux.HandleFunc(pat.Get("/searchLoc"), searchLoc(db))
	http.ListenAndServe("localhost:7005", mux)
}
func searchLoc(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		fmt.Println(r.FormValue("q"))
		var locString string
		type match struct {
			Loc   []float64 `json:"loc"`
			Title string    `json:"title"`
		}
		var matches []match
		//var matches []location
		//rows, err := db.Query("SELECT array_to_json(regexp_split_to_array(location,',')), address FROM Present WHERE address like $1", "%%"+r.FormValue("q")+"%%")
		rows, err := db.Query("SELECT location, address FROM Newest_Present WHERE address like ?", "%%"+r.FormValue("q")+"%%")
		for rows.Next() {
			var loc match
			var tmpLoc [2]string
			rows.Scan(&locString, &loc.Title)
			json.Unmarshal([]byte(locString), &tmpLoc)
			test := strings.Split(tmpLoc[0], " ")
			for _, t := range test {
				val, _ := strconv.ParseFloat(t, 64)
				loc.Loc = append(loc.Loc, val)
				//loc.Loc[a] = strconv.ParseFloat(t, 64)
			}
			matches = append(matches, loc)
		}
		//test := match{Loc: []float64{45.492080, -73.668867}, Title: "163 Sussex"}
		//matches = append(matches, test)

		//checkErr(err)
		respBody, err := json.MarshalIndent(matches, "", "  ")
		if err != nil {
			log.Fatal(err)
		}
		ResponseWithJSON(w, respBody, http.StatusOK)
	}
}
func getDetails(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		var years []year
		var data details
		//query := fmt.Sprintf("SELECT value, year, owner FROM History WHERE lot_number = '%s'", r.FormValue("lot"))
		//fmt.Println(query)

		//query, err := db.Prepare("SELECT value, year, owner FROM History WHERE lot_number = ?")
		//rows, err := query.Exec(r.FormValue("lot"))
		//rows, err := db.Query("SELECT value, year, owner FROM Previous WHERE lot_number ='1054552'")
		rows, err := db.Query("SELECT value, year, owner FROM Previous WHERE lot_number = ?", r.FormValue("lot"))
		//rows, err := db.Query("SELECT value, year, owner FROM History WHERE lot_number = ? and value is not null and year is not null and owner is not null", r.FormValue("lot"))
		//rows, err := db.Query("SELECT value, year, owner from Previous WHERE lot_number = ?")
		for rows.Next() {
			var y year
			rows.Scan(&y.Value, &y.Year, &y.Owner)
			years = append(years, y)
		}
		data.History = years
		rows, err = db.Query("SELECT building_value, land_value, name, land_area, floor_area, construction_year, physical_link FROM Newest_Present WHERE lot_number = ?", r.FormValue("lot"))
		//rows, err = db.Query("SELECT building_value, land_value, name, land_area, floor_area, construction_year, physical_link FROM Present WHERE lot_number = ? and physical_link is not null", r.FormValue("lot"))
		for rows.Next() {
			rows.Scan(&data.BuildingValue, &data.LandValue, &data.Owner, &data.LandArea, &data.FloorArea, &data.ConstructionYear, &data.PhysicalLink)
		}
		checkErr(err)
		respBody, err := json.MarshalIndent(data, "", "  ")
		if err != nil {
			log.Fatal(err)
		}
		ResponseWithJSON(w, respBody, http.StatusOK)
	}
}

func getMarkers(db *sql.DB) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		var data []markers
		minX, _ := strconv.ParseFloat(r.FormValue("minX"), 64)
		minY, _ := strconv.ParseFloat(r.FormValue("minY"), 64)
		maxX, _ := strconv.ParseFloat(r.FormValue("maxX"), 64)
		maxY, _ := strconv.ParseFloat(r.FormValue("maxY"), 64)
		//fmt.Println(query)
		//query := fmt.Sprintf("SELECT battletag FROM QuickMatch WHERE battletag like '%s%%' and games > 10 LIMIT 10", r.FormValue("query"))
		//query := fmt.Sprintf("SELECT address, property_value, lot_number, bounding_box FROM Present WHERE geo @ ST_MakeEnvelope (?,?,?,?, 4326) and bounding_box is not null and property_value is not null and lot_number is not null", minX, minY, maxX, maxY)

		//fmt.Println(query)
		//rows, err := db.Query("SELECT address, property_value, lot_number, bounding_box FROM Present WHERE geo @ ST_MakeEnvelope ($1,$2,$3,$4, 4326) and bounding_box is not null and property_value is not null and lot_number is not null", minX, minY, maxX, maxY)
		rows, err := db.Query("SELECT address, property_value, lot_number, bounding_box FROM Present WHERE geo @ ST_MakeEnvelope (?,?,?,?, 4326) and bounding_box is not null and property_value is not null and lot_number is not null", minX, minY, maxX, maxY)
		for rows.Next() {
			var loc markers
			rows.Scan(&loc.Address, &loc.Value, &loc.Lot, &loc.Location)
			data = append(data, loc)
		}
		checkErr(err)
		//	var battletag string
		//	err = rows.Scan(&battletag)
		//	test.Suggestion = append(test.Suggestion, battletag)
		//}
		respBody, err := json.MarshalIndent(data, "", "  ")
		if err != nil {
			log.Fatal(err)
		}
		ResponseWithJSON(w, respBody, http.StatusOK)
	}
}
func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}
