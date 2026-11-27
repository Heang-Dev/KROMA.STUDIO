---
title: The voice engine
group: Voices
section: 3
order: 2
---
The designed and cloned voices come from the **Khmer Voice Studio engine** (VoxCPM2). Instant voices don't need it.

## On a free Google Colab GPU (fast)

1. Open `KHMER.VOICE.STUDIO/engine/colab/KhmerVoiceStudio_Colab.ipynb` in Google Colab.
2. Choose a T4 GPU and run the cells.
3. Paste the address and token it prints into **Settings → Voice Engine**.

## On your computer (slower)

In the Khmer Voice Studio folder:

```bash
make engine
```

The first time downloads the voice model (about 5 GB). Kroma connects to `http://127.0.0.1:7861`.

## Status

**Settings → Voice Engine → Check** shows whether the engine is reachable and how many voices it offers. If the Voice panel says the engine isn't reachable, start it, or use the instant voices.
