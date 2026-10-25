import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import Desktop from '../Desktop/Desktop';
import { Invitation } from './Content';
import { invitationLocation } from './location';
import { getInvitation, rsvpConfigured } from './services/rsvp';
import RsvpDashboard from './pages/RsvpDashboardPage';
import { preloadEventCover } from './services/eventCover';
import { preloadGalleryCaptions } from './services/gallery';
import '../Desktop/original.css';
import './style.css';

const { slug, accessToken } = invitationLocation();

function App() {
    const [invite, setInvite] = useState<Invitation | null>(slug === 'demo' ? {
        slug, name: 'bạn', greeting: 'Gửi bạn,', message: '',
    } : null);
    const [loading, setLoading] = useState(slug !== 'demo' && Boolean(accessToken) && rsvpConfigured);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const isAdmin = window.location.pathname === '/admin/rsvp';

    useEffect(() => {
        if (isAdmin || slug === 'demo' || !accessToken || !rsvpConfigured) return;
        let cancelled = false;
        setLoading(true);
        getInvitation(slug, accessToken).then((row) => {
            if (!cancelled && row) setInvite({
                slug: row.guest_slug, name: row.display_name,
                greeting: row.greeting || `Gửi ${row.display_name},`, message: row.invitation_message,
            });
        }).catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [attempt, isAdmin]);

    if (isAdmin) return <div className="admin-shell"><RsvpDashboard /></div>;
    if (loading) return <div className="route-state" role="status"><p>Đang mở lá thư dành cho bạn…</p></div>;
    if (error) return <div className="route-state" role="alert"><h1>Chưa mở được thư.</h1><p>Kết nối đang gián đoạn. Bạn thử lại nhé.</p><button className="site-button" onClick={() => { setError(false); setAttempt(attempt + 1); }}>Thử lại</button></div>;
    if (!invite) return <div className="route-state"><h1>Lá thư chưa mở được.</h1><p>{!rsvpConfigured ? 'Kết nối thư mời chưa được cấu hình.' : 'Bạn hãy mở đúng link riêng Hoàng gửi, bao gồm cả mã truy cập nhé.'}</p><a className="site-button" href="/invitation.html">Xem thư mời mẫu</a></div>;
    return <Desktop invite={invite} accessToken={accessToken} />;
}

// Forward only interaction events needed by the room's camera and sound engine.
if (window.parent !== window) {
    for (const type of ['mousemove', 'mousedown', 'mouseup', 'keydown', 'keyup']) {
        document.addEventListener(type, (event) => {
            const mouse = event as MouseEvent;
            const keyboard = event as KeyboardEvent;
            window.parent.postMessage({ type, clientX: mouse.clientX, clientY: mouse.clientY, key: keyboard.key }, window.location.origin);
        });
    }
}

if (window.location.pathname !== '/admin/rsvp') {
    preloadEventCover();
    preloadGalleryCaptions();
}
ReactDOM.render(<App />, document.getElementById('root'));
