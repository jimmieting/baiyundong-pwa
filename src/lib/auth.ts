/**
 * 认证模块
 * 使用 Supabase 匿名登录（无需手机号）
 * 后续可升级为手机号登录
 */
import { supabase, isSupabaseConfigured } from './supabase'

/** 获取当前用户，如未登录则自动匿名登录 */
export async function ensureUser() {
  if (!isSupabaseConfigured()) return null

  // 检查现有会话
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    return session.user
  }

  // 匿名登录
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('匿名登录失败', error)
    return null
  }

  // 首次登录，创建用户记录
  if (data.user) {
    const { error: insertErr } = await supabase
      .from('users')
      .upsert({
        id: data.user.id,
        nickname: '匿名攀登者',
        identity: 'ANONYMOUS'
      }, { onConflict: 'id' })

    if (insertErr) console.warn('创建用户记录失败', insertErr)
  }

  return data.user
}

/** 获取当前用户 ID */
export async function getUserId(): Promise<string | null> {
  const user = await ensureUser()
  return user?.id ?? null
}
