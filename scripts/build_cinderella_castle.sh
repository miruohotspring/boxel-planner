#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:-examples/cinderella-castle-50.boxel.json}"
CLI=(node packages/cli/dist/index.js)

STONE_BASE="#B8BEC9"
STONE_MAIN="#D9DDE5"
STONE_TRIM="#F4F6FB"
ROOF_BLUE="#3E5FA8"
ROOF_DARK="#27447F"
GOLD="#D8B343"
WINDOW="#203A74"

run() {
  "${CLI[@]}" "$@" --json >/dev/null
}

spire() {
  local cx="$1"
  local cz="$2"
  local start_y="$3"
  shift 3

  local radii_csv=""
  local r
  for r in "$@"; do
    if [[ -n "$radii_csv" ]]; then
      radii_csv+=","
    fi
    radii_csv+="$r"
  done

  run spire "$FILE" --cx "$cx" --cz "$cz" --y "$start_y" --radii "$radii_csv" --color "$ROOF_BLUE" --cap-color "$GOLD"
}

roof_box() {
  local x1="$1"
  local z1="$2"
  local x2="$3"
  local z2="$4"
  local start_y="$5"

  local y="$start_y"
  local shrink=0
  while [ "$x1" -le "$x2" ] && [ "$z1" -le "$z2" ]; do
    run fill "$FILE" --x1 "$x1" --y1 "$y" --z1 "$z1" --x2 "$x2" --y2 "$y" --z2 "$z2" --color "$ROOF_DARK"
    x1=$((x1 + 1))
    x2=$((x2 - 1))
    z1=$((z1 + 1))
    z2=$((z2 - 1))
    y=$((y + 1))
    shrink=$((shrink + 1))
    if [ "$shrink" -ge 3 ]; then
      break
    fi
  done
}

run init "cinderella-castle-50" --out "$FILE"

# Base terraces
run fill "$FILE" --x1 5 --y1 0 --z1 5 --x2 43 --y2 1 --z2 43 --color "$STONE_BASE"
run fill "$FILE" --x1 7 --y1 2 --z1 7 --x2 41 --y2 2 --z2 41 --color "$STONE_MAIN"
run fill "$FILE" --x1 10 --y1 3 --z1 9 --x2 38 --y2 3 --z2 40 --color "$STONE_TRIM"

# Lower volumes
run fill "$FILE" --x1 16 --y1 4 --z1 20 --x2 32 --y2 18 --z2 34 --color "$STONE_MAIN"
run fill "$FILE" --x1 18 --y1 19 --z1 22 --x2 30 --y2 29 --z2 32 --color "$STONE_TRIM"
run fill "$FILE" --x1 21 --y1 30 --z1 24 --x2 27 --y2 39 --z2 30 --color "$STONE_MAIN"

run fill "$FILE" --x1 8 --y1 4 --z1 20 --x2 15 --y2 14 --z2 34 --color "$STONE_MAIN"
run fill "$FILE" --x1 33 --y1 4 --z1 20 --x2 40 --y2 14 --z2 34 --color "$STONE_MAIN"
run fill "$FILE" --x1 18 --y1 4 --z1 12 --x2 30 --y2 14 --z2 19 --color "$STONE_TRIM"
run fill "$FILE" --x1 18 --y1 4 --z1 35 --x2 30 --y2 15 --z2 40 --color "$STONE_MAIN"

# Tower bodies
run cylinder "$FILE" --cx 13 --cz 18 --r 3 --y1 4 --y2 23 --color "$STONE_MAIN" --filled
run cylinder "$FILE" --cx 35 --cz 18 --r 3 --y1 4 --y2 23 --color "$STONE_MAIN" --filled
run cylinder "$FILE" --cx 11 --cz 36 --r 4 --y1 4 --y2 20 --color "$STONE_MAIN" --filled
run cylinder "$FILE" --cx 37 --cz 36 --r 4 --y1 4 --y2 20 --color "$STONE_MAIN" --filled
run cylinder "$FILE" --cx 18 --cz 24 --r 2 --y1 19 --y2 32 --color "$STONE_TRIM" --filled
run cylinder "$FILE" --cx 30 --cz 24 --r 2 --y1 19 --y2 32 --color "$STONE_TRIM" --filled
run cylinder "$FILE" --cx 20 --cz 31 --r 2 --y1 18 --y2 28 --color "$STONE_TRIM" --filled
run cylinder "$FILE" --cx 28 --cz 31 --r 2 --y1 18 --y2 28 --color "$STONE_TRIM" --filled
run cylinder "$FILE" --cx 24 --cz 27 --r 4 --y1 20 --y2 39 --color "$STONE_TRIM" --filled
run cylinder "$FILE" --cx 24 --cz 27 --r 2 --y1 40 --y2 42 --color "$STONE_TRIM" --filled

