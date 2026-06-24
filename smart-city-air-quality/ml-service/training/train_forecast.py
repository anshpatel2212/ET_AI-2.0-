import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import StandardScaler
import joblib
from loguru import logger

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from training.data_pipeline import (
    fetch_training_data,
    engineer_features,
    train_test_split_time,
    scale_features,
)

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "..", "artifacts")
TARGETS = ["pm25", "pm10", "no2", "o3", "co", "so2", "nh3", "aqi"]
EXCLUDE_COLS = {
    "timestamp", "station_id", "lat", "lon", "zone",
    "hour", "day_of_week", "month", "day_of_year",
}


def get_feature_cols(df: pd.DataFrame) -> list[str]:
    cols = []
    for col in df.columns:
        if col in EXCLUDE_COLS:
            continue
        if col in TARGETS:
            continue
        cols.append(col)
    return cols


def train_models(data_path: str | None = None) -> dict:
    logger.info("=" * 60)
    logger.info("Starting model training pipeline")
    logger.info("=" * 60)

    if data_path and os.path.exists(data_path):
        logger.info(f"Loading data from {data_path}")
        df = pd.read_csv(data_path)
    else:
        logger.info("Fetching training data (MongoDB or synthetic)")
        df = fetch_training_data(days=180)

    logger.info(f"Raw data shape: {df.shape}")
    df = engineer_features(df)
    logger.info(f"Engineered data shape: {df.shape}")

    train_df, test_df = train_test_split_time(df, test_hours=168)
    logger.info(f"Train: {train_df.shape}, Test: {test_df.shape}")

    feature_cols = get_feature_cols(train_df)
    logger.info(f"Total features: {len(feature_cols)}")

    train_scaled, test_scaled, scaler = scale_features(train_df, test_df, feature_cols)

    results = {}
    models = {}

    for target in TARGETS:
        if target not in df.columns:
            logger.warning(f"Target {target} not in data, skipping")
            continue

        logger.info(f"\n{'─' * 40}")
        logger.info(f"Training models for target: {target}")
        logger.info(f"{'─' * 40}")

        y_train = train_scaled[target].values
        y_test = test_scaled[target].values
        X_train = train_scaled[feature_cols].values
        X_test = test_scaled[feature_cols].values

        target_models = {}

        # Random Forest
        logger.info("  Training RandomForest...")
        try:
            rf = RandomForestRegressor(
                n_estimators=100,
                max_depth=12,
                min_samples_leaf=5,
                random_state=42,
                n_jobs=-1,
            )
            rf.fit(X_train, y_train)
            target_models["rf"] = rf
            metrics = evaluate_model(rf, X_test, y_test)
            results[f"{target}_rf"] = metrics
            logger.info(f"    RF - RMSE: {metrics['rmse']:.3f}, MAE: {metrics['mae']:.3f}, R²: {metrics['r2']:.4f}")
        except Exception as e:
            logger.error(f"    RF failed: {e}")

        # XGBoost
        logger.info("  Training XGBoost...")
        try:
            from xgboost import XGBRegressor
            xgb = XGBRegressor(
                n_estimators=100,
                max_depth=8,
                learning_rate=0.08,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1,
                verbosity=0,
            )
            xgb.fit(X_train, y_train)
            target_models["xgb"] = xgb
            metrics = evaluate_model(xgb, X_test, y_test)
            results[f"{target}_xgb"] = metrics
            logger.info(f"    XGB - RMSE: {metrics['rmse']:.3f}, MAE: {metrics['mae']:.3f}, R²: {metrics['r2']:.4f}")
        except Exception as e:
            logger.error(f"    XGB failed: {e}")

        # LightGBM
        logger.info("  Training LightGBM...")
        try:
            from lightgbm import LGBMRegressor
            lgb = LGBMRegressor(
                n_estimators=100,
                max_depth=8,
                learning_rate=0.08,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                n_jobs=-1,
                verbose=-1,
            )
            lgb.fit(X_train, y_train)
            target_models["lgb"] = lgb
            metrics = evaluate_model(lgb, X_test, y_test)
            results[f"{target}_lgb"] = metrics
            logger.info(f"    LGB - RMSE: {metrics['rmse']:.3f}, MAE: {metrics['mae']:.3f}, R²: {metrics['r2']:.4f}")
        except Exception as e:
            logger.error(f"    LGB failed: {e}")

        if not target_models:
            logger.warning(f"    No models trained for {target}, skipping")
            continue

        models[target] = target_models

    logger.info("\n" + "=" * 60)
    logger.info("Calculating ensemble weights...")
    weights = calculate_ensemble_weights(models, test_scaled, feature_cols, TARGETS)
    logger.info("Ensemble weights calculated")

    metadata = {
        "trained_at": datetime.utcnow().isoformat(),
        "features": feature_cols,
        "targets": [t for t in TARGETS if t in df.columns],
        "train_samples": len(train_df),
        "test_samples": len(test_df),
        "data_source": "synthetic" if data_path is None else data_path,
        "performance": results,
        "ensemble_weights": weights,
    }

    save_artifacts(models, scaler, metadata)
    logger.info("Training pipeline complete!")
    return metadata


