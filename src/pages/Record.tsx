import { useParams, useNavigate } from 'react-router-dom'
import './PageCommon.css'

/** 记录详情页（后续实现） */
export default function RecordPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="page fade-in">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← 返回</button>
        <h1 className="text-title">记录详情</h1>
        <div className="divider" />
      </header>
      <div className="placeholder-section">
        <p className="text-body" style={{ textAlign: 'center', marginTop: 80 }}>
          记录 {id} 详情页待实现
        </p>
      </div>
    </div>
  )
}
