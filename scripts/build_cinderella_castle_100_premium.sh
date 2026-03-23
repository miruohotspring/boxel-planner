#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILE="${1:-examples/cinderella-castle-100-premium.boxel.json}"
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

TMP_DIR="$(mktemp -d /tmp/boxel-cinderella-100-premium-XXXXXX)"
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
  { name: "stone-light", color: "#B8C1D0", description: "明るい石帯" },
  { name: "stone-trim", color: "#E9EEF7", description: "白塔の縁石" },
  { name: "stone-white", color: "#FBFCFE", description: "主塔の白壁" },
  { name: "roof-navy", color: "#27427B", description: "主屋根の濃紺" },
  { name: "roof-blue", color: "#3F66B3", description: "標準の青い尖塔屋根" },
  { name: "roof-sky", color: "#6F94DA", description: "光を受けた青屋根" },
  { name: "window-deep", color: "#253A63", description: "窓奥の濃紺" },
  { name: "window-glow", color: "#F5E7A8", description: "上層の発光窓" },
  { name: "gold", color: "#D6B14D", description: "金色の装飾" },
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
  json init front-large-tower-100 --out "$file"

  json cylinder "$file" --cx 7 --cz 7 --r 7 --y1 0 --y2 25 --color "$STONE_DARK" --filled
  json cylinder "$file" --cx 7 --cz 7 --r 7 --y1 26 --y2 29 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 7 --cz 7 --r 6 --y1 30 --y2 32 --color "$STONE_TRIM" --filled
  json fill "$file" --x1 4 --y1 9 --z1 0 --x2 10 --y2 17 --z2 1 --color "$WINDOW"
  json fill "$file" --x1 1 --y1 26 --z1 2 --x2 13 --y2 26 --z2 12 --color "$STONE_LIGHT" --step-x 1 --gap-x 1
  spire "$file" 7 7 33 "$ROOF_BLUE" 8 8 7 7 6 6 5 5 4 4 3 3 2 2 1
}

build_medium_front_tower() {
  local file="$1"
  json init front-medium-tower-100 --out "$file"

  json cylinder "$file" --cx 5 --cz 5 --r 5 --y1 0 --y2 20 --color "$STONE_DARK" --filled
  json cylinder "$file" --cx 5 --cz 5 --r 5 --y1 21 --y2 24 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 5 --cz 5 --r 4 --y1 25 --y2 27 --color "$STONE_TRIM" --filled
  json fill "$file" --x1 3 --y1 8 --z1 0 --x2 7 --y2 15 --z2 0 --color "$WINDOW"
  json fill "$file" --x1 2 --y1 22 --z1 2 --x2 8 --y2 22 --z2 8 --color "$STONE_LIGHT" --step-x 1 --gap-x 1
  spire "$file" 5 5 28 "$ROOF_SKY" 6 6 5 5 4 4 3 3 2 2 1
}

build_small_turret() {
  local file="$1"
  json init small-turret-100 --out "$file"

  json cylinder "$file" --cx 3 --cz 3 --r 3 --y1 0 --y2 16 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 3 --cz 3 --r 2 --y1 17 --y2 19 --color "$STONE_TRIM" --filled
  json fill "$file" --x1 3 --y1 7 --z1 0 --x2 3 --y2 12 --z2 0 --color "$WINDOW"
  spire "$file" 3 3 20 "$ROOF_BLUE" 4 4 3 3 2 2 1
}

build_rear_tower() {
  local file="$1"
  json init rear-tower-100 --out "$file"

  json cylinder "$file" --cx 4 --cz 4 --r 4 --y1 0 --y2 18 --color "$STONE_MAIN" --filled
  json cylinder "$file" --cx 4 --cz 4 --r 3 --y1 19 --y2 21 --color "$STONE_TRIM" --filled
  json fill "$file" --x1 3 --y1 8 --z1 0 --x2 5 --y2 13 --z2 0 --color "$WINDOW"
  spire "$file" 4 4 22 "$ROOF_BLUE" 5 5 4 4 3 3 2 2 1
}

