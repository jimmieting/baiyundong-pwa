import { useNavigate } from 'react-router-dom'
import './PageCommon.css'

/** 历史记录页（后续实现） */
export default function HistoryPage() {
  const navigate = useNavigate()

  return (
    <div className="page fade-in">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← 返回</button>
        <h1 className="text-title">攀登记录</h1>
        <div className="divider" />
      </header>
      <div className="placeholder-section">
        <p className="text-body" style={{ textAlign: 'center', marginTop: 80 }}>
          暂无记录
        </p>
      </div>
    </div>
  )
}
