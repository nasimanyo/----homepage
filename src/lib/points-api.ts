import type { SupabaseClient } from '@supabase/supabase-js'

type PointsAction = 'login_bonus' | 'roulette'

type PointsSuccess = { points: number; spin?: number }
type PointsError = { error: string }

export async function callPointsApi(
  supabase: SupabaseClient,
  action: PointsAction,
): Promise<PointsSuccess | PointsError> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { error: 'ログインが必要です' }
  }

  const response = await fetch('/api/points', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action }),
  })

  const result = await response.json() as PointsSuccess | PointsError
  if (!response.ok) {
    return { error: 'error' in result ? result.error : 'エラーが発生しました' }
  }
  return result
}
