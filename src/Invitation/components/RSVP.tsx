import React, { useEffect, useState, FormEvent } from 'react';
import { getRsvp, submitRsvp, rsvpConfigured, RsvpStatus } from '../services/rsvp';

export default function RSVP({ slug, accessToken }: { slug: string; accessToken: string }) {
    const canConnect = slug !== 'demo' && Boolean(accessToken) && rsvpConfigured;
    const [status, setStatus] = useState<RsvpStatus | ''>('');
    const [partySize, setPartySize] = useState(1);
    const [message, setMessage] = useState('');
    const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'error'>(canConnect ? 'loading' : 'invalid');
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        if (!canConnect) return;
        let cancelled = false;
        setState('loading');
        getRsvp(slug, accessToken).then((row) => {
            if (cancelled) return;
            if (!row) return setState('invalid');
            setStatus(row.status || '');
            setPartySize(row.partySize);
            setMessage(row.message);
            setState('ready');
        }).catch(() => { if (!cancelled) setState('error'); });
        return () => { cancelled = true; };
    }, [slug, accessToken, canConnect, attempt]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (state !== 'ready' || !status || busy) return;
        setBusy(true);
        setNotice('');
        try {
            const result = await submitRsvp(slug, accessToken, {
                status, partySize: status === 'attending' ? partySize : 1, message,
            });
            if (!result) throw new Error('EMPTY_RESPONSE');
            setPartySize(result.partySize);
            setNotice('Hoàng đã nhận được lời hồi âm của bạn. Cảm ơn bạn nhé! Bạn có thể cập nhật lại bất cứ lúc nào.');
        } catch {
            setNotice('Chưa lưu được phản hồi. Lời nhắn của bạn vẫn ở đây, hãy thử gửi lại nhé.');
        } finally { setBusy(false); }
    }

    const help = slug === 'demo'
        ? 'Bạn đang xem thư mời mẫu. Hãy mở link riêng Hoàng gửi để xác nhận tham dự.'
        : !rsvpConfigured ? 'Phần hồi âm chưa được kết nối. Bạn hãy nhắn trực tiếp cho Hoàng nhé.'
        : !accessToken || state === 'invalid' ? 'Link chưa có mã hợp lệ. Bạn hãy mở đầy đủ đường dẫn riêng Hoàng gửi nhé.'
        : state === 'loading' ? 'Đang tải phản hồi của bạn…'
        : state === 'error' ? 'Chưa tải được phản hồi. Bạn hãy kiểm tra kết nối rồi thử lại.' : '';

    return <section className="rsvp-panel">
        {/* <p className="eyebrow">Một lời hẹn nhỏ</p> */}
        <h2>Bạn sẽ đến chứ?</h2>
        <p>Hồi âm trước ngày 07/11/2026 để mình biết nhé.</p>
        {help && <p className="notice" role="status">{help}</p>}
        {state === 'error' && <button className="site-button" onClick={() => setAttempt(attempt + 1)}>Thử tải lại</button>}
        <form onSubmit={submit} onChange={() => setNotice('')}>
            <fieldset disabled={!canConnect || state !== 'ready' || busy}>
                <legend>Lời hồi âm của bạn</legend>
                <div className="rsvp-options">
                    {([
                        ['attending', 'Mình sẽ đến'],
                        ['maybe', 'Mình chưa chắc'],
                        ['declined', 'Tiếc là mình bận rồi'],
                    ] as const).map(([value, label]) => <label className="rsvp-option" key={value}>
                        <input type="radio" name="attendance" value={value} required checked={status === value} onChange={() => setStatus(value)} />
                        <span>{label}</span>
                    </label>)}
                </div>
                <label>Gửi Hoàng một lời nhắn
                    <textarea rows={5} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Chỗ dành cho vài lời thân thương…" />
                </label>
                <small>{message.length}/500 ký tự</small>
                <button className="site-button" type="submit">{busy ? 'Đang gửi…' : 'Gửi lời hồi âm'}</button>
            </fieldset>
        </form>
        <p className="result" role="status" aria-live="polite">{notice}</p>
    </section>;
}
