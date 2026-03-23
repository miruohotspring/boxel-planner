#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:-examples/cinderella-castle-50-premium.boxel.json}"
CLI=(node packages/cli/dist/index.js)

STONE_DARK="#7A818E"
STONE_MAIN="#919AAA"
STONE_LIGHT="#B8C1D0"
STONE_TRIM="#E9EEF7"
STONE_WHITE="#FBFCFE"
ROOF_NAVY="#27427B"
ROOF_BLUE="#3F66B3"
ROOF_SKY="#6F94DA"
WINDOW="#253A63"
WINDOW_GLOW="#F5E7A8"
GOLD="#D6B14D"
GOLD_DARK="#A9872A"
ROSE_CYAN="#7BD8E6"
ROSE_MAGENTA="#D36AD9"
ROSE_YELLOW="#E8D86A"
BANNER_RED="#C84253"
BANNER_GREEN="#7ED46D"
BANNER_CYAN="#52D1D8"
BANNER_PURPLE="#8B5BE8"
COURT="#DDE5F1"
GARDEN="#55794C"

TMP_DIR="$(mktemp -d /tmp/boxel-cinderella-premium-XXXXXX)"
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
  { name: "stone-dark", color: "#7A818E", description: "下層外壁の濃い灰石" },
  { name: "stone-main", color: "#919AAA", description: "石塔の主色" },
  { name: "stone-light", color: "#B8C1D0", description: "上縁や明るい石帯" },
  { name: "stone-trim", color: "#E9EEF7", description: "白塔の縁石" },
  { name: "stone-white", color: "#FBFCFE", description: "上層主塔の白壁" },
  { name: "roof-navy", color: "#27427B", description: "主屋根の濃紺" },
  { name: "roof-blue", color: "#3F66B3", description: "標準の青い尖塔屋根" },
  { name: "roof-sky", color: "#6F94DA", description: "光の当たる明るい屋根" },
  { name: "window-deep", color: "#253A63", description: "窓奥の濃紺" },
  { name: "window-glow", color: "#F5E7A8", description: "塔上部の発光窓" },
  { name: "gold", color: "#D6B14D", description: "金色の装飾とフィニアル" },
  { name: "gold-dark", color: "#A9872A", description: "影側の金装飾" },
  { name: "rose-cyan", color: "#7BD8E6", description: "ステンドグラスの水色" },
  { name: "rose-magenta", color: "#D36AD9", description: "ステンドグラスの紫紅" },
  { name: "rose-yellow", color: "#E8D86A", description: "ステンドグラスの黄" },
  { name: "banner-red", color: "#C84253", description: "暖色の旗" },
  { name: "banner-green", color: "#7ED46D", description: "緑の旗" },
  { name: "banner-cyan", color: "#52D1D8", description: "青緑の旗" },
  { name: "banner-purple", color: "#8B5BE8", description: "紫の旗" },
  { name: "court", color: "#DDE5F1", description: "前庭と欄干の石" },
  { name: "garden", color: "#55794C", description: "植栽" }
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
  local color="${5:-$ROOF_BLUE}"
  shift 5

  local radii_csv=""
  local r
  for r in "$@"; do
    if [[ -n "$radii_csv" ]]; then
      radii_csv+=","
    fi
    radii_csv+="$r"
  done

  json spire "$file" --cx "$cx" --cz "$cz" --y "$start_y" --radii "$radii_csv" --color "$color" --cap-color "$GOLD"
}

build_large_front_tower() {
  local file="$1"
  json init large-front-tower --out "$file"

  json cylinder "$file" --cx 4 --cz 4 --r 4 --y1 0 --y2 15 --color "$STONE_DARK" --filled
  json cylinder "$file" --cx 4 --cz 4 --r 4 --y1 16 --y2 18 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 4 --cz 4 --r 3 --y1 19 --y2 20 --color "$STONE_TRIM" --filled
  json fill "$file" --x1 1 --y1 8 --z1 0 --x2 7 --y2 11 --z2 1 --color "$WINDOW"
  json fill "$file" --x1 0 --y1 16 --z1 2 --x2 8 --y2 16 --z2 6 --color "$STONE_LIGHT" --step-x 1 --gap-x 1
  spire "$file" 4 4 21 "$ROOF_BLUE" 5 5 4 4 3 3 2 2 1
}

