#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:-examples/neuschwanstein-castle-50-modular.boxel.json}"
CLI=(node packages/cli/dist/index.js)

STONE_CLIFF="#8F96A3"
STONE_BASE="#C7CDD8"
STONE_MAIN="#E7EBF2"
STONE_TRIM="#F8FAFD"
ROOF_MAIN="#4A5C8F"
ROOF_DARK="#2F3E66"
WINDOW="#20314E"
GOLD="#C8A347"
TREE="#3B5A38"

TMP_DIR="$(mktemp -d /tmp/boxel-neuschwanstein-XXXXXX)"
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
  { name: "cliff-stone", color: "#8F96A3", description: "崖と基壇の暗めの石灰岩" },
  { name: "terrace-stone", color: "#C7CDD8", description: "テラスと石段の中間色" },
  { name: "main-wall", color: "#E7EBF2", description: "城の主壁に使う白い石材" },
  { name: "trim-white", color: "#F8FAFD", description: "塔や窓回りの明るい縁石" },
  { name: "roof-blue", color: "#4A5C8F", description: "尖塔や屋根の青いスレート" },
  { name: "roof-navy", color: "#2F3E66", description: "主屋根の濃い陰色" },
  { name: "window-deep", color: "#20314E", description: "窓の奥行きを示す濃紺" },
  { name: "finial-gold", color: "#C8A347", description: "尖塔先端の金属装飾" },
  { name: "garden-pine", color: "#3B5A38", description: "背面庭の樹木色" },
  { name: "mist-gray", color: "#B8BEC9", description: "霞んだ補助石材色" },
  { name: "shadow-gray", color: "#737B88", description: "陰影と段差を締める補助色" },
  { name: "courtyard-light", color: "#D9DEE7", description: "中庭や渡り部の明るい舗装色" }
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

  json spire "$file" --cx "$cx" --cz "$cz" --y "$start_y" --radii "$radii_csv" --color "$ROOF_MAIN" --cap-color "$GOLD"
}

build_main_palace() {
  local file="$1"
  json init main-palace --out "$file"

  json fill "$file" --x1 0 --y1 0 --z1 0 --x2 18 --y2 15 --z2 18 --color "$STONE_MAIN"
  json remove "$file" --x1 3 --y1 1 --z1 3 --x2 15 --y2 14 --z2 15
  json fill "$file" --x1 3 --y1 16 --z1 4 --x2 15 --y2 25 --z2 16 --color "$STONE_TRIM"
  json remove "$file" --x1 5 --y1 17 --z1 6 --x2 13 --y2 24 --z2 14
  json fill "$file" --x1 6 --y1 26 --z1 7 --x2 12 --y2 33 --z2 13 --color "$STONE_MAIN"
  json fill "$file" --x1 7 --y1 34 --z1 8 --x2 11 --y2 36 --z2 12 --color "$STONE_TRIM"

  json cylinder "$file" --cx 1 --cz 2 --r 2 --y1 4 --y2 23 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 17 --cz 2 --r 2 --y1 4 --y2 23 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 2 --cz 17 --r 2 --y1 6 --y2 19 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 16 --cz 17 --r 2 --y1 6 --y2 19 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 9 --cz 9 --r 4 --y1 32 --y2 36 --color "$STONE_TRIM" --filled

  roof_box "$file" 0 0 18 18 16 4 "$ROOF_DARK" 1 1
  roof_box "$file" 3 4 15 16 26 3 "$ROOF_DARK" 1 1
  roof_box "$file" 6 7 12 13 37 2 "$ROOF_DARK" 1 1

  spire "$file" 9 9 37 3 3 2 2 1
  spire "$file" 1 2 24 2 2 1 1
  spire "$file" 17 2 24 2 2 1 1
  spire "$file" 2 17 20 2 1 1
  spire "$file" 16 17 20 2 1 1

  json remove "$file" --x1 8 --y1 0 --z1 0 --x2 10 --y2 8 --z2 2
  json remove "$file" --x1 8 --y1 1 --z1 3 --x2 10 --y2 4 --z2 8

  local x
  for x in 3 6 9 12 15; do
    json fill "$file" --x1 "$x" --y1 6 --z1 0 --x2 "$x" --y2 12 --z2 0 --color "$WINDOW"
  done
  for x in 5 9 13; do
    json fill "$file" --x1 "$x" --y1 18 --z1 4 --x2 $((x + 1)) --y2 23 --z2 4 --color "$WINDOW"
  done
  json fill "$file" --x1 8 --y1 28 --z1 7 --x2 10 --y2 33 --z2 7 --color "$WINDOW"
  json fill "$file" --x1 0 --y1 16 --z1 0 --x2 18 --y2 16 --z2 0 --color "$STONE_TRIM" --step-x 1 --gap-x 1
  json fill "$file" --x1 3 --y1 26 --z1 4 --x2 15 --y2 26 --z2 4 --color "$STONE_TRIM" --step-x 1 --gap-x 1
}

