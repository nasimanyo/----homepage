'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { InfoPost } from '@/types'
import { StickyNote, MapPin, Link2, Loader2, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AppHeader } from '@/components/ui/AppHeader'
import { Mascot } from '@/components/ui/Mascot'
import { PageShell } from '@/components/ui/PageShell'

const kindConfig = {
  memo: { icon: StickyNote, color: 'bg-amber-50 text-amber-600', label: 'メモ' },
  place: { icon: MapPin, color: 'bg-rose-50 text-rose-600', label: '行き先' },
  link: { icon: Link2, color: 'bg-cyan-50 text-cyan-600', label: 'リンク' },
}

export default function InfoPage() {
  const [posts, setPosts] = useState<InfoPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', kind: 'memo', url: '' })
  const [submitting, setSubmitting] = useState(false)
  const supabase = typeof window === 'undefined' ? null : createClient()

  useEffect(() => { fetchPosts() }, [])

  async function fetchPosts() {
    if (!supabase) return

    const { data } = await supabase
      .from('info_posts')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
    setPosts((data as InfoPost[]) || [])
    setLoading(false)
  }

  async function handleSubmit() {
    if (!form.title.trim() || !supabase) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }
    await supabase.from('info_posts').insert({
      author_id: user.id,
      title: form.title,
      body: form.body || null,
      kind: form.kind,
      url: form.url || null,
    })
    setForm({ title: '', body: '', kind: 'memo', url: '' })
    setShowForm(false)
    await fetchPosts()
    setSubmitting(false)
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AppHeader subtitle="情報" />
        <button
          onClick={() => setShowForm(!showForm)}
          className="tsuku-btn shrink-0 self-center px-5 py-2.5 text-sm sm:self-start"
        >
          <Plus size={16} /> 追加
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-6 lg:items-start">
        {showForm && (
          <section className="tsuku-card p-5 sm:p-6 lg:sticky lg:top-6">
            <h2 className="text-base font-bold text-[var(--tsuku-text)]">新しい情報を追加</h2>
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(['memo', 'place', 'link'] as const).map(k => {
                  const cfg = kindConfig[k]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={k}
                      onClick={() => setForm(f => ({ ...f, kind: k }))}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-semibold transition sm:text-sm ${
                        form.kind === k
                          ? 'border-[var(--tsuku-orange)] bg-[var(--tsuku-orange-light)] text-[var(--tsuku-orange-dark)]'
                          : 'border-[var(--tsuku-border)] text-[var(--tsuku-text-muted)]'
                      }`}
                    >
                      <Icon size={16} />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                placeholder="タイトル *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="tsuku-input"
              />
              <textarea
                placeholder="詳細（任意）"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="tsuku-input resize-none"
                rows={3}
              />
              {form.kind === 'link' && (
                <input
                  type="url"
                  placeholder="URL"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="tsuku-input"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-full border-2 border-[var(--tsuku-border)] py-2.5 text-sm font-semibold text-[var(--tsuku-text-muted)]"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="tsuku-btn flex-1 py-2.5 text-sm"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="tsuku-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--tsuku-text)]">
            <StickyNote size={18} className="text-[var(--tsuku-orange)]" />
            みんなの情報
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-[var(--tsuku-orange)]" size={28} />
            </div>
          ) : posts.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-stone-50 p-8 text-center">
              <p className="text-sm font-semibold text-[var(--tsuku-text)]">まだ情報がありません</p>
              <p className="mt-1 text-xs text-[var(--tsuku-text-muted)]">メモや行き先を追加してみよう</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {posts.map(post => {
                const cfg = kindConfig[post.kind] || kindConfig.memo
                const Icon = cfg.icon
                return (
                  <li
                    key={post.id}
                    className="rounded-xl border border-[var(--tsuku-border)] bg-stone-50 p-3 sm:p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 rounded-xl p-2 ${cfg.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[var(--tsuku-text)]">{post.title}</p>
                        {post.body && (
                          <p className="mt-1 text-xs leading-relaxed text-[var(--tsuku-text-muted)]">{post.body}</p>
                        )}
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block max-w-full truncate text-xs text-[var(--tsuku-orange-dark)] underline"
                          >
                            {post.url}
                          </a>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-stone-400">
                          <span>{post.profiles?.display_name}</span>
                          <span>·</span>
                          <span>
                            {formatDistanceToNow(new Date(post.created_at), { locale: ja, addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 flex justify-center pb-2">
        <Mascot size="hero" speech="メモを残そう！" />
      </div>
    </PageShell>
  )
}

export const dynamic = 'force-dynamic'