# Roof masses
roof_box 8 20 15 34 15
roof_box 33 20 40 34 15
roof_box 18 12 30 19 15
roof_box 18 35 30 40 16
roof_box 18 22 30 32 30

spire 13 18 24 4 4 3 3 2 2 1 1
spire 35 18 24 4 4 3 3 2 2 1 1
spire 11 36 21 5 5 4 4 3 3 2 2 1
spire 37 36 21 5 5 4 4 3 3 2 2 1
spire 18 24 33 3 3 2 2 1 1
spire 30 24 33 3 3 2 2 1 1
spire 20 31 29 3 2 2 1 1
spire 28 31 29 3 2 2 1 1
spire 24 27 43 4 4 3 3 2 2 1 1

# Front entry and facade shaping
run remove "$FILE" --x 22 --y 4 --z 12
run remove "$FILE" --x 23 --y 4 --z 12
run remove "$FILE" --x 24 --y 4 --z 12
run remove "$FILE" --x 25 --y 4 --z 12
run remove "$FILE" --x 26 --y 4 --z 12
run remove "$FILE" --x 22 --y 5 --z 12
run remove "$FILE" --x 23 --y 5 --z 12
run remove "$FILE" --x 24 --y 5 --z 12
run remove "$FILE" --x 25 --y 5 --z 12
run remove "$FILE" --x 26 --y 5 --z 12
run remove "$FILE" --x 22 --y 6 --z 12
run remove "$FILE" --x 23 --y 6 --z 12
run remove "$FILE" --x 24 --y 6 --z 12
run remove "$FILE" --x 25 --y 6 --z 12
run remove "$FILE" --x 26 --y 6 --z 12
run remove "$FILE" --x 23 --y 7 --z 12
run remove "$FILE" --x 24 --y 7 --z 12
run remove "$FILE" --x 25 --y 7 --z 12
run remove "$FILE" --x 24 --y 8 --z 12

run fill "$FILE" --x1 23 --y1 9 --z1 12 --x2 25 --y2 15 --z2 12 --color "$WINDOW"
run fill "$FILE" --x1 22 --y1 20 --z1 20 --x2 26 --y2 34 --z2 20 --color "$WINDOW"
run fill "$FILE" --x1 10 --y1 7 --z1 20 --x2 11 --y2 10 --z2 20 --color "$WINDOW"
run fill "$FILE" --x1 13 --y1 7 --z1 20 --x2 14 --y2 10 --z2 20 --color "$WINDOW"
run fill "$FILE" --x1 34 --y1 7 --z1 20 --x2 35 --y2 10 --z2 20 --color "$WINDOW"
run fill "$FILE" --x1 37 --y1 7 --z1 20 --x2 38 --y2 10 --z2 20 --color "$WINDOW"
run fill "$FILE" --x1 20 --y1 8 --z1 35 --x2 21 --y2 11 --z2 35 --color "$WINDOW"
run fill "$FILE" --x1 27 --y1 8 --z1 35 --x2 28 --y2 11 --z2 35 --color "$WINDOW"

# White trim and buttresses
run fill "$FILE" --x1 17 --y1 4 --z1 20 --x2 17 --y2 18 --z2 34 --color "$STONE_TRIM"
run fill "$FILE" --x1 31 --y1 4 --z1 20 --x2 31 --y2 18 --z2 34 --color "$STONE_TRIM"
run fill "$FILE" --x1 19 --y1 19 --z1 22 --x2 19 --y2 29 --z2 32 --color "$STONE_MAIN"
run fill "$FILE" --x1 29 --y1 19 --z1 22 --x2 29 --y2 29 --z2 32 --color "$STONE_MAIN"
run fill "$FILE" --x1 22 --y1 30 --z1 24 --x2 22 --y2 39 --z2 30 --color "$STONE_MAIN"
run fill "$FILE" --x1 26 --y1 30 --z1 24 --x2 26 --y2 39 --z2 30 --color "$STONE_MAIN"

# Parapet accents
run fill "$FILE" --x1 16 --y1 19 --z1 20 --x2 32 --y2 19 --z2 20 --color "$STONE_TRIM" --step-x 1 --gap-x 1
run fill "$FILE" --x1 18 --y1 15 --z1 12 --x2 30 --y2 15 --z2 12 --color "$STONE_TRIM" --step-x 1 --gap-x 1
run fill "$FILE" --x1 8 --y1 15 --z1 20 --x2 15 --y2 15 --z2 20 --color "$STONE_TRIM" --step-x 1 --gap-x 1
run fill "$FILE" --x1 33 --y1 15 --z1 20 --x2 40 --y2 15 --z2 20 --color "$STONE_TRIM" --step-x 1 --gap-x 1

# Construction scaffold
run scaffold generate "$FILE" --margin 1

echo "Generated $FILE"
