import { useCallback, useEffect, useState } from 'react';
import { Client, type Room } from 'colyseus.js';

export type RealtimeStatusValue = 'disconnected' | 'connecting' | 'connected' | 'error';

interface RealtimeStatusProps {
  realtimeUrl: string;
}

interface FoundationStateLike {
  players?: Map<string, { id?: string }>;
}

export function RealtimeStatus({ realtimeUrl }: RealtimeStatusProps) {
  const [status, setStatus] = useState<RealtimeStatusValue>('disconnected');
  const [participants, setParticipants] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room<FoundationStateLike> | null>(null);

  const disconnect = useCallback(async () => {
    const activeRoom = room;
    setRoom(null);
    setSessionId(null);
    setParticipants([]);
    if (activeRoom) {
      await activeRoom.leave();
    }
    setStatus('disconnected');
  }, [room]);

  const connect = useCallback(async () => {
    setStatus('connecting');
    try {
      const client = new Client(realtimeUrl);
      const activeRoom = await client.joinOrCreate<FoundationStateLike>('foundation_room');
      setRoom(activeRoom);
      setSessionId(activeRoom.sessionId);
      setStatus('connected');

      activeRoom.onStateChange((state) => {
        const players = state.players;
        if (players && typeof players.values === 'function') {
          setParticipants(
            Array.from(players.values())
              .map((player) => player.id)
              .filter((id): id is string => Boolean(id)),
          );
        }
      });

      activeRoom.onLeave(() => {
        setRoom(null);
        setSessionId(null);
        setParticipants([]);
        setStatus('disconnected');
      });
    } catch {
      setStatus('error');
      setRoom(null);
      setSessionId(null);
      setParticipants([]);
    }
  }, [realtimeUrl]);

  useEffect(() => () => {
    void room?.leave();
  }, [room]);

  return (
    <section className="status-card" aria-labelledby="realtime-status-title">
      <div className="status-card__header">
        <h2 id="realtime-status-title">Realtime foundation room</h2>
        <span className={`status-pill status-pill--${status}`}>{status}</span>
      </div>
      <p className="status-card__detail">
        {sessionId ? `Session ${sessionId}` : 'No active room session'}
      </p>
      <div className="status-card__actions">
        <button type="button" onClick={() => void connect()} disabled={status === 'connecting' || status === 'connected'}>
          Connect
        </button>
        <button type="button" onClick={() => void disconnect()} disabled={status === 'disconnected'}>
          Disconnect
        </button>
      </div>
      <div className="participant-list" aria-live="polite">
        <strong>Participants</strong>
        {participants.length === 0 ? <span>None connected</span> : participants.map((participant) => <span key={participant}>{participant}</span>)}
      </div>
    </section>
  );
}