build_small_front_tower() {
  local file="$1"
  json init small-front-tower --out "$file"

  json cylinder "$file" --cx 3 --cz 3 --r 3 --y1 0 --y2 12 --color "$STONE_DARK" --filled
  json cylinder "$file" --cx 3 --cz 3 --r 3 --y1 13 --y2 15 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 3 --cz 3 --r 2 --y1 16 --y2 17 --color "$STONE_TRIM" --filled
  json fill "$file" --x1 2 --y1 6 --z1 0 --x2 4 --y2 9 --z2 0 --color "$WINDOW"
  json fill "$file" --x1 1 --y1 13 --z1 1 --x2 5 --y2 13 --z2 5 --color "$STONE_LIGHT" --step-x 1 --gap-x 1
  spire "$file" 3 3 18 "$ROOF_SKY" 4 4 3 3 2 2 1
}

build_side_turret() {
  local file="$1"
  json init side-turret --out "$file"

  json cylinder "$file" --cx 2 --cz 2 --r 2 --y1 0 --y2 11 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 2 --cz 2 --r 1 --y1 12 --y2 13 --color "$STONE_TRIM" --filled
  json fill "$file" --x1 2 --y1 5 --z1 0 --x2 2 --y2 8 --z2 0 --color "$WINDOW"
  spire "$file" 2 2 14 "$ROOF_BLUE" 3 3 2 2 1
}

build_central_keep() {
  local file="$1"
  json init central-keep-premium --out "$file"

  # lower white palace block
  json fill "$file" --x1 0 --y1 0 --z1 0 --x2 14 --y2 8 --z2 15 --color "$STONE_WHITE"
  json remove "$file" --x1 2 --y1 1 --z1 2 --x2 12 --y2 7 --z2 13
  json fill "$file" --x1 2 --y1 9 --z1 1 --x2 12 --y2 15 --z2 12 --color "$STONE_TRIM"
  json remove "$file" --x1 4 --y1 10 --z1 3 --x2 10 --y2 14 --z2 10

  # front white flank turrets
  json cylinder "$file" --cx 1 --cz 3 --r 2 --y1 4 --y2 15 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 13 --cz 3 --r 2 --y1 4 --y2 15 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 2 --cz 13 --r 2 --y1 6 --y2 13 --color "$STONE_WHITE" --filled
  json cylinder "$file" --cx 12 --cz 13 --r 2 --y1 6 --y2 13 --color "$STONE_WHITE" --filled

  # central drum for the main tower
  json cylinder "$file" --cx 7 --cz 9 --r 3 --y1 16 --y2 23 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 7 --cz 9 --r 2 --y1 24 --y2 29 --color "$STONE_WHITE" --filled
  json fill "$file" --x1 6 --y1 30 --z1 8 --x2 8 --y2 31 --z2 10 --color "$STONE_TRIM"

  roof_box "$file" 2 1 12 12 16 3 "$ROOF_NAVY" 1 1
  json gable "$file" --face north --center 7 --base 0 --y 12 --width 9 --height 7 --depth 5 --color "$STONE_TRIM"
  spire "$file" 1 3 16 "$ROOF_SKY" 3 3 2 2 1
  spire "$file" 13 3 16 "$ROOF_SKY" 3 3 2 2 1
  spire "$file" 2 13 14 "$ROOF_BLUE" 2 2 1
  spire "$file" 12 13 14 "$ROOF_BLUE" 2 2 1
  spire "$file" 7 9 30 "$ROOF_BLUE" 2 2 2 1 1 1
  json add "$file" --x 7 --y 34 --z 9 --color "$GOLD"

  # front windows and stained-glass rose
  json fill "$file" --x1 6 --y1 2 --z1 0 --x2 8 --y2 8 --z2 0 --color "$WINDOW"
  json fill "$file" --x1 4 --y1 7 --z1 1 --x2 5 --y2 11 --z2 1 --color "$WINDOW"
  json fill "$file" --x1 9 --y1 7 --z1 1 --x2 10 --y2 11 --z2 1 --color "$WINDOW"
  json fill "$file" --x1 7 --y1 12 --z1 1 --x2 7 --y2 14 --z2 1 --color "$WINDOW_GLOW"
  json add "$file" --x 7 --y 12 --z 0 --color "$ROSE_CYAN"
  json add "$file" --x 6 --y 12 --z 0 --color "$ROSE_MAGENTA"
  json add "$file" --x 8 --y 12 --z 0 --color "$ROSE_YELLOW"
  json add "$file" --x 7 --y 11 --z 0 --color "$ROSE_MAGENTA"
  json add "$file" --x 7 --y 13 --z 0 --color "$ROSE_YELLOW"
  json fill "$file" --x1 3 --y1 12 --z1 0 --x2 11 --y2 12 --z2 0 --color "$GOLD_DARK" --step-x 1 --gap-x 1
}