build_central_keep() {
  local file="$1"
  json init central-keep-100-premium --out "$file"

  json fill "$file" --x1 0 --y1 0 --z1 0 --x2 30 --y2 14 --z2 34 --color "$STONE_WHITE"
  json remove "$file" --x1 3 --y1 1 --z1 3 --x2 27 --y2 13 --z2 30
  json fill "$file" --x1 4 --y1 15 --z1 3 --x2 26 --y2 28 --z2 26 --color "$STONE_TRIM"
  json remove "$file" --x1 8 --y1 16 --z1 7 --x2 22 --y2 27 --z2 22

  json cylinder "$file" --cx 3 --cz 6 --r 3 --y1 7 --y2 28 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 27 --cz 6 --r 3 --y1 7 --y2 28 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 6 --cz 27 --r 3 --y1 10 --y2 22 --color "$STONE_WHITE" --filled
  json cylinder "$file" --cx 24 --cz 27 --r 3 --y1 10 --y2 22 --color "$STONE_WHITE" --filled

  json cylinder "$file" --cx 15 --cz 18 --r 6 --y1 29 --y2 43 --color "$STONE_TRIM" --filled
  json cylinder "$file" --cx 15 --cz 18 --r 4 --y1 44 --y2 56 --color "$STONE_WHITE" --filled
  json fill "$file" --x1 13 --y1 57 --z1 16 --x2 17 --y2 61 --z2 20 --color "$STONE_TRIM"

  roof_box "$file" 5 3 25 24 29 4 "$ROOF_NAVY" 1 1
  roof_box "$file" 7 23 23 31 24 3 "$ROOF_NAVY" 1 1
  json gable "$file" --face north --center 15 --base 0 --y 21 --width 17 --height 12 --depth 8 --color "$STONE_TRIM"
  json gable "$file" --face south --center 15 --base 34 --y 24 --width 13 --height 8 --depth 6 --color "$STONE_TRIM"

  spire "$file" 3 6 29 "$ROOF_SKY" 5 5 4 4 3 3 2 2 1
  spire "$file" 27 6 29 "$ROOF_SKY" 5 5 4 4 3 3 2 2 1
  spire "$file" 6 27 23 "$ROOF_BLUE" 3 3 2 2 1
  spire "$file" 24 27 23 "$ROOF_BLUE" 3 3 2 2 1
  spire "$file" 15 18 62 "$ROOF_BLUE" 4 4 4 3 3 3 2 2 2 1 1
  json add "$file" --x 15 --y 73 --z 18 --color "$GOLD"

  json fill "$file" --x1 13 --y1 4 --z1 0 --x2 17 --y2 13 --z2 0 --color "$WINDOW"
  json fill "$file" --x1 8 --y1 13 --z1 1 --x2 10 --y2 20 --z2 1 --color "$WINDOW"
  json fill "$file" --x1 20 --y1 13 --z1 1 --x2 22 --y2 20 --z2 1 --color "$WINDOW"
  json fill "$file" --x1 15 --y1 21 --z1 1 --x2 15 --y2 25 --z2 1 --color "$WINDOW_GLOW"
  json add "$file" --x 15 --y 18 --z 0 --color "$ROSE_CYAN"
  json add "$file" --x 14 --y 18 --z 0 --color "$ROSE_MAGENTA"
  json add "$file" --x 16 --y 18 --z 0 --color "$ROSE_YELLOW"
  json add "$file" --x 15 --y 17 --z 0 --color "$ROSE_MAGENTA"
  json add "$file" --x 15 --y 19 --z 0 --color "$ROSE_YELLOW"
  json fill "$file" --x1 8 --y1 18 --z1 0 --x2 22 --y2 18 --z2 0 --color "$GOLD_DARK" --step-x 1 --gap-x 1
}

FINAL="$FILE"
TOWER_L="$TMP_DIR/front_large_tower.boxel.json"
TOWER_M="$TMP_DIR/front_medium_tower.boxel.json"
TURRET_S="$TMP_DIR/small_turret.boxel.json"
TOWER_R="$TMP_DIR/rear_tower.boxel.json"
KEEP="$TMP_DIR/central_keep_100.boxel.json"

build_large_front_tower "$TOWER_L"
build_medium_front_tower "$TOWER_M"
build_small_turret "$TURRET_S"
build_rear_tower "$TOWER_R"
build_central_keep "$KEEP"

rm -f "$FINAL"
json init cinderella-castle-100-premium --out "$FINAL"
set_palette "$FINAL"

