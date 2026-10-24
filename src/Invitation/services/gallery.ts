import { callRsvpRpc } from './rsvp';

export type GalleryCaption = { file_path: string; caption: string };

export function getGalleryCaptions() {
    return callRsvpRpc<GalleryCaption[]>('get_gallery_captions', {});
}