FINAL="$FILE"
TOWER_L="$TMP_DIR/front_large_tower.boxel.json"
TOWER_S="$TMP_DIR/front_small_tower.boxel.json"
TURRET="$TMP_DIR/side_turret.boxel.json"
KEEP="$TMP_DIR/central_keep.boxel.json"

build_large_front_tower "$TOWER_L"
build_small_front_tower "$TOWER_S"
build_side_turret "$TURRET"
build_central_keep "$KEEP"

rm -f "$FINAL"
json init cinderella-castle-50-premium --out "$FINAL"
set_palette "$FINAL"

# Broad terrace and front bridge.
json fill "$FINAL" --x1 0 --y1 0 --z1 7 --x2 48 --y2 2 --z2 48 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 3 --y1 3 --z1 10 --x2 45 --y2 4 --z2 45 --color "$COURT"
json fill "$FINAL" --x1 8 --y1 5 --z1 14 --x2 40 --y2 5 --z2 41 --color "$STONE_WHITE"
json fill "$FINAL" --x1 18 --y1 0 --z1 0 --x2 30 --y2 2 --z2 10 --color "$COURT"
json fill "$FINAL" --x1 19 --y1 3 --z1 0 --x2 29 --y2 3 --z2 8 --color "$STONE_TRIM"
json fill "$FINAL" --x1 20 --y1 4 --z1 0 --x2 28 --y2 4 --z2 7 --color "$STONE_WHITE"

# Low balustrade and gardens.
json fill "$FINAL" --x1 12 --y1 5 --z1 9 --x2 36 --y2 6 --z2 10 --color "$STONE_TRIM"
json fill "$FINAL" --x1 12 --y1 7 --z1 10 --x2 36 --y2 7 --z2 10 --color "$STONE_TRIM" --step-x 1 --gap-x 1
json fill "$FINAL" --x1 2 --y1 3 --z1 34 --x2 7 --y2 5 --z2 46 --color "$GARDEN"
json fill "$FINAL" --x1 41 --y1 3 --z1 34 --x2 46 --y2 5 --z2 46 --color "$GARDEN"

# Massive lower front wall and gate core.
json fill "$FINAL" --x1 10 --y1 6 --z1 14 --x2 38 --y2 17 --z2 24 --color "$STONE_DARK"
json remove "$FINAL" --x1 21 --y1 6 --z1 14 --x2 27 --y2 13 --z2 21
json fill "$FINAL" --x1 18 --y1 14 --z1 14 --x2 30 --y2 23 --z2 22 --color "$STONE_TRIM"
json fill "$FINAL" --x1 19 --y1 24 --z1 15 --x2 29 --y2 28 --z2 20 --color "$STONE_WHITE"
json gable "$FINAL" --face north --center 24 --base 13 --y 19 --width 11 --height 9 --depth 5 --color "$STONE_TRIM"
json fill "$FINAL" --x1 24 --y1 17 --z1 14 --x2 24 --y2 21 --z2 14 --color "$WINDOW_GLOW"
json add "$FINAL" --x 24 --y 18 --z 13 --color "$ROSE_CYAN"
json add "$FINAL" --x 23 --y 18 --z 13 --color "$ROSE_MAGENTA"
json add "$FINAL" --x 25 --y 18 --z 13 --color "$ROSE_YELLOW"
json add "$FINAL" --x 24 --y 17 --z 13 --color "$ROSE_MAGENTA"
json add "$FINAL" --x 24 --y 19 --z 13 --color "$ROSE_YELLOW"

# Front tower ensemble.
json place "$FINAL" --source "$TOWER_L" --x 7 --y 6 --z 14 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_L" --x 33 --y 6 --z 14 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_S" --x 14 --y 8 --z 11 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_S" --x 28 --y 8 --z 11 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_S" --x 2 --y 8 --z 16 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_S" --x 40 --y 8 --z 16 --include structure --collision theirs

