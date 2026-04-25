// ============================================================
//  MultiplayerRoom.js  –  Firebase realtime multiplayer
//  4 người chơi trên 4 thiết bị – không cần server riêng
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, isFirebaseReady } from '../firebase';

// Lazy-load firebase/database to avoid crash when not configured
let fbRef, fbSet, fbGet, fbOnValue, fbOff, fbPush, fbOnDisconnect, fbRemove;
const loadFb = async () => {
  if (fbRef) return true;
  try {
    const m = await import('firebase/database');
    fbRef = m.ref; fbSet = m.set; fbGet = m.get;
    fbOnValue = m.onValue; fbOff = m.off;
    fbPush = m.push; fbOnDisconnect = m.onDisconnect; fbRemove = m.remove;
    return true;
  } catch { return false; }
};

// ── Constants ────────────────────────────────────────────────────────────────
const LETTERS  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const genCode  = () => Array.from({ length: 4 }, () => LETTERS[Math.random() * LETTERS.length | 0]).join('');
const PLAYER_ID_KEY = 'fc_pid';

export const getMyPlayerId = () => {
  let id = sessionStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
};

export const TEAM_COLORS = {
  'Đội Trăng': '#a78bfa',
  'Đội Lửa':   '#f97316',
  'Đội Then':  '#22d3ee',
};

