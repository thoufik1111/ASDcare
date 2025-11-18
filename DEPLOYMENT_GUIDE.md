# XGBoost Model Integration - Deployment Guide

This guide walks you through deploying the Python ML service to enable real XGBoost model predictions for video analysis.

## Overview

The system architecture consists of:

1. **Frontend (React)** - User uploads video, triggers assessment
2. **Supabase Edge Function** (`predict-video`) - Receives video URL, calls Python service
3. **Python ML Service** (Flask) - Processes video, extracts features, runs XGBoost model
4. **Supabase Database** - Stores predictions and assessment results

## Prerequisites

- Supabase project (already set up)
- Python 3.8+ installed locally for testing
- Account on deployment platform (Railway, Render, or Heroku)

## Step 1: Test Python Service Locally

### Install Dependencies

```bash
cd python-ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Verify Model Loading

The service should automatically load the model from `public/models/xgb_fusion_model.pkl`. Verify it works:

```bash
python app.py
```

You should see:
```
INFO:__main__:Starting AutiCare ML Service...
INFO:__main__:XGBoost model loaded successfully
```

### Test Health Endpoint

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### Test Prediction (Optional)

If you have a test video URL:

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://your-video-url.mp4"}'
```

## Step 2: Deploy Python Service

### Option A: Railway.app (Recommended - Free Tier)

Railway is the easiest and has a generous free tier.

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Create New Project**
   ```bash
   cd python-ml-service
   railway init
   ```
   - Choose "Empty Project"
   - Name it "auticare-ml"

4. **Deploy**
   ```bash
   railway up
   ```

5. **Get Deployment URL**
   ```bash
   railway domain
   ```

   Or visit the Railway dashboard and copy the URL (e.g., `https://auticare-ml-production.up.railway.app`)

6. **Important**: Add `/predict` to the end of your URL for the Edge Function
   - Full endpoint: `https://auticare-ml-production.up.railway.app/predict`

### Option B: Render.com (Free Tier)

1. **Push Code to GitHub**
   ```bash
   git add python-ml-service
   git commit -m "Add Python ML service"
   git push
   ```

2. **Create New Web Service on Render**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - Name: `auticare-ml`
   - Root Directory: `python-ml-service`
   - Environment: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app`

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Copy the service URL (e.g., `https://auticare-ml.onrender.com`)

5. **Full endpoint**: `https://auticare-ml.onrender.com/predict`

### Option C: Heroku (No longer free, but reliable)

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login and Create App**
   ```bash
   heroku login
   cd python-ml-service
   heroku create auticare-ml
   ```

3. **Add Buildpack**
   ```bash
   heroku buildpacks:set heroku/python
   ```

4. **Create Procfile** (if not exists)
   ```bash
   echo "web: gunicorn --bind 0.0.0.0:\$PORT --workers 2 --timeout 120 app:app" > Procfile
   ```

5. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy ML service"
   git push heroku main
   ```

6. **Get URL**
   ```bash
   heroku info
   ```
   - Full endpoint: `https://auticare-ml.herokuapp.com/predict`

## Step 3: Configure Supabase Edge Function

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click "Edge Functions" in the left sidebar

2. **Set Environment Variable**
   - Click "Settings" tab
   - Scroll to "Environment Variables"
   - Add new variable:
     - Name: `PYTHON_ML_ENDPOINT`
     - Value: Your Python service URL + `/predict`
       - Example: `https://auticare-ml-production.up.railway.app/predict`
   - Click "Save"

3. **Deploy Edge Function**
   ```bash
   npx supabase functions deploy predict-video
   ```

## Step 4: Verify Integration

### Test Edge Function

```bash
curl -X POST 'https://YOUR_SUPABASE_URL/functions/v1/predict-video' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://test-video-url.mp4"}'
```

### Test from Frontend

1. Start your React app: `npm run dev`
2. Login with a test account
3. Start an assessment (Parent or Clinician role)
4. Upload a video
5. Check browser console for logs
6. Verify prediction appears in results

### Check Logs

