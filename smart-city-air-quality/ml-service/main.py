import os
import io
import time
import json
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
from loguru import logger

from models.aqi_forecaster import AQIForecaster
from models.pollution_detector import PollutionDetector
from models.source_attributor import SourceAttributor

# ── Metrics ──────────────────────────────────────────────────────────────────
REQUEST_COUNT = 0
ERROR_COUNT = 0
START_TIME = time.time()
METRICS_LOCK = asyncio.Lock()

# ── Global model instances ───────────────────────────────────────────────────
forecaster: AQIForecaster | None = None
detector: PollutionDetector | None = None
attributor: SourceAttributor | None = None


# ── Pydantic models ──────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")
    stationId: str = Field(default="station_001", description="Station identifier")
    horizons: list[int] = Field(
        default_factory=lambda: [1, 3, 6, 12, 24, 48, 72],
        description="Forecast horizons in hours",
    )


class ForecastPoint(BaseModel):
    mean: float
    ci_lower: float
    ci_upper: float


class ForecastHorizon(BaseModel):
    pm25: ForecastPoint
    pm10: ForecastPoint
    no2: ForecastPoint
    o3: ForecastPoint
    co: ForecastPoint
    so2: ForecastPoint
    nh3: ForecastPoint
    aqi: ForecastPoint


class ShapFeature(BaseModel):
    name: str
    shap_value: float


class Explanation(BaseModel):
    base_value: float = 0
    top_features: list[ShapFeature] = []
    error: str | None = None


class PredictResponse(BaseModel):
    station_id: str
    timestamp: str
    forecast: dict[str, ForecastHorizon]
    explanations: dict[str, Explanation]


class BatchPredictRequest(BaseModel):
    grid: list[list[float]] = Field(
        ..., description="List of [lat, lon] grid points"
    )
    horizon: int = Field(default=24, description="Forecast horizon in hours")


class BatchPredictResponse(BaseModel):
    predictions: list[PredictResponse]
    total_points: int
    horizon: int


class DetectionItem(BaseModel):
    class_name: str = Field(..., alias="class")
    confidence: float
    bbox: list[float]

    class Config:
        populate_by_name = True


class DetectResponse(BaseModel):
    detections: list[DetectionItem]
    model_used: str
    image_processed: bool


class SourceFactor(BaseModel):
    percentage: float
    description: str
    factors: dict


class SourceBreakdown(BaseModel):
    traffic: SourceFactor
    industrial: SourceFactor
    construction: SourceFactor
    waste_burning: SourceFactor
    natural: SourceFactor


class SpatialHeatPoint(BaseModel):
    lat: float
    lon: float
    pm25_estimate: float
    confidence: float


class AttributeResponse(BaseModel):
    region: str
    time_range: dict
    avg_pm25: float
    avg_pm10: float
    source_breakdown: SourceBreakdown
    spatial_heat_data: list[SpatialHeatPoint]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: float
    models_loaded: bool


class ReadyResponse(BaseModel):
    ready: bool
    models: dict[str, bool]


class AttributeRequest(BaseModel):
    region: str = Field(default="ahmedabad", description="Region/city name")
    timeRange: dict = Field(default_factory=dict, description="Time range {start, end}")


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global forecaster, detector, attributor
    logger.info("Starting ML Service...")

    try:
        forecaster = AQIForecaster()
        forecaster.load_models()
        logger.info("AQIForecaster initialized")
    except Exception as e:
        logger.error(f"Failed to initialize AQIForecaster: {e}")
        forecaster = AQIForecaster()
        forecaster._train_fallback_models()

    try:
        detector = PollutionDetector()
        detector.load_model()
        logger.info(f"PollutionDetector initialized (mode: {detector.model_type})")
    except Exception as e:
        logger.error(f"Failed to initialize PollutionDetector: {e}")
        detector = PollutionDetector()
        detector.model_type = "simulation"

    try:
        attributor = SourceAttributor()
        logger.info("SourceAttributor initialized")
    except Exception as e:
        logger.error(f"Failed to initialize SourceAttributor: {e}")
        attributor = SourceAttributor()

    logger.info("ML Service startup complete")
    yield
    logger.info("Shutting down ML Service...")


# ── FastAPI Application ─────────────────────────────────────────────────────

