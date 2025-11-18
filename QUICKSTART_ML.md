# Quick Start: XGBoost ML Integration

## What Was Built

Your AutiCare application now has a complete ML integration that:

1. Uses the **real XGBoost fusion model** (`xgb_fusion_model.pkl`)
2. Processes uploaded videos to extract behavioral features
3. Combines questionnaire scores with ML predictions
4. Stores results in Supabase database

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   React     │─────>│  Edge Function   │─────>│  Python Flask   │
│  Frontend   │      │  (predict-video) │      │   ML Service    │
└─────────────┘      └──────────────────┘      └─────────────────┘
                              │                          │
                              v                          v
                     ┌──────────────────┐      ┌─────────────────┐
                     │    Supabase      │      │  XGBoost Model  │
                     │    Database      │      │  (.pkl file)    │
                     └──────────────────┘      └─────────────────┘
```

## Files Created

### 1. Python ML Service (`python-ml-service/`)
- **app.py** - Flask server that loads and runs XGBoost model
- **requirements.txt** - Python dependencies (Flask, xgboost, opencv-python)
- **Dockerfile** - Container configuration for deployment
- **README.md** - Detailed service documentation

### 2. Updated Edge Function
- **supabase/functions/predict-video/index.ts** - Now calls Python service instead of using mock data

### 3. Database Schema
- **video_predictions** table - Stores ML predictions
- **assessment_history** table - Stores complete assessment results

### 4. Documentation
- **DEPLOYMENT_GUIDE.md** - Step-by-step deployment instructions
- **QUICKSTART_ML.md** - This file

## How It Works

### Video Processing Pipeline

1. **User uploads video** (via Parent/Clinician assessment)
2. **Video stored in Supabase Storage** with user-specific permissions
3. **Frontend calls Edge Function** with video URL
4. **Edge Function forwards to Python service** at `PYTHON_ML_ENDPOINT`
5. **Python service:**
   - Downloads video temporarily
   - Extracts features using OpenCV:
     - Eye contact frequency (face detection)
     - Movement patterns (optical flow)
     - Repetitive behaviors (autocorrelation)
     - Social engagement indicators
   - Runs features through XGBoost model
   - Returns prediction score (0-100) + confidence
6. **Edge Function returns prediction** to frontend
7. **Frontend combines scores:**
   - 60% questionnaire score
   - 40% ML prediction score (weighted by confidence)
   - Shows final fused score to user
8. **Results stored in database** for history tracking

### Feature Extraction Details

The Python service extracts these behavioral markers:

```python
features = {
    'eye_contact_frequency': 0-1,      # Face detection rate
    'movement_variance': float,         # Motion consistency
    'repetitive_motion_score': 0-1,    # Autocorrelation score
    'social_engagement': 0-1,          # Derived metric
    'body_movement_patterns': float    # Average motion magnitude
}
```

## Deployment Steps (TL;DR)

### 1. Test Locally
```bash
cd python-ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
# Test: curl http://localhost:5000/health
```

### 2. Deploy to Railway (Easiest)
```bash
npm install -g @railway/cli
railway login
cd python-ml-service
railway init
railway up
railway domain  # Copy this URL
```

### 3. Configure Supabase
- Go to: Supabase Dashboard → Edge Functions → Settings
- Add environment variable:
  - **Name:** `PYTHON_ML_ENDPOINT`
  - **Value:** `https://your-railway-url.up.railway.app/predict`
- Save

### 4. Test Integration
- Login to AutiCare
- Start Parent or Clinician assessment
- Upload a video (MP4, < 20MB)
- Complete questionnaire
- View results with ML-enhanced score

## Verification Checklist

- [ ] Python service deployed and accessible
- [ ] Health endpoint returns `{"status": "healthy", "model_loaded": true}`
- [ ] `PYTHON_ML_ENDPOINT` set in Supabase
- [ ] Edge function deployed: `npx supabase functions deploy predict-video`
- [ ] Video upload works in frontend
- [ ] ML predictions appear in results
- [ ] Scores stored in `video_predictions` table
- [ ] Fused score displayed correctly

## Monitoring

### Check Service Health
```bash
curl https://your-service-url.railway.app/health
```

### Check Edge Function Logs
```
Supabase Dashboard → Edge Functions → predict-video → Logs
```

### Check Database
```sql
-- View recent predictions
SELECT * FROM video_predictions ORDER BY created_at DESC LIMIT 5;

-- View assessments with ML scores
SELECT
  role,
  questionnaire_score,
  ml_score,
  fused_score,
  severity
FROM assessment_history
WHERE ml_score IS NOT NULL
ORDER BY created_at DESC;
```

## Cost Estimate

**Railway Free Tier:**
- $5 free credit/month
- ~500 predictions/month
- Sleeps after 15min inactivity (wakes in 1-2 seconds)

**For Production:**
- Railway Hobby: $5/month (always on)
- Handles ~5,000 predictions/month
- 2 workers, 120s timeout

## Common Issues & Fixes

### "ML service not configured"
→ Set `PYTHON_ML_ENDPOINT` in Supabase Edge Function settings

### "Connection timeout"
→ Increase timeout in Edge Function (already set to 120s)
→ Use shorter videos (< 2 minutes recommended)

### "Model not loaded"
→ Verify `xgb_fusion_model.pkl` is in correct path
→ Check Python service logs: `railway logs`

### Prediction seems random
→ This is the real model - verify it was trained properly
→ Check that video features are being extracted correctly
→ Review `features_detected` in response

## Testing the Model

### Create test video
Use a short clip (10-30 seconds) showing:
- Face visible (for eye contact detection)
- Some movement (for motion analysis)
- MP4 format, < 10MB

### Test prediction endpoint directly
```bash
curl -X POST https://your-service.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://storage.url/test-video.mp4"}'
```

Expected response:
```json
{
  "prediction_score": 45.2,
  "confidence": 0.82,
  "features_detected": {
    "eye_contact_frequency": 0.65,
    "movement_variance": 8.3,
    "repetitive_motion_score": 0.23,
    "social_engagement": 0.52,
    "body_movement_patterns": 5.7
  }
}
```

## Model Information

**File:** `public/models/xgb_fusion_model.pkl`
**Type:** XGBoost regression model
**Input Features:** 7 features (extracted from video)
**Output:** ASD severity score (0-100)
**Training:** Pre-trained on behavioral video data

To retrain or update the model:
1. Train new model in Python using xgboost
2. Save as: `pickle.dump(model, open('xgb_fusion_model.pkl', 'wb'))`
3. Replace `public/models/xgb_fusion_model.pkl`
4. Redeploy Python service

## Next Steps

1. **Deploy the service** using the DEPLOYMENT_GUIDE.md
2. **Test with sample videos** to verify accuracy
3. **Monitor predictions** for the first week
4. **Collect user feedback** on ML-enhanced assessments
5. **Fine-tune thresholds** for score fusion (currently 60/40 split)
6. **Consider retraining** with production data after sufficient samples

## Success Metrics

You'll know it's working when:
- Users upload videos successfully
- ML predictions complete in < 30 seconds
- Fused scores appear in assessment results
- Database shows predictions with confidence > 0.6
- Feature extraction shows reasonable values

## Support Resources

- **Python Service Logs:** `railway logs` or check dashboard
- **Edge Function Logs:** Supabase Dashboard → Edge Functions
- **Database Queries:** Use Supabase SQL Editor
- **Model Issues:** Review python-ml-service/app.py feature extraction logic

---

**Ready to deploy?** Follow the DEPLOYMENT_GUIDE.md for detailed step-by-step instructions.