build_west_wing() {
  local file="$1"
  json init west-wing --out "$file"

  json fill "$file" --x1 0 --y1 0 --z1 0 --x2 14 --y2 11 --z2 12 --color "$STONE_MAIN"
  json remove "$file" --x1 2 --y1 1 --z1 2 --x2 12 --y2 10 --z2 10
  json fill "$file" --x1 2 --y1 12 --z1 2 --x2 12 --y2 15 --z2 10 --color "$STONE_TRIM"
  json cylinder "$file" --cx 1 --cz 10 --r 3 --y1 0 --y2 19 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 13 --cz 2 --r 2 --y1 2 --y2 15 --color "$STONE_MAIN" --filled

  roof_box "$file" 0 0 14 12 12 4 "$ROOF_MAIN" 1 1
  roof_box "$file" 2 2 12 10 16 2 "$ROOF_DARK" 1 1
  spire "$file" 1 10 20 3 3 2 2 1
  spire "$file" 13 2 16 2 2 1 1

  local x
  for x in 3 6 9 12; do
    json fill "$file" --x1 "$x" --y1 5 --z1 0 --x2 "$x" --y2 9 --z2 0 --color "$WINDOW"
    json fill "$file" --x1 "$x" --y1 13 --z1 2 --x2 "$x" --y2 15 --z2 2 --color "$WINDOW"
  done
  json fill "$file" --x1 0 --y1 12 --z1 0 --x2 14 --y2 12 --z2 0 --color "$STONE_TRIM" --step-x 1 --gap-x 1
}

build_gatehouse() {
  local file="$1"
  json init gatehouse --out "$file"

  json fill "$file" --x1 0 --y1 0 --z1 0 --x2 10 --y2 9 --z2 7 --color "$STONE_TRIM"
  json cylinder "$file" --cx 0 --cz 7 --r 2 --y1 0 --y2 15 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 10 --cz 7 --r 2 --y1 0 --y2 15 --color "$STONE_MAIN" --filled

  roof_box "$file" 0 0 10 7 10 3 "$ROOF_DARK" 1 1
  spire "$file" 0 7 16 2 2 1 1
  spire "$file" 10 7 16 2 2 1 1

  json remove "$file" --x1 4 --y1 0 --z1 0 --x2 6 --y2 6 --z2 7
  json fill "$file" --x1 2 --y1 4 --z1 0 --x2 2 --y2 7 --z2 0 --color "$WINDOW"
  json fill "$file" --x1 8 --y1 4 --z1 0 --x2 8 --y2 7 --z2 0 --color "$WINDOW"
}

build_chapel_tower() {
  local file="$1"
  json init chapel-tower --out "$file"

  json cylinder "$file" --cx 4 --cz 4 --r 3 --y1 0 --y2 29 --color "$STONE_TRIM" --filled
  json fill "$file" --x1 2 --y1 6 --z1 0 --x2 6 --y2 15 --z2 3 --color "$STONE_MAIN"
  json fill "$file" --x1 1 --y1 16 --z1 1 --x2 7 --y2 21 --z2 5 --color "$STONE_MAIN"
  json fill "$file" --x1 2 --y1 22 --z1 2 --x2 6 --y2 28 --z2 6 --color "$STONE_TRIM"

  roof_box "$file" 1 1 7 5 22 2 "$ROOF_DARK" 1 1
  spire "$file" 4 4 30 3 3 2 2 1 1

  json fill "$file" --x1 4 --y1 8 --z1 1 --x2 4 --y2 25 --z2 1 --color "$WINDOW"
  json fill "$file" --x1 4 --y1 26 --z1 2 --x2 4 --y2 29 --z2 2 --color "$WINDOW"
}

build_round_tower() {
  local file="$1"
  json init round-tower --out "$file"

  json cylinder "$file" --cx 3 --cz 3 --r 3 --y1 0 --y2 18 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 3 --cz 3 --r 2 --y1 19 --y2 21 --color "$STONE_TRIM" --filled
  spire "$file" 3 3 22 3 3 2 2 1
  json fill "$file" --x1 2 --y1 5 --z1 0 --x2 4 --y2 10 --z2 0 --color "$WINDOW"
}

FINAL="$FILE"
CENTER="$TMP_DIR/main_palace.boxel.json"
WEST="$TMP_DIR/west_wing.boxel.json"
GATE="$TMP_DIR/gatehouse.boxel.json"
CHAPEL="$TMP_DIR/chapel_tower.boxel.json"
ROUND="$TMP_DIR/round_tower.boxel.json"

build_main_palace "$CENTER"
build_west_wing "$WEST"
build_gatehouse "$GATE"
build_chapel_tower "$CHAPEL"
build_round_tower "$ROUND"

rm -f "$FINAL"
json init neuschwanstein-castle-50-modular --out "$FINAL"
set_palette "$FINAL"

