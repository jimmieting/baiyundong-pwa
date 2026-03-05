/**
 * 攀登记录模块
 * 负责与 Supabase 交互：创建/更新/查询记录
 */
import { supabase, isSupabaseConfigured } from './supabase'
import { getUserId } from './auth'

export interface Workout {
  id: string
  user_id: string
  status: string
  start_time: string
  end_time: string | null
  duration_sec: number
  start_lat: number
  start_lng: number
  end_lat: number | null
  end_lng: number | null
  start_alt: number
  end_alt: number
  is_valid: boolean
  validation_flags: string[]
}

/** 创建攀登记录（开始攀登时调用） */
export async function createWorkout(location: {
  lat: number
  lng: number
  alt: number
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null

  const userId = await getUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      status: 'RUNNING',
      start_lat: location.lat,
      start_lng: location.lng,
      start_alt: location.alt,
    })
    .select('id')
    .single()

  if (error) {
    console.error('创建记录失败', error)
    return null
  }

  return data.id
}

/** 到达终点（更新记录） */
export async function arriveWorkout(
  workoutId: string,
  location: { lat: number; lng: number; alt: number },
  samples: unknown[]
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false

  const { error } = await supabase
    .from('workouts')
    .update({
      status: 'ARRIVED',
      end_time: new Date().toISOString(),
      end_lat: location.lat,
      end_lng: location.lng,
      end_alt: location.alt,
      altitude_samples: samples,
    })
    .eq('id', workoutId)

  if (error) {
    console.error('更新到达数据失败', error)
    return false
  }

  return true
}

/** 调用校验函数 */
export async function validateWorkout(workoutId: string) {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase.rpc('validate_workout', {
    workout_id: workoutId,
  })

  if (error) {
    console.error('校验失败', error)
    return null
  }

  return data as {
    success: boolean
    isValid: boolean
    status: string
    duration: number
    flags: string[]
  }
}

/** 获取用户统计 */
export async function getUserStats() {
  if (!isSupabaseConfigured()) return null

  const userId = await getUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from('users')
    .select('total_climbs, personal_pb, total_ascent')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

/** 获取排行榜 */
export async function getLeaderboard(period: 'today' | 'month' | 'all') {
  if (!isSupabaseConfigured()) return []

  let query = supabase
    .from('workouts')
    .select('id, user_id, duration_sec, start_time, start_alt, end_alt, users!inner(nickname)')
    .eq('is_valid', true)
    .eq('status', 'COMPLETED')
    .order('duration_sec', { ascending: true })
    .limit(50)

  if (period === 'today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    query = query.gte('start_time', today.toISOString())
  } else if (period === 'month') {
    const firstDay = new Date()
    firstDay.setDate(1)
    firstDay.setHours(0, 0, 0, 0)
    query = query.gte('start_time', firstDay.toISOString())
  }

  const { data, error } = await query
  if (error) {
    console.error('排行榜查询失败', error)
    return []
  }

  return data || []
}

/** 获取个人历史记录 */
export async function getHistory() {
  if (!isSupabaseConfigured()) return []

  const userId = await getUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(50)

  if (error) {
    console.error('历史记录查询失败', error)
    return []
  }

  return data || []
}

/** 获取单条记录 */
export async function getWorkout(id: string): Promise<Workout | null> {
  if (!isSupabaseConfigured()) return null

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
