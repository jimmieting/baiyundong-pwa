import './PageCommon.css'

/** 共建页 - 文化 + 社群（后续实现） */
export default function CommunityPage() {
  return (
    <div className="page fade-in">
      <header className="page-header">
        <h1 className="text-title">共建</h1>
        <div className="divider" />
      </header>

      <section className="card" style={{ marginTop: 32 }}>
        <p className="text-body" style={{ lineHeight: 1.8 }}>
          朱熹曾于鼓山白云洞题"天路"二字，<br />
          意指通往精神高处的道路。
        </p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <p className="text-body" style={{ textAlign: 'center' }}>
          社群入口、反馈功能即将上线
        </p>
      </section>
    </div>
  )
}