# Terrace, bridge, and forecourt.
json fill "$FINAL" --x1 0 --y1 0 --z1 18 --x2 98 --y2 4 --z2 98 --color "$STONE_LIGHT"
json fill "$FINAL" --x1 4 --y1 5 --z1 22 --x2 94 --y2 7 --z2 92 --color "$COURT"
json fill "$FINAL" --x1 38 --y1 0 --z1 0 --x2 60 --y2 3 --z2 18 --color "$COURT"
json fill "$FINAL" --x1 40 --y1 4 --z1 0 --x2 58 --y2 6 --z2 16 --color "$STONE_TRIM"
json fill "$FINAL" --x1 42 --y1 7 --z1 0 --x2 56 --y2 8 --z2 14 --color "$STONE_WHITE"
json fill "$FINAL" --x1 16 --y1 8 --z1 16 --x2 82 --y2 9 --z2 18 --color "$STONE_TRIM"
json fill "$FINAL" --x1 12 --y1 5 --z1 70 --x2 24 --y2 8 --z2 92 --color "$GARDEN"
json fill "$FINAL" --x1 74 --y1 5 --z1 70 --x2 86 --y2 8 --z2 92 --color "$GARDEN"

# Front fortress wall and gate.
json fill "$FINAL" --x1 18 --y1 10 --z1 28 --x2 80 --y2 31 --z2 48 --color "$STONE_DARK"
json remove "$FINAL" --x1 42 --y1 10 --z1 28 --x2 56 --y2 23 --z2 42
json fill "$FINAL" --x1 36 --y1 24 --z1 28 --x2 62 --y2 37 --z2 44 --color "$STONE_TRIM"
json fill "$FINAL" --x1 39 --y1 38 --z1 30 --x2 59 --y2 43 --z2 40 --color "$STONE_WHITE"
json gable "$FINAL" --face north --center 49 --base 27 --y 30 --width 19 --height 14 --depth 8 --color "$STONE_TRIM"
json fill "$FINAL" --x1 49 --y1 24 --z1 28 --x2 49 --y2 33 --z2 28 --color "$WINDOW_GLOW"
json add "$FINAL" --x 49 --y 29 --z 27 --color "$ROSE_CYAN"
json add "$FINAL" --x 48 --y 29 --z 27 --color "$ROSE_MAGENTA"
json add "$FINAL" --x 50 --y 29 --z 27 --color "$ROSE_YELLOW"
json add "$FINAL" --x 49 --y 28 --z 27 --color "$ROSE_MAGENTA"
json add "$FINAL" --x 49 --y 30 --z 27 --color "$ROSE_YELLOW"

# Front tower belt.
json place "$FINAL" --source "$TOWER_L" --x 10 --y 10 --z 28 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_L" --x 74 --y 10 --z 28 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_M" --x 24 --y 12 --z 21 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_M" --x 64 --y 12 --z 21 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_M" --x 1 --y 14 --z 34 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_M" --x 87 --y 14 --z 34 --include structure --collision theirs
json place "$FINAL" --source "$TURRET_S" --x 33 --y 14 --z 24 --include structure --collision theirs
json place "$FINAL" --source "$TURRET_S" --x 59 --y 14 --z 24 --include structure --collision theirs

# Side wings and outer turrets.
json fill "$FINAL" --x1 4 --y1 14 --z1 42 --x2 24 --y2 29 --z2 74 --color "$STONE_MAIN"
json fill "$FINAL" --x1 74 --y1 14 --z1 42 --x2 94 --y2 29 --z2 74 --color "$STONE_MAIN"
json fill "$FINAL" --x1 4 --y1 30 --z1 42 --x2 24 --y2 30 --z2 74 --color "$STONE_LIGHT" --step-z 1 --gap-z 1
json fill "$FINAL" --x1 74 --y1 30 --z1 42 --x2 94 --y2 30 --z2 74 --color "$STONE_LIGHT" --step-z 1 --gap-z 1
json place "$FINAL" --source "$TURRET_S" --x 8 --y 16 --z 50 --include structure --collision theirs
json place "$FINAL" --source "$TURRET_S" --x 84 --y 16 --z 50 --include structure --collision theirs
json place "$FINAL" --source "$TURRET_S" --x 16 --y 18 --z 70 --include structure --collision theirs
json place "$FINAL" --source "$TURRET_S" --x 76 --y 18 --z 70 --include structure --collision theirs