# Terrace and cliff base.
json fill "$FINAL" --x1 4 --y1 0 --z1 10 --x2 44 --y2 1 --z2 44 --color "$STONE_CLIFF"
json fill "$FINAL" --x1 6 --y1 2 --z1 12 --x2 42 --y2 3 --z2 42 --color "$STONE_BASE"
json fill "$FINAL" --x1 8 --y1 4 --z1 14 --x2 40 --y2 5 --z2 40 --color "$STONE_MAIN"
json fill "$FINAL" --x1 20 --y1 0 --z1 0 --x2 28 --y2 1 --z2 11 --color "$STONE_CLIFF"
json fill "$FINAL" --x1 19 --y1 2 --z1 10 --x2 29 --y2 2 --z2 12 --color "$STONE_BASE"
json fill "$FINAL" --x1 20 --y1 3 --z1 12 --x2 28 --y2 3 --z2 13 --color "$STONE_BASE"
json fill "$FINAL" --x1 21 --y1 4 --z1 13 --x2 27 --y2 4 --z2 14 --color "$STONE_MAIN"

# Rocky shoulders to hint at the castle's perch.
json fill "$FINAL" --x1 0 --y1 0 --z1 18 --x2 7 --y2 4 --z2 44 --color "$STONE_CLIFF"
json fill "$FINAL" --x1 1 --y1 5 --z1 20 --x2 6 --y2 5 --z2 42 --color "$STONE_BASE"
json fill "$FINAL" --x1 41 --y1 0 --z1 24 --x2 48 --y2 4 --z2 44 --color "$STONE_CLIFF"
json fill "$FINAL" --x1 42 --y1 5 --z1 26 --x2 47 --y2 5 --z2 42 --color "$STONE_BASE"

# Main volumes.
json place "$FINAL" --source "$CENTER" --x 18 --y 6 --z 21 --include structure --collision error
json place "$FINAL" --source "$WEST" --x 1 --y 6 --z 18 --include structure --collision error
json place "$FINAL" --source "$GATE" --x 19 --y 6 --z 7 --include structure --collision error
json place "$FINAL" --source "$CHAPEL" --x 37 --y 6 --z 30 --include structure --collision error
json place "$FINAL" --source "$ROUND" --x 8 --y 6 --z 33 --include structure --collision error
json place "$FINAL" --source "$ROUND" --x 33 --y 6 --z 12 --include structure --collision error

# Connectors and stepped courtyards.
json fill "$FINAL" --x1 15 --y1 6 --z1 22 --x2 18 --y2 13 --z2 29 --color "$STONE_MAIN"
json fill "$FINAL" --x1 18 --y1 6 --z1 15 --x2 30 --y2 12 --z2 21 --color "$STONE_TRIM"
json fill "$FINAL" --x1 36 --y1 6 --z1 29 --x2 39 --y2 14 --z2 34 --color "$STONE_MAIN"
json fill "$FINAL" --x1 13 --y1 6 --z1 31 --x2 19 --y2 10 --z2 37 --color "$STONE_TRIM"
json remove "$FINAL" --x1 22 --y1 6 --z1 15 --x2 26 --y2 9 --z2 21
json remove "$FINAL" --x1 37 --y1 7 --z1 31 --x2 38 --y2 11 --z2 33

roof_box "$FINAL" 15 22 18 29 14 2 "$ROOF_DARK" 1 1
roof_box "$FINAL" 18 15 30 21 13 2 "$ROOF_DARK" 1 1
roof_box "$FINAL" 36 29 39 34 15 2 "$ROOF_DARK" 1 1
roof_box "$FINAL" 13 31 19 37 11 2 "$ROOF_MAIN" 1 1

# Forecourt walls and facade rhythm.
json fill "$FINAL" --x1 11 --y1 6 --z1 14 --x2 37 --y2 10 --z2 15 --color "$STONE_TRIM"
json fill "$FINAL" --x1 11 --y1 11 --z1 14 --x2 37 --y2 11 --z2 15 --color "$STONE_TRIM" --step-x 1 --gap-x 1
json remove "$FINAL" --x1 22 --y1 6 --z1 14 --x2 26 --y2 9 --z2 15
json fill "$FINAL" --x1 15 --y1 7 --z1 15 --x2 15 --y2 9 --z2 15 --color "$WINDOW"
json fill "$FINAL" --x1 20 --y1 7 --z1 15 --x2 20 --y2 10 --z2 15 --color "$WINDOW"
json fill "$FINAL" --x1 28 --y1 7 --z1 15 --x2 28 --y2 10 --z2 15 --color "$WINDOW"
json fill "$FINAL" --x1 33 --y1 7 --z1 15 --x2 33 --y2 9 --z2 15 --color "$WINDOW"

# Rear terrace and small garden accents.
json fill "$FINAL" --x1 15 --y1 6 --z1 40 --x2 37 --y2 6 --z2 44 --color "$STONE_BASE"
json fill "$FINAL" --x1 17 --y1 7 --z1 41 --x2 35 --y2 7 --z2 43 --color "$STONE_TRIM"
json add "$FINAL" --x 12 --y 6 --z 41 --color "$TREE"
json add "$FINAL" --x 36 --y 6 --z 42 --color "$TREE"
json add "$FINAL" --x 10 --y 6 --z 38 --color "$TREE"
json add "$FINAL" --x 39 --y 6 --z 38 --color "$TREE"

json scaffold generate "$FINAL" --margin 1
json recenter "$FINAL"

echo "Generated $FINAL"
