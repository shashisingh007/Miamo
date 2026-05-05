-- Add more pure likes (no move/message) to miamo1
INSERT INTO "Like" (id, "fromUserId", "toUserId", "targetType", "createdAt")
VALUES 
  (gen_random_uuid(), '1bf00a98-05aa-4d83-8865-64561ed19346', 'd155b595-cd57-4817-9cfd-385e8a4dd52b', 'profile', NOW() - INTERVAL '3 hours'),
  (gen_random_uuid(), '620d4810-efcf-4721-8f51-c278ca38106f', 'd155b595-cd57-4817-9cfd-385e8a4dd52b', 'photo', NOW() - INTERVAL '8 hours'),
  (gen_random_uuid(), '2863c7ce-f285-42ab-9883-d0196e517bb3', 'd155b595-cd57-4817-9cfd-385e8a4dd52b', 'profile', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;
