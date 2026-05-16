#!/bin/bash
DB="docker exec miamo-postgres-local psql -U miamo -d miamo -t -c"
tables=("User" "Profile" "Photo" "Interest" "Prompt" "Match" "Chat" "Message" "Like" "FeedPost" "Story" "Video" "CreativityItem" "Notification" "MatrimonialProfile" "DiscoverFilter" "MiamoMove" "Beat")
for t in "${tables[@]}"; do
  cnt=$($DB "SELECT count(*) FROM \"$t\";" 2>/dev/null | xargs)
  printf "%-22s %s\n" "$t" "$cnt"
done
