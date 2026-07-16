# Effect golden images

Reference PNGs for the effect-mode shaders, captured through the browser
(shaders can't run in Vitest). Regenerate deliberately, review visually,
commit — the same golden-file contract as test/algorithm/__fixtures__.

Capture (dev server on :3000, via CDP or the devtools console):

    __redpaintEffectScene(8)                       // deterministic bars
    __redpaintSetMode('Smear')                     // or Shade/Blend/Smooth/Cycle
    copy(__redpaintEffectStroke([{x:40,y:100},{x:260,y:100}]))

Save the copied data URL as a PNG:

    node -e "const u=require('fs').readFileSync(0,'utf8').trim();
      require('fs').writeFileSync(process.argv[1],
      Buffer.from(u.split(',')[1],'base64'))" test/effects-golden/<name>.png

Compare a new capture against the fixture with `cmp` (byte-identical PNGs
from the same browser) or by eye. Named `<mode>-<policy>.png`
(e.g. smear.png, shade-up.png, blend-hybrid.png, blend-indexed.png).
Overlap-mask behavior is pinned by a slow, dense stroke fixture:
`__redpaintEffectStroke([{x:40,y:100},{x:44,y:100},{x:48,y:100}])`.
