import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ClimbPage from './pages/Climb'
import SummitPage from './pages/Summit'
import CommunityPage from './pages/Community'
import HistoryPage from './pages/History'
import RecordPage from './pages/Record'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/climb" replace />} />
        <Route path="/climb" element={<ClimbPage />} />
        <Route path="/summit" element={<SummitPage />} />
        <Route path="/community" element={<CommunityPage />} />
      </Route>
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/record/:id" element={<RecordPage />} />
    </Routes>
  )
}

export default App