**Supabase Edge Function Logs:**
- Supabase Dashboard → Edge Functions → `predict-video` → Logs

**Python Service Logs:**
- Railway: `railway logs`
- Render: Dashboard → Logs tab
- Heroku: `heroku logs --tail`

## Step 5: Store Predictions in Database

The predictions are automatically stored when a video is analyzed. Verify by checking the database:

```sql
-- View video predictions
SELECT * FROM video_predictions ORDER BY created_at DESC LIMIT 10;

-- View assessment history with ML scores
SELECT
  id,
  role,
  questionnaire_score,
  ml_score,
  fused_score,
  severity,
  created_at
FROM assessment_history
WHERE ml_score IS NOT NULL
ORDER BY created_at DESC;
```

## Troubleshooting

### Issue: "ML service not configured" error

**Solution**: Ensure `PYTHON_ML_ENDPOINT` environment variable is set in Supabase Edge Functions settings.

### Issue: "Connection refused" or timeout errors

**Solution**:
- Verify Python service is running (check health endpoint)
- Ensure URL includes `/predict` at the end
- Check service logs for errors
- Verify firewall/CORS settings

### Issue: Model loading fails

**Solution**:
- Verify `xgb_fusion_model.pkl` is in correct location
- Check Python and xgboost versions match
- View service logs: `railway logs` or equivalent

### Issue: Video processing fails

**Solution**:
- Ensure video format is supported (MP4, AVI, MOV)
- Check video file size (< 20MB recommended)
- Verify OpenCV is installed correctly
- Check service memory limits

### Issue: Low prediction accuracy

**Solution**:
- Ensure video quality is sufficient (720p or higher)
- Video should be at least 10 seconds long
- Video should clearly show the subject
- Consider retraining model with more diverse data

## Performance Optimization

### For Production Use:

1. **Increase Worker Count**
   - Railway/Render: Upgrade to higher tier
   - Add more gunicorn workers: `--workers 4`

2. **Add Caching**
   - Implement Redis cache for repeated video URLs
   - Cache model predictions for 24 hours

3. **Enable GPU Processing**
   - Use GPU-enabled instance for faster video processing
   - Install `opencv-python-headless` for better performance

4. **Optimize Video Processing**
   - Reduce frame sampling rate for longer videos
   - Implement async processing for large videos
   - Add job queue (Celery) for background processing

5. **Monitor Performance**
   - Set up logging aggregation (Sentry, LogDNA)
   - Monitor API response times
   - Track prediction accuracy metrics

## Cost Estimates

### Railway (Recommended)
- **Free Tier**: $5 credit/month, ~500 hours runtime
- **Hobby**: $5/month for more resources
- **Pro**: $20/month for production use

### Render
- **Free Tier**: 750 hours/month (sleeps after 15 min inactivity)
- **Starter**: $7/month (always on)
- **Standard**: $25/month (production ready)

### Heroku
- **Basic**: $7/month per dyno
- **Standard**: $25/month per dyno

## Security Considerations

1. **API Authentication**: Edge function already validates Supabase auth tokens
2. **Rate Limiting**: Implement rate limiting on Python service (using Flask-Limiter)
3. **Input Validation**: Service validates video URLs and file sizes
4. **Data Privacy**: Videos are processed and deleted, not stored permanently
5. **CORS**: Configured to accept requests from Supabase only

## Next Steps

1. Monitor initial predictions for accuracy
2. Collect user feedback on ML-enhanced assessments
3. Fine-tune model based on production data
4. Implement A/B testing for different model versions
5. Add telemetry and analytics

## Support

For issues:
1. Check service logs first
2. Verify environment variables are set correctly
3. Test health endpoint and prediction endpoint separately
4. Review Supabase Edge Function logs
5. Check database for stored predictions

## Summary

After completing these steps, your system will:
- Accept video uploads from users
- Process videos using the XGBoost fusion model
- Extract behavioral features automatically
- Combine questionnaire + ML scores
- Store results in database
- Display enhanced predictions to users

The integration is complete when you see ML scores appearing in the assessment results alongside questionnaire scores.
