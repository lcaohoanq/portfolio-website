import React, { useEffect, useRef, useState } from 'react';
import { getGalleryCaptions } from '../services/gallery';
import { rsvpConfigured } from '../services/rsvp';

const BATCH_SIZE = 12;

export default function MemoryGallery() {
    const [captions, setCaptions] = useState<Record<string, string>>({});
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const sentinel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const target = sentinel.current;
        if (!target || visibleCount >= __GALLERY_IMAGES__.length) return;
        if (typeof IntersectionObserver === 'undefined') {
            setVisibleCount(__GALLERY_IMAGES__.length);
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                observer.disconnect();
                setVisibleCount((count) => Math.min(count + BATCH_SIZE, __GALLERY_IMAGES__.length));
            }
        }, { root: target.closest('.site-page-content'), rootMargin: '300px 0px' });
        observer.observe(target);
        return () => observer.disconnect();
    }, [visibleCount]);

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
        <div className="photo-grid">{__GALLERY_IMAGES__.slice(0, visibleCount).map(({ file, previews }, index) => <figure key={file}>
            <a href={`/invitation/gallery/${file}`} target="_blank" rel="noreferrer">
                <img src={previews[0].src}
                    srcSet={previews.map((preview) => `${preview.src} ${preview.width}w`).join(', ')}
                    sizes="(max-width: 520px) calc(50vw - 39px), (max-width: 1100px) 30vw, 372px"
                    width="800" height="600"
                    alt={file === 'fpt.jpg' ? 'Khuôn viên Đại học FPT HCM' : `Ảnh kỷ niệm ${index + 1} từ bộ sưu tập của Hoàng`} loading="lazy" decoding="async" />
            </a>
            {captions[file] && <figcaption>{captions[file]}</figcaption>}
        </figure>)}</div>
        {visibleCount < __GALLERY_IMAGES__.length && <div ref={sentinel} className="gallery-sentinel" aria-hidden="true" />}
    </section>;
}
