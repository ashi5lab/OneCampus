-- Add publish_marks toggle to assignments and online exams
ALTER TABLE onec_assignments ADD COLUMN IF NOT EXISTS publish_marks BOOLEAN DEFAULT false;
ALTER TABLE onec_online_exams ADD COLUMN IF NOT EXISTS publish_marks BOOLEAN DEFAULT false;
