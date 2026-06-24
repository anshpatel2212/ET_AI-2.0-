#!/usr/bin/env python3
"""Fetch real-time AQI data from WAQI API for Ahmedabad stations."""

import os
import json
import httpx
from datetime import datetime
from pathlib import Path

WAQI_TOKEN = os.getenv("WAQI_TOKEN", "")
AHMEDABAD_LAT, AHMEDABAD_LON = 23.0225, 72.5714

async def fetch_waqi_feed(lat=AHMEDABAD_LAT, lon=AHMEDABAD_LON, token=WAQI_TOKEN):
    """Fetch AQI feed for a geo location."""
    if not token:
        print("WAQI_TOKEN not set, using mock data")
        return mock_waqi_data()
    url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={token}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()

def mock_waqi_data():
    """Return realistic mock data when API key is unavailable."""
    return {
        "status": "ok",
        "data": {
            "aqi": 156,
            "idx": 12345,
            "city": {"name": "Ahmedabad", "geo": [23.0225, 72.5714]},
            "iaqi": {
                "pm25": {"v": 85.3},
                "pm10": {"v": 142.1},
                "no2": {"v": 34.2},
                "so2": {"v": 12.5},
                "co": {"v": 1.82},
                "o3": {"v": 28.7},
                "t": {"v": 34.2},
                "h": {"v": 62.1},
                "w": {"v": 4.2},
                "p": {"v": 1011.2},
            },
            "time": {"s": datetime.now().isoformat(), "tz": "+05:30"}
        }
    }

async def main():
    data = await fetch_waqi_feed()
    output_dir = Path(__file__).parent / "fetched_data"
    output_dir.mkdir(exist_ok=True)
    with open(output_dir / f"waqi_{datetime.now().strftime('%Y%m%d_%H%M')}.json", "w") as f:
        json.dump(data, f, indent=2)
    print(f"WAQI data saved. AQI: {data.get('data', {}).get('aqi', 'N/A')}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())