app = FastAPI(
    title="Urban Air Quality Intelligence - ML Service",
    description="AI-powered air quality forecasting, pollution detection, and source attribution",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Error Handler ────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    global ERROR_COUNT
    async with METRICS_LOCK:
        ERROR_COUNT += 1
    logger.error(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": request.url.path},
    )


# ── Middleware for request counting ──────────────────────────────────────────

@app.middleware("http")
async def count_requests(request: Request, call_next):
    global REQUEST_COUNT
    async with METRICS_LOCK:
        REQUEST_COUNT += 1
    response = await call_next(request)
    return response


# ── Routes ───────────────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    logger.info(f"Predict request: station={request.stationId}, horizons={request.horizons}")
    if forecaster is None:
        raise HTTPException(status_code=503, detail="Forecaster not initialized")

    try:
        result = forecaster.predict(
            station_id=request.stationId,
            horizons=request.horizons,
        )

        # Convert to response model friendly format
        forecast = {}
        for h, preds in result["forecast"].items():
            forecast[h] = {
                k: {"mean": v["mean"], "ci_lower": v["ci_lower"], "ci_upper": v["ci_upper"]}
                for k, v in preds.items()
            }

        explanations = {}
        for target, exp in result.get("explanations", {}).items():
            if isinstance(exp, dict) and "error" in exp:
                explanations[target] = {"base_value": 0, "top_features": [], "error": exp["error"]}
            elif isinstance(exp, dict):
                explanations[target] = {
                    "base_value": exp.get("base_value", 0),
                    "top_features": [
                        {"name": f["name"], "shap_value": f["shap_value"]}
                        for f in exp.get("top_features", [])
                    ],
                    "error": None,
                }

        return PredictResponse(
            station_id=result["station_id"],
            timestamp=result["timestamp"],
            forecast=forecast,
            explanations=explanations,
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-predict", response_model=BatchPredictResponse)
async def batch_predict(request: BatchPredictRequest):
    logger.info(f"Batch predict request: {len(request.grid)} points, horizon={request.horizon}")
    if forecaster is None:
        raise HTTPException(status_code=503, detail="Forecaster not initialized")

    try:
        results = forecaster.batch_predict(grid=request.grid, horizon=request.horizon)
        predictions = []
        for r in results:
            forecast = {}
            for h, preds in r["forecast"].items():
                forecast[h] = {
                    k: {"mean": v["mean"], "ci_lower": v["ci_lower"], "ci_upper": v["ci_upper"]}
                    for k, v in preds.items()
                }
            explanations = {}
            for target, exp in r.get("explanations", {}).items():
                if isinstance(exp, dict):
                    explanations[target] = {
                        "base_value": exp.get("base_value", 0),
                        "top_features": [
                            {"name": f["name"], "shap_value": f["shap_value"]}
                            for f in exp.get("top_features", [])
                        ],
                        "error": None,
                    }
            predictions.append(PredictResponse(
                station_id=r["station_id"],
                timestamp=r["timestamp"],
                forecast=forecast,
                explanations=explanations,
            ))

        return BatchPredictResponse(
            predictions=predictions,
            total_points=len(request.grid),
            horizon=request.horizon,
        )
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect", response_model=DetectResponse)
async def detect(
    file: UploadFile = File(None),
    imageUrl: str = Form(None),
):
    logger.info(f"Detect request: file={'yes' if file else 'no'}, imageUrl={'yes' if imageUrl else 'no'}")
    if detector is None:
        raise HTTPException(status_code=503, detail="Detector not initialized")

    try:
        image_bytes = None
        if file:
            image_bytes = await file.read()

        detections = detector.detect(image_bytes=image_bytes, image_url=imageUrl)

        return DetectResponse(
            detections=[
                DetectionItem(
                    class_name=d["class"],
                    confidence=d["confidence"],
                    bbox=d["bbox"],
                )
                for d in detections
            ],
            model_used=detector.model_type,
            image_processed=(file is not None or imageUrl is not None),
        )
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/attribute", response_model=AttributeResponse)
async def attribute(request: AttributeRequest):
    region = request.region
    time_range = request.timeRange
    logger.info(f"Attribute request: region={region}, timeRange={time_range}")

    if attributor is None:
        raise HTTPException(status_code=503, detail="Attributor not initialized")

    try:
        result = attributor.attribute(region=region, time_range=time_range)

        breakdown = result["source_breakdown"]
        return AttributeResponse(
            region=result["region"],
            time_range=result["time_range"],
            avg_pm25=result["avg_pm25"],
            avg_pm10=result["avg_pm10"],
            source_breakdown=SourceBreakdown(
                traffic=SourceFactor(**breakdown["traffic"]),
                industrial=SourceFactor(**breakdown["industrial"]),
                construction=SourceFactor(**breakdown["construction"]),
                waste_burning=SourceFactor(**breakdown["waste_burning"]),
                natural=SourceFactor(**breakdown["natural"]),
            ),
            spatial_heat_data=[
                SpatialHeatPoint(**p) for p in result.get("spatial_heat_data", [])
            ],
        )
    except Exception as e:
        logger.error(f"Attribution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        service="ml-service",
        version="1.0.0",
        uptime_seconds=round(time.time() - START_TIME, 2),
        models_loaded=(
            forecaster is not None
            and detector is not None
            and attributor is not None
        ),
    )


@app.get("/ready", response_model=ReadyResponse)
async def ready():
    models_status = {
        "forecaster": forecaster is not None,
        "detector": detector is not None,
        "attributor": attributor is not None,
    }
    return ReadyResponse(
        ready=all(models_status.values()),
        models=models_status,
    )


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    global REQUEST_COUNT, ERROR_COUNT
    async with METRICS_LOCK:
        rc = REQUEST_COUNT
        ec = ERROR_COUNT
    uptime = time.time() - START_TIME

    lines = [
        "# HELP ml_service_requests_total Total number of requests",
        "# TYPE ml_service_requests_total counter",
        f"ml_service_requests_total {rc}",
        "",
        "# HELP ml_service_errors_total Total number of errors",
        "# TYPE ml_service_errors_total counter",
        f"ml_service_errors_total {ec}",
        "",
        "# HELP ml_service_uptime_seconds Service uptime in seconds",
        "# TYPE ml_service_uptime_seconds gauge",
        f"ml_service_uptime_seconds {uptime:.2f}",
        "",
        "# HELP ml_service_models_loaded Whether ML models are loaded (1=yes, 0=no)",
        "# TYPE ml_service_models_loaded gauge",
        f"ml_service_models_loaded {1 if forecaster is not None else 0}",
    ]
    return "\n".join(lines)


# ── Root ─────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "Urban Air Quality Intelligence - ML Service",
        "version": "1.0.0",
        "endpoints": {
            "/predict": "POST - Get ensemble air quality forecast with SHAP explanations",
            "/batch-predict": "POST - Get grid-based batch forecasts",
            "/detect": "POST - Detect pollution sources from images",
            "/attribute": "POST - Get source attribution breakdown",
            "/health": "GET - Health check",
            "/ready": "GET - Readiness probe",
            "/metrics": "GET - Prometheus-style metrics",
        },
    }


# ── Main entry point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
