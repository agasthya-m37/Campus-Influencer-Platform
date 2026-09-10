#!/usr/bin/env bash
# Compliance guards that a code review would not reliably catch.
#
# Checks product code only: comments and tests may name the prohibited terms,
# since that is how the prohibition gets documented in the first place.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0

# Strip comments, so a note explaining a rule is not read as breaking it.
strip() { sed -e 's://.*::' -e '/^[[:space:]]*\*/d' -e '/^[[:space:]]*\/\*/d'; }

check() {
  local label="$1" pattern="$2" hits=""
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if strip < "$f" | grep -qiE "$pattern"; then hits="$hits$f"$'\n'; fi
  done < <(grep -rlniE "$pattern" src --include='*.ts' --include='*.tsx' \
             --exclude='*.test.ts' --exclude='*.test.tsx' 2>/dev/null)

  if [ -n "$hits" ]; then
    echo "FAIL  $label"
    printf '%s' "$hits" | sed 's/^/        /'
    fail=1
  else
    echo "ok    $label"
  fi
}

# F-DASH-04: this phrase must not appear in the product.
check "no forbidden earnings phrasing" "money generated"

# F-ONB-08 / D3: no identity documents or payment instruments in Phase 1.
check "no identity documents"   "aadhaar|pan_number|college_id_proof|id_card_"
check "no payment instruments"  "upi_id|bank_account|ifsc|account_number"

exit $fail
