import React, { useEffect, useState } from 'react';
import { getGalleryCaptions } from '../services/gallery';
import { rsvpConfigured } from '../services/rsvp';

export default function MemoryGallery() {
    const [captions, setCaptions] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!rsvpConfigured) return;
        let cancelled = false;
        getGalleryCaptions().then((rows) => {
            if (!cancelled) {
                setCaptions(Object.fromEntries(rows.map((row) => [row.file_path, row.caption])));
            }
        }).catch(() => { /* Keep photos available if captions cannot be loaded. */ });
        return () => { cancelled = true; };
    }, []);

    return <section>
        <p className="eyebrow">Những điều mình muốn mang theo</p>
        <h1>Một vài<br /><em>khoảnh khắc.</em></h1>
        <p>Một góc nhỏ để nhìn lại hành trình trước khi bước sang chương mới.</p>
        <div className="photo-grid">{__GALLERY_IMAGES__.map((file, index) => <figure key={file}>
            <a href={`/invitation/gallery/${file}`} target="_blank" rel="noreferrer">
                <img src={`/invitation/gallery/${file}`} alt={file === 'fpt.jpg' ? 'Khuôn viên Đại học FPT HCM' : `Ảnh kỷ niệm ${index + 1} từ bộ sưu tập của Hoàng`} loading="lazy" decoding="async" />
            </a>
            {captions[file] && <figcaption>{captions[file]}</figcaption>}
        </figure>)}</div>
    </section>;
}
