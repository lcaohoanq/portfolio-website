import React, { useEffect, useState } from 'react';
import Window from './components/os/Window';
import Icon from './components/general/Icon';
import { IconName } from './assets/icons';
import Content, { Invitation, Page, pages } from '../Invitation/Content';

const icons: Record<Page, IconName> = {
    letter: 'showcaseIcon', event: 'myComputer', photos: 'computerBig', rsvp: 'windowExplorerIcon', credits: 'credits',
};

export default function Desktop({ invite, accessToken }: { invite: Invitation; accessToken: string }) {
    const [page, setPage] = useState<Page>('letter');
    const [open, setOpen] = useState(true);
    const [minimized, setMinimized] = useState(false);
    const [startOpen, setStartOpen] = useState(false);
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setTime(new Date()), 10000);
        return () => clearInterval(interval);
    }, []);
    function navigate(next: Page) { setPage(next); setOpen(true); setMinimized(false); setStartOpen(false); }
    return <div className="desktop">
        <div className="shortcuts" aria-label="Ứng dụng trên desktop">
            {pages.map(({ key, title }) => <button className="desktop-shortcut" key={key} onClick={() => navigate(key)}>
                <Icon icon={icons[key]} size={32} /><span>{title}</span>
            </button>)}
        </div>
        {open && <div className="invitation-window" style={{ visibility: minimized ? 'hidden' : 'visible' }}>
            <Window top={24} left={64} width={Math.max(300, window.innerWidth - 100)} height={Math.max(300, window.innerHeight - 100)}
                windowTitle="Thư mời tốt nghiệp" windowBarIcon="windowExplorerIcon"
                closeWindow={() => setOpen(false)} minimizeWindow={() => setMinimized(true)} onInteract={() => setStartOpen(false)}
                bottomLeftText="">
                <div className="site-page">
                    <nav className="invitation-nav" aria-label="Nội dung thư mời">
                        <div className="nav-identity"><h2>Lưu Cao<br />Hoàng</h2><p>Graduation ’26</p></div>
                        {pages.map(({ key, title }) => <button key={key} className={`nav-link ${page === key ? 'selected' : ''}`} aria-current={page === key ? 'page' : undefined} onClick={() => navigate(key)}>{title}</button>)}
                        {/* <span className="nav-note">Một cuộc hẹn,<br />một chương mới.</span> */}
                    </nav>
                    <main className={`site-page-content${page === 'event' ? ' event-page-content' : ''}`} key={page} id="letter-content"><Content page={page} invite={invite} accessToken={accessToken} navigate={navigate} /></main>
                </div>
            </Window>
        </div>}
        {startOpen && <nav className="start-menu" aria-label="Start menu"><div className="start-brand">HoàngOS ’26</div><div className="start-items">{pages.map(({ key, title }) => <button className="start-menu-option" key={key} onClick={() => navigate(key)}><Icon icon={icons[key]} size={24} />{title}</button>)}</div></nav>}
        <footer className="taskbar">
            <button className="task-button start-button" aria-expanded={startOpen} onClick={() => setStartOpen(!startOpen)}><Icon icon="windowsStartIcon" size={20} /><b>Start</b></button>
            {open && <button className={`task-button task-tab ${!minimized ? 'active' : ''}`} onClick={() => setMinimized(!minimized)}><Icon icon="showcaseIcon" size={18} /><span>Thư mời tốt nghiệp</span></button>}
            <div className="tray"><Icon icon="volumeOn" size={18} /><time>{time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time></div>
        </footer>
    </div>;
}
