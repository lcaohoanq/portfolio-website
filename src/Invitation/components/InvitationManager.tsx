import React, { useEffect, useRef, useState, type FormEvent } from 'react'
import { createInvitation, getInvitationLinks, type InvitationLink } from '../services/rsvp'
import { invitationCopy } from '../data/copy'

function slugify(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '')
}

function randomToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function InvitationManager({ accessToken, onCreated }: {
  accessToken: string; onCreated: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [greeting, setGreeting] = useState('')
  const [message, setMessage] = useState<string>(invitationCopy.paragraph)
  const [links, setLinks] = useState<InvitationLink[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [linksError, setLinksError] = useState(false)
  const [linkAttempt, setLinkAttempt] = useState(0)
  const pending = useRef<{ fingerprint: string; token: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    getInvitationLinks(accessToken).then((rows) => {
      if (!cancelled) { setLinks(rows); setLinksError(false) }
    }).catch(() => { if (!cancelled) setLinksError(true) })
    return () => { cancelled = true }
  }, [accessToken, linkAttempt])

  function inviteUrl(link: InvitationLink) {
    const url = new URL(`/invite/${link.guest_slug}`, window.location.origin)
    url.searchParams.set('key', link.access_token)
    return url.href
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const values = { name: name.trim(), slug: slug.trim(), greeting: greeting.trim() || `Hello ${name.trim()},`, message: message.trim() }
      const fingerprint = JSON.stringify(values)
      if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, token: randomToken() }
      const link = await createInvitation(accessToken, { ...values, token: pending.current.token })
      setLinks((current) => [link, ...current.filter((item) => item.guest_slug !== link.guest_slug)])
      setNotice(`Đã tạo lời mời cho ${values.name}. Bạn có thể sao chép link bên dưới.`)
      setName(''); setSlug(''); setGreeting(''); setMessage(invitationCopy.paragraph)
      pending.current = null
      await onCreated()
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'INVITATION_SLUG_EXISTS'
        ? 'Mã đường dẫn đã được dùng. Hãy nhập mã khác, ví dụ thêm họ hoặc số.'
        : 'Chưa thể tạo lời mời. Kiểm tra kết nối và thử lại.')
    } finally { setBusy(false) }
  }

  return <section className="invitation-manager" aria-labelledby="invitation-manager-title">
    <h2 id="invitation-manager-title">Thêm khách mời</h2>
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <label>Tên khách mời
          <input value={name} maxLength={100} required onChange={(event) => {
            const value = event.target.value
            setName(value)
            if (slug === slugify(name)) setSlug(slugify(value))
          }} />
        </label>
        <label>Mã đường dẫn
          <input value={slug} onChange={(event) => setSlug(event.target.value)}
            pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} required
            title="Chữ thường không dấu, số và dấu gạch ngang" />
          <small>Ví dụ: nguyen-an. Mỗi khách dùng một mã riêng.</small>
        </label>
        <label>Lời chào (không bắt buộc)
          <input value={greeting} maxLength={200} placeholder={name ? `Hello ${name},` : 'Hello bạn,'}
            onChange={(event) => setGreeting(event.target.value)} />
        </label>
        <label>Lời nhắn riêng
          <textarea value={message} maxLength={2000} rows={4} required
            onChange={(event) => setMessage(event.target.value)} />
        </label>
        <button className="button button-solid" type="submit">{busy ? 'Đang tạo…' : 'Tạo link'}</button>
      </fieldset>
    </form>
    <p role="status">{notice}</p>
    {error && <p role="alert">{error}</p>}
    <h3>Link khách mời đã tạo</h3>
    {['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname) &&
      <p className="control-help">Bạn đang mở bản trên máy này. Để gửi khách qua Internet, hãy mở trang quản trị trên địa chỉ website đã xuất bản rồi sao chép link.</p>}
    {linksError && <p role="alert">Chưa tải được danh sách link. <button type="button"
      onClick={() => setLinkAttempt(linkAttempt + 1)}>Tải lại danh sách link</button></p>}
    {!linksError && !links.length && <p>Chưa có link được tạo từ trang quản trị.</p>}
    <ul className="invitation-links">
      {links.map((link) => <li key={link.guest_slug}>
        <label>Link /{link.guest_slug}
          <input readOnly value={inviteUrl(link)} onFocus={(event) => event.target.select()} />
        </label>
        <button className="button button-outline" type="button" onClick={async () => {
          try {
            await navigator.clipboard.writeText(inviteUrl(link))
            setNotice(`Đã sao chép link /${link.guest_slug}.`)
          } catch { setNotice('Không thể sao chép tự động. Bạn hãy chọn và sao chép đường dẫn trong ô link.') }
        }}>Sao chép</button>
        <a className="text-link" href={inviteUrl(link)} target="_blank" rel="noreferrer">Xem lời mời ↗</a>
      </li>)}
    </ul>
  </section>
}
