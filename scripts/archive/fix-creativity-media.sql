-- Add media URLs to creativity items based on their category
UPDATE "CreativityItem" ci
SET "mediaUrl" = sub.url, type = 'image'
FROM (
  SELECT ci2.id,
    CASE cc.name
      WHEN 'Sports' THEN 'https://images.unsplash.com/photo-1461896836934-bd45ba688b94?w=800&h=1200&fit=crop'
      WHEN 'Music' THEN 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=1200&fit=crop'
      WHEN 'Art' THEN 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=1200&fit=crop'
      WHEN 'Dance' THEN 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=800&h=1200&fit=crop'
      WHEN 'Comedy' THEN 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&h=1200&fit=crop'
      WHEN 'Fitness' THEN 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=1200&fit=crop'
      WHEN 'Cooking' THEN 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=1200&fit=crop'
      WHEN 'Photography' THEN 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=1200&fit=crop'
      WHEN 'Travel' THEN 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=1200&fit=crop'
      WHEN 'Fashion' THEN 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=1200&fit=crop'
      WHEN 'Tech Projects' THEN 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=1200&fit=crop'
      WHEN 'Singing' THEN 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&h=1200&fit=crop'
      WHEN 'Poetry' THEN 'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=800&h=1200&fit=crop'
      WHEN 'Writing' THEN 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=1200&fit=crop'
      WHEN 'Lifestyle' THEN 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=1200&fit=crop'
      WHEN 'Nature' THEN 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=1200&fit=crop'
      WHEN 'Date Ideas' THEN 'https://images.unsplash.com/photo-1529543544282-ea69407b3656?w=800&h=1200&fit=crop'
      WHEN 'Career Highlights' THEN 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1200&fit=crop'
      WHEN 'Acting' THEN 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&h=1200&fit=crop'
      ELSE 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=1200&fit=crop'
    END as url
  FROM "CreativityItem" ci2
  JOIN "CreativityCategory" cc ON ci2."categoryId" = cc.id
  WHERE ci2."mediaUrl" IS NULL OR ci2."mediaUrl" = ''
) sub
WHERE ci.id = sub.id;

-- Also add some variety: give each item a unique image by adding a random seed param
UPDATE "CreativityItem"
SET "mediaUrl" = "mediaUrl" || '&sig=' || LEFT(id::text, 8)
WHERE "mediaUrl" IS NOT NULL AND "mediaUrl" != '' AND "mediaUrl" NOT LIKE '%&sig=%';
