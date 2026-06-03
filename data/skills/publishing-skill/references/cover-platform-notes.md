# Cover Platform Notes

Use this file for mechanism-level routing. Verify exact product behavior in the live surface when high confidence matters.

## 1. Two Mechanism Families

### Custom-cover upload friendly
Examples often include surfaces like Douyin, Xiaohongshu, YouTube, and some channel/community products.

Default handling:
- deliver a cover image
- prepend export is optional fallback when the user only plans to send video files around

### First-frame / preview heavy
Examples often include feed surfaces where the file itself is likely to determine preview behavior.

Default handling:
- prefer a prepend-share export
- still deliver the cover image as backup when useful

Operational note:
- Treat **X** as a first-frame / preview-heavy surface when the posting workflow bakes the cover into the exported video.
- If the master starts with fade-in, black, or delayed reveal, do not trust frame 0.
- In that case, produce a share export whose opening frames are the selected cover still so the platform's first-frame pick matches the intended cover.

## 2. Safe-Zone Thinking

When choosing or describing a cover, assume:
- center survives best
- edges are most likely to be cropped or visually crowded
- text should avoid corners that may be covered by UI or profile chrome

This is why centered hero framing is preferred in the auto-pick policy.

## 3. Deliverable Planning

When several platforms are requested, list outputs explicitly instead of implying one asset solves all:
- `cover_image`
- `master_video`
- `share_video_with_prepend`

Do not force prepend on every export when upload-cover behavior already solves the problem cleanly.
Do force prepend when the platform effectively derives cover/preview from frame 0 and the master opens with fade-in risk.
