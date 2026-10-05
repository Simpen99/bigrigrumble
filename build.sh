#!/bin/sh
# Builds both versions of Big Rig Rumble from src/ into dist/.
set -e
cd "$(dirname "$0")/src"
# Web version (PeerJS multiplayer, host anywhere e.g. Netlify)
cat part1n.html part2.js partart.js parttruck.js partmap.js partfx.js partnet.js part3n.js partgame.js part4a.js part4b.js partmg2.js partedit.js part4cn.js partend.html > ../dist/index.html
# Claude artifact version (Claude "room" multiplayer)
cat part1.html part2.js partart.js parttruck.js partmap.js partfx.js part3.js partgame.js part4a.js part4b.js partmg2.js partedit.js part4c.js partend.html > ../dist/claude-artifact.html
echo "Built dist/index.html and dist/claude-artifact.html"
