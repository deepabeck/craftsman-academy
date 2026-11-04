-- Marks tasks whose ai_score is known to be the AI's original score.
-- Before this, re-grading overwrote ai_score with the parent's score, so for
-- already-approved tasks where ai_score = final_score the original is unknown.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_score_locked boolean NOT NULL DEFAULT false;

-- If ai_score differs from final_score it cannot have been overwritten by a re-grade.
UPDATE tasks
SET ai_score_locked = true
WHERE status = 'approved'
  AND ai_score IS NOT NULL
  AND final_score IS NOT NULL
  AND ai_score <> final_score;
