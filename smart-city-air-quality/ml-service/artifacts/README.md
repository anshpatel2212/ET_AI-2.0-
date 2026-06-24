# Model Artifacts

This directory stores pre-trained model artifacts (.pkl, .joblib files).

## Contents

- `aqi_rf_model.joblib` — Random Forest model for AQI forecasting
- `aqi_xgb_model.joblib` — XGBoost model for AQI forecasting
- `aqi_lgb_model.joblib` — LightGBM model for AQI forecasting
- `scaler.joblib` — StandardScaler fitted on training data
- `ensemble_weights.json` — Per-horizon ensemble weighting coefficients
- `metadata.json` — Training metadata (date, performance metrics, features)

## Notes

- If these files are missing, the service will train simple fallback models on startup using synthetic Ahmedabad air quality data.
- For production, replace with properly trained models using `python training/train_forecast.py`.
