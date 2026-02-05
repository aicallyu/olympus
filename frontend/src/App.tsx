import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { TaskBoard } from './pages/TaskBoard'
import { AgentStatus } from './pages/AgentStatus'
import { ActivityFeed } from './pages/ActivityFeed'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<TaskBoard />} />
        <Route path="/agents" element={<AgentStatus />} />
        <Route path="/activity" element={<ActivityFeed />} />
      </Routes>
    </Layout>
  )
}

export default App
