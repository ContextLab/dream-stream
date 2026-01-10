-- Dream Stream MVP Seed Data
-- Run this after the schema migration to populate sample content

-- Insert categories
INSERT INTO categories (name, slug, icon, color, sort_order) VALUES
  ('Flying', 'flying', 'airplane', '#3b82f6', 1),
  ('Ocean', 'ocean', 'water', '#06b6d4', 2),
  ('Space', 'space', 'planet', '#8b5cf6', 3),
  ('Forest', 'forest', 'leaf', '#22c55e', 4),
  ('Mountains', 'mountains', 'triangle', '#f59e0b', 5),
  ('Urban', 'urban', 'business', '#6b7280', 6),
  ('Underwater', 'underwater', 'fish', '#0ea5e9', 7),
  ('Abstract', 'abstract', 'shapes', '#ec4899', 8)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample dreams
-- Using Mux's public test playback ID for demo content
INSERT INTO dreams (title, description, thumbnail_url, mux_playback_id, mux_asset_id, duration_seconds, category_id, is_featured, view_count) VALUES
  -- Flying category
  ('Soaring Through Clouds', 'Drift peacefully above a sea of fluffy white clouds as the golden sun rises.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-1', 180, (SELECT id FROM categories WHERE slug = 'flying'), TRUE, 1523),
  ('Eagle''s Flight', 'Experience the world from an eagle''s perspective as you glide over vast canyons.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-2', 240, (SELECT id FROM categories WHERE slug = 'flying'), FALSE, 892),
  ('Balloon Journey', 'Float gently in a hot air balloon over painted valleys and rivers.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-3', 300, (SELECT id FROM categories WHERE slug = 'flying'), FALSE, 654),
  
  -- Ocean category
  ('Sunset Beach', 'Walk along a pristine beach as waves gently lap at your feet during golden hour.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-4', 360, (SELECT id FROM categories WHERE slug = 'ocean'), TRUE, 2341),
  ('Island Paradise', 'Explore a tropical island with crystal-clear turquoise waters.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-5', 420, (SELECT id FROM categories WHERE slug = 'ocean'), FALSE, 1876),
  ('Ocean Storm', 'Witness the raw power of the sea during a magnificent thunderstorm.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-6', 280, (SELECT id FROM categories WHERE slug = 'ocean'), FALSE, 1102),
  
  -- Space category
  ('Starfield Journey', 'Travel through an infinite field of stars and distant galaxies.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-7', 480, (SELECT id FROM categories WHERE slug = 'space'), TRUE, 3201),
  ('Lunar Landscape', 'Walk on the surface of the moon with Earth hanging in the sky.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-8', 320, (SELECT id FROM categories WHERE slug = 'space'), FALSE, 1654),
  ('Nebula Dreams', 'Float through colorful cosmic clouds in a distant nebula.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-9', 540, (SELECT id FROM categories WHERE slug = 'space'), FALSE, 2102),
  ('Aurora Borealis', 'Watch the northern lights dance across a starlit sky.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-10', 390, (SELECT id FROM categories WHERE slug = 'space'), TRUE, 2876),
  
  -- Forest category
  ('Enchanted Woods', 'Wander through a magical forest filled with glowing fireflies.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-11', 420, (SELECT id FROM categories WHERE slug = 'forest'), TRUE, 1987),
  ('Autumn Trail', 'Follow a winding path through golden autumn foliage.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-12', 300, (SELECT id FROM categories WHERE slug = 'forest'), FALSE, 1432),
  ('Bamboo Grove', 'Find peace walking through towering bamboo stalks.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-13', 360, (SELECT id FROM categories WHERE slug = 'forest'), FALSE, 1198),
  ('Rainforest Canopy', 'Explore the lush canopy of a tropical rainforest.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-14', 480, (SELECT id FROM categories WHERE slug = 'forest'), FALSE, 1567),
  
  -- Mountains category
  ('Alpine Sunrise', 'Watch the sun paint snow-capped peaks in shades of pink and gold.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-15', 360, (SELECT id FROM categories WHERE slug = 'mountains'), TRUE, 2543),
  ('Valley Vista', 'Gaze down at a peaceful valley from a mountain summit.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-16', 300, (SELECT id FROM categories WHERE slug = 'mountains'), FALSE, 1321),
  ('Waterfall Descent', 'Follow a majestic waterfall down through misty cliffs.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-17', 420, (SELECT id FROM categories WHERE slug = 'mountains'), FALSE, 1876),
  
  -- Urban category
  ('Neon City', 'Roam through a futuristic city bathed in neon lights.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-18', 480, (SELECT id FROM categories WHERE slug = 'urban'), TRUE, 3102),
  ('Rooftop View', 'Watch the city lights twinkle from a high-rise rooftop at night.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-19', 300, (SELECT id FROM categories WHERE slug = 'urban'), FALSE, 1654),
  ('Rainy Streets', 'Stroll through quiet city streets glistening with rain.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-20', 360, (SELECT id FROM categories WHERE slug = 'urban'), FALSE, 1432),
  
  -- Underwater category
  ('Coral Kingdom', 'Swim through a vibrant coral reef teeming with colorful fish.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-21', 420, (SELECT id FROM categories WHERE slug = 'underwater'), TRUE, 2234),
  ('Deep Blue', 'Descend into the mysterious depths of the ocean.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-22', 540, (SELECT id FROM categories WHERE slug = 'underwater'), FALSE, 1765),
  ('Jellyfish Ballet', 'Watch ethereal jellyfish dance in bioluminescent waters.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-23', 360, (SELECT id FROM categories WHERE slug = 'underwater'), FALSE, 1987),
  
  -- Abstract category
  ('Fractal Dreams', 'Journey through infinite mathematical patterns and shapes.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-24', 480, (SELECT id FROM categories WHERE slug = 'abstract'), TRUE, 2654),
  ('Color Flow', 'Lose yourself in flowing streams of pure color and light.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-25', 300, (SELECT id FROM categories WHERE slug = 'abstract'), FALSE, 1543),
  ('Geometric Harmony', 'Explore a world of perfectly balanced geometric forms.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-26', 420, (SELECT id FROM categories WHERE slug = 'abstract'), FALSE, 1321),
  ('Soundscape', 'Experience a visual representation of calming sounds.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-27', 540, (SELECT id FROM categories WHERE slug = 'abstract'), FALSE, 1876),
  
  -- Additional dreams for 30 total
  ('Misty Lake', 'Find serenity on the shores of a peaceful mountain lake.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-28', 360, (SELECT id FROM categories WHERE slug = 'mountains'), FALSE, 1432),
  ('Desert Stars', 'Lie under a canopy of stars in a vast, quiet desert.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-29', 480, (SELECT id FROM categories WHERE slug = 'space'), FALSE, 2012),
  ('Cherry Blossoms', 'Walk beneath a canopy of delicate pink cherry blossoms.', 'https://image.mux.com/VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg/thumbnail.jpg', 'VcmKA6aqzIzlg3MayYKPt02M01Xkoo5Bg', 'demo-asset-30', 300, (SELECT id FROM categories WHERE slug = 'forest'), FALSE, 1765);

