/*
  # Add Assessment History and Video Predictions Tables

  1. New Tables
    - `assessment_history`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - User who took the assessment
      - `role` (text) - Role type (individual, parent, clinician)
      - `questionnaire_score` (numeric) - Score from questionnaire (0-100)
      - `ml_score` (numeric, nullable) - ML model score if video was uploaded
      - `fused_score` (numeric) - Final combined score
      - `severity` (text) - Severity level
      - `metadata` (jsonb) - Additional assessment data
      - `video_url` (text, nullable) - URL of uploaded video
      - `created_at` (timestamptz) - Timestamp of assessment
      
    - `video_predictions`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - User who uploaded the video
      - `assessment_id` (uuid, nullable) - Link to assessment
      - `video_url` (text) - URL of the analyzed video
      - `prediction_score` (numeric) - ML model prediction score (0-100)
      - `confidence` (numeric) - Model confidence (0-1)
      - `features_detected` (jsonb) - Extracted video features
      - `processing_time_ms` (integer) - Time taken to process
      - `created_at` (timestamptz) - Timestamp of analysis

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
    - Proper foreign key constraints
    
  3. Indexes
    - Indexes on user_id for fast lookups
    - Indexes on created_at for chronological queries
*/

-- Assessment History Table
CREATE TABLE IF NOT EXISTS public.assessment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('individual', 'parent', 'clinician')),
  questionnaire_score numeric NOT NULL CHECK (questionnaire_score >= 0 AND questionnaire_score <= 100),
  ml_score numeric CHECK (ml_score IS NULL OR (ml_score >= 0 AND ml_score <= 100)),
  fused_score numeric NOT NULL CHECK (fused_score >= 0 AND fused_score <= 100),
  severity text NOT NULL CHECK (severity IN ('low', 'mild', 'moderate', 'high')),
  metadata jsonb DEFAULT '{}'::jsonb,
  video_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_history_user_id ON public.assessment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_history_created_at ON public.assessment_history(created_at DESC);

ALTER TABLE public.assessment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessment history"
  ON public.assessment_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
  ON public.assessment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON public.assessment_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Video Predictions Table
CREATE TABLE IF NOT EXISTS public.video_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assessment_id uuid,
  video_url text NOT NULL,
  prediction_score numeric NOT NULL CHECK (prediction_score >= 0 AND prediction_score <= 100),
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  features_detected jsonb DEFAULT '{}'::jsonb,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT fk_assessment 
    FOREIGN KEY (assessment_id) 
    REFERENCES public.assessment_history(id) 
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_video_predictions_user_id ON public.video_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_predictions_created_at ON public.video_predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_predictions_assessment_id ON public.video_predictions(assessment_id);

ALTER TABLE public.video_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video predictions"
  ON public.video_predictions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video predictions"
  ON public.video_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own video predictions"
  ON public.video_predictions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.assessment_history IS 'Stores complete ASD assessment results including questionnaire and ML scores';
COMMENT ON TABLE public.video_predictions IS 'Stores ML model predictions from video analysis for ASD assessment';
COMMENT ON COLUMN public.video_predictions.prediction_score IS 'ML model prediction score (0-100 scale)';
COMMENT ON COLUMN public.video_predictions.confidence IS 'Model confidence level (0-1 scale)';
COMMENT ON COLUMN public.video_predictions.features_detected IS 'JSON object containing extracted behavioral features from video';
