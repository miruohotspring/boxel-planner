#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:-examples/shuri-castle-50-modular.boxel.json}"
CLI=(node packages/cli/dist/index.js)

STONE_BASE="#C7B8A0"
STONE_LIGHT="#E2D7C8"
STONE_SHADOW="#A89A88"
PLAZA_WHITE="#EEE7DC"
PLAZA_RED="#B64B3E"
RED_MAIN="#B42524"
RED_DARK="#7B1417"
RED_TRIM="#D84F3F"
ROOF_MAIN="#8D6759"
ROOF_DARK="#6E5045"
ROOF_EDGE="#D7CFC3"
WHITE="#F4E7D2"
GOLD="#CFA243"
GREEN="#2F8B69"
WINDOW="#2A1714"

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
  local color="${8:-$ROOF_MAIN}"
  local overhang_x="${9:-0}"
  local overhang_z="${10:-0}"

  json roof "$file" \
    --x1 "$x1" --z1 "$z1" --x2 "$x2" --z2 "$z2" \
    --y "$start_y" --layers "$layers" \
    --color "$color" \
    --overhang-x "$overhang_x" --overhang-z "$overhang_z" \
    --shrink-x 1 --shrink-z 1
}

FINAL="$FILE"

rm -f "$FINAL"
json init shuri-castle-50-modular --out "$FINAL"

# Forecourt stripes and central approach.
json fill "$FINAL" --x1 -24 --y1 0 --z1 -24 --x2 24 --y2 0 --z2 -11 --color "$PLAZA_WHITE"
for z in -24 -21 -18 -15 -12; do
  json fill "$FINAL" --x1 -24 --y1 0 --z1 "$z" --x2 24 --y2 0 --z2 "$z" --color "$PLAZA_RED"
done
json fill "$FINAL" --x1 -2 --y1 0 --z1 -24 --x2 2 --y2 0 --z2 -6 --color "$PLAZA_RED"

# Stone terrace and broad stair.
json fill "$FINAL" --x1 -24 --y1 1 --z1 -10 --x2 24 --y2 2 --z2 18 --color "$STONE_BASE"
json fill "$FINAL" --x1 -22 --y1 3 --z1 -8 --x2 22 --y2 3 --z2 17 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 -20 --y1 4 --z1 -6 --x2 20 --y2 4 --z2 16 --color "$STONE_SHADOW"
json fill "$FINAL" --x1 -8 --y1 1 --z1 -10 --x2 8 --y2 1 --z2 -9 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 -7 --y1 2 --z1 -8 --x2 7 --y2 2 --z2 -7 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 -6 --y1 3 --z1 -6 --x2 6 --y2 3 --z2 -5 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 -5 --y1 4 --z1 -4 --x2 5 --y2 4 --z2 -3 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 -20 --y1 5 --z1 -2 --x2 -8 --y2 6 --z2 -1 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 8 --y1 5 --z1 -2 --x2 20 --y2 6 --z2 -1 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 -20 --y1 7 --z1 -1 --x2 -8 --y2 7 --z2 -1 --color "$WHITE" --step-x 1 --gap-x 1
json fill "$FINAL" --x1 8 --y1 7 --z1 -1 --x2 20 --y2 7 --z2 -1 --color "$WHITE" --step-x 1 --gap-x 1

# Lower hall body and side galleries.
json fill "$FINAL" --x1 -20 --y1 5 --z1 0 --x2 20 --y2 15 --z2 16 --color "$RED_MAIN"
json fill "$FINAL" --x1 -22 --y1 5 --z1 2 --x2 -19 --y2 11 --z2 14 --color "$RED_MAIN"
json fill "$FINAL" --x1 19 --y1 5 --z1 2 --x2 22 --y2 11 --z2 14 --color "$RED_MAIN"

# Upper tiers.
json fill "$FINAL" --x1 -14 --y1 16 --z1 4 --x2 14 --y2 22 --z2 13 --color "$RED_MAIN"
json fill "$FINAL" --x1 -8 --y1 23 --z1 7 --x2 8 --y2 27 --z2 11 --color "$RED_MAIN"

# Interior voids for enterable spaces.
json remove "$FINAL" --x1 -18 --y1 6 --z1 2 --x2 18 --y2 14 --z2 15
json remove "$FINAL" --x1 -12 --y1 17 --z1 5 --x2 12 --y2 21 --z2 12
json remove "$FINAL" --x1 -6 --y1 24 --z1 8 --x2 6 --y2 26 --z2 10

# Central gate passage aligned to the main interior.
json remove "$FINAL" --x1 -3 --y1 5 --z1 -4 --x2 3 --y2 12 --z2 3

# Portico frame around the gate.
json fill "$FINAL" --x1 -8 --y1 5 --z1 -4 --x2 -6 --y2 13 --z2 2 --color "$RED_MAIN"
json fill "$FINAL" --x1 6 --y1 5 --z1 -4 --x2 8 --y2 13 --z2 2 --color "$RED_MAIN"
json fill "$FINAL" --x1 -5 --y1 5 --z1 -4 --x2 -4 --y2 13 --z2 2 --color "$WHITE"
json fill "$FINAL" --x1 4 --y1 5 --z1 -4 --x2 5 --y2 13 --z2 2 --color "$WHITE"
json fill "$FINAL" --x1 -8 --y1 13 --z1 -4 --x2 8 --y2 15 --z2 2 --color "$RED_MAIN"
json fill "$FINAL" --x1 -2 --y1 10 --z1 -4 --x2 2 --y2 12 --z2 -4 --color "$WINDOW"
json fill "$FINAL" --x1 -2 --y1 6 --z1 -4 --x2 2 --y2 9 --z2 -4 --color "$RED_DARK"
json fill "$FINAL" --x1 -6 --y1 14 --z1 -4 --x2 6 --y2 14 --z2 -4 --color "$GOLD"

