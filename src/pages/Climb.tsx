import { useState, useEffect, useRef, useCallback } from 'react'
import './Climb.css'

/** 核心常量 */
const GEOFENCE = {
  START: { lat: 26.070797, lng: 119.372559 },
  END:   { lat: 26.075214, lng: 119.389145 },
  RADIUS: 50, // 米
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

  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 初始化日期
  useEffect(() => {
    const now = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    setDateText(`${now.getMonth() + 1}月${now.getDate()}日 周${weekDays[now.getDay()]}`)
  }, [])

  // GPS 定位
  useEffect(() => {
    if (TEST_MODE) return

    if (!navigator.geolocation) {
      setGeoText('浏览器不支持定位')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const target = state === 'RUNNING' ? GEOFENCE.END : GEOFENCE.START
        const dist = haversine(latitude, longitude, target.lat, target.lng)
        const inZone = dist <= GEOFENCE.RADIUS

        setGeoReady(inZone)

        if (dist < 100) {
          setGeoText(inZone ? '已进入范围' : `距离 ${Math.round(dist)} 米`)
        } else if (dist < 1000) {
          setGeoText(`距离 ${Math.round(dist)} 米`)
        } else {
          setGeoText(`距离 ${(dist / 1000).toFixed(1)} 公里`)
        }
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
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
  const handleStart = () => {
    startTimeRef.current = Date.now()
    setElapsed(0)
    setState('RUNNING')
    setGeoText(TEST_MODE ? '测试模式 · 围栏已跳过' : '攀登中...')
    setGeoReady(TEST_MODE)
  }

  /** 确认到达 */
  const handleArrive = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setState('COMPLETED')

    // TODO: 校验 + 写入 Supabase
    setTimeout(() => {
      alert(`完成！用时 ${formatTime(elapsed)}`)
      setState('IDLE')
      setElapsed(0)
      setGeoText(TEST_MODE ? '测试模式 · 围栏已跳过' : '定位中...')
      setGeoReady(TEST_MODE)
    }, 500)
  }

  const handleTap = () => {
    if (state === 'IDLE' && (geoReady || TEST_MODE)) handleStart()
    else if (state === 'RUNNING' && (geoReady || TEST_MODE)) handleArrive()
  }

  const buttonText = state === 'IDLE'
    ? (geoReady ? '开始攀登' : '等待进入起点')
    : state === 'RUNNING'
      ? (geoReady ? '确认到达' : '攀登中')
      : '已完成'

  const buttonEnabled = state === 'IDLE'
    ? geoReady
    : state === 'RUNNING'
      ? geoReady
      : false

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
              <span className="stat-value mono">0</span>
              <span className="stat-label text-caption">累计攀登</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value mono">--:--</span>
              <span className="stat-label text-caption">个人最佳</span>
            </div>
          </div>
        </section>
      )}

      {/* 底部留言 */}
      <p className="climb-footer text-caption">向上的秩序 · Order Upwards</p>
    </div>
  )
}

/** Haversine 公式计算两点距离（米） */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
