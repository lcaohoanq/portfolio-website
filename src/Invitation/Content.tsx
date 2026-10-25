import React from 'react';
import { archive, event, formatEventDate } from './data/event';
import { invitationCopy, personalNoteCopy } from './data/copy';
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
        <p>{personalNoteCopy.paragraphs[0]}.</p>
        <p>{invite.message || invitationCopy.paragraph}</p>
        <p>Mình mong được gặp bạn, cùng trò chuyện và chụp một tấm hình để nhớ về ngày đặc biệt này.</p>
        <div className="signature"><img src="/invitation/signature.png" alt="Chữ ký của Hoàng" /><span>{archive.fullName}</span></div>
        {/* <div className="letter-actions"><button className="site-button" onClick={() => navigate('event')}>Thông tin buổi lễ →</button><button className="site-button" onClick={() => navigate('rsvp')}>Gửi lời hồi âm</button></div> */}
    </article>;
    if (page === 'event') return <section>
        {/* <p className="eyebrow">Lưu lại cuộc hẹn của chúng mình</p> */}
        <h1>Hẹn bạn<br /><em>ngày tốt nghiệp.</em></h1>
        <img className="campus" src={eventCoverSrc} alt="Ảnh buổi lễ tốt nghiệp" width={1448} height={1086} loading="eager" decoding="async" />
        <h2>{event.title}</h2>
        <dl className="event-facts">
            <div><dt>Ngày</dt><dd>Thứ Bảy, {formatEventDate(event.date)}</dd></div>
            <div><dt>Thời gian</dt><dd>09:00–12:00 <small>(GMT+7)</small></dd></div>
            <div><dt>Địa điểm</dt><dd>{event.venue}<p>{event.address}</p></dd></div>
        </dl>
        <div className="letter-actions"><a className="site-button" href={event.directionsUrl!} target="_blank" rel="noreferrer">Xem đường đi ↗</a><a className="site-button" href={createGoogleCalendarUrl(event, archive)!} target="_blank" rel="noreferrer">Thêm vào lịch ↗</a></div>
        {/* <p className="footnote">Bạn có thể rủ thêm người đi cùng. Hẹn gặp bạn ở đó nhé!</p> */}
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