def evaluate_model(model, X_test, y_test) -> dict:
    preds = model.predict(X_test)
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_test, preds))),
        "mae": float(mean_absolute_error(y_test, preds)),
        "r2": float(r2_score(y_test, preds)),
    }


def calculate_ensemble_weights(
    models: dict,
    test_df: pd.DataFrame,
    feature_cols: list[str],
    targets: list[str],
) -> dict:
    X_val = test_df[feature_cols].values
    weights = {}

    for target, target_models in models.items():
        if target not in test_df.columns:
            weights[target] = {name: 1.0 / len(target_models) for name in target_models}
            continue

        y_val = test_df[target].values
        model_rmse = {}

        for name, model in target_models.items():
            try:
                pred = model.predict(X_val)
                rmse = np.sqrt(mean_squared_error(y_val, pred))
                model_rmse[name] = rmse
            except Exception as e:
                logger.warning(f"  RMSE calc failed for {target}/{name}: {e}")
                model_rmse[name] = float("inf")

        # Inverse RMSE weighting
        inv_rmse = {k: 1.0 / max(v, 1e-10) for k, v in model_rmse.items()}
        total = sum(inv_rmse.values())
        if total > 0:
            weights[target] = {k: round(v / total, 4) for k, v in inv_rmse.items()}
        else:
            weights[target] = {k: 1.0 / len(target_models) for k in target_models}

        logger.info(f"  {target} weights: {weights[target]}")

    return weights


def save_artifacts(
    models: dict,
    scaler: StandardScaler,
    metadata: dict,
):
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    logger.info(f"Saving model artifacts to {ARTIFACTS_DIR}")

    # Save individual models per target
    all_rf = {}
    all_xgb = {}
    all_lgb = {}

    for target, target_models in models.items():
        for name, model in target_models.items():
            if name == "rf":
                all_rf[target] = model
            elif name == "xgb":
                all_xgb[target] = model
            elif name == "lgb":
                all_lgb[target] = model

    if all_rf:
        path = os.path.join(ARTIFACTS_DIR, "aqi_rf_model.joblib")
        joblib.dump(all_rf, path)
        logger.info(f"  Saved RF models to {path}")

    if all_xgb:
        path = os.path.join(ARTIFACTS_DIR, "aqi_xgb_model.joblib")
        joblib.dump(all_xgb, path)
        logger.info(f"  Saved XGB models to {path}")

    if all_lgb:
        path = os.path.join(ARTIFACTS_DIR, "aqi_lgb_model.joblib")
        joblib.dump(all_lgb, path)
        logger.info(f"  Saved LGB models to {path}")

    # Save scaler
    scaler_path = os.path.join(ARTIFACTS_DIR, "scaler.joblib")
    joblib.dump(scaler, scaler_path)
    logger.info(f"  Saved scaler to {scaler_path}")

    # Save ensemble weights
    weights = metadata.get("ensemble_weights", {})
    if weights:
        weights_path = os.path.join(ARTIFACTS_DIR, "ensemble_weights.json")
        with open(weights_path, "w") as f:
            json.dump(weights, f, indent=2)
        logger.info(f"  Saved ensemble weights to {weights_path}")

    # Save metadata
    meta_path = os.path.join(ARTIFACTS_DIR, "metadata.json")
    serializable_meta = _make_serializable(metadata)
    with open(meta_path, "w") as f:
        json.dump(serializable_meta, f, indent=2)
    logger.info(f"  Saved metadata to {meta_path}")

    logger.info("All artifacts saved successfully!")


def _make_serializable(obj):
    if isinstance(obj, dict):
        return {k: _make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_make_serializable(v) for v in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


if __name__ == "__main__":
    logger.info("Running train_forecast.py as standalone script")
    data_path = sys.argv[1] if len(sys.argv) > 1 else None
    metadata = train_models(data_path=data_path)
    print(json.dumps(_make_serializable(metadata), indent=2))
