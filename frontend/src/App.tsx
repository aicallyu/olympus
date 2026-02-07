import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { TaskBoard } from './pages/TaskBoard'
import { AgentStatus } from './pages/AgentStatus'
import { ActivityFeed } from './pages/ActivityFeed'
import { WarRoomLobby } from './pages/WarRoomLobby'
import { WarRoom } from './components/war-room/WarRoom'
import { Pipeline } from './pages/Pipeline'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tasks" element={<TaskBoard />} />
        <Route path="/agents" element={<AgentStatus />} />
        <Route path="/activity" element={<ActivityFeed />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/pipeline/:taskId" element={<Pipeline />} />
        <Route path="/war-room" element={<WarRoomLobby />} />
        <Route path="/war-room/:roomId" element={<WarRoomWrapper />} />
      </Routes>
    </Layout>
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
