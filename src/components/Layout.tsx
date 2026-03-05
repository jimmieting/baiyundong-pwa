import { Outlet, NavLink } from 'react-router-dom'

/**
 * 主布局：页面内容 + 底部水墨导航
 */
export default function Layout() {
  return (
    <>
      <Outlet />
      <nav className="tab-bar">
        <NavLink
          to="/summit"
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
        >
          <MountainIcon />
          <span className="tab-label">巅峰</span>
        </NavLink>
        <NavLink
          to="/climb"
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
        >
          <ClimbIcon />
          <span className="tab-label">攀登</span>
        </NavLink>
        <NavLink
          to="/community"
          className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
        >
          <CommunityIcon />
          <span className="tab-label">共建</span>
        </NavLink>
      </nav>
    </>
  )
}

/** 山峰图标（水墨笔触风） */
function MountainIcon() {
  return (
    <svg className="tab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20 L10 8 L13 14 L16 10 L20 20 Z" />
    </svg>
  )
}

/** 向上箭头（攀登） */
function ClimbIcon() {
  return (
    <svg className="tab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19 L12 5" />
      <path d="M5 12 L12 5 L19 12" />
    </svg>
  )
}

/** 人形图标（共建） */
function CommunityIcon() {
  return (
    <svg className="tab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20 C3 16 6 14 9 14 C12 14 15 16 15 20" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20 C15 17 16.5 15.5 17 15.5 C19 15.5 21 17 21 20" />
    </svg>
  )
}
