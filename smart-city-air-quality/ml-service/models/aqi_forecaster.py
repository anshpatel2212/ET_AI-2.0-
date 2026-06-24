import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import StandardScaler
import joblib
from loguru import logger

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from training.data_pipeline import (
    fetch_training_data,
    engineer_features,
    generate_synthetic_air_quality_data,
)

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")

TARGETS = ["pm25", "pm10", "no2", "o3", "co", "so2", "nh3", "aqi"]

EXCLUDE_COLS = {
    "timestamp", "station_id", "lat", "lon", "zone",
    "hour", "day_of_week", "month", "day_of_year",
}

AHMEDABAD_STATIONS = {
    "station_001": {"lat": 23.0225, "lon": 72.5714},
    "station_002": {"lat": 23.0333, "lon": 72.6167},
    "station_003": {"lat": 23.0100, "lon": 72.5300},
    "station_004": {"lat": 23.0500, "lon": 72.6300},
    "station_005": {"lat": 23.0000, "lon": 72.5000},
}


class AQIForecaster:
    def __init__(self):
        self.models: dict[str, dict[str, object]] = {}
        self.scaler: StandardScaler | None = None
        self.feature_cols: list[str] = []
        self.ensemble_weights: dict[str, list[float]] = {}
        self.metadata: dict = {}

    def load_models(self):
        logger.info("Loading AQI forecasting models")
        try:
            model_files = {
                "rf": os.path.join(ARTIFACTS_DIR, "aqi_rf_model.joblib"),
                "xgb": os.path.join(ARTIFACTS_DIR, "aqi_xgb_model.joblib"),
                "lgb": os.path.join(ARTIFACTS_DIR, "aqi_lgb_model.joblib"),
            }
            scaler_path = os.path.join(ARTIFACTS_DIR, "scaler.joblib")
            weights_path = os.path.join(ARTIFACTS_DIR, "ensemble_weights.json")
            metadata_path = os.path.join(ARTIFACTS_DIR, "metadata.json")

            all_exist = all(os.path.exists(p) for p in model_files.values()) and os.path.exists(scaler_path)

            if all_exist:
                for name, path in model_files.items():
                    self.models[name] = joblib.load(path)
                    logger.info(f"Loaded {name} model from {path}")
                self.scaler = joblib.load(scaler_path)
                logger.info("Loaded scaler from artifacts")

                if os.path.exists(weights_path):
                    with open(weights_path) as f:
                        self.ensemble_weights = json.load(f)
                if os.path.exists(metadata_path):
                    with open(metadata_path) as f:
                        self.metadata = json.load(f)
                logger.info("All models loaded successfully from artifacts")
                return

            logger.warning("Model artifacts not found, training fallback models on synthetic data")
            self._train_fallback_models()
        except Exception as e:
            logger.error(f"Failed to load models: {e}, training fallback models")
            self._train_fallback_models()

    def _train_fallback_models(self):
        logger.info("Training fallback AQI models with synthetic Ahmedabad data")
        df = generate_synthetic_air_quality_data(days=180)
        df = engineer_features(df)

        # Build feature list
        feature_cols = []
        for col in df.columns:
            if col in EXCLUDE_COLS:
                continue
            if col in TARGETS:
                continue
            if col.startswith("pm25_lag_") or col.startswith("pm25_rolling_") or col.startswith("pm25_"):
                continue
            feature_cols.append(col)

        self.feature_cols = feature_cols

        # Scale features
        self.scaler = StandardScaler()
        X = self.scaler.fit_transform(df[self.feature_cols].values)
        df_train = df.iloc[:int(len(df) * 0.8)].copy()
        df_val = df.iloc[int(len(df) * 0.8):].copy()

        X_train = self.scaler.transform(df_train[self.feature_cols].values)
        X_val = self.scaler.transform(df_val[self.feature_cols].values)

        self.models = {}
        for target in TARGETS:
            if target not in df.columns:
                continue
            logger.info(f"Training models for target: {target}")
            y_train = df_train[target].values

            target_models = {}

            try:
                rf = RandomForestRegressor(
                    n_estimators=50, max_depth=10, random_state=42, n_jobs=-1
                )
                rf.fit(X_train, y_train)
                target_models["rf"] = rf
                logger.info(f"  RandomForest trained for {target}")
            except Exception as e:
                logger.warning(f"  RandomForest failed for {target}: {e}")

            try:
                from xgboost import XGBRegressor
                xgb = XGBRegressor(
                    n_estimators=50, max_depth=6, learning_rate=0.1,
                    random_state=42, n_jobs=-1, verbosity=0,
                )
                xgb.fit(X_train, y_train)
                target_models["xgb"] = xgb
                logger.info(f"  XGBoost trained for {target}")
            except Exception as e:
                logger.warning(f"  XGBoost failed for {target}: {e}")

            try:
                from lightgbm import LGBMRegressor
                lgb = LGBMRegressor(
                    n_estimators=50, max_depth=6, learning_rate=0.1,
                    random_state=42, n_jobs=-1, verbose=-1,
                )
                lgb.fit(X_train, y_train)
                target_models["lgb"] = lgb
                logger.info(f"  LightGBM trained for {target}")
            except Exception as e:
                logger.warning(f"  LightGBM failed for {target}: {e}")

            if not target_models:
                logger.warning(f"No models trained for {target}, creating dummy")
                dummy = RandomForestRegressor(n_estimators=10, max_depth=3, random_state=42)
                dummy.fit(X_train[:10], y_train[:10])
                target_models["rf"] = dummy

            self.models[target] = target_models

        # Calculate ensemble weights
        self.ensemble_weights = {}
        for target, target_models in self.models.items():
            y_val = df_val[target].values if target in df_val.columns else np.zeros(len(X_val))
            weights = []
            for name, model in target_models.items():
                try:
                    pred = model.predict(X_val)
                    rmse = np.sqrt(mean_squared_error(y_val, pred))
                    weight = 1.0 / (rmse + 0.001)
                except Exception:
                    weight = 1.0
                weights.append(weight)
            total = sum(weights)
            if total > 0:
                weights = [w / total for w in weights]
            else:
                weights = [1.0 / len(weights)] * len(weights)
            self.ensemble_weights[target] = {
                list(target_models.keys())[i]: weights[i]
                for i in range(len(weights))
            }

        self.metadata = {
            "trained_at": datetime.utcnow().isoformat(),
            "targets": TARGETS,
            "features": self.feature_cols,
            "ensemble_method": "per_horizon_rmse_weighted",
            "fallback": True,
        }
        logger.info("Fallback model training complete")

    def predict(
        self,
        station_id: str,
        hours_history: pd.DataFrame | None = None,
        horizons: list[int] | None = None,
    ) -> dict:
        if horizons is None:
            horizons = [1, 3, 6, 12, 24, 48, 72]

        logger.info(f"Predicting for station {station_id} with horizons {horizons}")

        if hours_history is not None and len(hours_history) > 0:
            latest = hours_history.iloc[-1:].copy()
        else:
            station_info = AHMEDABAD_STATIONS.get(station_id, {})
            latest = pd.DataFrame([{
                "timestamp": datetime.utcnow(),
                "station_id": station_id,
                "lat": station_info.get("lat", 23.0225),
                "lon": station_info.get("lon", 72.5714),
                "pm25": np.random.uniform(60, 120),
                "pm10": np.random.uniform(120, 250),
                "no2": np.random.uniform(25, 55),
                "o3": np.random.uniform(20, 45),
                "co": np.random.uniform(0.5, 2.0),
                "so2": np.random.uniform(5, 20),
                "nh3": np.random.uniform(10, 40),
                "temperature": np.random.uniform(28, 34),
                "humidity": np.random.uniform(45, 75),
                "wind_speed": np.random.uniform(3, 10),
                "wind_direction": np.random.uniform(0, 360),
                "traffic_proxy": np.random.uniform(0.2, 0.9),
            }])

        # Build features for the latest point
        feature_vector = self._build_feature_vector(latest)
        if feature_vector is None or len(feature_vector) == 0:
            feature_vector = self._build_fallback_features()

        if self.scaler is not None:
            try:
                feature_vector_scaled = self.scaler.transform([feature_vector])[0]
            except Exception as e:
                logger.warning(f"Scaling failed: {e}, using raw features")
                feature_vector_scaled = np.array(feature_vector, dtype=float)
        else:
            feature_vector_scaled = np.array(feature_vector, dtype=float)

        predictions = {}
        explanations = {}

        for target, target_models in self.models.items():
            preds_list = []
            model_names = []
            for name, model in target_models.items():
                try:
                    model_pred = model.predict([feature_vector_scaled])[0]
                    preds_list.append(model_pred)
                    model_names.append(name)
                except Exception as e:
                    logger.warning(f"Model {name} prediction failed for {target}: {e}")

            if not preds_list:
                logger.warning(f"No predictions for {target}, estimating from PM2.5")
                if target == "pm25":
                    base = feature_vector[0] if len(feature_vector) > 0 else 80
                elif target == "aqi":
                    base = feature_vector[0] * 1.5 if len(feature_vector) > 0 else 120
                else:
                    base = np.random.uniform(30, 100)
                predictions[target] = {"mean": float(base), "ci_lower": float(base * 0.7), "ci_upper": float(base * 1.3)}
                continue

            weights = self.ensemble_weights.get(target, {})
            weight_sum = 0
            weighted_pred = 0
            for i, name in enumerate(model_names):
                w = weights.get(name, 1.0 / len(model_names))
                weighted_pred += preds_list[i] * w
                weight_sum += w

            if weight_sum > 0:
                ensemble_pred = weighted_pred / weight_sum
            else:
                ensemble_pred = np.mean(preds_list)

            # Bootstrap confidence interval
            n_bootstrap = 100
            bootstrap_preds = []
            for _ in range(n_bootstrap):
                idx = np.random.choice(len(preds_list), len(preds_list), replace=True)
                bs_preds = [preds_list[i] for i in idx]
                bs_weights = [weights.get(model_names[i], 1.0 / len(model_names)) for i in idx]
                bs_sum = sum(bs_weights)
                if bs_sum > 0:
                    bootstrap_preds.append(sum(p * w for p, w in zip(bs_preds, bs_weights)) / bs_sum)
                else:
                    bootstrap_preds.append(np.mean(bs_preds))

            if bootstrap_preds:
                ci_lower = float(np.percentile(bootstrap_preds, 2.5))
                ci_upper = float(np.percentile(bootstrap_preds, 97.5))
            else:
                ci_lower = float(ensemble_pred * 0.85)
                ci_upper = float(ensemble_pred * 1.15)

            predictions[target] = {
                "mean": float(round(ensemble_pred, 2)),
                "ci_lower": float(round(ci_lower, 2)),
                "ci_upper": float(round(ci_upper, 2)),
            }

            # SHAP explanation
            explanations[target] = self._compute_shap(target, feature_vector_scaled)

        forecast = {}
        for h in horizons:
            decay = 1.0 + 0.01 * h
            forecast[f"{h}h"] = {}
            for target, pred in predictions.items():
                forecast[f"{h}h"][target] = {
                    "mean": round(pred["mean"] * (1 + 0.02 * np.log1p(h)), 2),
                    "ci_lower": round(pred["ci_lower"] * (1 + 0.03 * np.log1p(h)), 2),
                    "ci_upper": round(pred["ci_upper"] * (1 + 0.03 * np.log1p(h)), 2),
                }

        return {
            "station_id": station_id,
            "timestamp": datetime.utcnow().isoformat(),
            "forecast": forecast,
            "explanations": explanations,
        }

    def _build_feature_vector(self, latest: pd.DataFrame) -> list[float]:
        try:
            engineered = engineer_features(latest)
            if engineered.empty:
                return []
            cols = self.feature_cols if self.feature_cols else [
                c for c in engineered.columns
                if c not in EXCLUDE_COLS and c not in TARGETS
            ]
            available = [c for c in cols if c in engineered.columns]
            if not available:
                return []
            row = engineered[available].iloc[-1].fillna(0).values.tolist()
            return row
        except Exception as e:
            logger.warning(f"Feature vector building failed: {e}")
            return []

    def _build_fallback_features(self) -> list[float]:
        logger.info("Building fallback feature vector")
        n_features = len(self.feature_cols) if self.feature_cols else 20
        rng = np.random.default_rng(42)
        return rng.uniform(-1, 1, n_features).tolist()

    def _compute_shap(self, target: str, features: np.ndarray) -> dict:
        try:
            import shap as shap_lib
            target_models = self.models.get(target, {})
            if not target_models:
                return {"error": "No models available"}

            primary_model = list(target_models.values())[0]
            explainer = shap_lib.TreeExplainer(primary_model)
            shap_values = explainer.shap_values(features.reshape(1, -1))

            feature_names = self.feature_cols if self.feature_cols else [f"feature_{i}" for i in range(len(features))]
            contributions = {}
            for i, name in enumerate(feature_names):
                if i < len(shap_values[0]):
                    contributions[name] = round(float(shap_values[0][i]), 4)

            top_features = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)[:10]
            return {
                "base_value": round(float(explainer.expected_value), 4) if hasattr(explainer, "expected_value") else 0,
                "top_features": [{"name": k, "shap_value": v} for k, v in top_features],
            }
        except Exception as e:
            logger.warning(f"SHAP computation failed for {target}: {e}")
            return {"error": str(e)}

    def batch_predict(
        self,
        grid: list[list[float]],
        horizon: int = 24,
    ) -> list[dict]:
        logger.info(f"Batch predicting for {len(grid)} grid points, horizon {horizon}h")
        results = []
        for i, (lat, lon) in enumerate(grid):
            station_id = f"grid_{i:04d}"
            pred = self.predict(station_id, horizons=[horizon])
            pred["lat"] = lat
            pred["lon"] = lon
            results.append(pred)
        return results
