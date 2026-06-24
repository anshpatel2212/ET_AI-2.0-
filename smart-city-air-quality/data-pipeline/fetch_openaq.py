#!/usr/bin/env python3
"""Fetch air quality measurements from OpenAQ API."""

import os
import json
import httpx
from datetime import datetime
from pathlib import Path

OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY", "")

async def fetch_openaq_latest(country="IN", limit=100):
    """Fetch latest measurements from OpenAQ."""
    headers = {"X-API-Key": OPENAQ_API_KEY} if OPENAQ_API_KEY else {}
    url = f"https://api.openaq.org/v2/latest?country={country}&limit={limit}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()

async def main():
    data = await fetch_openaq_latest()
    output_dir = Path(__file__).parent / "fetched_data"
    output_dir.mkdir(exist_ok=True)
    results = data.get("results", [])
    ahmedabad = [r for r in results if "ahmedabad" in r.get("city", "").lower()]
    with open(output_dir / f"openaq_{datetime.now().strftime('%Y%m%d_%H%M')}.json", "w") as f:
        json.dump(ahmedabad[:20] if ahmedabad else results[:20], f, indent=2)
    print(f"OpenAQ: {len(ahmedabad)} Ahmedabad stations found out of {len(results)} total")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())