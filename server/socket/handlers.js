import { nanoid } from 'nanoid';
import { getRestaurantById } from '../routes/restaurants.js';

const sessions = new Map();
const DISCONNECT_GRACE_MS = 30_000;
const EMPTY_SESSION_TTL_MS = 5 * 60_000;

export function createSession() {
  const id = nanoid(8);
  const session = {
    id,
    status: 'lobby',
    decisionMode: null,
    participants: [],
    suggestions: [],
    votes: {},
    voteLimit: 3,
    winnerId: null,
    spinState: null,
    participantsLocked: false,
    cleanupTimers: new Map(),
    deleteTimer: null,
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id) {
  return sessions.get(id) || null;
}

function publicSession(session) {
  const everyoneVoted =
    session.status === 'deciding' &&
    session.decisionMode === 'vote' &&
    session.participants.length > 0 &&
    Object.keys(session.votes).length >= session.participants.length;
  const revealVotes = session.status === 'result' || everyoneVoted;

  return {
    id: session.id,
    status: session.status,
    decisionMode: session.decisionMode,
    participantsLocked: session.participantsLocked,
    participants: session.participants.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      connected: p.connected,
    })),
    suggestions: session.suggestions,
    voteLimit: session.voteLimit,
    voteProgress: {
      cast: Object.keys(session.votes).length,
      total: session.participants.length,
    },
    votes: revealVotes ? session.votes : null,
    winnerId: session.winnerId,
    spinState: session.spinState,
  };
}

function broadcast(io, session) {
  io.to(session.id).emit('session_update', publicSession(session));
}

function isHost(session, clientId) {
  const p = session.participants.find((p) => p.id === clientId);
  return !!(p && p.isHost);
}

function reassignHostIfNeeded(session) {
  if (session.participants.length === 0) return;
  if (!session.participants.some((p) => p.isHost)) {
    session.participants[0].isHost = true;
  }
}

function tallyVotes(session) {
  const N = session.voteLimit;
  const points = new Map();
  for (const ranking of Object.values(session.votes)) {
    ranking.forEach((id, idx) => points.set(id, (points.get(id) || 0) + (N - idx)));
  }
  if (points.size === 0) return null;
  let max = -1;
  for (const v of points.values()) if (v > max) max = v;
  const tied = [...points.entries()].filter(([, c]) => c === max).map(([id]) => id);
  return tied[Math.floor(Math.random() * tied.length)];
}

function maybeAutoTally(session) {
  if (
    session.status === 'deciding' &&
    session.decisionMode === 'vote' &&
    session.participants.length > 0 &&
    Object.keys(session.votes).length >= session.participants.length
  ) {
    const winner = tallyVotes(session);
    if (winner) {
      session.winnerId = winner;
      session.status = 'result';
    }
  }
}

function schedulePurge(io, session, clientId) {
  const existing = session.cleanupTimers.get(clientId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    session.cleanupTimers.delete(clientId);
    purgeParticipant(io, session, clientId);
  }, DISCONNECT_GRACE_MS);
  session.cleanupTimers.set(clientId, timer);
}

