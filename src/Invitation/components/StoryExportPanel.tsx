import * as React from 'react'
import './StoryExportPanel.css'

type Guest = { guestSlug: string; displayName: string }

function searchable(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase()
}

export default function StoryExportPanel({ guests, disabled = false }: {
  guests: Guest[]; disabled?: boolean
}) {
  const [query, setQuery] = React.useState('')
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [notice, setNotice] = React.useState('')
  const matches = guests.filter(guest => searchable(`${guest.displayName} ${guest.guestSlug}`).includes(searchable(query.trim())))
  const chosen = guests.filter(guest => selected.has(guest.guestSlug))

  function toggle(slug: string) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
    setNotice('')
  }

  function download() {
    if (disabled || !chosen.length) return
    // Only export names and safe file identifiers; never include RSVP data or access tokens.
    const data = { version: 1, guests: chosen.map(guest => ({ slug: guest.guestSlug, name: guest.displayName })) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'story-guests.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice(`Đã tải danh sách ${chosen.length} khách. Dùng file này để xuất Story trên máy.`)
  }

  return <section className="story-export" aria-labelledby="story-export-title" aria-busy={disabled}>
    <h2 id="story-export-title">Xuất Story theo tên khách</h2>
    <p>Chọn khách và tải danh sách để xuất ảnh, video Story riêng cho từng người trên máy.</p>
    <fieldset disabled={disabled}>
      <legend className="visually-hidden">Chọn khách xuất Story</legend>
      <label className="story-export-search">Tìm khách xuất Story
        <input type="search" value={query} placeholder="Tên hoặc mã khách…" onChange={event => setQuery(event.target.value)} />
      </label>
      <div className="story-export-actions">
        <button className="button button-outline" type="button" disabled={!matches.length} onClick={() => {
          setSelected(current => new Set([...current, ...matches.map(guest => guest.guestSlug)]))
          setNotice('')
        }}>Chọn tất cả kết quả ({matches.length})</button>
        <button className="button button-outline" type="button" disabled={!chosen.length} onClick={() => { setSelected(new Set()); setNotice('') }}>Bỏ chọn tất cả</button>
        <span>Đã chọn {chosen.length}/{guests.length} khách</span>
      </div>
      <ul className="story-export-guests" aria-label="Khách xuất Story">
        {matches.map(guest => <li key={guest.guestSlug}>
          <label><input type="checkbox" checked={selected.has(guest.guestSlug)} onChange={() => toggle(guest.guestSlug)} />
            <span>{guest.displayName}<small>/{guest.guestSlug}</small></span>
          </label>
        </li>)}
      </ul>
      {!matches.length && <p>{guests.length ? 'Không tìm thấy khách phù hợp.' : 'Chưa có khách để xuất Story.'}</p>}
      <button className="button button-solid" type="button" disabled={!chosen.length} onClick={download}>Tải danh sách xuất Story ({chosen.length})</button>
    </fieldset>
    <p className="story-export-notice" aria-live="polite">{notice}</p>
  </section>
}
