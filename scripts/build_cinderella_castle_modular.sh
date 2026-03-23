#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:-examples/cinderella-castle-50-modular.boxel.json}"
CLI=(node packages/cli/dist/index.js)

STONE_BASE="#B8BEC9"
STONE_MAIN="#D9DDE5"
STONE_TRIM="#F4F6FB"
ROOF_BLUE="#3E5FA8"
ROOF_DARK="#27447F"
WINDOW="#203A74"
GOLD="#D8B343"

TMP_DIR="$(mktemp -d /tmp/boxel-cinderella-XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

json() {
  "${CLI[@]}" "$@" --json >/dev/null
}

roof_box() {
  local file="$1"
  local x1="$2"
  local z1="$3"
  local x2="$4"
  local z2="$5"
  local start_y="$6"
  local layers="${7:-3}"
  local color="${8:-$ROOF_DARK}"

  local y="$start_y"
  local layer=0
  while [ "$x1" -le "$x2" ] && [ "$z1" -le "$z2" ] && [ "$layer" -lt "$layers" ]; do
    json fill "$file" --x1 "$x1" --y1 "$y" --z1 "$z1" --x2 "$x2" --y2 "$y" --z2 "$z2" --color "$color"
    x1=$((x1 + 1))
    x2=$((x2 - 1))
    z1=$((z1 + 1))
    z2=$((z2 - 1))
    y=$((y + 1))
    layer=$((layer + 1))
  done
}

spire() {
  local file="$1"
  local cx="$2"
  local cz="$3"
  local start_y="$4"
  shift 4

  local radii_csv=""
  local r
  for r in "$@"; do
    if [[ -n "$radii_csv" ]]; then
      radii_csv+=","
    fi
    radii_csv+="$r"
  done

  json spire "$file" --cx "$cx" --cz "$cz" --y "$start_y" --radii "$radii_csv" --color "$ROOF_BLUE" --cap-color "$GOLD"
}

build_center_keep() {
  local file="$1"
  json init center-keep --out "$file"

  json fill "$file" --x1 -8 --y1 0 --z1 -6 --x2 8 --y2 11 --z2 8 --color "$STONE_MAIN"
  json fill "$file" --x1 -6 --y1 12 --z1 -4 --x2 6 --y2 21 --z2 6 --color "$STONE_TRIM"
  json fill "$file" --x1 -4 --y1 22 --z1 -2 --x2 4 --y2 29 --z2 4 --color "$STONE_MAIN"
  json cylinder "$file" --cx 0 --cz 1 --r 4 --y1 30 --y2 35 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 0 --cz 1 --r 2 --y1 36 --y2 38 --color "$STONE_TRIM" --filled

  json cylinder "$file" --cx -6 --cz -7 --r 2 --y1 5 --y2 21 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 6 --cz -7 --r 2 --y1 5 --y2 21 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx -7 --cz 7 --r 2 --y1 7 --y2 18 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 7 --cz 7 --r 2 --y1 7 --y2 18 --color "$STONE_MAIN" --filled

  roof_box "$file" -8 -6 8 8 12 3 "$ROOF_DARK"
  roof_box "$file" -6 -4 6 6 22 3 "$ROOF_DARK"

  spire "$file" 0 1 39 4 3 3 2 2
  spire "$file" -6 -7 22 3 3 2 2 1 1
  spire "$file" 6 -7 22 3 3 2 2 1 1
  spire "$file" -7 7 19 2 2 1 1
  spire "$file" 7 7 19 2 2 1 1

  json fill "$file" --x1 -1 --y1 7 --z1 -6 --x2 1 --y2 25 --z2 -6 --color "$WINDOW"
  json fill "$file" --x1 -6 --y1 8 --z1 -5 --x2 -6 --y2 15 --z2 -5 --color "$WINDOW"
  json fill "$file" --x1 6 --y1 8 --z1 -5 --x2 6 --y2 15 --z2 -5 --color "$WINDOW"
  json fill "$file" --x1 -3 --y1 13 --z1 -4 --x2 -2 --y2 18 --z2 -4 --color "$WINDOW"
  json fill "$file" --x1 2 --y1 13 --z1 -4 --x2 3 --y2 18 --z2 -4 --color "$WINDOW"
  json fill "$file" --x1 -1 --y1 30 --z1 -2 --x2 1 --y2 35 --z2 -2 --color "$WINDOW"

  json fill "$file" --x1 -8 --y1 12 --z1 -6 --x2 8 --y2 12 --z2 -6 --color "$STONE_TRIM" --step-x 1 --gap-x 1
  json fill "$file" --x1 -6 --y1 22 --z1 -4 --x2 6 --y2 22 --z2 -4 --color "$STONE_TRIM" --step-x 1 --gap-x 1
}

build_side_wing() {
  local file="$1"
  json init side-wing --out "$file"

  json fill "$file" --x1 0 --y1 0 --z1 -4 --x2 8 --y2 9 --z2 8 --color "$STONE_MAIN"
  json fill "$file" --x1 6 --y1 4 --z1 3 --x2 11 --y2 11 --z2 9 --color "$STONE_TRIM"
  json cylinder "$file" --cx 10 --cz 6 --r 3 --y1 0 --y2 18 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 10 --cz 6 --r 2 --y1 19 --y2 21 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 2 --cz -4 --r 2 --y1 3 --y2 13 --color "$STONE_TRIM" --filled

  roof_box "$file" 0 -4 8 8 10 3 "$ROOF_DARK"
  roof_box "$file" 6 3 11 9 12 2 "$ROOF_DARK"
  spire "$file" 10 6 22 4 3 3 2 2 1 1
  spire "$file" 2 -4 14 2 2 1 1

  json fill "$file" --x1 3 --y1 4 --z1 -4 --x2 4 --y2 7 --z2 -4 --color "$WINDOW"
  json fill "$file" --x1 7 --y1 5 --z1 3 --x2 7 --y2 9 --z2 3 --color "$WINDOW"
  json fill "$file" --x1 10 --y1 6 --z1 3 --x2 10 --y2 16 --z2 3 --color "$WINDOW"
  json fill "$file" --x1 0 --y1 10 --z1 -4 --x2 8 --y2 10 --z2 -4 --color "$STONE_TRIM" --step-x 1 --gap-x 1
}

