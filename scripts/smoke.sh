#!/usr/bin/env bash
# End-to-end API smoke test. Exercises every business rule in docs/technical-design.md §7.
# Usage: BASE=http://localhost:3000 ADMIN_EMAIL=founder@example.com scripts/smoke.sh
# Requires: curl, node. Creates throwaway accounts with random emails; safe to run repeatedly.
set -u

BASE=${BASE:-http://localhost:3000}
ADMIN_EMAIL=${ADMIN_EMAIL:?set ADMIN_EMAIL to an address listed in ADMIN_EMAILS}
RUN=$(date +%s)$RANDOM
TMP=$(mktemp -d)
PASS=0; FAIL=0

json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);const p=process.argv[1].split(".");let v=o;for(const k of p){if(k==="")continue;v=v==null?undefined:v[k]}console.log(v===undefined?"":typeof v==="object"?JSON.stringify(v):String(v))}catch{console.log("")}})' "$1"; }
# call METHOD PATH [COOKIEJAR] [JSON_BODY] -> sets $STATUS and $BODY
call() {
    local method=$1 path=$2 jar=${3:-} body=${4:-}
    local args=(-s -o "$TMP/body" -w '%{http_code}' -X "$method" "$BASE$path")
    [ -n "$jar" ] && args+=(-b "$jar" -c "$jar")
    [ -n "$body" ] && args+=(-H 'content-type: application/json' -d "$body")
    STATUS=$(curl "${args[@]}")
    BODY=$(cat "$TMP/body")
}
check() { # check "label" "expected" "actual"
    if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; else FAIL=$((FAIL+1)); printf '  FAIL %s (expected %s, got %s)\n' "$1" "$2" "$3"; fi
}
field() { echo "$BODY" | json "$1"; }

echo "== accounts"
A=$TMP/admin.jar; U=$TMP/user.jar
GUEST="guest-$RUN@example.com"; TRADER="trader-$RUN@example.com"
call POST /api/auth/signup "$A" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"smoke-pass-1\"}"
[ "$STATUS" = 409 ] && call POST /api/auth/signin "$A" "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"smoke-pass-1\"}"
check "admin signed in" "true" "$(field data.user.isAdmin)"
call POST /api/auth/signup "$U" "{\"email\":\"$GUEST\",\"password\":\"smoke-pass-1\",\"name\":\"Guest Person\"}"
check "user signup 201" 201 "$STATUS"
check "user is not admin" "false" "$(field data.user.isAdmin)"
call POST /api/auth/signup "" "{\"email\":\"$GUEST\",\"password\":\"smoke-pass-1\"}"
check "duplicate signup 409" 409 "$STATUS"
call POST /api/auth/signin "" "{\"email\":\"$GUEST\",\"password\":\"wrong\"}"
check "wrong password 401" 401 "$STATUS"
call POST /api/auth/signup "" "{\"email\":\"x-$RUN@example.com\",\"password\":\"short\"}"
check "weak password 400" 400 "$STATUS"
call POST /api/auth/signout "$U"
call GET /api/auth/me "$U"
check "signed out -> user null" "null" "$(field data.user)"
call POST /api/auth/signin "$U" "{\"email\":\"$GUEST\",\"password\":\"smoke-pass-1\"}"
check "signin 200" 200 "$STATUS"

echo "== authorization"
call GET /api/admin/puzzles ""
check "admin route without session 401" 401 "$STATUS"
call GET /api/admin/puzzles "$U"
check "admin route as user 403" 403 "$STATUS"
call GET /api/admin/puzzles "$A"
check "admin route as admin 200" 200 "$STATUS"
call GET /api/me/credits ""
check "me route without session 401" 401 "$STATUS"
call POST /api/redemptions "" '{"puzzleIds":[]}'
check "redeem without session 401" 401 "$STATUS"

