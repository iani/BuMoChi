# Third-party notices

The proprietary [LICENSE](LICENSE) covers only this project's own material. The
following third-party works are used under their own licences, which continue to
apply to them.

## Demo footage (streamed at runtime, not stored in this repository)

| Clip | Source | Licence |
| --- | --- | --- |
| Belly dance (Jana Scheiermann, Leverkusen, 2024) — Irina Gordeeva | https://commons.wikimedia.org/wiki/File:German_Belly_Dancer_Jana_Scheiermann,_Leverkusen,_9th_November_2024.webm | CC BY-SA 4.0 |
| "Watch Me Whip" tutorial | https://commons.wikimedia.org/wiki/File:Watch_Me_Whip_-_Tutorial.webm | CC BY 3.0 |

`frontend/public/fixtures/pose/*.json` contain pose landmarks extracted from these clips and
record the source and licence of each; they are used for testing and demonstration only.

## Software dependencies

Open-source packages are declared, with their versions, in `frontend/package.json`,
`deck/package.json` and `backend/pyproject.toml`; their licences (MIT, Apache-2.0, BSD,
ISC, …) ship inside each installed package. Notable runtime components: Tone.js (MIT),
MediaPipe Tasks Vision (Apache-2.0), React (MIT), FastAPI (MIT), librosa (ISC).
