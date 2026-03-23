#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:-examples/cinderella-castle-50-fresh.boxel.json}"
CLI=(node packages/cli/dist/index.js)

STONE_BASE="#BAC3D2"
STONE_MAIN="#E8ECF5"
STONE_TRIM="#F9FBFE"
STONE_SHADE="#8B96AA"
ROOF_BLUE="#4568AF"
ROOF_NAVY="#2A437A"
ROOF_LIGHT="#6F8FD0"
WINDOW="#22355D"
GOLD="#D4B04D"
BANNER_RED="#C53E55"
BANNER_PINK="#F08CAA"
COURT="#DCE3EF"
GARDEN="#567B4B"
STAIR="#A7B0C0"

TMP_DIR="$(mktemp -d /tmp/boxel-cinderella-fresh-XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

json() {
  "${CLI[@]}" "$@" --json >/dev/null
}

set_palette() {
  local file="$1"
  node --input-type=module -e '
import fs from "node:fs";

const [file] = process.argv.slice(1);
const blueprint = JSON.parse(fs.readFileSync(file, "utf8"));
blueprint.palette = [
  { name: "stone-base", color: "#BAC3D2", description: "基壇と低層テラスの石材" },
  { name: "stone-main", color: "#E8ECF5", description: "城の主壁の白い石材" },
  { name: "stone-trim", color: "#F9FBFE", description: "縁石と上層塔身の明色" },
  { name: "stone-shade", color: "#8B96AA", description: "段差と陰影を締める補助石" },
  { name: "roof-blue", color: "#4568AF", description: "標準の青い屋根" },
  { name: "roof-navy", color: "#2A437A", description: "濃い主屋根と影側の屋根" },
  { name: "roof-light", color: "#6F8FD0", description: "軽い屋根や尖塔の明色" },
  { name: "window-deep", color: "#22355D", description: "窓奥の濃色" },
  { name: "gold-finial", color: "#D4B04D", description: "尖塔先端と装飾帯" },
  { name: "banner-red", color: "#C53E55", description: "主旗と暖色アクセント" },
  { name: "banner-pink", color: "#F08CAA", description: "副旗と柔らかい差し色" },
  { name: "court-light", color: "#DCE3EF", description: "中庭と前庭の舗装" },
  { name: "garden-green", color: "#567B4B", description: "植栽と花壇" },
  { name: "stair-stone", color: "#A7B0C0", description: "階段と斜面の石材" }
];
fs.writeFileSync(file, JSON.stringify(blueprint, null, 2) + "\n", "utf8");
' "$file"
}

