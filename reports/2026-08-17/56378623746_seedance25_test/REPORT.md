# Case 56378623746: Seedance 2.5 smoke test

## Test

- Model: `doubao-seedance-2-5-260628`
- Task: `cgt-20260817200434-xjchv`
- Inputs: the case Mentor reference image and `mentor_fala_6` MP3
- Request: 6 seconds, 720p, 16:9, `generate_audio=true`, reference image + reference audio
- Result: succeeded; 1280x720, 24 fps, 6.041667s video and 6.08s AAC audio
- Usage: 130,500 completion tokens

## Verification

- Output audio was identified as Brazilian Portuguese.
- Output transcription: `É isso. Um projeto pede atenção, uma parceria demonstra valor, coerência e compromisso.`
- Video understanding found the character facing camera with visible mouth movement broadly synchronized to speech; no obvious silent-mouth interval, competing mouth, or visual jump was observed.
- The output audio is not source-preserved. The source MP3 is 5.28s; the generated AAC track is 6.08s, and aligned waveform Pearson correlation is approximately `0.0103`.

## Conclusion

This controlled 5.28-second sample did not reproduce the case's earlier unintelligible/"Russian" audio failure on Seedance 2.5. It passed the Brazilian Portuguese intelligibility and basic lip-sync checks. The remaining limitation is unchanged: Seedance 2.5 reconstructs the audio when `generate_audio=true`; it should not be presented as preserving the original voice waveform, exact pauses, or exact timing.

## Audio-preservation prompt rerun

- Task: `cgt-20260817201817-f9d4f`
- Added prompt priority: treat the reference audio as the exact final source; preserve language, speaker identity, words, pronunciation, pauses, timing, pitch, loudness, and waveform; do not synthesize, translate, paraphrase, re-voice, normalize, denoise, time-stretch, pitch-shift, compress, or replace it; preserve audio over lip-sync if they conflict.
- Result: succeeded with the same 130,500 completion tokens.
- Language: Brazilian Portuguese, complete intelligible transcript, no Russian or unintelligible interval.
- Lip sync: basic visual check passed; no obvious speech-with-static-mouth interval or visual jump.
- Source fidelity: failed. The output audio remained 6.08s versus the 5.28s source, and aligned waveform Pearson correlation was approximately `0.0056`.

The stronger prompt did not force source-audio passthrough. Prompt wording can preserve speech semantics and language in this sample, but exact audio preservation requires a deterministic post-generation audio replacement/mux path rather than another prompt revision.
