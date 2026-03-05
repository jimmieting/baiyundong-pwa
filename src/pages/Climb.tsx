import { useState, useEffect, useRef, useCallback } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { ensureUser } from '../lib/auth'
import { createWorkout, arriveWorkout, validateWorkout, getUserStats } from '../lib/workout'
import './Climb.css'

/** 核心常量 */
const GEOFENCE = {
  START: { lat: 26.070797, lng: 119.372559 },
  END:   { lat: 26.075214, lng: 119.389145 },
  RADIUS: 50,
}

const TEST_MODE = true // 上线前改为 false

type ClimbState = 'IDLE' | 'RUNNING' | 'ARRIVED' | 'COMPLETED'

/**
 * 攀登页 - 核心 C 位
 * 水墨意境：宣纸底、墨黑大字、朱红印章
 */
export default function ClimbPage() {
  const [state, setState] = useState<ClimbState>('IDLE')
  const [elapsed, setElapsed] = useState(0)
  const [geoText, setGeoText] = useState(TEST_MODE ? '测试模式 · 围栏已跳过' : '定位中...')
  const [geoReady, setGeoReady] = useState(TEST_MODE)
  const [dateText, setDateText] = useState('')
  const [totalClimbs, setTotalClimbs] = useState(0)
  const [personalPB, setPersonalPB] = useState('--:--')
  const [loading, setLoading] = useState(false)

  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const workoutIdRef = useRef<string | null>(null)
  const locationRef = useRef<{ lat: number; lng: number; alt: number }>({ lat: 0, lng: 0, alt: 0 })

  // 初始化
  useEffect(() => {
    const now = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    setDateText(`${now.getMonth() + 1}月${now.getDate()}日 周${weekDays[now.getDay()]}`)

    // Supabase 初始化
    if (isSupabaseConfigured()) {
      ensureUser()
      loadStats()
    }
  }, [])

  const loadStats = async () => {
    const stats = await getUserStats()
    if (stats) {
      setTotalClimbs(stats.total_climbs || 0)
      setPersonalPB(stats.personal_pb ? formatTime(stats.personal_pb) : '--:--')
    }
  }

  // GPS 定位
  useEffect(() => {
    if (TEST_MODE) return
    if (!navigator.geolocation) {
      setGeoText('浏览器不支持定位')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, altitude } = pos.coords
        locationRef.current = { lat: latitude, lng: longitude, alt: altitude || 0 }

        const target = state === 'RUNNING' ? GEOFENCE.END : GEOFENCE.START
        const dist = haversine(latitude, longitude, target.lat, target.lng)
        const inZone = dist <= GEOFENCE.RADIUS
        setGeoReady(inZone)

        if (dist < 100) setGeoText(inZone ? '已进入范围' : `距离 ${Math.round(dist)} 米`)
        else if (dist < 1000) setGeoText(`距离 ${Math.round(dist)} 米`)
        else setGeoText(`距离 ${(dist / 1000).toFixed(1)} 公里`)
      },
      () => setGeoText('定位失败，请授权'),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [state])

  // 计时器
  useEffect(() => {
    if (state === 'RUNNING') {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [state])

  const formatTime = useCallback((sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    const mm = String(m).padStart(2, '0')
    const ss = String(s).padStart(2, '0')
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
  }, [])

  /** 开始攀登 */
  const handleStart = async () => {
    setLoading(true)
    startTimeRef.current = Date.now()
    setElapsed(0)
    setState('RUNNING')
    setGeoText(TEST_MODE ? '测试模式 · 围栏已跳过' : '攀登中...')
    setGeoReady(TEST_MODE)

    // 写入 Supabase
    if (isSupabaseConfigured()) {
      const id = await createWorkout(locationRef.current)
      workoutIdRef.current = id
    }
    setLoading(false)
  }

  /** 确认到达 */
  const handleArrive = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setLoading(true)
    setState('ARRIVED')

    const workoutId = workoutIdRef.current
    const timeText = formatTime(elapsed)

    if (isSupabaseConfigured() && workoutId) {
      // 更新到达
      await arriveWorkout(workoutId, locationRef.current, [])

      // 校验
      const result = await validateWorkout(workoutId)

      if (result?.success && result.isValid) {
        setState('COMPLETED')
        // 刷新统计
        loadStats()
        // 提示分享
        setTimeout(() => {
          if (confirm(`挑战成功！用时 ${timeText}\n去分享成绩？`)) {
            window.location.href = `/record/${workoutId}`
          }
          resetToIdle()
        }, 300)
      } else {
        setState('COMPLETED')
        alert(result?.flags?.length ? `记录异常：${result.flags.join('、')}` : `完成！用时 ${timeText}`)
        resetToIdle()
      }
    } else {
      // 未配置 Supabase 或测试模式
      setState('COMPLETED')
      setTimeout(() => {
        alert(`完成！用时 ${timeText}`)
        resetToIdle()
      }, 300)
    }

    setLoading(false)
  }

  const resetToIdle = () => {
    workoutIdRef.current = null
    setState('IDLE')
    setElapsed(0)
    setGeoText(TEST_MODE ? '测试模式 · 围栏已跳过' : '定位中...')
    setGeoReady(TEST_MODE)
  }

  const handleTap = () => {
    if (loading) return
    if (state === 'IDLE' && (geoReady || TEST_MODE)) handleStart()
    else if (state === 'RUNNING' && (geoReady || TEST_MODE)) handleArrive()
  }

  const buttonText = loading
    ? '处理中...'
    : state === 'IDLE'
      ? (geoReady ? '开始攀登' : '等待进入起点')
      : state === 'RUNNING'
        ? (geoReady ? '确认到达' : '攀登中')
        : state === 'ARRIVED'
          ? '校验中...'
          : '已完成'

  const buttonEnabled = !loading && (
    state === 'IDLE' ? geoReady :
    state === 'RUNNING' ? geoReady :
    false
  )

  return (
    <div className="page climb-page fade-in">
      {/* 水墨山形装饰 */}
      <div className="ink-mountain">
        <svg viewBox="0 0 375 120" preserveAspectRatio="none">
          <path d="M0,120 L0,80 Q40,50 80,70 Q120,30 160,55 Q200,15 240,45 Q280,25 320,50 Q350,40 375,60 L375,120 Z" fill="var(--ink)" opacity="0.04" />
          <path d="M0,120 L0,95 Q50,75 100,85 Q150,60 200,78 Q250,55 300,72 Q340,65 375,80 L375,120 Z" fill="var(--ink)" opacity="0.06" />
        </svg>
      </div>

      {/* 品牌标题 */}
      <header className="climb-header">
        <h1 className="brand-title">白云洞登山局</h1>
        <div className="divider" />
        <p className="text-caption" style={{ marginTop: 8 }}>{dateText}</p>
      </header>

      {/* 计时核心 */}
      <section className="timer-section">
        <div className="timer-display">
          <span className="timer-text mono">{formatTime(elapsed)}</span>
        </div>
        {state === 'RUNNING' && (
          <p className="timer-hint text-caption">攀登中...</p>
        )}
      </section>

      {/* 地理状态 */}
      <div className={`geo-bar ${geoReady ? 'ready' : ''}`}>
        <span className="geo-dot" />
        <span className="text-caption">{geoText}</span>
      </div>

      {/* 核心按钮 */}
      <button
        className={`btn-primary ${state === 'RUNNING' && geoReady ? 'seal' : ''}`}
        disabled={!buttonEnabled}
        onClick={handleTap}
      >
        {buttonText}
      </button>

      {/* 底部数据（IDLE 时展示） */}
      {state === 'IDLE' && (
        <section className="stats-section fade-in">
          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-value mono">{totalClimbs}</span>
              <span className="stat-label text-caption">累计攀登</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value mono">{personalPB}</span>
              <span className="stat-label text-caption">个人最佳</span>
            </div>
          </div>
        </section>
      )}

      {/* Supabase 未配置提示 */}
      {!isSupabaseConfigured() && state === 'IDLE' && (
        <p className="text-caption" style={{ marginTop: 16, textAlign: 'center', opacity: 0.5 }}>
          离线模式 · 数据不会保存
        </p>
      )}

      <p className="climb-footer text-caption">向上的秩序 · Order Upwards</p>
    </div>
  )
}

/** Haversine 公式 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
