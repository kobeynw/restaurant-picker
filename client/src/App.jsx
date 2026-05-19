import { useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useSession } from './context/SessionContext.jsx';
import { getRememberedJoin } from './identity.js';
import Home from './pages/Home.jsx';
import Join from './pages/Join.jsx';
import Lobby from './pages/Lobby.jsx';
import Suggestions from './pages/Suggestions.jsx';
import Deciding from './pages/Deciding.jsx';
import Result from './pages/Result.jsx';

function Reconnecting({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <div className="text-slate-300 text-lg">{message || 'Reconnecting…'}</div>
        <div className="text-slate-500 text-sm">Hang tight.</div>
      </div>
    </div>
  );
}

function SessionRouter() {
  const { sessionId } = useParams();
  const { session, joinSession, joinError, socket } = useSession();
  const matched = session && session.id === sessionId;

  useEffect(() => {
    if (matched) return;
    if (joinError) return;
    const remembered = getRememberedJoin();
    if (
      remembered &&
      remembered.sessionId === sessionId &&
      remembered.name &&
      socket.connected
    ) {
      joinSession(sessionId, remembered.name);
    }
  }, [matched, sessionId, joinError, socket, joinSession]);

  if (matched) {
    switch (session.status) {
      case 'lobby':
        return <Lobby />;
      case 'submitting':
        return <Suggestions />;
      case 'deciding':
        return <Deciding />;
      case 'result':
        return <Result />;
      default:
        return <Lobby />;
    }
  }

  if (joinError) {
    return <Navigate to={`/join/${sessionId}`} replace />;
  }

  const remembered = getRememberedJoin();
  if (remembered && remembered.sessionId === sessionId && remembered.name) {
    return <Reconnecting />;
  }

  return <Navigate to={`/join/${sessionId}`} replace />;
}

function ErrorToast() {
  const { errorMessage } = useSession();
  if (!errorMessage) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg max-w-[90vw] text-sm">
      {errorMessage}
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-full">
      <ErrorToast />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:sessionId" element={<Join />} />
        <Route path="/session/:sessionId" element={<SessionRouter />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
