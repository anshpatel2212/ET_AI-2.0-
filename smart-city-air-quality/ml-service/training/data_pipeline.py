import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler
from loguru import logger

AHMEDABAD_STATIONS = {
    "station_001": {"lat": 23.0225, "lon": 72.5714, "zone": "central"},
    "station_002": {"lat": 23.0333, "lon": 72.6167, "zone": "east"},
    "station_003": {"lat": 23.0100, "lon": 72.5300, "zone": "west"},
    "station_004": {"lat": 23.0500, "lon": 72.6300, "zone": "north"},
    "station_005": {"lat": 23.0000, "lon": 72.5000, "zone": "south"},
}


def generate_synthetic_air_quality_data(
    days: int = 90, freq_hours: int = 1
) -> pd.DataFrame:
    logger.info(f"Generating {days} days of synthetic Ahmedabad air quality data")
    now = datetime.utcnow()
    times = pd.date_range(
        end=now, periods=days * 24 // freq_hours, freq=f"{freq_hours}h"
    )

    rows = []
    for station_id, meta in AHMEDABAD_STATIONS.items():
        base_pm25 = np.random.uniform(60, 120)
        base_pm10 = base_pm25 * np.random.uniform(1.8, 2.5)
        base_no2 = np.random.uniform(20, 60)
        base_o3 = np.random.uniform(15, 50)
        base_co = np.random.uniform(0.5, 2.0)
        base_so2 = np.random.uniform(5, 20)
        base_nh3 = np.random.uniform(10, 40)
        base_temperature = np.random.uniform(25, 35)
        base_humidity = np.random.uniform(40, 80)
        base_wind_speed = np.random.uniform(2, 12)
        base_wind_direction = np.random.uniform(0, 360)

        for t in times:
            hour = t.hour
            day_of_week = t.dayofweek
            is_weekend = 1 if day_of_week >= 5 else 0
            hour_sin = np.sin(2 * np.pi * hour / 24)
            hour_cos = np.cos(2 * np.pi * hour / 24)

            # Diurnal pattern: higher at night/morning, lower in afternoon
            diurnal = 1 + 0.3 * (
                0.5 * np.sin(2 * np.pi * (hour - 2) / 24)
                + 0.3 * np.cos(2 * np.pi * (hour - 12) / 24)
            )
            weekend_effect = 0.85 if is_weekend else 1.0
            noise = np.random.normal(0, 0.08)

            pm25 = base_pm25 * diurnal * weekend_effect * (1 + noise)
            pm25 = np.clip(pm25, 20, 350)

            pm10 = base_pm10 * diurnal * weekend_effect * (1 + np.random.normal(0, 0.1))
            pm10 = np.clip(pm10, 40, 500)

            no2 = base_no2 * diurnal * weekend_effect * (1 + np.random.normal(0, 0.12))
            no2 = np.clip(no2, 5, 150)

            o3 = base_o3 * (1 + 0.2 * np.sin(2 * np.pi * (hour - 12) / 24)) * (
                1 + np.random.normal(0, 0.15)
            )
            o3 = np.clip(o3, 5, 120)

            co = base_co * diurnal * weekend_effect * (1 + np.random.normal(0, 0.1))
            co = np.clip(co, 0.1, 5.0)

            so2 = base_so2 * (1 + np.random.normal(0, 0.15))
            so2 = np.clip(so2, 1, 50)

            nh3 = base_nh3 * (1 + np.random.normal(0, 0.12))
            nh3 = np.clip(nh3, 5, 80)

            temp = base_temperature + 5 * np.sin(2 * np.pi * (hour - 14) / 24) + np.random.normal(0, 1)
            humidity = base_humidity - 15 * np.sin(2 * np.pi * (hour - 14) / 24) + np.random.normal(0, 5)
            wind_speed = np.abs(base_wind_speed + np.random.normal(0, 2))
            wind_dir = (base_wind_direction + np.random.normal(0, 20)) % 360

            # Pollutant correlations
            if np.random.random() < 0.05:
                pm25 *= np.random.uniform(1.5, 3.0)
                pm10 *= np.random.uniform(1.3, 2.5)

            traffic_proxy = max(0, 1 - 0.5 * np.abs(hour - 9) / 12) if 6 <= hour <= 22 else 0.1
            traffic_proxy += np.random.uniform(0, 0.2)

            rows.append(
                {
                    "timestamp": t,
                    "station_id": station_id,
                    "lat": meta["lat"],
                    "lon": meta["lon"],
                    "pm25": round(pm25, 2),
                    "pm10": round(pm10, 2),
                    "no2": round(no2, 2),
                    "o3": round(o3, 2),
                    "co": round(co, 3),
                    "so2": round(so2, 2),
                    "nh3": round(nh3, 2),
                    "temperature": round(temp, 2),
                    "humidity": round(humidity, 2),
                    "wind_speed": round(wind_speed, 2),
                    "wind_direction": round(wind_dir, 2),
                    "traffic_proxy": round(traffic_proxy, 3),
                    "hour": hour,
                    "day_of_week": day_of_week,
                    "is_weekend": is_weekend,
                    "hour_sin": round(hour_sin, 4),
                    "hour_cos": round(hour_cos, 4),
                }
            )

    df = pd.DataFrame(rows)
    df = df.sort_values(["station_id", "timestamp"]).reset_index(drop=True)
    logger.info(f"Generated {len(df)} rows of synthetic data")
    return df


