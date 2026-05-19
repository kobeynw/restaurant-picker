import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { socket } from '../socket.js';
import {
  getClientId,
  getRememberedJoin,
  rememberJoin,
  forgetJoin,
} from '../identity.js';

const SessionContext = createContext(null);

const initialState = {
  restaurants: [],
  restaurantsLoaded: false,
  session: null,
  myName: '',
  clientId: getClientId(),
  errorMessage: null,
  joinError: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'set_restaurants':
      return { ...state, restaurants: action.restaurants, restaurantsLoaded: true };
    case 'set_session':
      return { ...state, session: action.session, joinError: null };
    case 'clear_session':
      return { ...state, session: null };
    case 'set_my_name':
      return { ...state, myName: action.name };
    case 'set_error':
      return { ...state, errorMessage: action.message };
    case 'clear_error':
      return { ...state, errorMessage: null };
    case 'set_join_error':
      return { ...state, joinError: action.error, session: null };
    case 'clear_join_error':
      return { ...state, joinError: null };
    default:
      return state;
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const errorTimer = useRef(null);
  const clientIdRef = useRef(state.clientId);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) dispatch({ type: 'set_restaurants', restaurants: data });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'set_error', message: 'Could not load restaurants' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleConnect() {
      const remembered = getRememberedJoin();
      if (remembered && remembered.sessionId && remembered.name) {
        socket.emit('join_session', {
          sessionId: remembered.sessionId,
          clientId: clientIdRef.current,
          name: remembered.name,
        });
      }
    }
    function handleSessionUpdate(session) {
      dispatch({ type: 'set_session', session });
    }
    function handleError({ message }) {
      dispatch({ type: 'set_error', message });
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => dispatch({ type: 'clear_error' }), 4000);
    }
    function handleJoinFailed({ reason, message }) {
      forgetJoin();
      dispatch({ type: 'set_join_error', error: { reason, message } });
    }
    socket.on('connect', handleConnect);
    socket.on('session_update', handleSessionUpdate);
    socket.on('error', handleError);
    socket.on('join_failed', handleJoinFailed);
    if (socket.connected) handleConnect();
    return () => {
      socket.off('connect', handleConnect);
      socket.off('session_update', handleSessionUpdate);
      socket.off('error', handleError);
      socket.off('join_failed', handleJoinFailed);
    };
  }, []);

  function joinSession(sessionId, name) {
    rememberJoin(sessionId, name);
    dispatch({ type: 'set_my_name', name });
    dispatch({ type: 'clear_join_error' });
    if (socket.connected) {
      socket.emit('join_session', {
        sessionId,
        clientId: clientIdRef.current,
        name,
      });
    }
  }

  function leaveSession() {
    forgetJoin();
    dispatch({ type: 'clear_session' });
  }

  const value = {
    ...state,
    dispatch,
    socket,
    joinSession,
    leaveSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export function useIsHost() {
  const { session, clientId } = useSession();
  if (!session) return false;
  const me = session.participants.find((p) => p.id === clientId);
  return !!(me && me.isHost);
}