function purgeParticipant(io, session, clientId) {
  const p = session.participants.find((p) => p.id === clientId);
  if (!p || p.connected) return;

  session.participants = session.participants.filter((x) => x.id !== clientId);
  if (session.status === 'lobby' || session.status === 'submitting') {
    session.suggestions = session.suggestions.filter((s) => s.suggestedBy !== clientId);
  }
  delete session.votes[clientId];
  reassignHostIfNeeded(session);

  if (session.participants.length === 0) {
    if (session.deleteTimer) clearTimeout(session.deleteTimer);
    session.deleteTimer = setTimeout(() => {
      sessions.delete(session.id);
    }, EMPTY_SESSION_TTL_MS);
    return;
  }

  maybeAutoTally(session);
  broadcast(io, session);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join_session', ({ sessionId, clientId, name }) => {
      const session = sessions.get(sessionId);
      if (!session) {
        socket.emit('join_failed', { reason: 'not_found', message: 'Session not found' });
        return;
      }
      if (!clientId || typeof clientId !== 'string') {
        socket.emit('join_failed', { reason: 'bad_request', message: 'Missing client id' });
        return;
      }

      if (session.deleteTimer) {
        clearTimeout(session.deleteTimer);
        session.deleteTimer = null;
      }

      const cleanName = String(name || '').trim().slice(0, 32) || 'Guest';
      const existing = session.participants.find((p) => p.id === clientId);

      if (existing) {
        existing.socketId = socket.id;
        existing.connected = true;
        if (cleanName) existing.name = cleanName;
        const pending = session.cleanupTimers.get(clientId);
        if (pending) {
          clearTimeout(pending);
          session.cleanupTimers.delete(clientId);
        }
      } else {
        if (session.participantsLocked) {
          socket.emit('join_failed', {
            reason: 'locked',
            message: 'A round is in progress. Wait for the host to start a new round.',
          });
          return;
        }
        const isFirst = session.participants.length === 0;
        session.participants.push({
          id: clientId,
          socketId: socket.id,
          name: cleanName,
          isHost: isFirst,
          connected: true,
        });
      }

      socket.data.sessionId = sessionId;
      socket.data.clientId = clientId;
      socket.join(sessionId);
      broadcast(io, session);
    });

    socket.on('submit_suggestion', ({ sessionId, restaurantId }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (session.status !== 'submitting') {
        socket.emit('error', { message: 'Not accepting suggestions right now' });
        return;
      }
      if (!getRestaurantById(restaurantId)) {
        socket.emit('error', { message: 'Unknown restaurant' });
        return;
      }
      if (session.suggestions.some((s) => s.restaurantId === restaurantId)) {
        socket.emit('error', { message: 'Already suggested' });
        return;
      }
      session.suggestions.push({ restaurantId, suggestedBy: clientId });
      broadcast(io, session);
    });

    socket.on('remove_suggestion', ({ sessionId, restaurantId }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      const idx = session.suggestions.findIndex(
        (s) => s.restaurantId === restaurantId && s.suggestedBy === clientId,
      );
      if (idx === -1) {
        socket.emit('error', { message: 'You can only remove your own suggestion' });
        return;
      }
      session.suggestions.splice(idx, 1);
      broadcast(io, session);
    });

    socket.on('set_decision_mode', ({ sessionId, mode }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (!isHost(session, clientId)) {
        socket.emit('error', { message: 'Only the host can change the mode' });
        return;
      }
      if (mode !== 'spin' && mode !== 'vote') {
        socket.emit('error', { message: 'Invalid mode' });
        return;
      }
      session.decisionMode = mode;
      broadcast(io, session);
    });

    socket.on('start_suggesting', ({ sessionId }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (!isHost(session, clientId)) {
        socket.emit('error', { message: 'Only the host can start' });
        return;
      }
      session.status = 'submitting';
      broadcast(io, session);
    });

    socket.on('start_deciding', ({ sessionId }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (!isHost(session, clientId)) {
        socket.emit('error', { message: 'Only the host can start deciding' });
        return;
      }
      if (session.suggestions.length < 2) {
        socket.emit('error', { message: 'Need at least 2 suggestions' });
        return;
      }
      if (!session.decisionMode) {
        socket.emit('error', { message: 'Choose a decision mode first' });
        return;
      }
      session.status = 'deciding';
      session.participantsLocked = true;
      session.votes = {};
      session.voteLimit = Math.min(session.voteLimit, session.suggestions.length);
      session.winnerId = null;
      session.spinState = null;
      broadcast(io, session);
    });

    socket.on('set_vote_limit', ({ sessionId, limit }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (!isHost(session, clientId)) {
        socket.emit('error', { message: 'Only the host can change the vote limit' });
        return;
      }
      const n = Number(limit);
      if (!Number.isInteger(n)) {
        socket.emit('error', { message: 'Invalid vote limit' });
        return;
      }
      session.voteLimit = Math.max(1, Math.min(n, Math.max(1, session.suggestions.length)));
      broadcast(io, session);
    });

    socket.on('submit_vote', ({ sessionId, ranking }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (session.status !== 'deciding' || session.decisionMode !== 'vote') {
        socket.emit('error', { message: 'Not in voting phase' });
        return;
      }
      if (!Array.isArray(ranking) || ranking.length === 0 || ranking.length > session.voteLimit) {
        socket.emit('error', { message: 'Invalid ballot' });
        return;
      }
      if (new Set(ranking).size !== ranking.length) {
        socket.emit('error', { message: 'Duplicate choices in ballot' });
        return;
      }
      if (!ranking.every((id) => session.suggestions.some((s) => s.restaurantId === id))) {
        socket.emit('error', { message: 'Not a valid choice' });
        return;
      }
      session.votes[clientId] = ranking;
      broadcast(io, session);

      if (Object.keys(session.votes).length >= session.participants.length) {
        const winner = tallyVotes(session);
        session.winnerId = winner;
        session.status = 'result';
        broadcast(io, session);
      }
    });

    socket.on('unlock_vote', ({ sessionId }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (session.status !== 'deciding' || session.decisionMode !== 'vote') return;
      if (clientId in session.votes) {
        delete session.votes[clientId];
        broadcast(io, session);
      }
    });

    socket.on('close_voting', ({ sessionId }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (!isHost(session, clientId)) return;
      if (session.status !== 'deciding' || session.decisionMode !== 'vote') return;
      const winner = tallyVotes(session);
      if (!winner) {
        socket.emit('error', { message: 'No votes yet' });
        return;
      }
      session.winnerId = winner;
      session.status = 'result';
      broadcast(io, session);
    });

    socket.on('start_spin', ({ sessionId }) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      if (session.status !== 'deciding' || session.decisionMode !== 'spin') {
        socket.emit('error', { message: 'Not in spin phase' });
        return;
      }
      if (session.spinState) {
        socket.emit('error', { message: 'Spin already in progress' });
        return;
      }
      if (session.winnerId != null) return;
      if (session.suggestions.length === 0) {
        socket.emit('error', { message: 'No suggestions to spin' });
        return;
      }

      const targetIndex = Math.floor(Math.random() * session.suggestions.length);
      const spins = 5 + Math.floor(Math.random() * 3);
      const duration = 4500;
      const mySpinState = {
        targetIndex,
        spins,
        duration,
        startedAt: Date.now(),
      };
      session.spinState = mySpinState;
      broadcast(io, session);

      setTimeout(() => {
        const s = sessions.get(sessionId);
        if (!s || s.spinState !== mySpinState) return;
        const target = s.suggestions[mySpinState.targetIndex];
        s.spinState = null;
        if (!target) {
          broadcast(io, s);
          return;
        }
        s.winnerId = target.restaurantId;
        s.status = 'result';
        broadcast(io, s);
      }, duration);
    });

    socket.on('new_round', ({ sessionId }) => {
      const session = sessions.get(sessionId);
      const clientId = socket.data.clientId;
      if (!session || !clientId) return;
      if (!isHost(session, clientId)) {
        socket.emit('error', { message: 'Only the host can start a new round' });
        return;
      }
      session.status = 'lobby';
      session.decisionMode = null;
      session.suggestions = [];
      session.votes = {};
      session.winnerId = null;
      session.spinState = null;
      session.participantsLocked = false;

      for (const p of [...session.participants]) {
        if (!p.connected) {
          const t = session.cleanupTimers.get(p.id);
          if (t) {
            clearTimeout(t);
            session.cleanupTimers.delete(p.id);
          }
          session.participants = session.participants.filter((x) => x.id !== p.id);
        }
      }
      reassignHostIfNeeded(session);
      broadcast(io, session);
    });

    socket.on('disconnect', () => {
      const sessionId = socket.data.sessionId;
      const clientId = socket.data.clientId;
      if (!sessionId || !clientId) return;
      const session = sessions.get(sessionId);
      if (!session) return;
      const p = session.participants.find((p) => p.id === clientId);
      if (!p) return;
      if (p.socketId !== socket.id) return;
      p.connected = false;
      broadcast(io, session);
      schedulePurge(io, session, clientId);
    });
  });
}