def fetch_training_data(days: int = 90) -> pd.DataFrame:
    try:
        import asyncio
        import os
        from dotenv import load_dotenv

        load_dotenv()
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        db_name = os.getenv("MONGODB_DB", "air_quality")

        try:
            from motor.motor_asyncio import AsyncIOMotorClient

            async def _fetch():
                client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=3000)
                db = client[db_name]
                cutoff = datetime.utcnow() - timedelta(days=days)
                cursor = db.air_quality_readings.find(
                    {"timestamp": {"$gte": cutoff}}
                ).sort("timestamp", -1)
                docs = await cursor.to_list(length=100000)
                client.close()
                return docs

            docs = asyncio.run(_fetch())
            if docs:
                df = pd.DataFrame(docs)
                if "_id" in df.columns:
                    df = df.drop(columns=["_id"])
                logger.info(f"Fetched {len(df)} records from MongoDB")
                return df
        except Exception as e:
            logger.warning(f"MongoDB connection failed: {e}")
    except ImportError:
        logger.warning("motor/pymongo not available, using synthetic data")

    return generate_synthetic_air_quality_data(days=days)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    logger.info("Engineering features from raw data")
    df = df.copy()
    df = df.sort_values(["station_id", "timestamp"]).reset_index(drop=True)

    if "aqi" not in df.columns:
        df["aqi"] = _compute_aqi(df)

    for pollutant in ["pm25", "pm10", "no2", "o3", "co", "so2", "nh3", "aqi"]:
        if pollutant not in df.columns:
            continue
        for window in [6, 12, 24, 72, 168]:
            df[f"{pollutant}_rolling_{window}h_mean"] = (
                df.groupby("station_id")[pollutant]
                .transform(lambda x: x.rolling(window, min_periods=1).mean())
            )
            df[f"{pollutant}_rolling_{window}h_std"] = (
                df.groupby("station_id")[pollutant]
                .transform(lambda x: x.rolling(window, min_periods=1).std())
            )

        df[f"{pollutant}_lag_1h"] = df.groupby("station_id")[pollutant].shift(1)
        df[f"{pollutant}_lag_3h"] = df.groupby("station_id")[pollutant].shift(3)
        df[f"{pollutant}_lag_6h"] = df.groupby("station_id")[pollutant].shift(6)
        df[f"{pollutant}_lag_24h"] = df.groupby("station_id")[pollutant].shift(24)
        df[f"{pollutant}_lag_48h"] = df.groupby("station_id")[pollutant].shift(48)

        df[f"{pollutant}_hourly_diff"] = df[pollutant] - df[f"{pollutant}_lag_1h"]
        df[f"{pollutant}_pct_change_6h"] = (
            (df[pollutant] - df[f"{pollutant}_lag_6h"]) / (df[f"{pollutant}_lag_6h"] + 0.001) * 100
        )

    # Weather interactions
    if all(c in df.columns for c in ["temperature", "humidity"]):
        df["temp_humidity_interaction"] = df["temperature"] * df["humidity"] / 100
    if all(c in df.columns for c in ["temperature", "wind_speed"]):
        df["temp_wind_interaction"] = df["temperature"] * df["wind_speed"]
    if all(c in df.columns for c in ["wind_speed", "humidity"]):
        df["wind_humidity_interaction"] = df["wind_speed"] * df["humidity"] / 100

    # Time features
    if "timestamp" in df.columns:
        df["hour"] = pd.to_datetime(df["timestamp"]).dt.hour
        df["day_of_week"] = pd.to_datetime(df["timestamp"]).dt.dayofweek
        df["month"] = pd.to_datetime(df["timestamp"]).dt.month
        df["day_of_year"] = pd.to_datetime(df["timestamp"]).dt.dayofyear
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

        # Holiday flags for major Indian festivals
        holiday_dates = []
        for y in range(2020, 2028):
            holiday_dates.extend([
                f"{y}-01-26",
                f"{y}-08-15",
                f"{y}-10-02",
                f"{y}-01-01",
            ])
        df["is_holiday"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d").isin(holiday_dates).astype(int)

    # Seasonal decompositions
    if "pm25" in df.columns:
        for lag in [24, 168]:
            df[f"pm25_seasonal_{lag}h"] = (
                df.groupby("station_id")["pm25"].transform(lambda x: x.rolling(lag, min_periods=1).mean())
            )
            df[f"pm25_residual_{lag}h"] = df["pm25"] - df[f"pm25_seasonal_{lag}h"]

    # Station encoding
    if "station_id" in df.columns:
        df["station_code"] = pd.Categorical(df["station_id"]).codes

    df = df.dropna()
    return df


def train_test_split_time(
    df: pd.DataFrame, test_hours: int = 168
) -> tuple[pd.DataFrame, pd.DataFrame]:
    logger.info(f"Splitting data with {test_hours}h test window")
    cutoff = df["timestamp"].max() - timedelta(hours=test_hours)
    train = df[df["timestamp"] < cutoff].copy()
    test = df[df["timestamp"] >= cutoff].copy()
    logger.info(f"Train: {len(train)} rows, Test: {len(test)} rows")
    return train, test


def scale_features(
    train: pd.DataFrame, test: pd.DataFrame, feature_cols: list[str]
) -> tuple[pd.DataFrame, pd.DataFrame, StandardScaler]:
    logger.info(f"Scaling {len(feature_cols)} features")
    scaler = StandardScaler()
    train_scaled = train.copy()
    test_scaled = test.copy()
    train_scaled[feature_cols] = scaler.fit_transform(train[feature_cols])
    test_scaled[feature_cols] = scaler.transform(test[feature_cols])
    return train_scaled, test_scaled, scaler


def _compute_aqi(df: pd.DataFrame) -> pd.Series:
    breakpoints = {
        "pm25": [(0, 30, 0, 50), (31, 60, 51, 100), (61, 90, 101, 200), (91, 120, 201, 300),
                 (121, 250, 301, 400), (251, 500, 401, 500)],
        "pm10": [(0, 50, 0, 50), (51, 100, 51, 100), (101, 250, 101, 200), (251, 350, 201, 300),
                 (351, 430, 301, 400), (431, 600, 401, 500)],
        "no2": [(0, 40, 0, 50), (41, 80, 51, 100), (81, 180, 101, 200), (181, 280, 201, 300),
                (281, 400, 301, 400), (401, 800, 401, 500)],
        "o3": [(0, 50, 0, 50), (51, 100, 51, 100), (101, 168, 101, 200), (169, 208, 201, 300),
               (209, 748, 301, 400), (749, 1000, 401, 500)],
        "so2": [(0, 40, 0, 50), (41, 80, 51, 100), (81, 380, 101, 200), (381, 800, 201, 300),
                (801, 1600, 301, 400), (1601, 3200, 401, 500)],
    }

    sub_indices = []
    for pollutant, bps in breakpoints.items():
        if pollutant not in df.columns:
            continue
        conc = df[pollutant].values
        sub = np.zeros_like(conc, dtype=float)
        for c_low, c_high, i_low, i_high in bps:
            mask = (conc >= c_low) & (conc <= c_high)
            sub[mask] = ((i_high - i_low) / (c_high - c_low)) * (conc[mask] - c_low) + i_low
        sub_indices.append(sub)

    if sub_indices:
        return pd.Series(np.maximum.reduce(sub_indices), index=df.index)
    return pd.Series(np.zeros(len(df)), index=df.index)