# Lower facade rhythm.
for x in -18 -12 -6 6 12 18; do
  json fill "$FINAL" --x1 "$x" --y1 5 --z1 0 --x2 "$x" --y2 15 --z2 1 --color "$RED_DARK"
done
for x in -16 -10 10 16; do
  json fill "$FINAL" --x1 "$x" --y1 8 --z1 0 --x2 $((x + 2)) --y2 12 --z2 0 --color "$WHITE"
done
json fill "$FINAL" --x1 -1 --y1 8 --z1 0 --x2 1 --y2 12 --z2 0 --color "$WHITE"
json fill "$FINAL" --x1 -20 --y1 15 --z1 0 --x2 20 --y2 15 --z2 0 --color "$ROOF_EDGE" --step-x 1 --gap-x 1

# Second tier balcony and windows.
json fill "$FINAL" --x1 -14 --y1 18 --z1 4 --x2 14 --y2 18 --z2 4 --color "$WINDOW"
json fill "$FINAL" --x1 -12 --y1 19 --z1 4 --x2 -8 --y2 21 --z2 4 --color "$WINDOW"
json fill "$FINAL" --x1 8 --y1 19 --z1 4 --x2 12 --y2 21 --z2 4 --color "$WINDOW"
json fill "$FINAL" --x1 -14 --y1 22 --z1 4 --x2 14 --y2 22 --z2 4 --color "$ROOF_EDGE" --step-x 1 --gap-x 1

# Top tier windows.
json fill "$FINAL" --x1 -3 --y1 24 --z1 7 --x2 3 --y2 26 --z2 7 --color "$WINDOW"
json fill "$FINAL" --x1 -8 --y1 27 --z1 7 --x2 8 --y2 27 --z2 7 --color "$ROOF_EDGE" --step-x 1 --gap-x 1

# Side gallery trim.
json fill "$FINAL" --x1 -22 --y1 8 --z1 2 --x2 -19 --y2 8 --z2 14 --color "$RED_DARK" --step-z 1 --gap-z 1
json fill "$FINAL" --x1 19 --y1 8 --z1 2 --x2 22 --y2 8 --z2 14 --color "$RED_DARK" --step-z 1 --gap-z 1
json fill "$FINAL" --x1 -22 --y1 11 --z1 2 --x2 -19 --y2 11 --z2 14 --color "$ROOF_EDGE" --step-z 1 --gap-z 1
json fill "$FINAL" --x1 19 --y1 11 --z1 2 --x2 22 --y2 11 --z2 14 --color "$ROOF_EDGE" --step-z 1 --gap-z 1

# Roofs.
roof_box "$FINAL" -22 2 22 16 16 4 "$ROOF_MAIN" 2 3
roof_box "$FINAL" -14 4 14 13 23 4 "$ROOF_MAIN" 2 2
roof_box "$FINAL" -8 7 8 11 28 3 "$ROOF_MAIN" 1 1
roof_box "$FINAL" -8 -4 8 2 16 3 "$ROOF_MAIN" 2 2
roof_box "$FINAL" -22 2 -19 14 12 2 "$ROOF_DARK" 1 2
roof_box "$FINAL" 19 2 22 14 12 2 "$ROOF_DARK" 1 2

# Gables and decorative color bands.
json gable "$FINAL" --face north --center 0 --base -5 --y 16 --width 17 --height 5 --depth 4 --color "$RED_TRIM"
json gable "$FINAL" --face north --center 0 --base 3 --y 23 --width 11 --height 3 --depth 3 --color "$RED_TRIM"
json fill "$FINAL" --x1 -7 --y1 16 --z1 -5 --x2 7 --y2 17 --z2 -5 --color "$GOLD"
json fill "$FINAL" --x1 -4 --y1 17 --z1 -5 --x2 4 --y2 18 --z2 -5 --color "$WINDOW"

# Ridge ornaments to hint at the photo's dragon finials.
json add "$FINAL" --x -20 --y 20 --z 7 --color "$GREEN"
json add "$FINAL" --x 20 --y 20 --z 7 --color "$GREEN"
json add "$FINAL" --x -12 --y 26 --z 8 --color "$GREEN"
json add "$FINAL" --x 12 --y 26 --z 8 --color "$GREEN"
json add "$FINAL" --x -6 --y 30 --z 9 --color "$GREEN"
json add "$FINAL" --x 6 --y 30 --z 9 --color "$GREEN"
json add "$FINAL" --x 0 --y 19 --z -1 --color "$GREEN"
json add "$FINAL" --x 0 --y 20 --z -1 --color "$GOLD"

# Shisa-like guardians and a low fence at the stair landing.
json fill "$FINAL" --x1 -9 --y1 5 --z1 -2 --x2 -8 --y2 8 --z2 -1 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 8 --y1 5 --z1 -2 --x2 9 --y2 8 --z2 -1 --color "$STONE_LIGHT"
json add "$FINAL" --x -9 --y 9 --z -1 --color "$STONE_SHADOW"
json add "$FINAL" --x 9 --y 9 --z -1 --color "$STONE_SHADOW"
json fill "$FINAL" --x1 -6 --y1 5 --z1 -5 --x2 6 --y2 5 --z2 -5 --color "$RED_MAIN" --step-x 1 --gap-x 1

json scaffold generate "$FINAL" --margin 1
json recenter "$FINAL"

echo "Generated $FINAL"
