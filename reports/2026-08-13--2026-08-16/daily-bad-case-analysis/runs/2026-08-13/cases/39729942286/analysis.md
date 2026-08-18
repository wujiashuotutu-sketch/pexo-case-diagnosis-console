# Bad Case Analysis: 39729942286

- Priority: P2
- Attribution: mixed (model, QA)
- Evidence source: production Postgres database 3; 1,166 chronological messages, 253 tool calls, 86 project assets

## Reconstructed Intent

Keep the male lead's earphones continuously wired: worn in sequences 1-3, both sides removed in sequence 4, and one side shared with the second character in sequence 5.

## Evidence-Based Finding

The Bad v3 was delivered at sequence 116. Post-delivery analyses at sequences 118-120 independently identify impossible wired-earbud topology plus continuity and composition misses. The audited media itself is structurally healthy: 57.683 seconds, 1080x1920 H.264 with AAC audio, no black segment, no silence, and 2.458 seconds total freeze. The defect is therefore visual continuity, not container failure.

## Root Cause and Impact

The generative shots did not preserve a stateful prop relationship across the sequence, and the relevant topology check occurred only after delivery. The narrative action of sharing one earbud becomes visually impossible or confusing.

## Skill and Lineage Audit

The trace includes brainstorm, script, generation, and motion reads, including composition and transition references. Those reads did not become an explicit per-shot prop-state ledger. Prompt and asset lineage is preserved in assets-with-prompts.json.

## Media and Delivery Evidence

See media/final-proxy.mp4, media/contact-sheet.jpg, media/ffprobe.json, media/blackdetect.txt, media/freezedetect.txt, media/silencedetect.txt, media/volumedetect.txt, and qa-report.html.

## Limitations

The 2.458-second freeze signal may include an intentional held shot and is not used as the root-cause proof. The finding relies on the trace's post-delivery visual analyses and continuity requirements.

## Proposed Phase B (Confirmation Required)

Add a prop-state continuity ledger for connected shots and require topology validation before delivery for cables, handoffs, and shared objects. Do not enter Phase C without user confirmation.
