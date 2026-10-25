import { callRsvpRpc, rsvpConfigured } from './rsvp';

export type GalleryCaption = { file_path: string; caption: string };

type CaptionCache = { savedAt: number; rows: GalleryCaption[] };
const CACHE_KEY = `invitation:gallery-captions:v1:${__SUPABASE_URL__.replace(/\/$/, '')}`;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT = 5000;
let cache: CaptionCache | null = null;
let cacheRead = false;
let pending: Promise<GalleryCaption[]> | undefined;

function isCaptionRows(value: unknown): value is GalleryCaption[] {
    return Array.isArray(value) && value.every((row) => row &&
        typeof row.file_path === 'string' && typeof row.caption === 'string');
}

export function getCachedGalleryCaptions(): GalleryCaption[] | null {
    if (!cacheRead) {
        cacheRead = true;
        try {
            const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            if (stored && Number.isFinite(stored.savedAt) && stored.savedAt > 0 &&
                stored.savedAt <= Date.now() && isCaptionRows(stored.rows)) cache = stored;
        } catch { /* Storage may be unavailable or contain invalid JSON. */ }
    }
    // Stale captions remain usable while a refresh runs in the background.
    return cache?.rows ?? null;
}

export function getGalleryCaptions(): Promise<GalleryCaption[]> {
    getCachedGalleryCaptions();
    if (cache && Date.now() - cache.savedAt < CACHE_TTL) return Promise.resolve(cache.rows);
    if (pending) return pending;
    if (!rsvpConfigured) return Promise.resolve([]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    pending = callRsvpRpc<unknown>('get_gallery_captions', {}, controller.signal).then((rows) => {
        if (!isCaptionRows(rows)) throw new Error('INVALID_GALLERY_CAPTIONS');
        cache = { savedAt: Date.now(), rows };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
        catch { /* Keep the in-memory cache when persistent storage is blocked. */ }
        return rows;
    }).finally(() => {
        clearTimeout(timeout);
        pending = undefined;
    });
    return pending;
}

export function preloadGalleryCaptions() {
    void getGalleryCaptions().catch(() => { /* The gallery can retry when opened. */ });
}