-- Add tags to dreams
INSERT INTO dream_tags (dream_id, tag) 
SELECT d.id, t.tag
FROM dreams d
CROSS JOIN (
  VALUES 
    ('relaxing'), ('peaceful'), ('calming'), ('meditative'), ('serene')
) AS t(tag)
WHERE d.title IN ('Soaring Through Clouds', 'Sunset Beach', 'Enchanted Woods', 'Alpine Sunrise', 'Coral Kingdom')
ON CONFLICT DO NOTHING;

INSERT INTO dream_tags (dream_id, tag)
SELECT d.id, t.tag
FROM dreams d  
CROSS JOIN (
  VALUES
    ('adventure'), ('exploration'), ('wonder'), ('journey')
) AS t(tag)
WHERE d.title IN ('Starfield Journey', 'Neon City', 'Deep Blue', 'Fractal Dreams')
ON CONFLICT DO NOTHING;

INSERT INTO dream_tags (dream_id, tag)
SELECT d.id, t.tag
FROM dreams d
CROSS JOIN (
  VALUES
    ('nature'), ('ambient'), ('immersive')
) AS t(tag)
WHERE d.category_id IN (SELECT id FROM categories WHERE slug IN ('forest', 'ocean', 'mountains'))
ON CONFLICT DO NOTHING;
