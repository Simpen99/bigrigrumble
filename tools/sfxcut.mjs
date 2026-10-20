// Packs a sound file holding several takes of one sound (takes separated by silence, like the user's sound packs) into a
// small mono mp3 for dist/sfx/: each take trimmed, GAP s of silence between them, scaled by --gain dB.
// The game finds the takes again from the silences (sfxTakes in partfx) and plays a random one.
//   node tools/sfxcut.mjs <in.wav> [<out.mp3>] [--gain dB]
//   node tools/sfxcut.mjs --all [<folder>]   every sound in PACKS from <folder>/<name>.wav (default sfx-raw/, not in git)
//                                            into dist/sfx/<name>.mp3 at its gain
// Without an output it only lists the takes it finds. Needs ffmpeg (winget install Gyan.FFmpeg).
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const GAP = 0.3,
	FLOOR = -50,
	MIN = 0.15;
/* the packs and their gains in dB: matched to the synth sounds they replaced (the loudest moment, EBU R128 momentary
   loudness: hit = crush, whip = cannon, crunchy = crush + thunder, splash = splash, spike = crush; the rest a little under) */
const PACKS = {
	hit: -7,
	whip: -10,
	whimsy: -13.5,
	coin: -14.5,
	crunchy: -1,
	spike: -5,
	splash: 6.5,
	strip: 10,
	jump: -3,
	jumpboost: -12,
	speed: -9.5,
};
const args = process.argv.slice(2);
if (args[0] === "--all") {
	const dir = args[1] || "sfx-raw";
	for (const [n, g] of Object.entries(PACKS)) {
		const r = spawnSync(
			process.execPath,
			[process.argv[1], path.join(dir, n + ".wav"), `dist/sfx/${n}.mp3`, "--gain", g],
			{
				encoding: "utf8",
			},
		);
		process.stdout.write(r.stdout + r.stderr);
	}
	process.exit(0);
}
const gi = args.indexOf("--gain"),
	gain = gi >= 0 ? +args[gi + 1] : 0,
	[src, out] = args.filter((a, i) => !a.startsWith("--") && (gi < 0 || i !== gi + 1));

/* ffmpeg on the PATH, or where winget put it (a shell started before the install doesn't have it on the PATH yet) */
function ffmpeg() {
	if (!spawnSync("ffmpeg", ["-version"]).error) return "ffmpeg";
	const base = path.join(process.env.LOCALAPPDATA || "", "Microsoft/WinGet/Packages");
	for (const d of fs.existsSync(base) ? fs.readdirSync(base) : []) {
		if (!/ffmpeg/i.test(d)) continue;
		for (const s of fs.readdirSync(path.join(base, d))) {
			const exe = path.join(base, d, s, "bin/ffmpeg.exe");
			if (fs.existsSync(exe)) return exe;
		}
	}
	throw new Error("ffmpeg not found");
}
const FF = ffmpeg(),
	ff = (a) => spawnSync(FF, ["-hide_banner", "-nostats", ...a], { encoding: "utf8" });

/* the takes = the stretches between silences (under FLOOR dB for MIN s), with a little room either side: the attack
   starts just under the floor, the tail fades out under it */
const det = ff(["-i", src, "-af", `silencedetect=n=${FLOOR}dB:d=${MIN}`, "-f", "null", "-"]).stderr,
	dur = (/Duration: (\d+):(\d+):([\d.]+)/.exec(det) || []).slice(1).reduce((a, v) => a * 60 + +v, 0),
	ev = [...det.matchAll(/silence_(start|end): ([\d.]+)/g)].map((m) => [m[1], +m[2]]),
	segs = [];
let at = 0;
for (const [k, t] of ev) {
	if (k === "start" && t > at + 0.02) segs.push([at, t]);
	if (k === "end") at = t;
}
if ((!ev.length || ev[ev.length - 1][0] === "end") && dur > at + 0.02) segs.push([at, dur]);
const cut = segs.map(([a, b]) => [Math.max(0, a - 0.01), Math.min(dur, b + 0.08)]);
if (!out) {
	console.log(`${path.basename(src)}: ${cut.length} takes`);
	cut.forEach(([a, b], i) => console.log(`  ${i + 1}: ${a.toFixed(3)} .. ${b.toFixed(3)} (${(b - a).toFixed(2)} s)`));
	process.exit(0);
}

/* each take trimmed, faded out over its last 60 ms, GAP s of silence after it; all joined, down to mono */
const parts = cut.map(
	([a, b], i) =>
		`[0:a]atrim=${a.toFixed(4)}:${b.toFixed(4)},asetpts=PTS-STARTPTS,` +
		`afade=t=out:st=${(b - a - 0.06).toFixed(4)}:d=0.06,apad=pad_dur=${GAP}[s${i}]`,
);
const fil =
	`${parts.join(";")};${cut.map((_, i) => `[s${i}]`).join("")}concat=n=${cut.length}:v=0:a=1,` +
	`pan=mono|c0=0.5*c0+0.5*c1,volume=${gain}dB,aresample=44100[o]`;
const r = spawnSync(
	FF,
	[
		"-hide_banner",
		"-loglevel",
		"error",
		"-y",
		"-i",
		src,
		"-filter_complex",
		fil,
		"-map",
		"[o]",
		"-c:a",
		"libmp3lame",
		"-q:a",
		"4",
		out,
	],
	{
		encoding: "utf8",
	},
);
if (r.status) throw new Error(r.stderr);
console.log(`${path.basename(out)}: ${cut.length} takes, ${gain} dB, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
