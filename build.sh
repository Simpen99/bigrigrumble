#!/bin/sh
# Builds Big Rig Rumble from src/ into dist/index.html (PeerJS multiplayer, deploy with `npx wrangler deploy`).
set -e
cd "$(dirname "$0")/src"
cat part1.html part2.js partart.js parttruck.js partmap.js partfx.js partnet.js part3.js partgame.js part4a.js part4b.js partmg2.js partedit.js part4c.js partend.html > ../dist/index.html
echo "Built dist/index.html"
