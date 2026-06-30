import Link from 'next/link'
import { AppHeader } from '@/components/ui/AppHeader'
import { PageShell } from '@/components/ui/PageShell'

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="tsuku-card p-5 sm:p-6">
        <AppHeader subtitle="プライバシーポリシー" />

        <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--tsuku-text)]">
          <section>
            <h2 className="font-bold">1. 取得する情報</h2>
            <p>本サービスは、メールアドレス、表示名、投稿内容、利用履歴（ポイント・投票情報等）を取得します。</p>
          </section>

          <section>
            <h2 className="font-bold">2. 利用目的</h2>
            <p>取得した情報は、認証、サービス提供、機能改善、不正利用防止、重要なお知らせのために利用します。</p>
          </section>

          <section>
            <h2 className="font-bold">3. 第三者提供</h2>
            <p>法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。</p>
          </section>

          <section>
            <h2 className="font-bold">4. 外部サービス</h2>
            <p>本サービスは認証・データ保存のために Supabase を利用しています。データは同サービスの管理下で保管されます。</p>
          </section>

          <section>
            <h2 className="font-bold">5. 安全管理</h2>
            <p>情報漏えい・改ざん・不正アクセス防止のため、合理的な安全管理措置を講じます。</p>
          </section>

          <section>
            <h2 className="font-bold">6. 開示・訂正・削除</h2>
            <p>本人からの請求があった場合、法令に従い、保有する個人情報の開示・訂正・削除に対応します。</p>
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
