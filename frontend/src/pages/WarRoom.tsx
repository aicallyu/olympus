import { WarRoom } from '../components/war-room/WarRoom'

export function WarRoomPage() {
  // Get the default OLYM HQ room ID from the database
  // For now using a placeholder - this should be fetched from DB
  const defaultRoomId = 'olym-hq'
  
  return (
    <div className="h-[calc(100vh-4rem)]">
      <WarRoom roomId={defaultRoomId} />
    </div>
  )
}