# Side walls and secondary towers.
json fill "$FINAL" --x1 4 --y1 8 --z1 20 --x2 12 --y2 17 --z2 34 --color "$STONE_MAIN"
json fill "$FINAL" --x1 36 --y1 8 --z1 20 --x2 44 --y2 17 --z2 34 --color "$STONE_MAIN"
json fill "$FINAL" --x1 4 --y1 18 --z1 20 --x2 12 --y2 18 --z2 34 --color "$STONE_LIGHT" --step-z 1 --gap-z 1
json fill "$FINAL" --x1 36 --y1 18 --z1 20 --x2 44 --y2 18 --z2 34 --color "$STONE_LIGHT" --step-z 1 --gap-z 1
json place "$FINAL" --source "$TURRET" --x 6 --y 10 --z 24 --include structure --collision theirs
json place "$FINAL" --source "$TURRET" --x 40 --y 10 --z 24 --include structure --collision theirs
json place "$FINAL" --source "$TURRET" --x 8 --y 11 --z 34 --include structure --collision theirs
json place "$FINAL" --source "$TURRET" --x 38 --y 11 --z 34 --include structure --collision theirs

# Central white keep and vertical composition.
json place "$FINAL" --source "$KEEP" --x 17 --y 12 --z 16 --include structure --collision theirs
json cylinder "$FINAL" --cx 20 --cz 20 --r 1 --y1 26 --y2 33 --color "$STONE_TRIM" --filled
json cylinder "$FINAL" --cx 28 --cz 20 --r 1 --y1 26 --y2 33 --color "$STONE_TRIM" --filled
json fill "$FINAL" --x1 20 --y1 29 --z1 19 --x2 20 --y2 31 --z2 19 --color "$WINDOW_GLOW"
json fill "$FINAL" --x1 28 --y1 29 --z1 19 --x2 28 --y2 31 --z2 19 --color "$WINDOW_GLOW"
spire "$FINAL" 20 20 34 "$ROOF_BLUE" 2 2 1 1
spire "$FINAL" 28 20 34 "$ROOF_BLUE" 2 2 1 1
json fill "$FINAL" --x1 17 --y1 18 --z1 25 --x2 31 --y2 23 --z2 33 --color "$STONE_WHITE"
json fill "$FINAL" --x1 18 --y1 24 --z1 27 --x2 30 --y2 28 --z2 31 --color "$STONE_TRIM"
roof_box "$FINAL" 18 26 30 32 29 3 "$ROOF_NAVY" 1 1
json gable "$FINAL" --face south --center 24 --base 33 --y 27 --width 9 --height 5 --depth 4 --color "$STONE_TRIM"

# Rear battlements and side appendages.
json fill "$FINAL" --x1 12 --y1 10 --z1 34 --x2 36 --y2 17 --z2 42 --color "$STONE_DARK"
json fill "$FINAL" --x1 12 --y1 18 --z1 34 --x2 36 --y2 18 --z2 42 --color "$STONE_TRIM" --step-x 1 --gap-x 1
json fill "$FINAL" --x1 17 --y1 8 --z1 39 --x2 20 --y2 13 --z2 44 --color "$STONE_MAIN"
json fill "$FINAL" --x1 28 --y1 8 --z1 39 --x2 31 --y2 13 --z2 44 --color "$STONE_MAIN"
roof_box "$FINAL" 17 39 20 44 14 2 "$ROOF_BLUE" 1 1
roof_box "$FINAL" 28 39 31 44 14 2 "$ROOF_BLUE" 1 1

# Banners and gold accents.
json fill "$FINAL" --x1 13 --y1 11 --z1 14 --x2 13 --y2 17 --z2 14 --color "$BANNER_GREEN"
json fill "$FINAL" --x1 17 --y1 10 --z1 14 --x2 17 --y2 17 --z2 14 --color "$BANNER_CYAN"
json fill "$FINAL" --x1 31 --y1 10 --z1 14 --x2 31 --y2 17 --z2 14 --color "$BANNER_PURPLE"
json fill "$FINAL" --x1 35 --y1 11 --z1 14 --x2 35 --y2 17 --z2 14 --color "$BANNER_RED"
json fill "$FINAL" --x1 19 --y1 29 --z1 15 --x2 19 --y2 33 --z2 15 --color "$BANNER_CYAN"
json fill "$FINAL" --x1 29 --y1 29 --z1 15 --x2 29 --y2 33 --z2 15 --color "$BANNER_RED"
json fill "$FINAL" --x1 18 --y1 23 --z1 14 --x2 30 --y2 23 --z2 14 --color "$GOLD" --step-x 1 --gap-x 1
json add "$FINAL" --x 24 --y 45 --z 25 --color "$GOLD_DARK"
json add "$FINAL" --x 24 --y 44 --z 25 --color "$GOLD"
json add "$FINAL" --x 20 --y 35 --z 19 --color "$GOLD"
json add "$FINAL" --x 28 --y 35 --z 19 --color "$GOLD"

json scaffold generate "$FINAL" --margin 1
json recenter "$FINAL"

echo "Generated $FINAL"