build_gatehouse() {
  local file="$1"
  json init gatehouse --out "$file"

  json fill "$file" --x1 -4 --y1 0 --z1 0 --x2 4 --y2 9 --z2 8 --color "$STONE_TRIM"
  json cylinder "$file" --cx -4 --cz 8 --r 2 --y1 0 --y2 13 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 4 --cz 8 --r 2 --y1 0 --y2 13 --color "$STONE_MAIN" --filled
  roof_box "$file" -4 0 4 8 10 3 "$ROOF_DARK"
  spire "$file" -4 8 14 2 2 1 1
  spire "$file" 4 8 14 2 2 1 1

  json remove "$file" --x1 -1 --y1 0 --z1 0 --x2 1 --y2 5 --z2 0
  json remove "$file" --x1 -1 --y1 0 --z1 1 --x2 1 --y2 4 --z2 2
  json fill "$file" --x1 -3 --y1 4 --z1 0 --x2 -3 --y2 7 --z2 0 --color "$WINDOW"
  json fill "$file" --x1 3 --y1 4 --z1 0 --x2 3 --y2 7 --z2 0 --color "$WINDOW"
}

build_corner_tower() {
  local file="$1"
  json init corner-tower --out "$file"

  json cylinder "$file" --cx 0 --cz 0 --r 3 --y1 0 --y2 16 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 0 --cz 0 --r 2 --y1 17 --y2 19 --color "$STONE_TRIM" --filled
  spire "$file" 0 0 20 3 3 2 2 1 1
  json fill "$file" --x1 -1 --y1 5 --z1 -3 --x2 1 --y2 11 --z2 -3 --color "$WINDOW"
}

if [[ "${BOXEL_LIBRARY_ONLY:-0}" != "1" ]]; then
  FINAL="$FILE"
  CENTER="$TMP_DIR/center_keep.boxel.json"
  WING="$TMP_DIR/side_wing.boxel.json"
  GATE="$TMP_DIR/gatehouse.boxel.json"
  CORNER="$TMP_DIR/corner_tower.boxel.json"

  build_center_keep "$CENTER"
  build_side_wing "$WING"
  build_gatehouse "$GATE"
  build_corner_tower "$CORNER"

  rm -f "$FINAL"
  json init cinderella-castle-50-modular --out "$FINAL"

  # Terraces and forecourt
  json fill "$FINAL" --x1 4 --y1 0 --z1 4 --x2 44 --y2 1 --z2 44 --color "$STONE_BASE"
  json fill "$FINAL" --x1 6 --y1 2 --z1 6 --x2 42 --y2 2 --z2 42 --color "$STONE_MAIN"
  json fill "$FINAL" --x1 8 --y1 3 --z1 8 --x2 40 --y2 3 --z2 40 --color "$STONE_TRIM"
  json fill "$FINAL" --x1 20 --y1 2 --z1 0 --x2 28 --y2 2 --z2 8 --color "$STONE_BASE"
  json fill "$FINAL" --x1 21 --y1 3 --z1 0 --x2 27 --y2 3 --z2 6 --color "$STONE_TRIM"
  json fill "$FINAL" --x1 12 --y1 4 --z1 12 --x2 36 --y2 4 --z2 36 --color "$STONE_BASE"

  # Component placement
  json place "$FINAL" --source "$CENTER" --x 24 --y 5 --z 24 --include structure --collision error
  json place "$FINAL" --source "$WING" --x 34 --y 5 --z 24 --include structure --collision error
  json place "$FINAL" --source "$WING" --x 14 --y 5 --z 24 --include structure --mirror x --collision error
json place "$FINAL" --source "$GATE" --x 24 --y 5 --z 4 --include structure --collision error
json place "$FINAL" --source "$GATE" --x 24 --y 5 --z 44 --include structure --rotate-y 180 --collision error
  json place "$FINAL" --source "$CORNER" --x 11 --y 5 --z 13 --include structure --collision error
  json place "$FINAL" --source "$CORNER" --x 37 --y 5 --z 13 --include structure --collision error
  json place "$FINAL" --source "$CORNER" --x 11 --y 5 --z 39 --include structure --collision error
  json place "$FINAL" --source "$CORNER" --x 37 --y 5 --z 39 --include structure --collision error

  # Forecourt decorations and extra windows
  json fill "$FINAL" --x1 21 --y1 5 --z1 8 --x2 27 --y2 5 --z2 8 --color "$STONE_TRIM"
  json fill "$FINAL" --x1 21 --y1 5 --z1 40 --x2 27 --y2 5 --z2 40 --color "$STONE_TRIM"
  json fill "$FINAL" --x1 20 --y1 6 --z1 8 --x2 28 --y2 6 --z2 8 --color "$STONE_TRIM" --step-x 1 --gap-x 1
  json fill "$FINAL" --x1 20 --y1 6 --z1 40 --x2 28 --y2 6 --z2 40 --color "$STONE_TRIM" --step-x 1 --gap-x 1
  json fill "$FINAL" --x1 23 --y1 6 --z1 4 --x2 25 --y2 14 --z2 4 --color "$WINDOW"

  json scaffold generate "$FINAL" --margin 1
  json recenter "$FINAL"

  echo "Generated $FINAL"
fi
