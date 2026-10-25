import eventCoverSrc from '../../../static/invitation/photos/event-cover.webp';

export { eventCoverSrc };

let cover: HTMLImageElement | undefined;

export function preloadEventCover() {
    if (cover) return;
    // Keep the decoded image available while the visitor reads the letter.
    cover = new Image();
    cover.decoding = 'async';
    cover.src = eventCoverSrc;
    // A failed warmup must not prevent the invitation from opening.
    void cover.decode().catch(() => {});
}
