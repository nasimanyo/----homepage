import Link from 'next/link'
import { AppHeader } from '@/components/ui/AppHeader'
import { PageShell } from '@/components/ui/PageShell'

export default function TermsPage() {
  return (
    <PageShell>
      <div className="tsuku-card p-5 sm:p-6">
        <AppHeader subtitle="利用規約" />

        <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--tsuku-text)]">
          <section>
            <h2 className="font-bold">第1条（適用）</h2>
            <p>本規約は、つくほーむ（以下「本サービス」）の利用条件を定めるものです。利用者は本規約に同意したうえで本サービスを利用します。</p>
          </section>

          <section>
            <h2 className="font-bold">第2条（アカウント）</h2>
            <p>利用者は正確な情報で登録を行い、自己の責任でログイン情報を管理するものとします。</p>
          </section>

          <section>
            <h2 className="font-bold">第3条（禁止事項）</h2>
            <p>法令違反、公序良俗に反する行為、第三者の権利侵害、サービス運営を妨害する行為を禁止します。</p>
          </section>

          <section>
            <h2 className="font-bold">第4条（サービス変更・停止）</h2>
            <p>運営は、保守・障害対応等のため、事前通知なく本サービスの全部または一部を変更・停止できるものとします。</p>
          </section>

          <section>
            <h2 className="font-bold">第5条（免責）</h2>
            <p>運営は、本サービスの完全性・正確性・継続性を保証しません。利用者に生じた損害について、故意または重過失を除き責任を負いません。</p>
          </section>

          <section>
            <h2 className="font-bold">第6条（規約変更）</h2>
            <p>運営は必要に応じて本規約を改定できます。改定後に本サービスを利用した場合、改定内容に同意したものとみなします。</p>
          </section>
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="tsuku-btn px-5 py-2.5 text-sm">
            ログインへ戻る
          </Link>
        </div>
      </div>
    </PageShell>
  )
}
