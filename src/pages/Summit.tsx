import './PageCommon.css'

/** 巅峰页 - 排行榜（后续实现） */
export default function SummitPage() {
  return (
    <div className="page fade-in">
      <header className="page-header">
        <h1 className="text-title">巅峰</h1>
        <div className="divider" />
      </header>
      <div className="placeholder-section">
        <p className="text-body" style={{ textAlign: 'center', marginTop: 80 }}>
          排行榜功能即将上线
        </p>
        <p className="text-caption" style={{ textAlign: 'center', marginTop: 8 }}>
          接入 Supabase 后展示今日 / 本月 / 历史排名
        </p>
      </div>
    </div>
  )
}