// ── useMultiplayer Hook ───────────────────────────────────────────────────────
export const useMultiplayer = () => {
  const [roomCode,    setRoomCode]    = useState(null);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [isHost,      setIsHost]      = useState(false);
  const [roomStatus,  setRoomStatus]  = useState('idle'); // idle | lobby | playing
  const [roomError,   setRoomError]   = useState(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [pendingItems,setPendingItems]= useState([]);      // incoming attacks
  const [gameSignal,  setGameSignal]  = useState(null);

  const roomCodeRef  = useRef(null);
  const pidRef       = useRef(getMyPlayerId());
  const nameRef      = useRef('Bạn');
  const teamRef      = useRef('Đội Trăng');
  const isHostRef    = useRef(false);
  const processedRef = useRef(new Set());
  const playersDbRef = useRef(null);
  const eventsDbRef  = useRef(null);

  // ── cleanup ────────────────────────────────────────────────────────────────
  const stopListeners = useCallback(() => {
    if (playersDbRef.current && fbOff) { fbOff(playersDbRef.current); playersDbRef.current = null; }
    if (eventsDbRef.current  && fbOff) { fbOff(eventsDbRef.current);  eventsDbRef.current  = null; }
    if (roomCodeRef.current && isFirebaseReady() && fbOff) {
      fbOff(fbRef(db, `rooms/${roomCodeRef.current}/gameState`));
    }
  }, []);

  useEffect(() => {
    loadFb();
    const pid = pidRef.current;
    return () => {
      stopListeners();
      if (roomCodeRef.current && fbRemove && isFirebaseReady()) {
        fbRemove(fbRef(db, `rooms/${roomCodeRef.current}/players/${pid}`)).catch(()=>{});
      }
    };
  }, [stopListeners]);

  // ── listen to a room ───────────────────────────────────────────────────────
  const startListening = useCallback((code) => {
    if (!isFirebaseReady() || !fbOnValue) return;

    // players
    const pRef = fbRef(db, `rooms/${code}/players`);
    playersDbRef.current = pRef;
    fbOnValue(pRef, snap => {
      const raw = snap.val() || {};
      setRoomPlayers(
        Object.entries(raw)
          .map(([id, p]) => ({ id, ...p }))
          .sort((a, b) => (b.score || 0) - (a.score || 0))
      );
    });

    // events directed at us
    const eRef = fbRef(db, `rooms/${code}/events`);
    eventsDbRef.current = eRef;
    fbOnValue(eRef, snap => {
      const raw = snap.val() || {};
      Object.entries(raw).forEach(([eid, ev]) => {
        if (processedRef.current.has(eid)) return;
        if (ev.fromPid === pidRef.current)  return; // my own event
        if (ev.targetPid !== pidRef.current) return; // not targeting me
        if (Date.now() - (ev.ts || 0) > 20000)  return; // stale
        processedRef.current.add(eid);
        setPendingItems(prev => [...prev, { ...ev, eid }]);
        // mark as processed
        fbSet(fbRef(db, `rooms/${code}/events/${eid}/done`), true).catch(()=>{});
      });
    });

    // game state sync (start game)
    const stateRef = fbRef(db, `rooms/${code}/gameState`);
    fbOnValue(stateRef, snap => {
      const state = snap.val();
      if (state && state.status === 'playing') {
        setRoomStatus('playing');
        setGameSignal(state);
      }
    });
  }, []);

  // ── createRoom ─────────────────────────────────────────────────────────────
  const createRoom = useCallback(async (playerName, playerTeam) => {
    if (!isFirebaseReady()) { setRoomError('Firebase chưa cấu hình – xem src/firebase.js'); return; }
    await loadFb();
    nameRef.current = playerName; teamRef.current = playerTeam;
    setRoomLoading(true); setRoomError(null);
    const code = genCode();
    const pid  = pidRef.current;
    try {
      await fbSet(fbRef(db, `rooms/${code}`), {
        hostPid:  pid,
        hostName: playerName,
        status:   'lobby',
        createdAt: Date.now(),
        players: {
          [pid]: { name: playerName, team: playerTeam, score: 0,
                   title: 'Người Gác Lửa', wolfStrikes: 0, rescued: 0,
                   online: true, isHost: true },
        },
      });
      fbOnDisconnect(fbRef(db, `rooms/${code}/players/${pid}`)).remove();
      roomCodeRef.current = code; isHostRef.current = true;
      setRoomCode(code); setIsHost(true); setRoomStatus('lobby');
      startListening(code);
    } catch { setRoomError('Lỗi tạo phòng. Kiểm tra kết nối mạng.'); }
    finally  { setRoomLoading(false); }
  }, [startListening]);

  // ── joinRoom ───────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async (code, playerName, playerTeam) => {
    if (!isFirebaseReady()) { setRoomError('Firebase chưa cấu hình – xem src/firebase.js'); return; }
    await loadFb();
    const upper = code.toUpperCase().trim();
    if (upper.length !== 4) { setRoomError('Mã phòng phải đúng 4 ký tự.'); return; }
    nameRef.current = playerName; teamRef.current = playerTeam;
    setRoomLoading(true); setRoomError(null);
    const pid = pidRef.current;
    try {
      const snap = await fbGet(fbRef(db, `rooms/${upper}`));
      if (!snap.exists()) { setRoomError('Không tìm thấy phòng. Kiểm tra mã phòng.'); return; }
      await fbSet(fbRef(db, `rooms/${upper}/players/${pid}`), {
        name: playerName, team: playerTeam, score: 0,
        title: 'Người Gác Lửa', wolfStrikes: 0, rescued: 0,
        online: true, isHost: false,
      });
      fbOnDisconnect(fbRef(db, `rooms/${upper}/players/${pid}`)).remove();
      roomCodeRef.current = upper; isHostRef.current = false;
      setRoomCode(upper); setIsHost(false); setRoomStatus('lobby');
      startListening(upper);
    } catch (e) { setRoomError('Lỗi kết nối: ' + (e?.message || 'Thử lại sau.')); }
    finally    { setRoomLoading(false); }
  }, [startListening]);

  // ── leaveRoom ─────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(async () => {
    stopListeners();
    if (roomCodeRef.current && isFirebaseReady() && fbRemove) {
      await fbRemove(fbRef(db, `rooms/${roomCodeRef.current}/players/${pidRef.current}`)).catch(()=>{});
    }
    roomCodeRef.current = null; isHostRef.current = false;
    processedRef.current = new Set();
    setRoomCode(null); setRoomPlayers([]); setIsHost(false);
    setRoomStatus('idle'); setRoomError(null); setPendingItems([]); setGameSignal(null);
  }, [stopListeners]);

  // ── syncScore  (call this whenever score / state changes) ─────────────────
  const syncScore = useCallback((name, team, score, wolfStrikes, rescued, title) => {
    if (!roomCodeRef.current || !isFirebaseReady() || !fbSet) return;
    nameRef.current = name; teamRef.current = team;
    fbSet(fbRef(db, `rooms/${roomCodeRef.current}/players/${pidRef.current}`), {
      name, team, score, title, wolfStrikes, rescued, online: true,
      isHost: isHostRef.current,
    }).catch(()=>{});
  }, []);

  // ── sendItemEvent (freeze / steal) ────────────────────────────────────────
  const sendItemEvent = useCallback((type, targetPid, opts = {}) => {
    if (!roomCodeRef.current || !isFirebaseReady() || !fbPush) return;
    fbPush(fbRef(db, `rooms/${roomCodeRef.current}/events`), {
      type,
      fromPid:    pidRef.current,
      fromName:   nameRef.current,
      fromTeam:   teamRef.current,
      targetPid,
      amount:     opts.amount   || 0,
      duration:   opts.duration || 0,
      ts:         Date.now(),
      done:       false,
    }).catch(()=>{});
  }, []);

  const triggerStartGame = useCallback((seedWordId) => {
    if (!roomCodeRef.current || !isFirebaseReady() || !fbSet) return;
    fbSet(fbRef(db, `rooms/${roomCodeRef.current}/gameState`), {
      status: 'playing',
      seedWordId: seedWordId || null,
      ts: Date.now()
    }).catch(()=>{});
  }, []);

  // ── consume incoming event ─────────────────────────────────────────────────
  const consumePendingItem = useCallback(eid => {
    setPendingItems(prev => prev.filter(e => e.eid !== eid));
  }, []);

  // ── update player name/team refs silently ─────────────────────────────────
  const updatePlayerRef = useCallback((name, team) => {
    nameRef.current = name; teamRef.current = team;
  }, []);

  return {
    roomCode, roomPlayers, isHost, roomStatus, roomError, roomLoading,
    pendingItems, gameSignal,
    createRoom, joinRoom, leaveRoom, triggerStartGame,
    syncScore, sendItemEvent, consumePendingItem, updatePlayerRef,
    setRoomError,
    myPid: pidRef.current,
  };
};

