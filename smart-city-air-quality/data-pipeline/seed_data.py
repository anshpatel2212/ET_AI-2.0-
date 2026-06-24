#!/usr/bin/env python3
"""
Seed data generator for Smart City AQI Platform.
Generates realistic Ahmedabad air quality data for 10 stations over 30 days.
"""

import json
import random
import math
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

STATIONS = [
    {"stationId": "AHM-001", "stationName": "Ahmedabad Maninagar", "lat": 23.0225, "lon": 72.5714, "ward": "Maninagar", "type": "CPCB"},
    {"stationId": "AHM-002", "stationName": "Ahmedabad Naroda", "lat": 23.0714, "lon": 72.6578, "ward": "Naroda", "type": "CPCB"},
    {"stationId": "AHM-003", "stationName": "Ahmedabad SG Highway", "lat": 23.0522, "lon": 72.5321, "ward": "SG Highway", "type": "GSPCB"},
    {"stationId": "AHM-004", "stationName": "Ahmedabad Bodakdev", "lat": 23.0365, "lon": 72.5072, "ward": "Bodakdev", "type": "GSPCB"},
    {"stationId": "AHM-005", "stationName": "Ahmedabad Bapunagar", "lat": 23.0431, "lon": 72.6012, "ward": "Bapunagar", "type": "CPCB"},
    {"stationId": "AHM-006", "stationName": "Ahmedabad Paldi", "lat": 23.0115, "lon": 72.5743, "ward": "Paldi", "type": "GSPCB"},
    {"stationId": "AHM-007", "stationName": "Ahmedabad Sabarmati", "lat": 23.0689, "lon": 72.5872, "ward": "Sabarmati", "type": "CPCB"},
    {"stationId": "AHM-008", "stationName": "Ahmedabad Vastrapur", "lat": 23.0395, "lon": 72.5262, "ward": "Vastrapur", "type": "GSPCB"},
    {"stationId": "AHM-009", "stationName": "Ahmedabad Gota", "lat": 23.1012, "lon": 72.5415, "ward": "Gota", "type": "Low-cost-IoT"},
    {"stationId": "AHM-010", "stationName": "Ahmedabad Bopal", "lat": 23.0123, "lon": 72.4698, "ward": "Bopal", "type": "GSPCB"},
]

POLLUTANT_BASELINES = {
    "pm25": {"mean": 65, "std": 25, "min": 20, "max": 250},
    "pm10": {"mean": 140, "std": 50, "min": 50, "max": 450},
    "no2": {"mean": 30, "std": 12, "min": 8, "max": 80},
    "so2": {"mean": 12, "std": 5, "min": 3, "max": 40},
    "co": {"mean": 1.5, "std": 0.6, "min": 0.3, "max": 5.0},
    "o3": {"mean": 35, "std": 15, "min": 10, "max": 90},
    "nh3": {"mean": 18, "std": 8, "min": 5, "max": 50},
    "nox": {"mean": 42, "std": 18, "min": 12, "max": 120},
}

def aqi_from_pm25(pm25):
    """Compute AQI from PM2.5 using CPCB breakpoints."""
    if pm25 <= 30: return (50/30) * pm25
    if pm25 <= 60: return 50 + (50/30) * (pm25 - 30)
    if pm25 <= 90: return 100 + (50/30) * (pm25 - 60)
    if pm25 <= 120: return 150 + (50/30) * (pm25 - 90)
    if pm25 <= 250: return 200 + (100/130) * (pm25 - 120)
    return 300 + (200/250) * (pm25 - 250)

def aqi_category(aqi):
    if aqi <= 50: return "Good"
    if aqi <= 100: return "Satisfactory"
    if aqi <= 150: return "Moderate"
    if aqi <= 200: return "Poor"
    if aqi <= 300: return "Severe"
    return "Hazardous"

def generate_reading(station, timestamp):
    """Generate a realistic AQI reading for a station at a given time."""
    hour = timestamp.hour
    is_rush_hour = (7 <= hour <= 10) or (17 <= hour <= 21)
    is_night = hour < 5 or hour > 23
    is_weekend = timestamp.weekday() >= 5
    is_winter = timestamp.month in [11, 12, 1, 2]

    result = {
        "timestamp": timestamp.isoformat(),
        "stationMeta": {
            "stationId": station["stationId"],
            "city": "Ahmedabad",
            "location": {"type": "Point", "coordinates": [station["lon"], station["lat"]]}
        },
        "temperature": round(random.gauss(32, 6), 1),
        "humidity": round(random.gauss(55, 15), 1),
        "windSpeed": round(random.gauss(3.5, 1.5), 1),
        "windDirection": random.randint(0, 359),
        "pressure": round(random.gauss(1012, 5), 1),
        "rainfall": round(max(0, random.gauss(0.5, 1.5)), 1),
        "source": random.choices(["waqi", "cpcb", "sensor"], weights=[0.4, 0.4, 0.2])[0],
        "confidence": round(random.uniform(0.85, 0.99), 2),
    }

    for pollutant, config in POLLUTANT_BASELINES.items():
        base = config["mean"]
        if is_rush_hour and pollutant in ["pm25", "pm10", "no2", "nox", "co"]:
            base *= 1.4
        if is_night:
            base *= 0.7
        if is_weekend:
            base *= 0.85
        if is_winter:
            base *= 1.3
        value = random.gauss(base, config["std"])
        value = max(config["min"], min(config["max"], value))
        result[pollutant] = round(value, 1 if pollutant != "co" else 2)

    aqi_val = aqi_from_pm25(result["pm25"])
    result["aqi"] = round(aqi_val, 1)
    result["aqiCategory"] = aqi_category(aqi_val)
    result["primaryPollutant"] = random.choices(
        ["PM2.5", "PM10", "NO2", "O3"], weights=[0.5, 0.3, 0.15, 0.05]
    )[0]
    result["healthAdvice"] = "Limit outdoor activities" if aqi_val > 150 else "Air quality is acceptable"

    return result

def main():
    output_dir = Path(__file__).parent / "seed_data"
    output_dir.mkdir(exist_ok=True)
    
    # Generate 30 days of hourly data
    start = datetime(2025, 1, 1, 0, 0)
    end = start + timedelta(days=30)
    current = start
    
    readings = []
    while current < end:
        for station in STATIONS:
            readings.append(generate_reading(station, current))
        current += timedelta(hours=1)
    
    # Save readings (sample every 10th for file size, full data for actual seed)
    sample = readings[::10]
    with open(output_dir / "readings_sample.json", "w") as f:
        json.dump(sample, f, indent=2)
    
    # Save station metadata
    with open(output_dir / "stations.json", "w") as f:
        json.dump(STATIONS, f, indent=2)
    
    print(f"Generated {len(readings)} readings ({len(sample)} sampled) from {start.date()} to {end.date()}")
    print(f"Stations: {len(STATIONS)}")
    print("Seed data written to seed_data/")

if __name__ == "__main__":
    main()