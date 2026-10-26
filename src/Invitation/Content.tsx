import React from 'react';
import { archive, event, formatEventDate, formatEventTime } from './data/event';
import { invitationCopy } from './data/copy';
import { createGoogleCalendarUrl } from './services/calendar';
import RSVP from './components/RSVP';
import MemoryGallery from './components/MemoryGallery';
import { eventCoverSrc } from './services/eventCover';

export type Invitation = { slug: string; name: string; greeting: string; message: string };
export type Page = 'letter' | 'event' | 'photos' | 'rsvp' | 'credits';
export const pages: { key: Page; title: string }[] = [
    { key: 'letter', title: 'Thư mời' }, { key: 'event', title: 'Buổi lễ' },
    { key: 'photos', title: 'Kỷ niệm' }, { key: 'rsvp', title: 'Hồi âm' },
    // { key: 'credits', title: 'Credits' },
];

export default function Content({ page, invite, accessToken, navigate }: {
    page: Page; invite: Invitation; accessToken: string; navigate: (page: Page) => void;
}) {
    if (page === 'letter') return <article className="letter">
        <div className="letter-heading"><div>
            {/* <p className="eyebrow">Bạn có một thư mới · Class of 2026</p> */}
            <h1>Một cột mốc mới.<br /><em>Cùng bạn, nhé.</em></h1>
            <p className="letter-date">07.11.2026 / ĐẠI HỌC FPT HCM</p>
        </div><img className="portrait" src="/invitation/photos/fit.png" alt="Hoàng trong trang phục tốt nghiệp" /></div>
        <hr />
        <h2>{invite.greeting}</h2>
        <p className="letter-message">{invite.message || invitationCopy.paragraph}</p>
        <div className="signature"><img src="/invitation/signature.png" alt="Chữ ký của Hoàng" /><span>{archive.fullName}</span></div>
    </article>;
    if (page === 'event') return <section className="event-section" aria-label="Thông tin buổi lễ">
        {/* <p className="eyebrow">Lưu lại cuộc hẹn của chúng mình</p> */}
        {/* <div className="event-actions">
            <a href={event.directionsUrl!} target="_blank" rel="noreferrer">Xem đường đi ↗</a>
            <a href={createGoogleCalendarUrl(event, archive)!} target="_blank" rel="noreferrer">Thêm vào lịch ↗</a>
        </div> */}
        <figure className="event-photo">
            <img className="campus" src={eventCoverSrc} alt="Hoàng trong trang phục tốt nghiệp tại khuôn viên trường" width={1448} height={1086} loading="eager" decoding="async" />
            <figcaption className="event-photo-caption">
                <h2>{event.title}</h2>
                <p className="event-photo-date"><span>Thứ Bảy, {formatEventDate(event.date)}</span><span>{formatEventTime(event.startTime)}–{formatEventTime(event.endTime)}</span></p>
                <p className="event-photo-place">{event.venue}<br /><span>{event.address}</span></p>
            </figcaption>
        </figure>
    </section>;
    if (page === 'photos') return <MemoryGallery />;
    if (page === 'rsvp') return <RSVP slug={invite.slug} accessToken={accessToken} />;
    return <section className="credits-panel">
        <p className="eyebrow">Những người tạo nên góc nhỏ này</p><h1>Credits.</h1>
        <p>Thư mời tốt nghiệp của {archive.fullName} · 2026.</p>
        <h2>Portfolio & giao diện máy tính</h2>
        <p><a href="https://github.com/henryjeff/portfolio-website" target="_blank" rel="noreferrer">Henry Heffernan</a> — thiết kế, lập trình, bố cục, texture và âm thanh.</p>
        <p><a href="https://github.com/henryjeff/portfolio-inner-site" target="_blank" rel="noreferrer">portfolio-inner-site</a> — cửa sổ, biểu tượng, font và giao diện desktop.</p>
        <p>Mickael Boitte — mô hình máy tính. Sean Nicolas — mô hình môi trường. Sound Cassette — âm thanh văn phòng. Microsoft — âm thanh khởi động Windows 95.</p>
        <h2>Nội dung thư mời</h2><p>Thông tin buổi lễ, lời mời, chữ ký và ảnh từ Graduation Archive của Hoàng.</p>
        <p className="footnote">Cảm ơn vì đã ghé qua. Hẹn gặp bạn ngày 07/11!</p>
    </section>;
}
