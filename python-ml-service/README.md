# AutiCare ML Prediction Service

Python-based microservice for ASD video analysis using XGBoost fusion model.

## Local Development

### Setup

```bash
cd python-ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Run

```bash
python app.py
```

The service will start on http://localhost:5000

### Test

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://your-video-url.mp4"}'
```

## Deployment Options

### Option 1: Railway.app (Recommended)

1. Create account at https://railway.app
2. Install Railway CLI: `npm i -g @railway/cli`
3. Login: `railway login`
4. Deploy:
   ```bash
   cd python-ml-service
   railway init
   railway up
   ```
5. Copy the deployment URL and set it as `PYTHON_ML_ENDPOINT` in Supabase Edge Functions

### Option 2: Render.com

1. Create account at https://render.com
2. Connect your Git repository
3. Create new Web Service
4. Set:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app`
5. Copy the service URL and set as `PYTHON_ML_ENDPOINT`

### Option 3: Docker + Any Cloud Provider

```bash
docker build -t auticare-ml .
docker run -p 5000:5000 auticare-ml
```

Deploy to AWS ECS, Google Cloud Run, Azure Container Instances, etc.

### Option 4: Heroku

1. Install Heroku CLI
2. Create app: `heroku create auticare-ml`
3. Deploy:
   ```bash
   git add .
   git commit -m "Add ML service"
   git push heroku main
   ```

## Environment Variables

Set in Supabase Dashboard → Edge Functions → Environment Variables:

- `PYTHON_ML_ENDPOINT`: URL of your deployed Python service (e.g., https://your-service.railway.app/predict)

## API Endpoints

### POST /predict

Request:
```json
{
  "video_url": "https://storage-url/video.mp4"
}
```

Response:
```json
{
  "prediction_score": 65.3,
  "confidence": 0.82,
  "features_detected": {
    "eye_contact_frequency": 0.45,
    "movement_variance": 12.3,
    "repetitive_motion_score": 0.67,
    "social_engagement": 0.35,
    "body_movement_patterns": 8.2
  }
}
```

### GET /health

Response:
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

## Model Information

The XGBoost fusion model (`xgb_fusion_model.pkl`) combines:
- Questionnaire response patterns
- Video-based behavioral markers
- Temporal feature analysis

Features extracted from video:
1. Eye contact frequency (face detection)
2. Movement variance (optical flow)
3. Repetitive motion patterns (autocorrelation)
4. Social engagement indicators
5. Body movement patterns

## Troubleshooting

### Model not loading
- Ensure `xgb_fusion_model.pkl` is in the correct path
- Check Python and xgboost versions match training environment

### Video processing errors
- Verify OpenCV installation: `python -c "import cv2; print(cv2.__version__)"`
- Check video format is supported (MP4, AVI, MOV)
- Ensure sufficient memory for video processing

### Performance optimization
- Increase worker count in gunicorn for production
- Use GPU-enabled OpenCV for faster processing
- Implement caching for repeated video URLs
