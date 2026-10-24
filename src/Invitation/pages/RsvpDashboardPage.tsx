import React, { useEffect, useMemo, useState } from 'react'
import InvitationManager from '../components/InvitationManager'
import {
  getRsvpDashboard,
  rsvpConfigured,
  type DashboardRsvp,
  type RsvpStatus,
} from '../services/rsvp'

const statusLabels: Record<RsvpStatus, string> = {
  attending: 'Sẽ tham dự',
  declined: 'Không tham dự',
  maybe: 'Chưa chắc',
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Chưa phản hồi'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value))
}

export default function RsvpDashboardPage() {
  const searchParams = new URLSearchParams(window.location.search)
  const accessToken = searchParams.get('key') ?? ''
  const canConnect = rsvpConfigured && Boolean(accessToken)
  const [rows, setRows] = useState<DashboardRsvp[]>([])
  const [loading, setLoading] = useState(canConnect)
  const [error, setError] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!canConnect) return
    let cancelled = false
    getRsvpDashboard(accessToken)
      .then((result) => {
        if (!cancelled) { setRows(result); setAuthorized(true) }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, canConnect])

  const summary = useMemo(() => {
    const attending = rows.filter((row) => row.status === 'attending')
    return {
      invited: rows.length,
      responded: rows.filter((row) => row.status).length,
      attending: attending.length,
      people: attending.reduce((total, row) => total + row.partySize, 0),
      declined: rows.filter((row) => row.status === 'declined').length,
      maybe: rows.filter((row) => row.status === 'maybe').length,
      pending: rows.filter((row) => !row.status).length,
    }
  }, [rows])

  async function refreshDashboard() {
    if (!canConnect) return
    setLoading(true)
    setError(false)
    try {
      setRows(await getRsvpDashboard(accessToken))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const unavailableMessage = !rsvpConfigured
    ? 'Bản dựng này chưa có cấu hình Supabase.'
    : 'Hãy mở đúng đường dẫn quản trị riêng có mã truy cập.'

  return (
    <section className="dashboard section-space" aria-labelledby="dashboard-title">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">RSVP / Tổng hợp riêng tư</p>
          <h1 id="dashboard-title">
            Những lời
            <br />
            <em>hồi âm.</em>
          </h1>
          <p>
            Danh sách này chỉ dành cho Hoàng. Mỗi lần tải lại sẽ đọc dữ liệu mới
            nhất từ Supabase.
          </p>
        </div>
        {canConnect && (
          <button
            className="button button-outline"
            type="button"
            onClick={refreshDashboard}
            disabled={loading}
          >
            {loading ? 'Đang tải…' : 'Làm mới'}{' '}
            <span aria-hidden="true">↻</span>
          </button>
        )}
      </div>

      {!canConnect && <p className="dashboard-notice">{unavailableMessage}</p>}
      {error && (
        <p className="dashboard-notice" role="alert">
          Không thể mở dữ liệu RSVP. Mã quản trị có thể không hợp lệ hoặc kết
          nối đang gián đoạn.
        </p>
      )}

      {canConnect && authorized && !error && (
        <>
          <InvitationManager key={accessToken} accessToken={accessToken} onCreated={refreshDashboard} />
          <div className="dashboard-summary" aria-label="Tóm tắt RSVP">
            <article>
              <span>Đã mời</span>
              <strong>{summary.invited}</strong>
            </article>
            <article>
              <span>Đã hồi âm</span>
              <strong>{summary.responded}</strong>
            </article>
            <article>
              <span>Sẽ tham dự</span>
              <strong>{summary.attending}</strong>
              <small>{summary.people} người</small>
            </article>
            <article>
              <span>Không tham dự</span>
              <strong>{summary.declined}</strong>
            </article>
            <article>
              <span>Chưa chắc</span>
              <strong>{summary.maybe}</strong>
            </article>
            <article>
              <span>Chưa trả lời</span>
              <strong>{summary.pending}</strong>
            </article>
          </div>

          <div className="dashboard-table-wrap" aria-busy={loading}>
            <table className="dashboard-table">
              <caption className="visually-hidden">
                Danh sách phản hồi theo từng khách
              </caption>
              <thead>
                <tr>
                  <th scope="col">Khách</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Số người</th>
                  <th scope="col">Lời nhắn</th>
                  <th scope="col">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.guestSlug}>
                    <th scope="row">
                      {row.displayName}
                      <small>/{row.guestSlug}</small>
                    </th>
                    <td>
                      <span className={`dashboard-status ${row.status ?? 'pending'}`}>
                        {row.status ? statusLabels[row.status] : 'Chưa phản hồi'}
                      </span>
                    </td>
                    <td>{row.status === 'attending' ? row.partySize : '—'}</td>
                    <td className="dashboard-message">{row.message || '—'}</td>
                    <td>{formatTimestamp(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
