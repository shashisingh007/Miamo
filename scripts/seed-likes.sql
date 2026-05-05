-- Create incoming likes for miamo1 (user d155b595-cd57-4817-9cfd-385e8a4dd52b)
-- From miamo6 (19e52f9e), miamo7 (2e144f08), miamo8 (63384317), miamo9, miamo10
INSERT INTO "Like" (id, "fromUserId", "toUserId", "targetType", "createdAt")
VALUES 
  (gen_random_uuid(), '19e52f9e-f8ab-4f42-867b-e1c3aa159340', 'd155b595-cd57-4817-9cfd-385e8a4dd52b', 'profile', NOW() - INTERVAL '2 hours'),
  (gen_random_uuid(), '2e144f08-b726-48c8-82d6-5975ba2fd3a8', 'd155b595-cd57-4817-9cfd-385e8a4dd52b', 'profile', NOW() - INTERVAL '5 hours'),
  (gen_random_uuid(), '63384317-99fd-4e56-b150-6e4fddb4c58b', 'd155b595-cd57-4817-9cfd-385e8a4dd52b', 'profile', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Create move messages from first two
INSERT INTO "MatchRequest" (id, "fromUserId", "toUserId", type, message, "targetType", status, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '19e52f9e-f8ab-4f42-867b-e1c3aa159340', 'd155b595-cd57-4817-9cfd-385e8a4dd52b', 'comment', 'Your photography caught my eye! Would love to know more about your travels.', 'profile', 'pending', NOW() - INTERVAL '2 hours', NOW()),
  (gen_random_uuid(), '2e144f08-b726-48c8-82d6-5975ba2fd3a8', 'd155b595-cd57-4817-9cfd-385e8a4dd52b', 'comment', 'Fellow coffee lover here - what is your go-to order?', 'profile', 'pending', NOW() - INTERVAL '5 hours', NOW())
ON CONFLICT DO NOTHING;