echo "== upload"
printf '\x89PNG\r\n\x1a\n\0\0\0\rIHDR\0\0\0\x01\0\0\0\x01\x08\x02\0\0\0\x90wS\xde\0\0\0\0IEND\xaeB`\x82' > "$TMP/px.png"
STATUS=$(curl -s -o "$TMP/body" -w '%{http_code}' -X POST "$BASE/api/upload" -F "puzzlePhoto=@$TMP/px.png;type=image/png"); BODY=$(cat "$TMP/body")
check "upload png 201" 201 "$STATUS"
IMG=$(field data.imageUrl)
check "image served" 200 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$IMG")"
printf '<html><script>alert(1)</script></html>' > "$TMP/evil.png"
STATUS=$(curl -s -o "$TMP/body" -w '%{http_code}' -X POST "$BASE/api/upload" -F "puzzlePhoto=@$TMP/evil.png;type=image/png")
check "html disguised as png 400" 400 "$STATUS"
check "traversal 404" 404 "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/uploads/..%2F..%2Fpackage.json")"

P() { echo "{\"name\":\"$1\",\"pieces\":$2,\"theme\":\"$3\",\"imageUrl\":\"$IMG\"}"; }

echo "== donations and credits"
call POST /api/donations "" "{\"name\":\"Guest Person\",\"email\":\"$GUEST\",\"puzzles\":[$(P "Smoke A $RUN" 500 Animals),$(P "Smoke B $RUN" 1000 Art)]}"
check "guest donation 201" 201 "$STATUS"
check "new donor starts at -1" -1 "$(field data.balance)"
check "estimate = one credit per puzzle" 2 "$(field data.estimatedCredits)"
check "estimated balance after approval" 1 "$(field data.estimatedBalance)"
call POST /api/donations "" "{\"name\":\"X\",\"email\":\"$GUEST\",\"puzzles\":[{\"name\":\"Bad\",\"pieces\":750,\"theme\":\"Art\",\"condition\":\"good\",\"imageUrl\":\"$IMG\"}]}"
check "invalid pieces 400" 400 "$STATUS"
check "field path reported" "puzzles.0.pieces" "$(field error.field)"
call GET /api/puzzles ""
check "pending puzzles not public" 0 "$(echo "$BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).data.filter(p=>p.name.endsWith(" "+process.argv[1])).length))' "$RUN")"
call GET "/api/admin/donation-batches?status=pending_review" "$A"
BATCH=$(echo "$BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s).data.find(b=>b.donorEmail===process.argv[1]);console.log(b?b.id:"")})' "$GUEST")
check "batch listed" "true" "$([ -n "$BATCH" ] && echo true || echo false)"
call POST "/api/admin/donation-batches/$BATCH" "$A" '{"action":"accept"}'
check "accept 200" 200 "$STATUS"
check "credits awarded = puzzles approved" 2 "$(field data.creditsAwarded)"
call POST "/api/admin/donation-batches/$BATCH" "$A" '{"action":"accept"}'
check "accept twice 409" 409 "$STATUS"
call GET /api/puzzles ""
check "public list has no emails" "" "$(echo "$BODY" | grep -o 'example.com' | head -1)"
call GET "/api/trader-status?email=$GUEST" ""
check "donor is now returning" "true" "$(field data.returning)"
call POST /api/donations "$U" "{\"name\":\"Guest Person\",\"puzzles\":[$(P "Smoke C $RUN" 300 Food)]}"
check "returning donor estimate = count" 1 "$(field data.estimatedCredits)"
BATCH2=$(field data.batchId)
call POST "/api/admin/donation-batches/$BATCH2" "$A" '{"action":"accept"}'
check "second batch credits = count" 1 "$(field data.creditsAwarded)"
call GET /api/me/credits "$U"
check "balance = 2" 2 "$(field data.balance)"

echo "== trades"
call GET /api/puzzles ""
WANT=$(echo "$BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).data.find(p=>p.name==="Smoke A "+process.argv[1]).id))' "$RUN")
call GET "/api/trader-status?email=$TRADER" ""
check "fresh trader is new (needs 2)" 2 "$(field data.requiredGiven)"
TRADE_BASE="\"name\":\"Trader\",\"email\":\"$TRADER\",\"wantedPuzzleId\":\"$WANT\",\"dropoffDate\":\"2099-01-05\",\"dropoffSlot\":\"14:00\""
call POST /api/trades "" "{$TRADE_BASE,\"givenPuzzles\":[$(P 'Given 1' 500 Movies)]}"
check "new trader with 1 puzzle 400" 400 "$STATUS"
call POST /api/trades "" "{$TRADE_BASE,\"givenPuzzles\":[$(P 'Given 1' 500 Movies),$(P 'Given 2' 500 Cityscape)]}"
check "new trader with 2 puzzles 201" 201 "$STATUS"
check "tier snapshot new" "new" "$(field data.tier)"
TRADE=$(field data.tradeId)
call GET "/api/trader-status?email=$TRADER" ""
check "credit charged at request (-2)" -2 "$(field data.balance)"
call GET /api/puzzles ""
check "wanted puzzle reserved (gone from Explore)" "" "$(echo "$BODY" | grep -o "$WANT")"
call POST /api/trades "" "{$TRADE_BASE,\"givenPuzzles\":[$(P 'G' 500 Movies),$(P 'G' 500 Movies),$(P 'G' 500 Movies)]}"
check "reserved puzzle cannot be picked 409 (balance -2 needs 3 pledged)" 409 "$STATUS"
call DELETE "/api/admin/puzzles/$WANT" "$A"
check "reserved puzzle cannot be deleted 409" 409 "$STATUS"
call POST "/api/admin/trades/$TRADE" "$A" '{"action":"complete"}'
check "complete trade 200" 200 "$STATUS"
check "received puzzle traded" "traded" "$(curl -s -b "$A" "$BASE/api/admin/puzzles?status=traded" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).data.find(p=>p.id===process.argv[1]);console.log(p?p.status:"")})' "$WANT")"
call GET "/api/trader-status?email=$TRADER" ""
check "trader now returning (needs 1)" 1 "$(field data.requiredGiven)"
check "balance 0 after completion (+2 approved, -1 taken)" 0 "$(field data.balance)"
check "given puzzles approved on completion" 2 "$(curl -s -b "$A" "$BASE/api/admin/trades?status=completed" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).data.find(t=>t.id===process.argv[1]);console.log(t?t.given.filter(g=>g.status==="available").length:"")})' "$TRADE")"
check "puzzlesAdded counted" 2 "$(field data.puzzlesAdded)"
call POST /api/trades "" "{\"name\":\"Trader\",\"email\":\"$TRADER\",\"wantedPuzzleId\":\"$WANT\",\"dropoffDate\":\"2099-01-05\",\"dropoffSlot\":\"10:00\",\"givenPuzzles\":[$(P G 500 Movies),$(P G 500 Movies)]}"
check "returning trader with 2 puzzles 400" 400 "$STATUS"
call GET /api/puzzles ""
WANT2=$(echo "$BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).data.find(p=>p.name==="Smoke B "+process.argv[1]).id))' "$RUN")
call POST /api/trades "" "{\"name\":\"Trader\",\"email\":\"$TRADER\",\"wantedPuzzleId\":\"$WANT2\",\"dropoffDate\":\"2099-01-05\",\"dropoffSlot\":\"10:00\",\"givenPuzzles\":[$(P 'Given 3' 300 Other)]}"
check "returning trader 1-for-1 201" 201 "$STATUS"
TRADE2=$(field data.tradeId)
call POST "/api/admin/trades/$TRADE2" "$A" '{"action":"cancel"}'
check "cancel trade 200" 200 "$STATUS"
call GET "/api/trader-status?email=$TRADER" ""
check "refund on cancel (back to 0)" 0 "$(field data.balance)"
call GET /api/puzzles ""
check "cancelled trade releases puzzle" "$WANT2" "$(echo "$BODY" | grep -o "$WANT2" | head -1)"
check "given puzzle rejected on cancel" "rejected" "$(echo "$BODY" >/dev/null; curl -s -b "$A" "$BASE/api/admin/trades?status=cancelled" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).data.find(t=>t.id===process.argv[1]);console.log(t?t.given[0].status:"")})' "$TRADE2")"

echo "== credits spend"
call GET /api/puzzles ""
IDS=$(echo "$BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).data.filter(p=>["Smoke B "+process.argv[1],"Smoke C "+process.argv[1]].includes(p.name)).map(p=>p.id))))' "$RUN")
ONE=$(echo "$IDS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0]))')
call POST /api/redemptions "$U" "{\"puzzleIds\":[\"$ONE\",\"$ONE\",\"00000000-0000-4000-8000-000000000000\",\"00000000-0000-4000-8000-000000000001\"]}"
check "redeem beyond balance 400" 400 "$STATUS"
call POST /api/redemptions "$U" "{\"puzzleIds\":[\"$ONE\"]}"
check "redeem 1 -> 201" 201 "$STATUS"
check "balance after redeem = 1" 1 "$(field data.balance)"
RED=$(field data.redemptionId)
call POST /api/redemptions "$U" "{\"puzzleIds\":[\"$ONE\"]}"
check "redeem reserved puzzle 409" 409 "$STATUS"
call POST "/api/admin/redemptions/$RED" "$A" '{"action":"fulfill"}'
check "fulfill 200" 200 "$STATUS"
check "fulfilled puzzles claimed" "claimed" "$(curl -s -b "$A" "$BASE/api/admin/puzzles?status=claimed" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).data.find(p=>p.id===process.argv[1]);console.log(p?p.status:"")})' "$ONE")"
TWO=$(echo "$IDS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[1]))')
call POST /api/redemptions "$U" "{\"puzzleIds\":[\"$TWO\"]}"
RED2=$(field data.redemptionId)
call POST "/api/admin/redemptions/$RED2" "$A" '{"action":"cancel"}'
check "cancel pickup 200" 200 "$STATUS"
call GET /api/me/credits "$U"
check "refund restores balance to 1" 1 "$(field data.balance)"
call GET /api/me/history "$U"
check "history: 2 donations" 2 "$(echo "$BODY" | json data.donations | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')"
check "history: 2 redemptions" 2 "$(echo "$BODY" | json data.redemptions | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')"

echo "== admin inventory and users"
call POST /api/admin/puzzles "$A" "{\"name\":\"Admin P\",\"pieces\":2000,\"theme\":\"Landscape\",\"imageUrl\":\"$IMG\"}"
check "admin create 201" 201 "$STATUS"
check "admin puzzle available" "available" "$(field data.status)"
check "admin puzzle condition n/a" "n/a" "$(field data.condition)"
ADMINP=$(field data.id)
call PATCH "/api/admin/puzzles/$ADMINP" "$A" '{"status":"traded"}'
check "admin cannot set traded directly 400" 400 "$STATUS"
call PATCH "/api/admin/puzzles/$ADMINP" "$A" '{"name":"Admin Renamed","status":"rejected"}'
check "status via edit 400 (review lives on Donations/Trades)" 400 "$STATUS"
call PATCH "/api/admin/puzzles/$ADMINP" "$A" '{"name":"Admin Renamed"}'
check "admin edit 200" 200 "$STATUS"
call POST "/api/admin/puzzles/$ADMINP/review" "$A" '{"action":"accept"}'
check "admin inventory is not reviewable 409" 409 "$STATUS"
call DELETE "/api/admin/puzzles/$ADMINP" "$A"
check "admin delete 200" 200 "$STATUS"
call GET /api/admin/users "$A"
check "users list includes guest with balance" 1 "$(echo "$BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const u=JSON.parse(s).data.find(u=>u.email===process.argv[1]);console.log(u?u.creditBalance:"")})' "$GUEST")"

echo "== per-puzzle credits and admin adjustment"
call POST /api/admin/credit-entries "$A" "{\"email\":\"$GUEST\",\"delta\":1,\"note\":\"smoke\"}"
check "admin adjustment 201" 201 "$STATUS"
check "adjusted balance = 2" 2 "$(field data.balance)"
call POST /api/donations "$U" "{\"name\":\"Guest Person\",\"puzzles\":[$(P "Smoke D $RUN" 100 Other),$(P "Smoke E $RUN" 300 Art)]}"
BATCH3=$(field data.batchId)
batch() { curl -s -b "$A" "$BASE/api/admin/donation-batches" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s).data.find(b=>b.id===process.argv[1]);const k=process.argv[2];console.log(!b?"":k==="puzzle0"?b.puzzles[0].id:k==="puzzle1"?b.puzzles[1].id:k==="p0status"?b.puzzles[0].status:k==="p1status"?b.puzzles[1].status:String(b[k]))})' "$BATCH3" "$1"; }
PZ=$(batch puzzle0); PZ2=$(batch puzzle1)
call POST "/api/admin/puzzles/$PZ/review" "$A" '{"action":"accept"}'
check "accept one puzzle of two 200" 200 "$STATUS"
check "review returns donor balance (3)" 3 "$(field data.balance)"
check "batch still pending while one puzzle awaits review" "pending_review" "$(batch status)"
check "batch credits unknown while pending" "null" "$(batch creditsAwarded)"
call POST "/api/admin/puzzles/$PZ/review" "$A" '{"action":"accept"}'
check "accept twice 409" 409 "$STATUS"
call POST "/api/admin/puzzles/$PZ2/review" "$A" '{"action":"reject"}'
check "reject the other puzzle 200" 200 "$STATUS"
check "batch accepted once all reviewed" "accepted" "$(batch status)"
check "batch credits = 1" 1 "$(batch creditsAwarded)"
call POST "/api/admin/donation-batches/$BATCH3" "$A" '{"action":"accept"}'
check "accept all with nothing pending 409" 409 "$STATUS"
call POST "/api/admin/puzzles/$PZ2/review" "$A" '{"action":"restore"}'
check "restore rejected puzzle 200" 200 "$STATUS"
check "restore credits +1 (4)" 4 "$(field data.balance)"
check "batch credits = 2" 2 "$(batch creditsAwarded)"
call POST "/api/admin/puzzles/$PZ2/review" "$A" '{"action":"restore"}'
check "restore an available puzzle 409" 409 "$STATUS"
call POST "/api/admin/puzzles/$PZ2/review" "$A" '{"action":"reject"}'
call GET /api/me/credits "$U"
check "rejecting approved puzzle -1 (3)" 3 "$(field data.balance)"
call POST "/api/admin/puzzles/$PZ2/review" "$A" '{"action":"restore"}'
call GET /api/me/credits "$U"
check "restore does not double count (4)" 4 "$(field data.balance)"
call POST "/api/admin/puzzles/$WANT/review" "$A" '{"action":"reject"}'
check "traded puzzle cannot be rejected 409" 409 "$STATUS"
call GET "/api/admin/trades?status=completed" "$A"
GIVEN=$(echo "$BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const t=JSON.parse(s).data.find(t=>t.id===process.argv[1]);console.log(t?t.given[0].id:"")})' "$TRADE")
call POST "/api/admin/puzzles/$GIVEN/review" "$A" '{"action":"reject"}'
check "trade puzzles are reviewed through the trade 409" 409 "$STATUS"
call POST /api/donations "$U" "{\"name\":\"Guest Person\",\"puzzles\":[$(P "Smoke F $RUN" 100 Other),$(P "Smoke G $RUN" 300 Art)]}"
BATCH4=$(field data.batchId)
call POST "/api/admin/donation-batches/$BATCH4" "$A" '{"action":"accept"}'
check "accept all 200" 200 "$STATUS"
check "accept all publishes both" 2 "$(field data.puzzlesPublished)"
call GET /api/me/credits "$U"
check "accept all credits +2 (6)" 6 "$(field data.balance)"
call POST /api/donations "$U" "{\"name\":\"Guest Person\",\"puzzles\":[$(P "Smoke H $RUN" 100 Other)]}"
BATCH5=$(field data.batchId)
PZ5=$(curl -s -b "$A" "$BASE/api/admin/donation-batches?status=pending_review" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s).data.find(b=>b.id===process.argv[1]);console.log(b?b.puzzles[0].id:"")})' "$BATCH5")
call DELETE "/api/admin/puzzles/$PZ5" "$A"
check "delete pending puzzle 200" 200 "$STATUS"
check "batch with no puzzles left is not pending" "rejected" "$(curl -s -b "$A" "$BASE/api/admin/donation-batches" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s).data.find(b=>b.id===process.argv[1]);console.log(b?b.status:"")})' "$BATCH5")"

echo
echo "passed: $PASS  failed: $FAIL"
rm -rf "$TMP"
[ "$FAIL" = 0 ]
