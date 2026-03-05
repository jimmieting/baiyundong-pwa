import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/** Supabase 客户端单例 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** 检查 Supabase 是否已配置 */
export const isSupabaseConfigured = () =>
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0