roof_box() {
  local file="$1"
  local x1="$2"
  local z1="$3"
  local x2="$4"
  local z2="$5"
  local start_y="$6"
  local layers="${7:-3}"
  local color="${8:-$ROOF_BLUE}"
  local overhang_x="${9:-0}"
  local overhang_z="${10:-0}"

  json roof "$file" \
    --x1 "$x1" --z1 "$z1" --x2 "$x2" --z2 "$z2" \
    --y "$start_y" --layers "$layers" \
    --color "$color" \
    --overhang-x "$overhang_x" --overhang-z "$overhang_z" \
    --shrink-x 1 --shrink-z 1
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
  json init center-keep-fresh --out "$file"

  json fill "$file" --x1 0 --y1 0 --z1 0 --x2 16 --y2 13 --z2 14 --color "$STONE_MAIN"
  json remove "$file" --x1 2 --y1 1 --z1 2 --x2 14 --y2 12 --z2 12

  json fill "$file" --x1 2 --y1 14 --z1 2 --x2 14 --y2 22 --z2 12 --color "$STONE_TRIM"
  json remove "$file" --x1 4 --y1 15 --z1 4 --x2 12 --y2 21 --z2 10

  json fill "$file" --x1 5 --y1 23 --z1 4 --x2 11 --y2 30 --z2 10 --color "$STONE_MAIN"
  json remove "$file" --x1 6 --y1 24 --z1 5 --x2 10 --y2 29 --z2 9

  json cylinder "$file" --cx 2 --cz 2 --r 2 --y1 4 --y2 24 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 14 --cz 2 --r 2 --y1 4 --y2 24 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 3 --cz 12 --r 2 --y1 6 --y2 19 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 13 --cz 12 --r 2 --y1 6 --y2 19 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 8 --cz 7 --r 3 --y1 31 --y2 36 --color "$STONE_TRIM" --filled

  roof_box "$file" 0 0 16 14 14 3 "$ROOF_NAVY" 1 1
  roof_box "$file" 2 2 14 12 23 3 "$ROOF_NAVY" 1 1
  roof_box "$file" 5 4 11 10 31 2 "$ROOF_LIGHT" 1 1

  spire "$file" 8 7 37 4 4 3 3 2 2 1
  spire "$file" 2 2 25 2 2 1 1
  spire "$file" 14 2 25 2 2 1 1
  spire "$file" 3 12 20 2 1 1
  spire "$file" 13 12 20 2 1 1

  json remove "$file" --x1 7 --y1 0 --z1 0 --x2 9 --y2 7 --z2 2
  json remove "$file" --x1 7 --y1 1 --z1 3 --x2 9 --y2 4 --z2 8

  local x
  for x in 3 6 10 13; do
    json fill "$file" --x1 "$x" --y1 6 --z1 0 --x2 "$x" --y2 11 --z2 0 --color "$WINDOW"
  done
  for x in 4 8 12; do
    json fill "$file" --x1 "$x" --y1 17 --z1 2 --x2 "$x" --y2 21 --z2 2 --color "$WINDOW"
  done
  json fill "$file" --x1 7 --y1 26 --z1 4 --x2 9 --y2 31 --z2 4 --color "$WINDOW"
  json fill "$file" --x1 0 --y1 14 --z1 0 --x2 16 --y2 14 --z2 0 --color "$GOLD" --step-x 1 --gap-x 1
  json fill "$file" --x1 2 --y1 23 --z1 2 --x2 14 --y2 23 --z2 2 --color "$STONE_TRIM" --step-x 1 --gap-x 1
  json fill "$file" --x1 6 --y1 11 --z1 0 --x2 6 --y2 14 --z2 0 --color "$BANNER_RED"
  json fill "$file" --x1 10 --y1 11 --z1 0 --x2 10 --y2 14 --z2 0 --color "$BANNER_PINK"
}

build_side_wing() {
  local file="$1"
  json init side-wing-fresh --out "$file"

  json fill "$file" --x1 0 --y1 0 --z1 0 --x2 10 --y2 8 --z2 16 --color "$STONE_MAIN"
  json remove "$file" --x1 1 --y1 1 --z1 1 --x2 9 --y2 7 --z2 15
  json fill "$file" --x1 2 --y1 9 --z1 2 --x2 9 --y2 13 --z2 14 --color "$STONE_TRIM"
  json remove "$file" --x1 3 --y1 10 --z1 3 --x2 8 --y2 12 --z2 13

  json cylinder "$file" --cx 1 --cz 13 --r 2 --y1 0 --y2 18 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 9 --cz 3 --r 2 --y1 2 --y2 15 --color "$STONE_MAIN" --filled

  roof_box "$file" 0 0 10 16 9 3 "$ROOF_BLUE" 1 1
  roof_box "$file" 2 2 9 14 14 2 "$ROOF_NAVY" 1 1
  spire "$file" 1 13 19 2 2 1 1
  spire "$file" 9 3 16 2 2 1 1

  local z
  for z in 2 5 8 11 14; do
    json fill "$file" --x1 0 --y1 4 --z1 "$z" --x2 0 --y2 7 --z2 "$z" --color "$WINDOW"
  done
  json fill "$file" --x1 2 --y1 9 --z1 0 --x2 8 --y2 9 --z2 0 --color "$GOLD" --step-x 1 --gap-x 1
  json fill "$file" --x1 0 --y1 8 --z1 0 --x2 10 --y2 8 --z2 0 --color "$STONE_SHADE" --step-x 1 --gap-x 1
}

build_gatehouse() {
  local file="$1"
  json init gatehouse-fresh --out "$file"

  json fill "$file" --x1 0 --y1 0 --z1 0 --x2 12 --y2 10 --z2 7 --color "$STONE_TRIM"
  json cylinder "$file" --cx 1 --cz 7 --r 2 --y1 0 --y2 16 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 11 --cz 7 --r 2 --y1 0 --y2 16 --color "$STONE_MAIN" --filled
  json remove "$file" --x1 4 --y1 0 --z1 0 --x2 8 --y2 7 --z2 7
  json fill "$file" --x1 5 --y1 8 --z1 0 --x2 7 --y2 10 --z2 0 --color "$WINDOW"

  roof_box "$file" 0 0 12 7 11 3 "$ROOF_NAVY" 1 1
  spire "$file" 1 7 17 2 2 1 1
  spire "$file" 11 7 17 2 2 1 1
  json fill "$file" --x1 0 --y1 11 --z1 0 --x2 12 --y2 11 --z2 0 --color "$GOLD" --step-x 1 --gap-x 1
}

