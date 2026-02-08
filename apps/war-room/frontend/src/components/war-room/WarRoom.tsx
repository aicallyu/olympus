import { useState, useEffect } from 'react';
import { useWarRoomMessages } from '@/hooks/useWarRoomMessages';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { MessageBubble } from './MessageBubble';

interface Props {
  roomId: string;
}

export function WarRoom({ roomId }: Props) {
  const { messages, isLoading, sendMessage, sendVoiceMessage } = useWarRoomMessages(roomId);
  const { isRecording, duration, startRecording, stopRecording } = useVoiceRecorder();
  const [inputText, setInputText] = useState('');
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(() => {
    const saved = localStorage.getItem('war-room-voice-reply');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('war-room-voice-reply', voiceReplyEnabled.toString());
  }, [voiceReplyEnabled]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await sendMessage(inputText, { preferVoiceReply: voiceReplyEnabled });
    setInputText('');
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      await sendVoiceMessage(blob);
    } else {
      await startRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gray-900/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">OLYM HQ</h2>
            <p className="text-xs text-white/50">Real-time collaboration with AI agents</p>
          </div>
          <button
            onClick={() => setVoiceReplyEnabled(!voiceReplyEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              voiceReplyEnabled
                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
            }`}
            title={voiceReplyEnabled ? 'Agents antworten als Sprachnachricht' : 'Agents antworten als Text'}
          >
            {voiceReplyEnabled ? '🎙️ Sprache' : '💬 Text'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-white/50">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/30">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwnMessage={msg.sender_name === 'Juan'}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 bg-gray-900/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceToggle}
            className={`p-3 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isRecording ? `⏹ ${formatDuration(duration)}` : '🎤'}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message... (use @ARGOS or @Claude to mention)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