# Central keep and the white upper palace.
json place "$FINAL" --source "$KEEP" --x 34 --y 18 --z 33 --include structure --collision theirs
json cylinder "$FINAL" --cx 40 --cz 42 --r 2 --y1 42 --y2 54 --color "$STONE_TRIM" --filled
json cylinder "$FINAL" --cx 58 --cz 42 --r 2 --y1 42 --y2 54 --color "$STONE_TRIM" --filled
json fill "$FINAL" --x1 40 --y1 46 --z1 40 --x2 40 --y2 50 --z2 40 --color "$WINDOW_GLOW"
json fill "$FINAL" --x1 58 --y1 46 --z1 40 --x2 58 --y2 50 --z2 40 --color "$WINDOW_GLOW"
spire "$FINAL" 40 42 55 "$ROOF_BLUE" 3 3 2 2 1
spire "$FINAL" 58 42 55 "$ROOF_BLUE" 3 3 2 2 1
json fill "$FINAL" --x1 34 --y1 34 --z1 58 --x2 64 --y2 41 --z2 74 --color "$STONE_WHITE"
json fill "$FINAL" --x1 38 --y1 42 --z1 60 --x2 60 --y2 47 --z2 70 --color "$STONE_TRIM"
roof_box "$FINAL" 38 59 60 71 48 4 "$ROOF_NAVY" 1 1
json gable "$FINAL" --face south --center 49 --base 74 --y 44 --width 17 --height 8 --depth 7 --color "$STONE_TRIM"

# Rear mass and background towers.
json fill "$FINAL" --x1 22 --y1 18 --z1 72 --x2 76 --y2 28 --z2 90 --color "$STONE_DARK"
json fill "$FINAL" --x1 22 --y1 29 --z1 72 --x2 76 --y2 29 --z2 90 --color "$STONE_TRIM" --step-x 1 --gap-x 1
json fill "$FINAL" --x1 28 --y1 20 --z1 86 --x2 36 --y2 28 --z2 94 --color "$STONE_MAIN"
json fill "$FINAL" --x1 62 --y1 20 --z1 86 --x2 70 --y2 28 --z2 94 --color "$STONE_MAIN"
roof_box "$FINAL" 28 86 36 94 29 3 "$ROOF_BLUE" 1 1
roof_box "$FINAL" 62 86 70 94 29 3 "$ROOF_BLUE" 1 1
json place "$FINAL" --source "$TOWER_R" --x 22 --y 20 --z 76 --include structure --collision theirs
json place "$FINAL" --source "$TOWER_R" --x 68 --y 20 --z 76 --include structure --collision theirs
json place "$FINAL" --source "$TURRET_S" --x 32 --y 24 --z 90 --include structure --collision theirs
json place "$FINAL" --source "$TURRET_S" --x 60 --y 24 --z 90 --include structure --collision theirs

# Flags and trim.
json fill "$FINAL" --x1 26 --y1 18 --z1 28 --x2 26 --y2 28 --z2 28 --color "$BANNER_GREEN"
json fill "$FINAL" --x1 34 --y1 17 --z1 28 --x2 34 --y2 29 --z2 28 --color "$BANNER_CYAN"
json fill "$FINAL" --x1 64 --y1 17 --z1 28 --x2 64 --y2 29 --z2 28 --color "$BANNER_PURPLE"
json fill "$FINAL" --x1 72 --y1 18 --z1 28 --x2 72 --y2 28 --z2 28 --color "$BANNER_RED"
json fill "$FINAL" --x1 38 --y1 44 --z1 31 --x2 38 --y2 50 --z2 31 --color "$BANNER_CYAN"
json fill "$FINAL" --x1 60 --y1 44 --z1 31 --x2 60 --y2 50 --z2 31 --color "$BANNER_RED"
json fill "$FINAL" --x1 36 --y1 37 --z1 28 --x2 62 --y2 37 --z2 28 --color "$GOLD" --step-x 1 --gap-x 1
json add "$FINAL" --x 49 --y 82 --z 51 --color "$GOLD_DARK"
json add "$FINAL" --x 49 --y 81 --z 51 --color "$GOLD"
json add "$FINAL" --x 40 --y 62 --z 42 --color "$GOLD"
json add "$FINAL" --x 58 --y 62 --z 42 --color "$GOLD"

json scaffold generate "$FINAL" --margin 1
json recenter "$FINAL"

echo "Generated $FINAL"