build_rear_tower() {
  local file="$1"
  json init rear-tower-fresh --out "$file"

  json fill "$file" --x1 1 --y1 0 --z1 0 --x2 7 --y2 9 --z2 8 --color "$STONE_MAIN"
  json remove "$file" --x1 2 --y1 1 --z1 1 --x2 6 --y2 8 --z2 7
  json cylinder "$file" --cx 4 --cz 5 --r 3 --y1 10 --y2 24 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 4 --cz 5 --r 2 --y1 25 --y2 27 --color "$STONE_MAIN" --filled
  roof_box "$file" 1 0 7 8 10 2 "$ROOF_BLUE" 1 1
  spire "$file" 4 5 28 3 3 2 2 1 1
  json fill "$file" --x1 4 --y1 6 --z1 0 --x2 4 --y2 22 --z2 0 --color "$WINDOW"
  json fill "$file" --x1 1 --y1 10 --z1 0 --x2 7 --y2 10 --z2 0 --color "$GOLD" --step-x 1 --gap-x 1
}

build_corner_turret() {
  local file="$1"
  json init corner-turret-fresh --out "$file"

  json cylinder "$file" --cx 2 --cz 2 --r 2 --y1 0 --y2 15 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 2 --cz 2 --r 1 --y1 16 --y2 17 --color "$STONE_TRIM" --filled
  spire "$file" 2 2 18 2 2 1 1
  json fill "$file" --x1 2 --y1 5 --z1 0 --x2 2 --y2 10 --z2 0 --color "$WINDOW"
}

FINAL="$FILE"
CENTER="$TMP_DIR/center_keep.boxel.json"
WING="$TMP_DIR/side_wing.boxel.json"
GATE="$TMP_DIR/gatehouse.boxel.json"
REAR="$TMP_DIR/rear_tower.boxel.json"
CORNER="$TMP_DIR/corner_turret.boxel.json"

build_center_keep "$CENTER"
build_side_wing "$WING"
build_gatehouse "$GATE"
build_rear_tower "$REAR"
build_corner_turret "$CORNER"

rm -f "$FINAL"
json init cinderella-castle-50-fresh --out "$FINAL"
set_palette "$FINAL"

# Base terraces and forecourt.
json fill "$FINAL" --x1 0 --y1 0 --z1 12 --x2 48 --y2 1 --z2 48 --color "$STONE_BASE"
json fill "$FINAL" --x1 3 --y1 2 --z1 15 --x2 45 --y2 3 --z2 45 --color "$COURT"
json fill "$FINAL" --x1 6 --y1 4 --z1 18 --x2 42 --y2 4 --z2 42 --color "$STONE_MAIN"
json fill "$FINAL" --x1 18 --y1 1 --z1 0 --x2 30 --y2 2 --z2 14 --color "$STAIR"
json fill "$FINAL" --x1 19 --y1 3 --z1 3 --x2 29 --y2 3 --z2 14 --color "$COURT"
json fill "$FINAL" --x1 20 --y1 4 --z1 6 --x2 28 --y2 4 --z2 14 --color "$STONE_TRIM"

# Garden shoulders.
json fill "$FINAL" --x1 2 --y1 2 --z1 36 --x2 8 --y2 4 --z2 46 --color "$GARDEN"
json fill "$FINAL" --x1 40 --y1 2 --z1 36 --x2 46 --y2 4 --z2 46 --color "$GARDEN"