// ── RoomPanel (shown on HomeScreen) ──────────────────────────────────────────
export const RoomPanel = ({ multiplayer, playerName, playerTeam, onStartGame }) => {
  const [joinCode, setJoinCode] = useState('');
  const {
    roomCode, roomPlayers, isHost, roomError, roomLoading,
    createRoom, joinRoom, leaveRoom, setRoomError,
  } = multiplayer;

  if (!isFirebaseReady()) {
    return (
      <div className="mp-panel mp-unconfigured">
        <p className="mp-panel-icon">🔥</p>
        <p className="mp-panel-title">Chơi Nhóm Realtime (4 người)</p>
        <p className="mp-panel-desc">
          Điền Firebase config vào <code>src/firebase.js</code> để bật tính năng này.
          <br /><a className="mp-docs-link" href="https://console.firebase.google.com" target="_blank" rel="noreferrer">→ Mở Firebase Console</a>
        </p>
      </div>
    );
  }

  // ── In a room ──────────────────────────────────────────────────────────────
  if (roomCode) {
    return (
      <motion.div className="mp-panel mp-in-room"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mp-room-header">
          <div>
            <p className="mp-panel-kicker">⚔️ Phòng đang mở</p>
            <div className="mp-code-row">
              <span className="mp-room-code">{roomCode}</span>
              <button className="mp-copy-btn"
                onClick={() => navigator.clipboard?.writeText(roomCode).catch(()=>{})}
                title="Sao chép mã">📋</button>
            </div>
            <p className="mp-share-hint">Chia sẻ mã này cho bạn bè để cùng vào phòng</p>
          </div>
          <button className="mp-leave-btn" onClick={leaveRoom}>Rời phòng ✕</button>
        </div>

        {/* Player list */}
        <div className="mp-players-list">
          {roomPlayers.map(p => (
            <div key={p.id} className="mp-player-row">
              <span className="mp-dot" style={{ background: TEAM_COLORS[p.team] || '#888' }} />
              <span className="mp-pname">{p.name}{p.isHost ? ' 👑' : ''}</span>
              <span className="mp-pteam" style={{ color: TEAM_COLORS[p.team] || '#ccc' }}>{p.team}</span>
              <span className="mp-pscore">{p.score || 0} đ</span>
            </div>
          ))}
          {roomPlayers.length === 0 && <p className="mp-empty">Đang chờ người chơi vào phòng...</p>}
        </div>

        {roomError && <p className="mp-error">⚠️ {roomError}</p>}

        {isHost ? (
          <button className="mp-start-btn" onClick={onStartGame}>
            🚀 Bắt đầu trận — {roomPlayers.length} người chơi
          </button>
        ) : (
          <p className="mp-waiting">⏳ Chờ host bắt đầu trận...</p>
        )}
      </motion.div>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  return (
    <motion.div className="mp-panel"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <p className="mp-panel-kicker">⚔️ Chơi Nhóm Realtime</p>
      <p className="mp-panel-desc">
        Tạo phòng hoặc nhập mã để cùng chiến với bạn bè trên mọi thiết bị.
      </p>

      <div className="mp-actions">
        <button className="mp-create-btn"
          onClick={() => createRoom(playerName, playerTeam)}
          disabled={roomLoading}>
          {roomLoading ? '⏳ Đang tạo...' : '➕ Tạo phòng mới'}
        </button>

        <div className="mp-join-row">
          <input className="mp-code-input"
            placeholder="Mã 4 chữ..."
            value={joinCode}
            onChange={e => { setRoomError(null); setJoinCode(e.target.value.toUpperCase().slice(0, 4)); }}
            maxLength={4}
          />
          <button className="mp-join-btn"
            onClick={() => joinRoom(joinCode, playerName, playerTeam)}
            disabled={roomLoading || joinCode.length !== 4}>
            {roomLoading ? '...' : 'Vào →'}
          </button>
        </div>

        <AnimatePresence>
          {roomError && (
            <motion.p className="mp-error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              ⚠️ {roomError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ── LivePlayersPanel (shown during game) ─────────────────────────────────────
export const LivePlayersPanel = ({ roomPlayers, myPid }) => {
  if (!roomPlayers || roomPlayers.length <= 1) return null;

  return (
    <motion.div className="live-players-panel"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <p className="live-title">👥 Phòng live</p>
      <div className="live-list">
        {roomPlayers.map(p => (
          <div key={p.id} className={`live-row ${p.id === myPid ? 'live-me' : ''}`}>
            <span className="live-dot" style={{ background: TEAM_COLORS[p.team] || '#888' }} />
            <span className="live-name">{p.name.slice(0, 8)}</span>
            <span className="live-score">{p.score || 0}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ── TargetPickerModal (choose who to freeze / steal from) ────────────────────
export const TargetPickerModal = ({ roomPlayers, myPid, myTeam, itemType, onSelect, onCancel }) => {
  const opponents = roomPlayers.filter(p => p.team !== myTeam && p.id !== myPid);
  const title = itemType === 'freeze' ? '❄️ Chọn người để Đóng Băng' : '🕷️ Chọn người để Cướp Điểm';

  return (
    <motion.div className="target-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="target-modal"
        initial={{ scale: 0.88, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}>
        <p className="target-title">{title}</p>

        {opponents.length === 0 ? (
          <p className="target-empty">Không có đối thủ ở phe khác trong phòng.</p>
        ) : (
          <div className="target-list">
            {opponents.map(p => (
              <button key={p.id} className="target-option" onClick={() => onSelect(p)}>
                <span className="target-dot" style={{ background: TEAM_COLORS[p.team] || '#888' }} />
                <div className="target-info">
                  <span className="target-name">{p.name}</span>
                  <span className="target-team" style={{ color: TEAM_COLORS[p.team] }}>
                    {p.team}
                  </span>
                </div>
                <span className="target-score">{p.score || 0} đ</span>
              </button>
            ))}
          </div>
        )}
        <button className="target-cancel" onClick={onCancel}>Hủy</button>
      </motion.div>
    </motion.div>
  );
};

export default RoomPanel;
