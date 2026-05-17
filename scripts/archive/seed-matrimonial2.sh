#!/bin/bash
# Seed matrimonial profiles - GET first to auto-create, then PUT

declare -a USERS=("miamo2" "miamo3" "miamo4" "miamo5" "miamo6" "miamo7" "miamo8")
declare -a NAMES=("Priya Sharma" "Aarav Patel" "Neha Gupta" "Rohan Rajput" "Kavya Iyer" "Arjun Singh" "Meera Reddy")
declare -a RELIGIONS=("Hindu" "Hindu" "Hindu" "Hindu" "Hindu" "Sikh" "Hindu")
declare -a CASTES=("Brahmin" "Patel" "Gupta" "Rajput" "Iyer" "Jat Sikh" "Reddy")
declare -a TONGUES=("Hindi" "Gujarati" "Hindi" "Hindi" "Tamil" "Punjabi" "Telugu")
declare -a EDUS=("MBA" "B.Tech/B.E." "CA" "MBBS" "M.Tech/M.E." "BBA" "Ph.D.")
declare -a JOBS=("HR Manager" "Software Engineer" "Chartered Accountant" "Doctor" "Data Scientist" "Business Analyst" "Professor")
declare -a COMPANIES=("TCS" "Google" "Deloitte" "AIIMS" "Amazon" "Infosys" "IIT Delhi")
declare -a CITIES=("Mumbai" "Ahmedabad" "Delhi" "Jaipur" "Chennai" "Chandigarh" "Hyderabad")
declare -a INCOMES=("10-15 Lakh" "20-30 Lakh" "15-20 Lakh" "30-50 Lakh" "20-30 Lakh" "8-10 Lakh" "15-20 Lakh")

for i in "${!USERS[@]}"; do
  USER="${USERS[$i]}"
  echo -n "[$USER] Login... "
  
  TOKEN=$(curl -s http://localhost:3200/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${USER}@miamo.test\",\"password\":\"${USER}\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
  
  if [ -z "$TOKEN" ]; then
    echo "FAIL"
    continue
  fi
  
  # First GET to auto-create the profile
  curl -s http://localhost:3200/api/v1/matrimonial/profile \
    -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
  
  # Then PUT to update
  RESULT=$(curl -s -X PUT http://localhost:3200/api/v1/matrimonial/profile \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{
      \"fullName\": \"${NAMES[$i]}\",
      \"religion\": \"${RELIGIONS[$i]}\",
      \"caste\": \"${CASTES[$i]}\",
      \"motherTongue\": \"${TONGUES[$i]}\",
      \"education\": \"${EDUS[$i]}\",
      \"occupation\": \"${JOBS[$i]}\",
      \"company\": \"${COMPANIES[$i]}\",
      \"workingCity\": \"${CITIES[$i]}\",
      \"annualIncome\": \"${INCOMES[$i]}\",
      \"height\": \"5'8\",
      \"manglik\": \"No\",
      \"diet\": \"Vegetarian\",
      \"familyType\": \"Nuclear\",
      \"familyStatus\": \"Upper Middle Class\",
      \"aboutMe\": \"Looking for a life partner who shares my values.\",
      \"maritalStatus\": \"Never Married\"
    }")
  
  CHECK=$(echo "$RESULT" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('fullName','FAIL'))" 2>/dev/null)
  echo "OK -> $CHECK"
done

echo ""
docker exec miamo-postgres-local psql -U miamo -d miamo -c "SELECT \"fullName\", religion, caste FROM \"MatrimonialProfile\";"
