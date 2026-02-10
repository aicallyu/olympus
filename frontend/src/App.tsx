import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { UserProvider } from './contexts/UserContext'
import { Dashboard } from './pages/Dashboard'
import { TaskBoard } from './pages/TaskBoard'
import { AgentStatus } from './pages/AgentStatus'
import { ActivityFeed } from './pages/ActivityFeed'
import { WarRoomLobby } from './pages/WarRoomLobby'
import { OfficePage } from './pages/OfficePage'
import { WarRoom } from './components/war-room/WarRoom'

function App() {
  return (
    <UserProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<TaskBoard />} />
        <Route path="/agents" element={<AgentStatus />} />
        <Route path="/activity" element={<ActivityFeed />} />
        <Route path="/war-room" element={<WarRoomLobby />} />
        <Route path="/war-room/:roomId" element={<WarRoomWrapper />} />
        <Route path="/office" element={<OfficePage />} />
      </Routes>
    </Layout>
    </UserProvider>
  )
}

// Wrapper to extract roomId from URL
import { useParams } from 'react-router-dom'
function WarRoomWrapper() {
  const { roomId } = useParams<{ roomId: string }>()
  if (!roomId) return <div>Invalid room</div>
  return <WarRoom roomId={roomId} />
}

export default App