# Main components.
json place "$FINAL" --source "$CENTER" --x 16 --y 5 --z 20 --include structure --collision error
json place "$FINAL" --source "$WING" --x 13 --y 5 --z 20 --include structure --mirror x --collision error
json place "$FINAL" --source "$WING" --x 35 --y 5 --z 20 --include structure --collision error
json place "$FINAL" --source "$GATE" --x 18 --y 5 --z 6 --include structure --collision error
json place "$FINAL" --source "$REAR" --x 20 --y 5 --z 36 --include structure --collision error
json place "$FINAL" --source "$CORNER" --x 8 --y 5 --z 13 --include structure --collision error
json place "$FINAL" --source "$CORNER" --x 36 --y 5 --z 13 --include structure --collision error
json place "$FINAL" --source "$CORNER" --x 10 --y 5 --z 38 --include structure --collision error
json place "$FINAL" --source "$CORNER" --x 34 --y 5 --z 38 --include structure --collision error

# Connectors and facade bands.
json fill "$FINAL" --x1 13 --y1 5 --z1 24 --x2 17 --y2 10 --z2 30 --color "$STONE_TRIM"
json fill "$FINAL" --x1 31 --y1 5 --z1 24 --x2 35 --y2 10 --z2 30 --color "$STONE_TRIM"
json fill "$FINAL" --x1 20 --y1 5 --z1 14 --x2 28 --y2 11 --z2 20 --color "$STONE_TRIM"
json fill "$FINAL" --x1 21 --y1 5 --z1 34 --x2 27 --y2 10 --z2 36 --color "$STONE_TRIM"
json remove "$FINAL" --x1 23 --y1 5 --z1 14 --x2 25 --y2 8 --z2 20
json remove "$FINAL" --x1 23 --y1 5 --z1 34 --x2 25 --y2 8 --z2 36

roof_box "$FINAL" 15 24 17 30 11 2 "$ROOF_NAVY" 1 1
roof_box "$FINAL" 31 24 33 30 11 2 "$ROOF_NAVY" 1 1
roof_box "$FINAL" 20 14 28 20 12 2 "$ROOF_NAVY" 1 1
roof_box "$FINAL" 21 34 27 36 11 2 "$ROOF_BLUE" 1 1

json fill "$FINAL" --x1 11 --y1 5 --z1 15 --x2 37 --y2 10 --z2 15 --color "$STONE_TRIM"
json remove "$FINAL" --x1 22 --y1 5 --z1 15 --x2 26 --y2 8 --z2 15
json fill "$FINAL" --x1 11 --y1 11 --z1 15 --x2 37 --y2 11 --z2 15 --color "$GOLD" --step-x 1 --gap-x 1
json fill "$FINAL" --x1 15 --y1 7 --z1 15 --x2 15 --y2 9 --z2 15 --color "$WINDOW"
json fill "$FINAL" --x1 20 --y1 7 --z1 15 --x2 20 --y2 10 --z2 15 --color "$WINDOW"
json fill "$FINAL" --x1 28 --y1 7 --z1 15 --x2 28 --y2 10 --z2 15 --color "$WINDOW"
json fill "$FINAL" --x1 33 --y1 7 --z1 15 --x2 33 --y2 9 --z2 15 --color "$WINDOW"

# Decorative gables and banners.
json gable "$FINAL" --face north --center 24 --base 15 --y 12 --width 13 --height 4 --depth 3 --color "$STONE_TRIM"
json gable "$FINAL" --face north --center 24 --base 19 --y 26 --width 9 --height 3 --depth 3 --color "$STONE_TRIM"
json fill "$FINAL" --x1 18 --y1 12 --z1 15 --x2 18 --y2 16 --z2 15 --color "$BANNER_RED"
json fill "$FINAL" --x1 30 --y1 12 --z1 15 --x2 30 --y2 16 --z2 15 --color "$BANNER_PINK"
json fill "$FINAL" --x1 23 --y1 17 --z1 15 --x2 23 --y2 20 --z2 15 --color "$BANNER_RED"
json fill "$FINAL" --x1 25 --y1 17 --z1 15 --x2 25 --y2 20 --z2 15 --color "$BANNER_PINK"

# Small gold finials and lights.
json add "$FINAL" --x 24 --y 49 --z 27 --color "$GOLD"
json add "$FINAL" --x 18 --y 31 --z 22 --color "$GOLD"
json add "$FINAL" --x 30 --y 31 --z 22 --color "$GOLD"
json add "$FINAL" --x 12 --y 25 --z 33 --color "$ROOF_LIGHT"
json add "$FINAL" --x 36 --y 25 --z 33 --color "$ROOF_LIGHT"

json scaffold generate "$FINAL" --margin 1
json recenter "$FINAL"

echo "Generated $FINAL"
