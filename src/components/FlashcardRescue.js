import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dictionaryData } from '../data/dictionaryData';
import './FlashcardRescue.css';
import {
  useMultiplayer, RoomPanel, LivePlayersPanel, TargetPickerModal, getMyPlayerId,
} from './MultiplayerRoom';

const RISK_PRESET = [97, 94, 92, 89, 85, 82, 78, 74, 71, 67, 61, 56, 52, 46, 43, 36, 28, 19, 12, 7];
const ORGANIC_POSITIONS = [
  { x: 6, y: 14 }, { x: 23, y: 7 }, { x: 39, y: 16 }, { x: 56, y: 8 }, { x: 74, y: 19 },
  { x: 90, y: 12 }, { x: 16, y: 36 }, { x: 33, y: 31 }, { x: 50, y: 39 }, { x: 68, y: 30 },
  { x: 86, y: 35 }, { x: 9, y: 58 }, { x: 26, y: 53 }, { x: 43, y: 62 }, { x: 61, y: 54 },
  { x: 79, y: 60 }, { x: 94, y: 56 }, { x: 18, y: 79 }, { x: 47, y: 84 }, { x: 78, y: 82 },
];

const STORAGE_KEYS = {
  learned: 'flashcard.learnedWords',
  community: 'flashcard.communityCount',
  leaderboard: 'flashcard.leaderboard',
  playerName: 'flashcard.playerName',
  playerTeam: 'flashcard.playerTeam',
};

const SESSION_GOAL = 8;
const SESSION_MAX_STEPS = 12;
const WOLF_STRIKE_LIMIT = 3;
const WOLF_APPEAR_INTERVAL = 2;

const TEAM_OPTIONS = ['Đội Trăng', 'Đội Lửa', 'Đội Then'];

const ITEM_TYPES = {
  freeze: { name: 'Đóng Băng', effect: 'Tạm dừng đối thủ 5 giây', duration: 5000, emoji: '❄️' },
  steal: { name: 'Cướp Điểm', effect: 'Lấy 50 điểm từ đối thủ', duration: 0, emoji: '🕷️' },
  shield: { name: 'Khiên Bảo Vệ', effect: 'Tránh được 1 vết cắn Sói', duration: 0, emoji: '🛡️' },
  boost: { name: 'Tăng Tốc', effect: '+100% điểm lượt tiếp theo', duration: 6000, emoji: '⚡' },
};

const SOUND_FILES = {
  wolfAttack: '/sound_game/Wolf.mp3',
  gameOver: '/sound_game/game_over.mp3',
  winner: '/sound_game/winner.mp3',
  ambient: '/sound_game/playful.mp3',
};

const ROLE_CONFIG = [
  {
    id: 'truong-ban',
    name: 'Trưởng Bản',
    skill: 'Thêm 10% điểm khi cứu từ có nguy cơ trên 80.',
    scoreBoost: (risk, base) => (risk >= 80 ? Math.round(base * 0.1) : 0),
  },
  {
    id: 'tien-tri',
    name: 'Tiên Tri',
    skill: 'Nếu cứu đúng từ Sói truy đuổi, cộng thêm 80 điểm.',
    scoreBoost: () => 0,
  },
  {
    id: 'tho-san',
    name: 'Thợ Săn',
    skill: 'Combo không bị reset khi bấm Cho tôi gặp lại.',
    scoreBoost: () => 0,
  },
];

const getTitleByRankAndScore = (rank, score) => {
  if (rank === 1 || score >= 3500) return 'Hộ Vệ Ngôn Ngữ';
  if ((rank > 1 && rank <= 5) || score >= 1800) return 'Thủ Lĩnh Bản';
  return 'Người Gác Lửa';
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeVN = (value = '') => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const hashString = (value = '') => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return h;
};

const categoryScene = (category, chapter) => {
  const text = normalizeVN(`${category} ${chapter}`);
  if (text.includes('nha') || text.includes('cua') || text.includes('gian')) return 'không gian nhà sàn';
  if (text.includes('cong cu') || text.includes('cuoc') || text.includes('dao')) return 'lao động trên nương';
  if (text.includes('chan nuoi') || text.includes('vat nuoi')) return 'đời sống chăn nuôi';
  if (text.includes('trong trot') || text.includes('ruong') || text.includes('nong')) return 'mùa vụ canh tác';
  if (text.includes('le hoi') || text.includes('then') || text.includes('sli')) return 'nghi lễ và lễ hội';
  if (text.includes('gia dinh') || text.includes('than toc')) return 'quan hệ gia đình';
  return 'đời sống bản làng';
};

const generateStoryFromWord = (word, index) => {
  const seed = hashString(`${word.word}-${word.meaning}-${word.category}-${index}`);
  const opener = [
    'Nếu mất từ này, một mảnh ký ức cũng mất theo.',
    'Đây là từ đang mờ dần trong lời nói hằng ngày.',
    'Từ này từng xuất hiện dày đặc trong sinh hoạt cộng đồng.',
  ][seed % 3];

  const usageLead = [
    'Ví dụ dễ nhớ:',
    'Mẹo ghi nhớ nhanh:',
    'Tình huống thường gặp:',
  ][(seed >> 2) % 3];

  const scene = categoryScene(word.category, word.chapter);
  const meaning = word.meaning || 'khái niệm quan trọng';
  const tay = word.word || 'từ Tày';

  const usage = [
    `khi nhắc tới ${meaning.toLowerCase()}, người lớn sẽ dùng từ "${tay}" trước tiên trong ${scene}.`,
    `trong ${scene}, chỉ cần nghe "${tay}" là mọi người hiểu ngay đang nói về ${meaning.toLowerCase()}.`,
    `trẻ nhỏ học từ "${tay}" qua ngữ cảnh ${scene}, vì từ này gắn trực tiếp với ${meaning.toLowerCase()}.`,
  ][(seed >> 4) % 3];

  const preserve = [
    `Giữ được "${tay}" tức là giữ lại cách gọi ${meaning.toLowerCase()} bằng tiếng Tày gốc.`,
    `Mỗi lần bạn nhớ "${tay}", nguy cơ đứt mạch từ vựng về ${meaning.toLowerCase()} giảm đi một chút.`,
    `Càng nhiều người dùng "${tay}", cơ hội tồn tại của lớp từ chỉ ${meaning.toLowerCase()} càng cao.`,
  ][(seed >> 7) % 3];

  return `${opener} ${tay} nghĩa là "${meaning}". ${usageLead} ${usage} ${preserve}`;
};

const flattenDictionaryWords = () => {
  const result = [];
  dictionaryData.forEach((chapter) => {
    chapter.categories.forEach((category) => {
      (category.words || []).forEach((word) => {
        result.push({ ...word, category: category.title, chapter: chapter.title });
      });
      (category.subcategories || []).forEach((subcat) => {
        (subcat.words || []).forEach((word) => {
          result.push({ ...word, category: subcat.title, chapter: chapter.title });
        });
      });
    });
  });

  // SHUFFLE the result array to ensure words change every game session
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.slice(0, 35).map((word, index) => {
    const riskScore = RISK_PRESET[index % RISK_PRESET.length] ?? 30;
    const knownBy =
      riskScore > 85 ? 1 + (index % 5) :
      riskScore >= 50 ? 40 + ((index * 9) % 22) :
      55 + ((index * 13) % 146);

    const categoryLabel = word.category || 'Văn hóa Tày';
    const safeWord = (word.word || 'tu-tay').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();

    return {
      id: `tay-${index + 1}-${safeWord}`,
      tay: word.word,
      vi: word.meaning,
      example: `Khi nói về ${word.meaning.toLowerCase()}, người Tày thường dùng từ ${word.word}.`,
      category: categoryLabel,
      chapter: word.chapter,
      story: generateStoryFromWord(word, index),
      audio: word.audio || null,
      riskScore,
      knownBy,
    };
  });
};

const parseStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const getCurrentRisk = (word, communityCount) => {
  const rescuers = communityCount[word.id] || word.knownBy;
  return Math.max(0, word.riskScore - Math.floor(rescuers / 5));
};

const getRiskPalette = (risk) => {
  if (risk >= 80) return { color: '#ff2d2d', tone: 'red', border: 'rgba(255, 75, 75, 0.8)' };
  if (risk >= 50) return { color: '#ff7c2d', tone: 'orange', border: 'rgba(255, 161, 95, 0.8)' };
  if (risk >= 20) return { color: '#ffd700', tone: 'yellow', border: 'rgba(255, 223, 116, 0.8)' };
  return { color: '#22c55e', tone: 'green', border: 'rgba(82, 223, 130, 0.9)' };
};

const getPriorityWords = (words, learnedIds, communityCount) => {
  return words
    .filter((w) => !learnedIds.includes(w.id))
    .sort((a, b) => getCurrentRisk(b, communityCount) - getCurrentRisk(a, communityCount));
};

const saveLearnedWords = (learnedWords) => {
  localStorage.setItem(STORAGE_KEYS.learned, JSON.stringify(learnedWords));
};

const saveCommunityCount = (communityCount) => {
  localStorage.setItem(STORAGE_KEYS.community, JSON.stringify(communityCount));
};

// (Real-time team sync is now handled by Firebase – see MultiplayerRoom.js)

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

const AnimatedCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const from = previousValueRef.current;
    const to = value;
    const start = performance.now();
    const duration = 800;
    previousValueRef.current = to;

    let frameId = null;
    const tick = (time) => {
      const progress = clamp((time - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + (to - from) * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value]);

  return <>{displayValue}</>;
};

const SuccessBurstCanvas = ({ active }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let rafId = null;

    const particles = Array.from({ length: 80 }).map(() => ({
      x: 0.5,
      y: 0.5,
      vx: (Math.random() - 0.5) * 0.03,
      vy: (Math.random() - 0.5) * 0.03,
      radius: 1.2 + Math.random() * 2.8,
      alpha: 0.7 + Math.random() * 0.3,
      life: 50 + Math.random() * 42,
    }));

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.992;
        particle.vy *= 0.992;
        particle.alpha *= 0.975;
        particle.life -= 1;

        if (particle.life <= 0 || particle.alpha <= 0.02) return;

        const x = particle.x * canvas.width;
        const y = particle.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(57, 255, 110, ${particle.alpha})`;
        ctx.fill();
      });
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="canvas-burst" />;
};

const TutorialCoach = ({ active, step, onSkip }) => {
  if (!active) return null;

  const steps = [
    'Bước 1/4: Hãy chạm vào một ngọn lửa đỏ để chọn từ nguy cấp bạn muốn cứu trước.',
    'Bước 2/4: Tuyệt vời. Bấm "Bắt đầu giải cứu" để vào phiên học.',
    'Bước 3/4: Hãy nhập nghĩa tiếng Việt của từ vào ô trống và nhấn Enter.',
    'Bước 4/4: Nếu trả lời đúng, bạn sẽ cứu được từ đó và nhận điểm thưởng!',
  ];

  return (
    <motion.div
      className="tutorial-coach"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <p>{steps[step] || steps[steps.length - 1]}</p>
      <button onClick={onSkip}>Bỏ qua hướng dẫn</button>
    </motion.div>
  );
};

const WolfStrikePopup = ({ event }) => {
  if (!event) return null;

  const isStrike = event.type === 'strike';

  return (
    <motion.div
      className="wolf-strike-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="wolf-strike-popup"
        initial={{ scale: 0.8, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 10, opacity: 0 }}
      >
        <p className="strike-kicker">{isStrike ? 'Sói ngôn ngữ tấn công' : 'Sói đã xuất hiện'}</p>
        <h3>{isStrike ? `"${event.word?.tay}" vừa bị cắn` : `Mục tiêu bị săn: "${event.word?.tay}"`}</h3>
        <p>
          {isStrike
            ? 'Từ này mất bớt người biết. Bạn cần phản công ở lượt tiếp theo để giữ bản làng an toàn.'
            : `Trong ${event.turnsLeft || 2} lượt tới, nếu không cứu được từ này, Sói sẽ cắn và làm suy yếu kho từ.`}
        </p>
      </motion.div>
    </motion.div>
  );
};

// Item notification toast
const ItemToast = ({ message, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="item-toast"
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.95 }}
    >
      {message}
    </motion.div>
  );
};

const ItemInventory = ({ inventory, onUseItem, isFrozen, shieldActive }) => {
  const itemList = Object.entries(inventory).filter(([_, count]) => count > 0);

  if (itemList.length === 0) return null;

  return (
    <div className="item-inventory">
      <p className="item-label">Vật phẩm:</p>
      <div className="item-list">
        {itemList.map(([itemKey, count]) => {
          const item = ITEM_TYPES[itemKey];
          const isShieldActive = itemKey === 'shield' && shieldActive;
          return (
            <button
              key={itemKey}
              className={`item-button ${isShieldActive ? 'item-shield-on' : ''}`}
              onClick={() => onUseItem(itemKey)}
              title={item.effect}
              disabled={isFrozen}
            >
              <span className="item-emoji">{item.emoji}</span>
              <span className="item-name">{item.name}</span>
              <span className="item-count">×{count}</span>
            </button>
          );
        })}
      </div>
      {isFrozen && <p className="item-frozen-msg">❄️ Bị đóng băng!</p>}
    </div>
  );
};

// eslint-disable-next-line no-unused-vars
const ItemMiniGame = ({ item, onComplete, onCancel }) => {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (taps >= 5) {
            setCompleted(true);
            setTimeout(() => onComplete(true), 600);
          } else {
            onComplete(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [taps, onComplete]);

  const handleTap = () => {
    if (taps < 5 && timeLeft > 0) {
      setTaps(taps + 1);
      if (taps + 1 >= 5) {
        setCompleted(true);
        clearInterval(timerRef.current);
        setTimeout(() => onComplete(true), 300);
      }
    }
  };

  return (
    <motion.div
      className="item-minigame-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="item-minigame-modal"
        initial={{ y: 30, scale: 0.9, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: -10, scale: 0.95, opacity: 0 }}
      >
        <p className="minigame-kicker">Kích hoạt {item.name}</p>
        <p className="minigame-instruction">Bấm nhanh 5 lần trong {timeLeft}s</p>

        <div className="minigame-tap-zone" onClick={handleTap}>
          <motion.div
            className="minigame-taps"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            key={taps}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`minigame-tap-dot ${i < taps ? 'filled' : ''}`}
              />
            ))}
          </motion.div>
          <p className="minigame-counter">{taps}/5</p>
        </div>

        {completed && (
          <motion.p
            className="minigame-success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ✅ Kích hoạt thành công!
          </motion.p>
        )}

        <button className="minigame-cancel" onClick={onCancel}>
          Hủy
        </button>
      </motion.div>
    </motion.div>
  );
};

const MissionHud = ({
  rescued,
  score,
  streak,
  maxStreak,
  soundEnabled,
  onToggleSound,
  wolfStatus,
  role,
  wolfStrikes,
  playerTitle,
  playerTeam,
  shieldActive,
  boostActivated,
}) => {
  return (
    <div className="mission-hud">
      <div className="mission-hud-left">
        <p className="mission-label">Nhiệm vụ đêm nay</p>
        <p className="mission-value">Giải cứu {rescued}/{SESSION_GOAL} từ trước {WOLF_STRIKE_LIMIT} vết cắn của Sói</p>
        {role && <p className="mission-role">🎭 {role.name}: {role.skill}</p>}
        {playerTitle && <p className="mission-title">🏆 {playerTitle}</p>}
        {playerTeam && <p className="mission-team">⚔️ {playerTeam}</p>}
        {wolfStatus && <p className="wolf-status">{wolfStatus}</p>}
      </div>
      <div className="mission-hud-right">
        <p className="hud-score">💎 <AnimatedCounter value={score} /></p>
        <p className="hud-streak">🔥 {streak} <span className="hud-streak-max">/{maxStreak}</span></p>
        <p className="hud-strike">🐺 {wolfStrikes}/{WOLF_STRIKE_LIMIT}</p>
        {shieldActive && <p className="hud-shield">🛡️ Khiên</p>}
        {boostActivated && <p className="hud-boost">⚡ x2</p>}
        <button className="sound-toggle" onClick={onToggleSound}>
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
  );
};

// ── Leaderboard with team tabs ──
const LeaderboardPanel = ({ rows, playerName, teamBoard, playerTeam }) => {
  const [tab, setTab] = useState('individual');

  const teamColors = {
    'Đội Trăng': '#a78bfa',
    'Đội Lửa': '#f97316',
    'Đội Then': '#22d3ee',
  };

  return (
    <div className="leaderboard-box">
      <div className="leaderboard-head">
        <div className="lb-tabs">
          <button
            className={`lb-tab ${tab === 'individual' ? 'active' : ''}`}
            onClick={() => setTab('individual')}
          >
            Cá nhân
          </button>
          <button
            className={`lb-tab ${tab === 'team' ? 'active' : ''}`}
            onClick={() => setTab('team')}
          >
            Phe
          </button>
        </div>
      </div>

      <div className="leaderboard-list">
        {tab === 'individual' && (
          <>
            {rows.length === 0 && <p className="leaderboard-empty">Chưa có điểm nào được ghi nhận.</p>}
            {rows.map((row, index) => (
              <div
                key={`${row.name}-${row.score}-${row.time}`}
                className={`leaderboard-row ${row.name === playerName ? 'me' : ''}`}
              >
                <span className="lb-rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <div className="lb-info">
                  <strong>{row.name}</strong>
                  <em className="lb-title">{row.title || 'Người Gác Lửa'}</em>
                  {row.team && (
                    <span className="lb-team-badge" style={{ color: teamColors[row.team] || '#ccc' }}>
                      {row.team}
                    </span>
                  )}
                </div>
                <span className="lb-score">{row.score} đ</span>
              </div>
            ))}
          </>
        )}

        {tab === 'team' && (
          <>
            {teamBoard.length === 0 && <p className="leaderboard-empty">Chưa có dữ liệu phe.</p>}
            {teamBoard.map((row, index) => (
              <div
                key={row.team}
                className={`leaderboard-row team-row ${row.team === playerTeam ? 'me' : ''}`}
              >
                <span className="lb-rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <div className="lb-info">
                  <strong style={{ color: teamColors[row.team] || '#fff' }}>{row.team}</strong>
                  <em className="lb-members">{row.members || 0} thành viên</em>
                </div>
                <div className="lb-team-score-col">
                  <span className="lb-score">{row.score} đ</span>
                  {row.team === playerTeam && <span className="lb-my-team">← Phe bạn</span>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const MissionBriefing = ({ team }) => {
  return (
    <div className="mission-briefing">
      <p className="mission-briefing-title">Mục đích trận đấu</p>
      <p>Bạn đang thuộc {team}. Cả phe phải giữ kho từ không bị Sói cắn quá 3 lần.</p>
      <p>Thắng trận: +250 điểm chiến dịch, tăng danh hiệu, và cộng điểm vào BXH phe.</p>
    </div>
  );
};

const HomeScreen = ({
  words,
  communityCount,
  onStart,
  onNodePick,
  score,
  streak,
  maxStreak,
  soundEnabled,
  onToggleSound,
  sessionRescued,
  leaderboard,
  playerName,
  onPlayerNameChange,
  wolfStatus,
  role,
  wolfStrikes,
  playerTitle,
  themeMode,
  playerTeam,
  onPlayerTeamChange,
  teamBoard,
  multiplayer,
}) => {
  const [typed, setTyped] = useState('');
  const [tooltipWord, setTooltipWord] = useState(null);
  const [selectedWordId, setSelectedWordId] = useState(null);
  const [showRules, setShowRules] = useState(() => {
    return localStorage.getItem('flashcard.hasSeenRules') !== 'true';
  });

  const closeRules = () => {
    localStorage.setItem('flashcard.hasSeenRules', 'true');
    setShowRules(false);
  };

  const title = 'Kho báu bí ẩn cần đánh thức';

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setTyped(title.slice(0, index + 1));
      index += 1;
      if (index >= title.length) clearInterval(timer);
    }, 38);
    return () => clearInterval(timer);
  }, []);

  const enriched = words.map((word) => ({ ...word, currentRisk: getCurrentRisk(word, communityCount) }));
  const rescuedCount = enriched.filter((w) => w.currentRisk <= 19).length;
  const urgentCount = enriched.filter((w) => w.currentRisk > 70).length;

  return (
    <div className={`flashcard-root ${themeMode === 'night' ? 'mode-night' : 'mode-day'}`}>
      <div className="flashcard-topbar">
        <div className="flashcard-shell py-3 space-y-2">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/70">Cộng đồng đã giải cứu {rescuedCount}/{words.length} từ</p>
          <div className="flashcard-progress-track">
            <motion.div
              className="flashcard-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(rescuedCount / words.length) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="flashcard-shell">
        <MissionHud
          rescued={sessionRescued}
          score={score}
          streak={streak}
          maxStreak={maxStreak}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          wolfStatus={wolfStatus}
          role={role}
          wolfStrikes={wolfStrikes}
          playerTitle={playerTitle}
          playerTeam={playerTeam}
        />

        <MissionBriefing team={playerTeam} />

        <div className="identity-row">
          <div className="identity-field">
            <label htmlFor="player-name">Tên người chơi</label>
            <input
              id="player-name"
              value={playerName}
              onChange={(event) => onPlayerNameChange(event.target.value)}
              maxLength={24}
              placeholder="Nhập biệt danh để lên BXH"
            />
          </div>
          <div className="identity-field">
            <label htmlFor="team-name">Chọn phe</label>
            <select id="team-name" value={playerTeam} onChange={(event) => onPlayerTeamChange(event.target.value)}>
              {TEAM_OPTIONS.map((team) => <option key={team} value={team}>{team}</option>)}
            </select>
          </div>
        </div>

        <header className="pt-4 pb-4">
          <h1 className="typewriter text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight">
            {typed}<span className="opacity-55">|</span>
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/60 max-w-2xl">
            Bạn không chỉ học từ. Bạn đang tham gia một chiến dịch cứu ngôn ngữ: mỗi lượt đúng sẽ kéo một từ ra khỏi vùng tuyệt chủng.
          </p>
        </header>

        <LeaderboardPanel
          rows={leaderboard}
          playerName={playerName}
          teamBoard={teamBoard}
          playerTeam={playerTeam}
        />

        <section className="relative mt-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,122,77,0.08),transparent_45%)]" />
          </div>

          <div className="forest-grid">
            {enriched.map((word, index) => {
              const palette = getRiskPalette(word.currentRisk);
              const position = ORGANIC_POSITIONS[index] || { x: (index % 5) * 20 + 10, y: Math.floor(index / 5) * 24 + 10 };
              const size = clamp(100 - word.currentRisk * 0.55, 38, 92);

              return (
                <motion.button
                  key={word.id}
                  className={`word-node word-node-${palette.tone}`}
                  style={{
                    background: `radial-gradient(circle at 28% 30%, rgba(255,255,255,0.25), ${palette.color})`,
                    borderColor: palette.border,
                    '--node-size': `${size}px`,
                    position: 'absolute',
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseEnter={() => setTooltipWord(word)}
                  onMouseLeave={() => setTooltipWord(null)}
                  onFocus={() => setTooltipWord(word)}
                  onBlur={() => setTooltipWord(null)}
                  onClick={() => {
                    setSelectedWordId(word.id);
                    onNodePick();
                  }}
                  whileHover={{ scale: 1.08 }}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3 + (index % 3), repeat: Infinity, ease: 'easeInOut' }}
                >
                  {(palette.tone === 'red' || palette.tone === 'orange') && <span className="node-flame" aria-hidden="true" />}
                  <span className="word-node-label">{word.tay}</span>
                  {palette.tone === 'red' && (
                    <>
                      <span className="ash-particle" style={{ '--x-shift': '-8px', animationDelay: '0s' }} />
                      <span className="ash-particle" style={{ '--x-shift': '6px', animationDelay: '0.9s' }} />
                      <span className="ash-particle" style={{ '--x-shift': '2px', animationDelay: '1.5s' }} />
                    </>
                  )}
                </motion.button>
              );
            })}

            <AnimatePresence>
              {tooltipWord && (
                <motion.div
                  className="word-tooltip"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  style={{ top: '8px', right: '8px' }}
                >
                  <p className="text-xs text-white font-semibold">{tooltipWord.tay}</p>
                  <p className="text-xs text-orange-300 mt-1">{tooltipWord.vi}</p>
                  <p className="text-[11px] text-white/60 mt-2">{communityCount[tooltipWord.id] || tooltipWord.knownBy} người biết từ này</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {selectedWordId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-left">
            {(() => {
              const selectedWord = enriched.find((w) => w.id === selectedWordId);
              if (!selectedWord) return null;
              return (
                <div className="selected-word-row">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/55">Ưu tiên đã chọn</p>
                    <p className="font-bold text-lg mt-1">{selectedWord.tay} - {selectedWord.vi}</p>
                    <p className="text-xs text-white/65 mt-1">Nguy cơ hiện tại: {selectedWord.currentRisk}/100</p>
                  </div>
                  <button className="rescue-btn" onClick={() => onStart(selectedWordId)}>
                    Giải cứu ngay →
                  </button>
                </div>
              );
            })()}
          </motion.div>
        )}

        <div className="mt-6 mb-2">
          <RoomPanel
            multiplayer={multiplayer}
            playerName={playerName}
            playerTeam={playerTeam}
            onStartGame={() => {
              const seed = selectedWordId || null;
              if (multiplayer.roomCode) {
                multiplayer.triggerStartGame(seed);
              } else {
                onStart(seed);
              }
            }}
          />
        </div>

        <section className="home-cta-row">
          <motion.button
            className="flashcard-cta"
            whileHover={{ scale: 1.03 }}
            animate={{ boxShadow: ['0 12px 35px rgba(255,60,20,0.28)', '0 18px 42px rgba(255,90,30,0.45)', '0 12px 35px rgba(255,60,20,0.28)'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            onClick={() => setShowRules(true)}
          >
            🎮 Bắt đầu giải cứu
          </motion.button>
          <button className="rules-trigger" onClick={() => setShowRules(true)}>📜 Xem luật chơi</button>
          <p className="urgent-count">Hôm nay có {urgentCount} từ cần bạn giải cứu khẩn cấp</p>
        </section>
      </div>

      <AnimatePresence>
        {showRules && (
          <motion.div
            className="rules-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) closeRules(); }}
          >
            <motion.div
              className="rules-modal"
              initial={{ y: 22, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.98 }}
            >
              <div className="rules-header">
                <div>
                  <p className="rules-kicker">Hướng dẫn chơi dễ hiểu</p>
                  <h3>Bảo Vệ Kho Tàng Tiếng Tày</h3>
                </div>
                <button className="rules-close-x" onClick={closeRules}>✕</button>
              </div>

              <div className="rules-body">
                <div className="rules-section">
                  <p className="rules-subtitle">🎯 1. Nhiệm vụ của bạn (Mục Tiêu)</p>
                  <p>Chào mừng đến Bản Làng! Những từ ngữ tiếng Tày đang dần bị lãng quên. Nhiệm vụ của bạn là giải cứu <strong>ít nhất 8 từ</strong> trước khi con Sói Ngôn Ngữ kịp cắn hỏng kho từ 3 lần.</p>
                </div>

                <div className="rules-section">
                  <p className="rules-subtitle">🚀 2. Bắt đầu như thế nào?</p>
                  <p>Ở màn hình chính, bạn hãy:</p>
                  <p className="rules-indent">• <strong>Nhập tên</strong> và <strong>Chọn Đội</strong> (Phe) để cùng bạn bè đua điểm.</p>
                  <p className="rules-indent">• Chạm vào một <strong>ngọn lửa sáng</strong> trên cây để ưu tiên cứu từ đó trước.</p>
                  <p className="rules-indent">• Hoặc bấm ngay nút <strong>🎮 Bắt đầu giải cứu</strong> để vào chơi luôn!</p>
                </div>

                <div className="rules-section">
                  <p className="rules-subtitle">🃏 3. Cách chơi từng lượt (Rất dễ!)</p>
                  <p>Mỗi lượt, một thẻ từ tiếng Tày sẽ hiện ra trên màn hình:</p>
                  <p>① Hãy <strong>nhập nghĩa tiếng Việt</strong> của từ đó vào ô trống.</p>
                  <p>② Bấm Enter hoặc nút "Kiểm tra" để xem kết quả.</p>
                  <p className="rules-indent">✅ <strong>Nhập đúng</strong>: Bạn nhận được điểm, tăng chuỗi Combo và từ đó được giải cứu an toàn.</p>
                  <p className="rules-indent">❌ <strong>Nhập sai</strong>: Bạn bị trừ 10 điểm. Nếu nhập sai trúng từ mà Sói đang săn, bạn sẽ bị cắn!</p>
                </div>

                <div className="rules-section">
                  <p className="rules-subtitle">🐺 4. Luật quan trọng (Hãy cẩn thận Sói!)</p>
                  <p>Sói rất ranh ma! Lâu lâu, Sói sẽ <strong>nhắm vào một từ cụ thể</strong> (màn hình sẽ có cảnh báo nháy đỏ).</p>
                  <p>Bạn có <strong>2 lượt</strong> để nhập đúng từ đó để đánh đuổi Sói, nếu không:</p>
                  <p className="rules-indent">• Sói sẽ cắn 1 nhát! Bạn mất 35 điểm và mất luôn chuỗi Combo điểm thưởng.</p>
                  <p className="rules-indent">• Nếu Sói cắn đủ 3 lần, bạn sẽ THUA.</p>
                </div>

                <div className="rules-section">
                  <p className="rules-subtitle">⚔️ 5. Chế độ nhiều người & Vật phẩm</p>
                  <p>Khi chơi thi đấu, thỉnh thoảng bạn sẽ nhận được Vật Phẩm xịn xò để dùng:</p>
                  <p className="rules-indent">❄️ <strong>Đóng Băng</strong>: Làm đối thủ bị "đứng hình" không bấm được trong 5 giây!</p>
                  <p className="rules-indent">🕷️ <strong>Cướp Điểm</strong>: Lén lấy 50 điểm của một người chơi khác.</p>
                  <p className="rules-indent">🛡️ <strong>Khiên Bảo Vệ</strong>: Giúp bạn chặn được 1 lần Sói cắn. Rất quý giá!</p>
                  <p className="rules-indent">⚡ <strong>Tăng Tốc</strong>: Lượt tiếp theo điểm sẽ được nhân đôi.</p>
                </div>

                <div className="rules-section">
                  <p className="rules-subtitle">🏁 6. Kết thúc game</p>
                  <p>🏆 <strong>CHIẾN THẮNG</strong>: Bạn cứu đủ 8 từ trước khi Sói cắn 3 lần. Nhận ngay điểm khủng (+250) và vinh danh Đội của bạn!</p>
                  <p>💀 <strong>THẤT BẠI</strong>: Bị Sói cắn đủ 3 lần. Đừng lo, bạn vẫn nhận được điểm nỗ lực để thử lại vào ván sau!</p>
                </div>
              </div>

              <div className="rules-actions">
                <button className="rules-start" onClick={() => { closeRules(); onStart(selectedWordId); }}>
                  🚀 Đã hiểu, bắt đầu ngay
                </button>
                <button className="rules-close" onClick={closeRules}>
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StudyScreen = ({
  word,
  communityCount,
  sessionLearnedCount,
  onKeep,
  onUnknown,
  step,
  score,
  streak,
  maxStreak,
  soundEnabled,
  onToggleSound,
  wolfStatus,
  role,
  wolfStrikes,
  playerTitle,
  playerTeam,
  themeMode,
  playerInventory,
  onUseItem,
  isFrozen,
  shieldActive,
  boostActivated,
  roomPlayers,
  myPid,
  allWords = [], // Pool to pick distractors from
  onScoreChange, // Callback to deduct points for hints
}) => {
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // 'correct', 'wrong'
  const [showAnswer, setShowAnswer] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [mcOptions, setMcOptions] = useState([]);
  const [hintActive, setHintActive] = useState(false);
  const audioRef = useRef(null);
  const inputRef = useRef(null);

  // Generate 4 multiple choice options (1 correct, 3 random)
  const generateOptions = useCallback(() => {
    if (!word || !allWords.length) return [];
    const correct = word.vi;
    const others = allWords
      .filter((w) => w.vi !== correct)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map((w) => w.vi);
    return [correct, ...others].sort(() => 0.5 - Math.random());
  }, [word, allWords]);

  useEffect(() => {
    setUserInput('');
    setFeedback(null);
    setShowAnswer(false);
    setWrongAttempts(0);
    setMcOptions([]);
    setHintActive(false);
    if (inputRef.current) inputRef.current.focus();
  }, [word?.id]);

  useEffect(() => {
    if (wrongAttempts === 1 && mcOptions.length === 0) {
      setMcOptions(generateOptions());
    }
  }, [wrongAttempts, mcOptions.length, generateOptions]);

  if (!word) return null;

  const currentRisk = getCurrentRisk(word, communityCount);
  const palette = getRiskPalette(currentRisk);
  const badge = currentRisk > 80 ? '⚠ NGUY CẤP' : currentRisk >= 50 ? 'CẦN BẢO VỆ' : 'ỔN ĐỊNH HƠN';

  const normalizeForCheck = (val) => normalizeVN(val).toLowerCase().trim().replace(/\s+/g, ' ');

  const handleCheck = (e, manualValue = null) => {
    if (e) e.preventDefault();
    if (isFrozen || feedback) return;

    const valToCheck = manualValue !== null ? manualValue : userInput;
    const correctAns = normalizeForCheck(word.vi);
    const playerAns = normalizeForCheck(valToCheck);

    if (playerAns === correctAns) {
      setFeedback('correct');
      setTimeout(onKeep, 1200);
    } else {
      setWrongAttempts((prev) => prev + 1);
      setFeedback('wrong');
      
      // If failed twice, show answer and move on
      if (wrongAttempts >= 1) {
        setShowAnswer(true);
        setTimeout(onUnknown, 2500);
      } else {
        // Clear feedback after a bit to let them try again or use MC
        setTimeout(() => setFeedback(null), 1500);
      }
    }
  };

  const useHint = () => {
    if (hintActive || feedback || isFrozen) return;
    setHintActive(true);
    // Reveal first character
    const firstChar = word.vi.trim().charAt(0);
    setUserInput(firstChar);
    if (onScoreChange) onScoreChange(-5); // Hint cost
    if (inputRef.current) inputRef.current.focus();
  };

  const playAudio = () => {
    if (!word.audio) return;
    const nfcFilename = word.audio.normalize('NFC');
    const nfdFilename = word.audio.normalize('NFD');
    const path = `${process.env.PUBLIC_URL || ''}/audio/${encodeURIComponent(nfcFilename)}`;
    const launch = (audioPath, fallbackPath = null) => {
      const audio = new Audio(audioPath);
      audioRef.current = audio;
      audio.onerror = () => { if (fallbackPath) launch(fallbackPath); };
      audio.play().catch(() => {});
    };
    const fallbackPath = nfcFilename !== nfdFilename
      ? `${process.env.PUBLIC_URL || ''}/audio/${encodeURIComponent(nfdFilename)}`
      : null;
    launch(path, fallbackPath);
  };

  return (
    <div className={`flashcard-root ${themeMode === 'night' ? 'mode-night' : 'mode-day'}`}>
      <div className="flashcard-topbar">
        <div className="flashcard-shell py-3 space-y-2">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/70">Sứ mệnh giải cứu</p>
          <div className="flashcard-progress-track">
            <motion.div
              className="flashcard-progress-fill"
              animate={{ width: `${Math.min(100, (sessionLearnedCount / SESSION_GOAL) * 100)}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-white/60">Đã giữ {sessionLearnedCount}/{SESSION_GOAL} từ | Lượt {step}/{SESSION_MAX_STEPS}</p>
        </div>
      </div>

      <div className="flashcard-shell py-4 md:py-8">
        <MissionHud
          rescued={sessionLearnedCount}
          score={score}
          streak={streak}
          maxStreak={maxStreak}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          wolfStatus={wolfStatus}
          role={role}
          wolfStrikes={wolfStrikes}
          playerTitle={playerTitle}
          playerTeam={playerTeam}
          shieldActive={shieldActive}
          boostActivated={boostActivated}
        />

        <ItemInventory
          inventory={playerInventory}
          onUseItem={onUseItem}
          isFrozen={isFrozen}
          shieldActive={shieldActive}
        />

        <LivePlayersPanel roomPlayers={roomPlayers} myPid={myPid} />

        <AnimatePresence mode="wait">
          <motion.div
            key={word.id}
            className="study-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <div
              className={`study-card ${feedback}`}
              style={{ border: `1px solid ${palette.border}` }}
            >
              <div className="study-card-header">
                <span className="badge">{badge}</span>
                <span className="step-tag">Bước {step}</span>
              </div>

              <div className="study-card-body">
                <p className="risk-hint">Đừng để từ này mất đi! Chỉ còn {communityCount[word.id] || word.knownBy} người nhớ.</p>
                <h2 className="word-tay">{word.tay}</h2>
                
                <form className="input-group" onSubmit={handleCheck}>
                  <p className="input-label">Nghĩa tiếng Việt là gì?</p>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      className="meaning-input"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Gõ nghĩa của từ..."
                      disabled={isFrozen || !!feedback}
                      autoFocus
                    />
                    {!feedback && !hintActive && !isFrozen && (
                      <button type="button" className="hint-trigger" onClick={useHint} title="Dùng 5 điểm để xem gợi ý">
                        💡 Gợi ý
                      </button>
                    )}
                  </div>
                  
                  {!feedback && (
                    <div className="flex gap-2 mt-3">
                      <button type="submit" className="check-btn flex-1" disabled={!userInput.trim()}>
                        Kiểm tra
                      </button>
                    </div>
                  )}
                </form>

                {/* Multiple Choice Fallback */}
                <AnimatePresence>
                  {wrongAttempts > 0 && !feedback && !showAnswer && (
                    <motion.div 
                      className="mc-options-grid mt-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="text-[11px] uppercase tracking-widest text-white/40 mb-3 text-center">Hoặc chọn đáp án đúng bên dưới:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {mcOptions.map((opt, i) => (
                          <button 
                            key={i} 
                            className="mc-opt-btn"
                            onClick={() => {
                              setUserInput(opt);
                              handleCheck(null, opt);
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {feedback === 'correct' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="feedback-msg correct">
                    ✨ Tuyệt vời! Bạn là Hộ vệ của từ này.
                  </motion.div>
                )}
                {feedback === 'wrong' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="feedback-msg wrong">
                    {wrongAttempts === 1 ? '❌ Thử lại nhé, hoặc dùng trắc nghiệm bên dưới!' : '❌ Vẫn chưa đúng rồi...'}
                  </motion.div>
                )}
              </div>

              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    className="answer-reveal"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                  >
                    <div className="answer-content">
                      <div className="h-px bg-white/10 my-4" />
                      <p className="ans-label">Đáp án đúng để cứu từ:</p>
                      <h3 className="ans-value">{word.vi}</h3>
                      <p className="ans-story">{word.story}</p>
                      {word.audio && (
                        <button className="audio-mini-btn" onClick={playAudio}>🔊 Nghe âm thanh</button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const SuccessScreen = ({ word, newCommunityCount, score, streak }) => {
  return (
    <div className="flashcard-root relative overflow-hidden">
      <SuccessBurstCanvas active />
      <div className="flashcard-shell min-h-screen flex flex-col items-center justify-center text-center relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6"
        >
          <span className="text-6xl">🌟</span>
        </motion.div>
        
        <motion.h2 className="text-2xl md:text-5xl font-black leading-tight" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          Giải cứu thành công: '{word.tay}'
        </motion.h2>
        <p className="mt-2 text-xl text-emerald-300 font-bold">Nghĩa là: {word.vi}</p>
        
        <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 max-w-xl">
          <p className="text-white/80 italic leading-relaxed">"{word.story}"</p>
        </div>

        <p className="mt-6 text-white/70 text-sm md:text-base">
          Bạn là người thứ <AnimatedCounter value={newCommunityCount} /> bảo vệ từ này khỏi sự quên lãng.
        </p>
        
        <div className="mt-4 flex gap-4 justify-center">
          <div className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            + {score} Điểm
          </div>
          <div className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30">
            Combo: {streak}
          </div>
        </div>

        <motion.div className="mt-10" initial={{ scale: 0.4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
          <span className="stamp-badge">Hộ Vệ Bản Làng</span>
        </motion.div>
      </div>
    </div>
  );
};

const SessionEndScreen = ({
  words,
  communityCount,
  sessionSavedIds,
  onContinue,
  onHome,
  score,
  maxStreak,
  leaderboard,
  playerName,
  playerRank,
  role,
  wolfStrikes,
  outcome,
  playerTitle,
  playerTeam,
  playerTeamRank,
  teamBoard,
}) => {
  const rescuedToday = sessionSavedIds.length;
  const impactedRows = sessionSavedIds
    .map((id) => {
      const word = words.find((item) => item.id === id);
      if (!word) return null;
      const afterCount = communityCount[word.id] || word.knownBy;
      const beforeCount = Math.max(word.knownBy, afterCount - 1);
      const beforeRisk = Math.max(0, word.riskScore - Math.floor(beforeCount / 5));
      const afterRisk = Math.max(0, word.riskScore - Math.floor(afterCount / 5));
      return { word, beforeRisk, afterRisk, delta: beforeRisk - afterRisk };
    })
    .filter(Boolean)
    .sort((a, b) => b.delta - a.delta);

  const nextTargets = words
    .map((word) => ({ ...word, currentRisk: getCurrentRisk(word, communityCount) }))
    .filter((word) => !sessionSavedIds.includes(word.id))
    .sort((a, b) => b.currentRisk - a.currentRisk)
    .slice(0, 3);

  const missionReward = (outcome === 'win' ? 250 : 80) + maxStreak * 15;
  const topTeam = teamBoard[0] || null;

  return (
    <div className="flashcard-root">
      <div className="flashcard-shell py-8 md:py-14">
        <div className="end-outcome-banner">
          {outcome === 'win' ? (
            <motion.div
              className="outcome-win"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <span className="outcome-icon">🏆</span>
              <div>
                <h2>Bản làng qua đêm an toàn!</h2>
                <p>Nhờ bạn, {rescuedToday} từ tiếng Tày được giữ lại cho thế hệ sau.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="outcome-lose"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <span className="outcome-icon">💀</span>
              <div>
                <h2>Đêm Sói đã xuyên thủng phòng tuyến</h2>
                <p>Bạn đã giữ được {rescuedToday} từ, nhưng Sói ngôn ngữ đã cắn {wolfStrikes} lần. Hãy quay lại đêm sau!</p>
              </div>
            </motion.div>
          )}
        </div>

        {role && <p className="mt-2 text-sm text-orange-300">🎭 Vai trò vừa chơi: {role.name}</p>}

        <div className="session-metrics mt-4">
          <span>💎 {score} điểm</span>
          <span>🔥 Combo cao nhất: {maxStreak}</span>
          <span>📚 Đã cứu: {rescuedToday} từ</span>
          <span>🏅 Hạng: {playerRank > 0 ? `#${playerRank}` : 'Chưa xếp hạng'}</span>
          <span>🐺 Sói cắn: {wolfStrikes}/{WOLF_STRIKE_LIMIT}</span>
          <span>🏆 {playerTitle}</span>
          <span>⚔️ {playerTeam} {playerTeamRank > 0 ? `(Top #${playerTeamRank})` : ''}</span>
          <span>🎖️ +{missionReward} điểm chiến dịch</span>
        </div>

        <div className="reward-box mt-4">
          <p className="summary-kicker">Bạn nhận được gì</p>
          <p>{outcome === 'win' ? 'Bạn đã chặn Sói thành công trong đêm này.' : 'Bạn đã giữ một phần kho từ và vẫn có thưởng nỗ lực.'}</p>
          <p>+{missionReward} điểm chiến dịch cho hồ sơ cá nhân.</p>
          <p>{topTeam ? `Phe dẫn đầu hiện tại: ${topTeam.team} (${topTeam.score} điểm)` : 'Chưa có phe nào ghi điểm.'}</p>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessionSavedIds.map((id) => {
            const word = words.find((item) => item.id === id);
            if (!word) return null;

            return (
              <div key={id} className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">Đã giải cứu</p>
                <p className="text-xl font-bold mt-2">{word.tay}</p>
                <p className="text-white/65 mt-1 text-sm">{word.vi}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-white/10 p-4 md:p-5 bg-white/[0.03] grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/60 mb-4">Bản đồ tác động phiên học</p>
            <div className="mini-forest">
              {words.map((word) => {
                const risk = getCurrentRisk(word, communityCount);
                const palette = getRiskPalette(risk);
                const isSaved = sessionSavedIds.includes(word.id);
                return (
                  <div key={word.id} className="mini-node" title={`${word.tay} - ${word.vi}`}>
                    <span style={{ background: palette.color, opacity: isSaved ? 1 : 0.46 }} />
                    <small>{word.tay.slice(0, 2)}</small>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-white/65 mt-3">Ô sáng hơn là những từ bạn vừa giữ. Ô đỏ đậm là mục tiêu cần ưu tiên ở phiên kế tiếp.</p>

            <div className="next-targets mt-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/55">Gợi ý 3 từ cần cứu tiếp</p>
              {nextTargets.map((target) => (
                <div key={target.id} className="target-row">
                  <span>{target.tay} - {target.vi}</span>
                  <strong>{target.currentRisk}/100</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/60">Mức giảm nguy cơ</p>
            {impactedRows.length === 0 && <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-white/65">Phiên này chưa có từ nào được giữ.</div>}
            {impactedRows.map((row) => (
              <div key={row.word.id} className="impact-row">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-semibold">{row.word.tay}</p>
                  <p className="text-emerald-300">-{row.delta}</p>
                </div>
                <div className="impact-track mt-2">
                  <div className="impact-before" style={{ width: `${row.beforeRisk}%` }} />
                  <div className="impact-after" style={{ width: `${row.afterRisk}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button onClick={() => onContinue()} className="end-btn-primary">🔄 Tiếp tục giải cứu</button>
          <button onClick={onHome} className="end-btn-secondary">🏠 Về trang chủ</button>
        </div>

        <div className="mt-6">
          <LeaderboardPanel
            rows={leaderboard}
            playerName={playerName}
            teamBoard={teamBoard}
            playerTeam={playerTeam}
          />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// Main component
// ─────────────────────────────────────────
const FlashcardRescue = ({ onExit }) => {
  const words = useMemo(() => flattenDictionaryWords(), []);
  const [communityCount, setCommunityCount] = useState({});
  const [learnedWords, setLearnedWords] = useState([]);

  const [screen, setScreen] = useState('home');
  const [currentWordId, setCurrentWordId] = useState(null);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [priorityQueue, setPriorityQueue] = useState([]);
  const [sessionSavedIds, setSessionSavedIds] = useState([]);
  const [sessionSeenIds, setSessionSeenIds] = useState([]);
  const [sessionStep, setSessionStep] = useState(1);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tutorial, setTutorial] = useState({ active: true, step: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState('Bạn');
  const [playerTeam, setPlayerTeam] = useState(TEAM_OPTIONS[0]);
  const [nightThreat, setNightThreat] = useState(null);
  const [wolfStrikes, setWolfStrikes] = useState(0);
  const [sessionRole, setSessionRole] = useState(null);
  const [sessionOutcome, setSessionOutcome] = useState('win');
  const [wolfStrikeEvent, setWolfStrikeEvent] = useState(null);
  const [playerInventory, setPlayerInventory] = useState({});
  const [activeFreezeUntil, setActiveFreezeUntil] = useState(null);
  const [boostActivated, setBoostActivated] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [itemToast, setItemToast] = useState(null);

  // ── Firebase Multiplayer ──
  const multiplayer = useMultiplayer();
  const [targetPicker, setTargetPicker] = useState(null); // { itemKey }

  const successTimerRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const ambientAudioRef = useRef(null); // for playful.mp3
  const sessionRecordedRef = useRef(false);
  const wolfPopupTimerRef = useRef(null);

  // ── Real MP3 ambient music ──
  const stopAmbient = useCallback(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.pause();
      ambientAudioRef.current.currentTime = 0;
    }
  }, []);

  const startAmbient = useCallback(() => {
    if (!soundEnabled) return;
    if (!ambientAudioRef.current) {
      ambientAudioRef.current = new Audio(SOUND_FILES.ambient);
      ambientAudioRef.current.loop = true;
      ambientAudioRef.current.volume = 0.35;
    }
    ambientAudioRef.current.play().catch(() => {});
  }, [soundEnabled]);

  const ensureAudioContext = useCallback(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency, duration, gainValue = 0.05, type = 'sine') => {
    if (!soundEnabled) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }, [ensureAudioContext, soundEnabled]);

  const playClickSfx = () => playTone(560, 0.08, 0.03, 'triangle');
  const playSuccessSfx = () => {
    playTone(660, 0.12, 0.05, 'triangle');
    window.setTimeout(() => playTone(880, 0.12, 0.045, 'triangle'), 80);
  };
  const playFailSfx = () => {
    playTone(280, 0.14, 0.04, 'sawtooth');
    window.setTimeout(() => playTone(220, 0.12, 0.03, 'sawtooth'), 90);
  };

  const playSound = (soundFile) => {
    if (!soundEnabled) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = soundFile;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  const playWolfAttackSound = () => playSound(SOUND_FILES.wolfAttack);

  const showItemToast = (msg) => {
    setItemToast(msg);
  };

  const advanceTutorial = (eventName) => {
    setTutorial((prev) => {
      if (!prev.active) return prev;
      if (prev.step === 0 && eventName === 'node-picked') return { active: true, step: 1 };
      if (prev.step === 1 && eventName === 'session-started') return { active: true, step: 2 };
      if (prev.step === 2 && eventName === 'decision-made') return { active: true, step: 3 };
      if (prev.step === 3 && eventName === 'session-ended') return { active: false, step: 3 };
      return prev;
    });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
      if (wolfPopupTimerRef.current) window.clearTimeout(wolfPopupTimerRef.current);
      stopAmbient();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stopAmbient]);

  // Load saved data
  useEffect(() => {
    setLearnedWords(parseStorage(STORAGE_KEYS.learned, []));
    setCommunityCount(parseStorage(STORAGE_KEYS.community, {}));
    setLeaderboard(parseStorage(STORAGE_KEYS.leaderboard, []));
    const savedName = localStorage.getItem(STORAGE_KEYS.playerName);
    if (savedName) setPlayerName(savedName);
    const savedTeam = localStorage.getItem(STORAGE_KEYS.playerTeam);
    if (savedTeam && TEAM_OPTIONS.includes(savedTeam)) setPlayerTeam(savedTeam);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.playerName, playerName || 'Bạn');
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.playerTeam, playerTeam || TEAM_OPTIONS[0]);
  }, [playerTeam]);

  // Ambient music control
  useEffect(() => {
    if (!soundEnabled || screen === 'end') {
      stopAmbient();
      return;
    }
    startAmbient();
  }, [soundEnabled, screen, startAmbient, stopAmbient]);

  // Sync ambient volume with soundEnabled
  useEffect(() => {
    if (ambientAudioRef.current) {
      ambientAudioRef.current.volume = soundEnabled ? 0.35 : 0;
    }
  }, [soundEnabled]);



  // Save to leaderboard on end
  useEffect(() => {
    if (screen !== 'end' || sessionRecordedRef.current) return;
    if (score <= 0 && sessionSavedIds.length === 0) return;

    const entry = {
      name: (playerName || 'Bạn').trim() || 'Bạn',
      team: playerTeam,
      score,
      saved: sessionSavedIds.length,
      title: getTitleByRankAndScore(0, score),
      time: Date.now(),
    };

    const next = [...leaderboard, entry]
      .sort((a, b) => b.score - a.score || b.saved - a.saved || b.time - a.time)
      .slice(0, 30);

    setLeaderboard(next);
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(next));
    sessionRecordedRef.current = true;

    // Sync final score to Firebase room
    if (multiplayer.roomCode) {
      multiplayer.syncScore(entry.name, entry.team, entry.score, entry.wolfStrikes || 0, entry.saved, entry.title);
    }
  }, [leaderboard, playerName, playerTeam, score, screen, sessionSavedIds.length, multiplayer]);

  const leaderboardTop = useMemo(
    () => [...leaderboard].sort((a, b) => b.score - a.score || b.saved - a.saved || b.time - a.time).slice(0, 8),
    [leaderboard],
  );

  const playerRank = useMemo(() => {
    const all = [...leaderboard].sort((a, b) => b.score - a.score || b.saved - a.saved || b.time - a.time);
    const target = (playerName || 'Bạn').trim() || 'Bạn';
    const index = all.findIndex((row) => row.name === target);
    return index >= 0 ? index + 1 : 0;
  }, [leaderboard, playerName]);

  const teamBoard = useMemo(() => {
    const aggregate = TEAM_OPTIONS.reduce((acc, team) => ({ ...acc, [team]: { score: 0, members: 0 } }), {});
    
    if (multiplayer.roomCode && multiplayer.roomPlayers && multiplayer.roomPlayers.length > 0) {
      multiplayer.roomPlayers.forEach((p) => {
        const team = TEAM_OPTIONS.includes(p.team) ? p.team : TEAM_OPTIONS[0];
        aggregate[team].score += (p.score || 0);
        aggregate[team].members += 1;
      });
    } else {
      leaderboard.forEach((row) => {
        const team = TEAM_OPTIONS.includes(row.team) ? row.team : TEAM_OPTIONS[0];
        aggregate[team].score += (row.score || 0);
        aggregate[team].members += 1;
      });
    }

    return Object.entries(aggregate)
      .map(([team, data]) => ({ team, score: data.score, members: data.members }))
      .sort((a, b) => b.score - a.score);
  }, [leaderboard, multiplayer.roomCode, multiplayer.roomPlayers]);

  const displayLeaderboard = useMemo(() => {
    if (multiplayer.roomCode && multiplayer.roomPlayers && multiplayer.roomPlayers.length > 0) {
      return multiplayer.roomPlayers.map((p) => ({
        name: p.name,
        team: p.team,
        score: p.score || 0,
        title: p.title || 'Người Gác Lửa',
        time: Date.now() + Math.random(),
      })).sort((a, b) => b.score - a.score);
    }
    return leaderboardTop;
  }, [multiplayer.roomCode, multiplayer.roomPlayers, leaderboardTop]);

  const playerTeamRank = useMemo(() => {
    const index = teamBoard.findIndex((row) => row.team === playerTeam);
    return index >= 0 ? index + 1 : 0;
  }, [playerTeam, teamBoard]);

  const playerTitle = useMemo(() => getTitleByRankAndScore(playerRank, score), [playerRank, score]);

  // ── Firebase: keep player refs in sync when name/team change ──────────────
  useEffect(() => {
    multiplayer.updatePlayerRef(playerName, playerTeam);
  }, [playerName, playerTeam, multiplayer]);

  // ── Firebase: push live score to room every time score changes ─────────────
  useEffect(() => {
    if (!multiplayer.roomCode) return;
    multiplayer.syncScore(
      playerName, playerTeam,
      score, wolfStrikes, sessionSavedIds.length,
      playerTitle,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, wolfStrikes, sessionSavedIds.length, playerTitle, multiplayer.roomCode]);

  // ── Firebase: apply incoming item attacks (freeze / steal) ─────────────────
  useEffect(() => {
    multiplayer.pendingItems.forEach(ev => {
      if (ev.type === 'FREEZE') {
        const dur = ev.duration || 5000;
        setActiveFreezeUntil(Date.now() + dur);
        window.setTimeout(() => setActiveFreezeUntil(null), dur);
        showItemToast(`❄️ ${ev.fromName || ev.fromTeam} đã đóng băng bạn!`);
      } else if (ev.type === 'STEAL') {
        const amt = ev.amount || 50;
        setScore(prev => Math.max(0, prev - amt));
        showItemToast(`🕷️ ${ev.fromName || ev.fromTeam} vừa cướp ${amt} điểm của bạn!`);
      }
      multiplayer.consumePendingItem(ev.eid);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiplayer.pendingItems]);

  const themeMode = useMemo(() => {
    if (nightThreat && (screen === 'study' || screen === 'success')) return 'night';
    return 'day';
  }, [nightThreat, screen]);

  // ── Firebase: listen to game start signal ──────────────────────────────────
  useEffect(() => {
    if (multiplayer.gameSignal && screen === 'home') {
      startSession(multiplayer.gameSignal.seedWordId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiplayer.gameSignal]);

  const pickNextWord = (
    nextLearned = sessionSeenIds,
    nextCommunity = communityCount,
    nextPriority = priorityQueue,
    nextReview = reviewQueue,
    avoidId = null,
  ) => {
    const learnedSet = new Set(nextLearned);

    if (nightThreat && nightThreat.turnsLeft > 0 && !learnedSet.has(nightThreat.wordId) && nightThreat.wordId !== avoidId) {
      return nightThreat.wordId;
    }

    const pickFromQueue = (queue) => {
      const nonRepeated = queue.find((id) => id !== avoidId && !learnedSet.has(id));
      if (nonRepeated) return nonRepeated;
      return queue.find((id) => !learnedSet.has(id));
    };

    const priorityPick = pickFromQueue(nextPriority);
    if (priorityPick) return priorityPick;

    const reviewPick = pickFromQueue(nextReview);
    if (reviewPick) return reviewPick;

    const fallbackList = getPriorityWords(words, nextLearned, nextCommunity);
    if (fallbackList.length === 0) {
      // If everything is learned, reset learned list for fallback or pick random
      const randomWord = words[Math.floor(Math.random() * words.length)];
      return randomWord?.id || null;
    }
    const fallback = fallbackList.find((item) => item.id !== avoidId) || fallbackList[0];
    return fallback?.id || null;
  };

  const startSession = (seedWordId = null) => {
    const actualSeedId = typeof seedWordId === 'string' ? seedWordId : null;
    playClickSfx();
    ensureAudioContext();
    advanceTutorial('session-started');

    sessionRecordedRef.current = false;
    setNightThreat(null);
    setWolfStrikes(0);
    setWolfStrikeEvent(null);
    setSessionOutcome('win');
    setSessionRole(ROLE_CONFIG[Math.floor(Math.random() * ROLE_CONFIG.length)]);
    setShieldActive(false);
    setBoostActivated(false);
    setPlayerInventory({});

    const firstCandidate = actualSeedId || pickNextWord([], communityCount, [], [], null);
    const first = firstCandidate || words[0]?.id || null;

    setSessionStep(1);
    setSessionSavedIds([]);
    setSessionSeenIds([]);
    setPriorityQueue([]);
    setReviewQueue([]);
    setCurrentWordId(first);
    setScreen(first ? 'study' : 'home');
  };

  const goToNext = (args = {}) => {
    const nextLearned = args.learnedWords ?? sessionSeenIds;
    const nextSessionSaved = args.sessionSavedIds ?? sessionSavedIds;
    let nextCommunity = args.communityCount ?? communityCount;
    const nextPriority = args.priorityQueue ?? priorityQueue;
    const nextReview = args.reviewQueue ?? reviewQueue;
    const avoidWordId = args.avoidWordId ?? null;

    let strikesAfter = wolfStrikes;

    if (nightThreat && nightThreat.turnsLeft > 0 && nextSessionSaved.includes(nightThreat.wordId)) {
      setNightThreat(null);
    } else if (nightThreat && nightThreat.turnsLeft > 0) {
      const nextTurns = nightThreat.turnsLeft - 1;
      if (nextTurns <= 0) {
        // Shield negates wolf strike
        if (shieldActive) {
          setShieldActive(false);
          showItemToast('🛡️ Khiên bảo vệ đã chặn Sói!');
          setNightThreat(null);
        } else {
          const victim = words.find((word) => word.id === nightThreat.wordId);
          if (victim) {
            const before = nextCommunity[victim.id] || victim.knownBy;
            nextCommunity = { ...nextCommunity, [victim.id]: Math.max(1, before - 2) };
            setCommunityCount(nextCommunity);
            saveCommunityCount(nextCommunity);

            setWolfStrikeEvent({ type: 'strike', word: victim, at: Date.now() });
            if (wolfPopupTimerRef.current) window.clearTimeout(wolfPopupTimerRef.current);
            wolfPopupTimerRef.current = window.setTimeout(() => setWolfStrikeEvent(null), 1800);
          }

          setNightThreat(null);
          setStreak(0);
          setScore((prev) => Math.max(0, prev - 35));
          playFailSfx();
          playWolfAttackSound();
          strikesAfter += 1;
          setWolfStrikes(strikesAfter);
        }
      } else {
        setNightThreat({ ...nightThreat, turnsLeft: nextTurns });
      }
    }

    if (strikesAfter >= WOLF_STRIKE_LIMIT) {
      setSessionOutcome('lose');
      playSound(SOUND_FILES.gameOver);
      setScreen('end');
      return;
    }

    const nextId = pickNextWord(nextLearned, nextCommunity, nextPriority, nextReview, avoidWordId);
    const reachedStepLimit = sessionStep >= SESSION_MAX_STEPS;
    const noMoreWord = !nextId;
    const shouldEnd = noMoreWord || reachedStepLimit;

    if (shouldEnd) {
      const hasEnoughRescues = nextSessionSaved.length >= SESSION_GOAL;
      setSessionOutcome(hasEnoughRescues ? 'win' : 'lose');
      if (hasEnoughRescues) {
        playSound(SOUND_FILES.winner);
      } else {
        playSound(SOUND_FILES.gameOver);
      }
      setScreen('end');
      return;
    }

    const nextStep = sessionStep + 1;
    if (!nightThreat && nextStep % WOLF_APPEAR_INTERVAL === 0) {
      const threatCandidates = words
        .filter((w) => !nextLearned.includes(w.id) && w.id !== nextId)
        .sort((a, b) => getCurrentRisk(b, nextCommunity) - getCurrentRisk(a, nextCommunity));
      if (threatCandidates[0]) {
        const threatenedWord = threatCandidates[0];
        setNightThreat({ wordId: threatenedWord.id, turnsLeft: 2 });
        setWolfStrikeEvent({ type: 'appear', word: threatenedWord, turnsLeft: 2, at: Date.now() });
        if (wolfPopupTimerRef.current) window.clearTimeout(wolfPopupTimerRef.current);
        wolfPopupTimerRef.current = window.setTimeout(() => setWolfStrikeEvent(null), 1600);
      }
    }

    setSessionStep(nextStep);
    setCurrentWordId(nextId);
    setScreen('study');
  };

  const currentWord = words.find((word) => word.id === currentWordId) || null;
  const wolfStatus = useMemo(() => {
    if (!nightThreat) return 'Mục tiêu: giữ kho từ sống sót qua đêm, không để Sói cắn quá 3 lần.';
    const threatened = words.find((word) => word.id === nightThreat.wordId);
    if (!threatened) return 'Đêm Sói đang hoạt động.';
    return `🐺 Sói nhắm: "${threatened.tay}" — còn ${nightThreat.turnsLeft} lượt để cứu!`;
  }, [nightThreat, words]);

  const rescueWord = () => {
    if (!currentWord) return;

    playSuccessSfx();
    advanceTutorial('decision-made');

    const currentRisk = getCurrentRisk(currentWord, communityCount);
    const nextStreak = streak + 1;
    const basePoints = 120 + nextStreak * 35 + Math.round(currentRisk * 1.2);
    const roleBoost = sessionRole?.scoreBoost ? sessionRole.scoreBoost(currentRisk, basePoints) : 0;
    const wolfHuntBonus = sessionRole?.id === 'tien-tri' && nightThreat?.wordId === currentWord.id ? 80 : 0;
    const boostMultiplier = boostActivated ? 2 : 1;
    const totalPoints = Math.round((basePoints + roleBoost + wolfHuntBonus) * boostMultiplier);

    setStreak(nextStreak);
    setMaxStreak((prev) => Math.max(prev, nextStreak));
    setScore((prev) => prev + totalPoints);
    setBoostActivated(false);

    const nextLearned = learnedWords.includes(currentWord.id)
      ? learnedWords
      : [...learnedWords, currentWord.id];
    const nextSessionSeen = sessionSeenIds.includes(currentWord.id)
      ? sessionSeenIds
      : [...sessionSeenIds, currentWord.id];
    const currentCommunity = communityCount[currentWord.id] || currentWord.knownBy;
    const nextCommunity = { ...communityCount, [currentWord.id]: currentCommunity + 1 };

    const nextSessionSaved = sessionSavedIds.includes(currentWord.id)
      ? sessionSavedIds
      : [...sessionSavedIds, currentWord.id];

    setLearnedWords(nextLearned);
    setSessionSeenIds(nextSessionSeen);
    setCommunityCount(nextCommunity);
    setSessionSavedIds(nextSessionSaved);

    saveLearnedWords(nextLearned);
    saveCommunityCount(nextCommunity);

    // 15% chance to gain an item
    if (Math.random() < 0.15) {
      const itemKeys = Object.keys(ITEM_TYPES);
      const randomItem = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      setPlayerInventory((prev) => ({
        ...prev,
        [randomItem]: (prev[randomItem] || 0) + 1,
      }));
      showItemToast(`🎁 Nhận được: ${ITEM_TYPES[randomItem].emoji} ${ITEM_TYPES[randomItem].name}!`);
    }

    const nextPriority = priorityQueue.filter((id) => id !== currentWord.id);
    const nextReview = reviewQueue.filter((id) => id !== currentWord.id);
    setPriorityQueue(nextPriority);
    setReviewQueue(nextReview);

    setScreen('success');

    successTimerRef.current = window.setTimeout(() => {
      goToNext({ learnedWords: nextSessionSeen, sessionSavedIds: nextSessionSaved, communityCount: nextCommunity, priorityQueue: nextPriority, reviewQueue: nextReview, avoidWordId: currentWord.id });
    }, 2500);
  };

  const markUnknown = () => {
    if (!currentWord) return;
    playFailSfx();
    advanceTutorial('decision-made');
    setStreak(0);
    setScore((prev) => Math.max(0, prev - 10));

    const nextSessionSeen = sessionSeenIds.includes(currentWord.id)
      ? sessionSeenIds
      : [...sessionSeenIds, currentWord.id];
    setSessionSeenIds(nextSessionSeen);

    const queueWithoutCurrent = priorityQueue.filter((id) => id !== currentWord.id);
    const nextPriority = [currentWord.id, ...queueWithoutCurrent];
    setPriorityQueue(nextPriority);
    goToNext({ learnedWords: nextSessionSeen, sessionSavedIds: sessionSavedIds, priorityQueue: nextPriority, avoidWordId: currentWord.id });
  };

  // ── handleTargetConfirm: called after picking a target from TargetPickerModal
  const handleTargetConfirm = useCallback((targetPlayer) => {
    if (!targetPicker) return;
    const { itemKey } = targetPicker;
    playClickSfx();
    if (itemKey === 'freeze') {
      multiplayer.sendItemEvent('FREEZE', targetPlayer.id, { duration: ITEM_TYPES.freeze.duration });
      showItemToast(`❄️ Đã đóng băng ${targetPlayer.name} (${targetPlayer.team}) 5 giây!`);
    } else if (itemKey === 'steal') {
      multiplayer.sendItemEvent('STEAL', targetPlayer.id, { amount: 50 });
      showItemToast(`🕷️ Đã cướp 50 điểm từ ${targetPlayer.name}!`);
    }
    setTargetPicker(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPicker, multiplayer]);

  const useItem = (itemKey) => {
    const item = ITEM_TYPES[itemKey];
    if (!item) return;
    if ((playerInventory[itemKey] || 0) <= 0) return;

    // Consume item from inventory immediately
    setPlayerInventory((prev) => ({
      ...prev,
      [itemKey]: Math.max(0, (prev[itemKey] || 0) - 1),
    }));

    // For multiplayer targeting items (freeze, steal) – show picker
    const inRoom = multiplayer.roomCode && multiplayer.roomPlayers.length > 1;
    if (inRoom && (itemKey === 'freeze' || itemKey === 'steal')) {
      playClickSfx();
      setTargetPicker({ itemKey });
      return;
    }

    switch (itemKey) {
      case 'freeze':
        // Solo mode: self-freeze as challenge
        playClickSfx();
        setActiveFreezeUntil(Date.now() + ITEM_TYPES.freeze.duration);
        window.setTimeout(() => setActiveFreezeUntil(null), ITEM_TYPES.freeze.duration);
        showItemToast('❄️ Đóng Băng (chế độ solo – thử thách bản thân 5 giây!)');
        break;

      case 'steal':
        // Solo mode: bonus points
        playClickSfx();
        setScore((prev) => prev + 50);
        showItemToast('🕷️ Cướp Điểm – +50 điểm thưởng!');
        break;

      case 'shield':
        playClickSfx();
        setShieldActive(true);
        showItemToast('🛡️ Khiên Bảo Vệ đã sẵn sàng – lần Sói cắn tiếp theo sẽ bị chặn!');
        break;

      case 'boost':
        playClickSfx();
        setBoostActivated(true);
        showItemToast('⚡ Tăng Tốc! Lượt tiếp theo bạn nhận x2 điểm!');
        window.setTimeout(() => setBoostActivated(false), ITEM_TYPES.boost.duration);
        break;

      default:
        break;
    }
  };

  const isFrozen = !!activeFreezeUntil && Date.now() < activeFreezeUntil;

  return (
    <div className={`flashcard-stage ${themeMode}`}>
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HomeScreen
              words={words}
              communityCount={communityCount}
              onStart={startSession}
              onNodePick={() => {
                playClickSfx();
                ensureAudioContext();
                advanceTutorial('node-picked');
              }}
              score={score}
              streak={streak}
              maxStreak={maxStreak}
              soundEnabled={soundEnabled}
              onToggleSound={() => {
                ensureAudioContext();
                setSoundEnabled((prev) => !prev);
              }}
              sessionRescued={sessionSavedIds.length}
              leaderboard={displayLeaderboard}
              playerName={playerName}
              onPlayerNameChange={setPlayerName}
              wolfStatus={wolfStatus}
              role={sessionRole}
              wolfStrikes={wolfStrikes}
              playerTitle={playerTitle}
              themeMode={themeMode}
              playerTeam={playerTeam}
              onPlayerTeamChange={setPlayerTeam}
              teamBoard={teamBoard}
              multiplayer={multiplayer}
            />
          </motion.div>
        )}

        {screen === 'study' && currentWord && (
          <motion.div key={`study-${currentWord.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StudyScreen
              word={currentWord}
              communityCount={communityCount}
              sessionLearnedCount={sessionSavedIds.length}
              onKeep={rescueWord}
              onUnknown={markUnknown}
              step={sessionStep}
              score={score}
              streak={streak}
              maxStreak={maxStreak}
              soundEnabled={soundEnabled}
              onToggleSound={() => {
                ensureAudioContext();
                setSoundEnabled((prev) => !prev);
              }}
              wolfStatus={wolfStatus}
              role={sessionRole}
              wolfStrikes={wolfStrikes}
              playerTitle={playerTitle}
              playerTeam={playerTeam}
              themeMode={themeMode}
              playerInventory={playerInventory}
              onUseItem={useItem}
              isFrozen={isFrozen}
              shieldActive={shieldActive}
              boostActivated={boostActivated}
              roomPlayers={multiplayer.roomPlayers}
              myPid={getMyPlayerId()}
              allWords={words}
              onScoreChange={(delta) => setScore((prev) => Math.max(0, prev + delta))}
            />
          </motion.div>
        )}

        {screen === 'success' && currentWord && (
          <motion.div key={`success-${currentWord.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SuccessScreen word={currentWord} newCommunityCount={communityCount[currentWord.id] || currentWord.knownBy} score={score} streak={streak} />
          </motion.div>
        )}

        {screen === 'end' && (
          <motion.div key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SessionEndScreen
              words={words}
              communityCount={communityCount}
              sessionSavedIds={sessionSavedIds}
              onContinue={startSession}
              onHome={onExit}
              score={score}
              maxStreak={maxStreak}
              leaderboard={displayLeaderboard}
              playerName={playerName}
              playerRank={playerRank}
              role={sessionRole}
              wolfStrikes={wolfStrikes}
              outcome={sessionOutcome}
              playerTitle={playerTitle}
              playerTeam={playerTeam}
              playerTeamRank={playerTeamRank}
              teamBoard={teamBoard}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Firebase TargetPickerModal for freeze/steal ── */}
      <AnimatePresence>
        {targetPicker && (
          <TargetPickerModal
            roomPlayers={multiplayer.roomPlayers}
            myPid={getMyPlayerId()}
            myTeam={playerTeam}
            itemType={targetPicker.itemKey}
            onSelect={handleTargetConfirm}
            onCancel={() => {
              // refund the item since we cancelled
              setPlayerInventory(prev => ({
                ...prev,
                [targetPicker.itemKey]: (prev[targetPicker.itemKey] || 0) + 1,
              }));
              setTargetPicker(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tutorial.active && screen !== 'end' && (
          <TutorialCoach
            active={tutorial.active}
            step={tutorial.step}
            onSkip={() => setTutorial((prev) => ({ ...prev, active: false }))}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {wolfStrikeEvent && <WolfStrikePopup event={wolfStrikeEvent} />}
      </AnimatePresence>

      <AnimatePresence>
        {itemToast && (
          <ItemToast message={itemToast} onDone={() => setItemToast(null)} />
        )}
      </AnimatePresence>

      <motion.button
        className="back-home-btn"
        whileHover={{ scale: 1.04 }}
        onClick={onExit}
      >
        ← Về trang chủ
      </motion.button>
    </div>
  );
};

export default FlashcardRescue;
