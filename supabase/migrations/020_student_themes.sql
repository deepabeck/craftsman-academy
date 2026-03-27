-- Migration 020: Student Themes
-- Adds theme column to user_settings and creates theme_library table
-- with seed data for 7 starter themes. Zero data impact.

-- ── user_settings: add theme column ───────────────────────────────────────────
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'default';

-- ── theme_library: defines available themes ───────────────────────────────────
CREATE TABLE theme_library (
  id              TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,

  -- Visual tokens
  color_palette   JSONB NOT NULL,
  font_display    TEXT NOT NULL DEFAULT 'Inter',
  font_body       TEXT NOT NULL DEFAULT 'Inter',
  background_url  TEXT,
  card_style      JSONB NOT NULL DEFAULT '{}',
  accent_style    JSONB NOT NULL DEFAULT '{}',

  is_active       BOOLEAN NOT NULL DEFAULT true,
  requires_tier   TEXT NOT NULL DEFAULT 'free'
                    CHECK (requires_tier IN ('free', 'standard', 'family')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE theme_library ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active themes
CREATE POLICY "authenticated_reads_themes" ON theme_library
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- ── Seed starter themes ──────────────────────────────────────────────────────
INSERT INTO theme_library (id, display_name, sort_order, color_palette, font_display, font_body, card_style, accent_style, description) VALUES
('default', 'Clean Slate', 0,
  '{"primary":"#3B82F6","secondary":"#1E40AF","accent":"#60A5FA","surface":"#FFFFFF","surfaceAlt":"#F8FAFC","text":"#1E293B","textMuted":"#64748B","border":"#E2E8F0"}'::jsonb,
  'Inter', 'Inter',
  '{"borderColor":"#E2E8F0","borderWidth":"1px","borderRadius":"12px","bgOpacity":"1","shadow":"0 1px 3px rgba(0,0,0,0.1)","backdropFilter":"none"}'::jsonb,
  '{"progressBarColor":"#3B82F6","badgeShape":"rounded","badgeColor":"#3B82F6","iconTint":"#3B82F6"}'::jsonb,
  'Clean, modern default. Light background, blue accents.'),

('steampunk', 'Steampunk Workshop', 1,
  '{"primary":"#E8A820","secondary":"#C8860A","accent":"#D4A830","surface":"rgba(8,17,30,0.85)","surfaceAlt":"rgba(20,35,60,0.7)","text":"#F0E8D8","textMuted":"#A09880","border":"rgba(232,168,32,0.3)"}'::jsonb,
  'Cinzel', 'Space Grotesk',
  '{"borderColor":"rgba(232,168,32,0.4)","borderWidth":"1px","borderRadius":"8px","bgOpacity":"0.85","shadow":"0 4px 12px rgba(0,0,0,0.4)","backdropFilter":"blur(12px)"}'::jsonb,
  '{"progressBarColor":"#E8A820","badgeShape":"rounded","badgeColor":"#C8860A","iconTint":"#E8A820"}'::jsonb,
  'Brass, gears, and glass-morphism. Inspired by Craftsman Academy.'),

('cosmic', 'Cosmic Explorer', 2,
  '{"primary":"#A78BFA","secondary":"#7C3AED","accent":"#C4B5FD","surface":"rgba(15,10,40,0.85)","surfaceAlt":"rgba(30,20,70,0.7)","text":"#EDE9FE","textMuted":"#A78BFA","border":"rgba(167,139,250,0.3)"}'::jsonb,
  'Orbitron', 'Inter',
  '{"borderColor":"rgba(167,139,250,0.3)","borderWidth":"1px","borderRadius":"16px","bgOpacity":"0.85","shadow":"0 4px 16px rgba(100,50,200,0.3)","backdropFilter":"blur(10px)"}'::jsonb,
  '{"progressBarColor":"#A78BFA","badgeShape":"rounded-full","badgeColor":"#7C3AED","iconTint":"#C4B5FD"}'::jsonb,
  'Deep space purples and nebula glow.'),

('jungle', 'Jungle Canopy', 3,
  '{"primary":"#22C55E","secondary":"#15803D","accent":"#86EFAC","surface":"rgba(10,30,15,0.85)","surfaceAlt":"rgba(20,50,30,0.7)","text":"#F0FDF4","textMuted":"#86EFAC","border":"rgba(34,197,94,0.3)"}'::jsonb,
  'Fredoka', 'Nunito',
  '{"borderColor":"rgba(34,197,94,0.3)","borderWidth":"1px","borderRadius":"16px","bgOpacity":"0.85","shadow":"0 4px 12px rgba(0,40,10,0.3)","backdropFilter":"blur(8px)"}'::jsonb,
  '{"progressBarColor":"#22C55E","badgeShape":"rounded-full","badgeColor":"#15803D","iconTint":"#86EFAC"}'::jsonb,
  'Rich greens and warm wood tones.'),

('minimalist', 'Modern Minimalist', 4,
  '{"primary":"#64748B","secondary":"#334155","accent":"#94A3B8","surface":"#FFFFFF","surfaceAlt":"#F1F5F9","text":"#0F172A","textMuted":"#64748B","border":"#E2E8F0"}'::jsonb,
  'Inter', 'Inter',
  '{"borderColor":"#E2E8F0","borderWidth":"1px","borderRadius":"8px","bgOpacity":"1","shadow":"0 1px 2px rgba(0,0,0,0.05)","backdropFilter":"none"}'::jsonb,
  '{"progressBarColor":"#64748B","badgeShape":"rounded","badgeColor":"#334155","iconTint":"#64748B"}'::jsonb,
  'Clean whites, slate grays, no texture. Maximum focus.'),

('bohemian', 'Bohemian Studio', 5,
  '{"primary":"#C2410C","secondary":"#9A3412","accent":"#FB923C","surface":"rgba(45,30,20,0.85)","surfaceAlt":"rgba(60,40,30,0.7)","text":"#FEF3C7","textMuted":"#D4A574","border":"rgba(194,65,12,0.3)"}'::jsonb,
  'Playfair Display', 'Lato',
  '{"borderColor":"rgba(194,65,12,0.3)","borderWidth":"1px","borderRadius":"12px","bgOpacity":"0.85","shadow":"0 4px 12px rgba(40,20,0,0.3)","backdropFilter":"blur(6px)"}'::jsonb,
  '{"progressBarColor":"#C2410C","badgeShape":"rounded","badgeColor":"#9A3412","iconTint":"#FB923C"}'::jsonb,
  'Warm terracotta and sage. Hand-crafted feel.'),

('midnight', 'Midnight Study', 6,
  '{"primary":"#3B82F6","secondary":"#1E3A5F","accent":"#93C5FD","surface":"rgba(10,15,30,0.9)","surfaceAlt":"rgba(20,30,50,0.8)","text":"#E2E8F0","textMuted":"#94A3B8","border":"rgba(59,130,246,0.2)"}'::jsonb,
  'Merriweather', 'Source Sans Pro',
  '{"borderColor":"rgba(59,130,246,0.2)","borderWidth":"1px","borderRadius":"10px","bgOpacity":"0.9","shadow":"0 4px 12px rgba(0,0,0,0.4)","backdropFilter":"blur(10px)"}'::jsonb,
  '{"progressBarColor":"#3B82F6","badgeShape":"rounded","badgeColor":"#1E3A5F","iconTint":"#93C5FD"}'::jsonb,
  'Dark mode with moody blues and warm lamp-light accents.')

ON CONFLICT (id) DO NOTHING;
