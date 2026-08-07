# webp2jpg for ARMv7

This utility decodes one WebP image at a time, optionally scales it down, and
writes a baseline JPEG. It is statically linked for the Cortex-A7 Linux target
used by the dictionary pen.

The same build also creates `libs/arm/libjsapi_webp.so`. That private QuickJS
module exports `convert(input, output, maxWidth, quality, segments)` and `isWebp(path)`
from `webp` and keeps the decoder entirely inside the miniapp process.

`segments` defaults to zero. Values greater than one reverse JM's horizontal
scramble blocks before JPEG encoding; ordinary sources such as Picacg use zero.

Build from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File native\webp2jpg\build.ps1
```

Run on the target:

```sh
webp2jpg-armv7 input.webp output.jpg 1020 86
```

The default maximum width is 1020 pixels and the default JPEG quality is 86.
The decoder runs without worker threads so only one image is expanded in memory.
