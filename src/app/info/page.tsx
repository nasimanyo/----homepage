'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { InfoPost } from '@/types'
import { StickyNote, MapPin, Link2, Loader2, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

const kindConfig = {
  memo: { icon: StickyNote, color: 'bg-amber-50 text-amber-500', label: 'メモ' },
  place: { icon: MapPin, color: 'bg-rose-50 text-rose-500', label: '行き先' },
  link: { icon: Link2, color: 'bg-cyan-50 text-cyan-500', label: 'リンク' },
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">📌 情報</h1>
          <p className="text-xs text-gray-400 mt-0.5">メモ・行き先・リンク</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-violet-600 text-white text-xs px-3 py-1.5 rounded-xl font-medium"
        >
          <Plus size={14} /> 追加
        </button>
      </header>

      <main className="px-4 py-4 space-y-3">
        {/* 投稿フォーム */}
        {showForm && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-violet-100">
            <h3 className="font-semibold text-sm text-gray-700 mb-3">新しい情報を追加</h3>
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2">
                {(['memo', 'place', 'link'] as const).map(k => {
                  const cfg = kindConfig[k]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={k}
                      onClick={() => setForm(f => ({ ...f, kind: k }))}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                        form.kind === k ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500'
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
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
              />
              <textarea
                placeholder="詳細（任意）"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none"
                rows={2}
              />
              {form.kind === 'link' && (
                <input
                  type="url"
                  placeholder="URL"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                />
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500">
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-60"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-violet-400" size={28} />
          </div>
        )}

        {posts.map(post => {
          const cfg = kindConfig[post.kind] || kindConfig.memo
          const Icon = cfg.icon
          return (
            <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl ${cfg.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{post.title}</p>
                  {post.body && <p className="text-xs text-gray-500 mt-1">{post.body}</p>}
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-violet-600 underline mt-1 inline-block truncate max-w-full">
                      {post.url}
                    </a>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-300">{post.profiles?.display_name}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-300">
                      {formatDistanceToNow(new Date(post.created_at), { locale: ja, addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}

export const dynamic = 'force-dynamic'
