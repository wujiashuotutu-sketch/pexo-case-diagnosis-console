# Multilingual and Voice-Reference Audio Test Set

Generated on 2026-08-13 for controlled video-model comparison.

## Multilingual lip-sync inputs

| File | Purpose | Target duration |
|---|---|---:|
| `multilingual-switch-30s.wav` | Test mouth-shape continuity while one speaker switches among Mandarin, English, Japanese, Spanish, and French | 30s |
| `english-15s.wav` | Test a full English passage without language switching | 15s |
| `japanese-15s.wav` | Test a full Japanese passage without language switching | 15s |

## Voice-reference A/B inputs

These are **voice samples only**, not the speech that the generated video should repeat. Both samples use the same reference sentence and timing but intentionally different voices. The video request must carry a new target sentence in its prompt. This is the key distinction from `audio_list_speech` / direct lip-sync testing.

| File | Intended voice | Target duration |
|---|---|---:|
| `voice-a-bright-female-12s.wav` | Bright, clear adult female voice sample | 12s |
| `voice-b-deep-male-12s.wav` | Low, steady adult male voice sample | 12s |

Reference-sample transcript (spoken in both files):

`你好，这是一段用于测试音色保持能力的参考声音。请记住我的声音特点，而不是只记住这句话。现在开始，三、二、一，测试结束。`

New target transcript (must **not** be included in the reference audio):

`今天我们换一段全新的内容，检查模型能不能保留参考声音的音色，同时准确说出这句话。现在，请看镜头，测试开始。`

Cross-language target transcript for a separate experiment:

`Hello, this is a new sentence. Keep the reference speaker's timbre, but speak these new words naturally and clearly.`

## Evaluation notes

- Multilingual tests measure transcript accuracy, language-switch timing, mouth-shape continuity, and identity stability separately.
- Voice-reference tests pass the sample audio as `reference_audio` / `audio_list_voice_ref`, while the new target transcript is carried separately in the prompt/text field. Never use the sample itself as the target speech for this test.
- Voice A/B tests must use the same image, target prompt, duration, seed, and provider settings.
- A model only passes voice-reference preservation if A and B remain audibly distinct, each output speaks the new target sentence, and each output resembles its own input voice.
- Accepting an audio file does not prove voice cloning. If the provider has no explicit voice-reference semantic, record the result as audio-driven generation rather than voice preservation.
