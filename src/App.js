import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  ChevronRight,
  X,
  ArrowDown,
  Wind,
  Search,
  BookOpen,
  PlayCircle,
  VolumeX,
} from 'lucide-react';
import { dictionaryData } from './data/dictionaryData';

// ─── Assets ──────────────────────────────────────────────────────────────────
import logoImg from './assets/logotudientay.png';
import image1 from './assets/image1.png';
import image2 from './assets/image2.png';
import image3 from './assets/image3.png';
import image4 from './assets/image4.png';
import image5 from './assets/image5.png';
import image6 from './assets/image6.png';

// ─── Map chapters to images + palette ────────────────────────────────────────
const CHAPTER_META = [
  {
    image: image1,
    exploreImage: image4,
    accent: '#f59e0b',
    tag: 'Đời Sống & Sản Xuất',
  },
  {
    image: image2,
    exploreImage: image5,
    accent: '#a78bfa',
    tag: 'Lễ Hội & Văn Hoá',
  },
  {
    image: image3,
    exploreImage: image6,
    accent: '#34d399',
    tag: 'Gia Đình & Huyết Thống',
  },
];

// ─── Word Card inside modal ───────────────────────────────────────────────────
const WordItem = ({ wordData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = useCallback((e) => {
    e.stopPropagation();

    if (!wordData.audio) return;

    const nfcFilename = wordData.audio.normalize('NFC');
    const nfdFilename = wordData.audio.normalize('NFD');
    const path = `${process.env.PUBLIC_URL || ''}/audio/${encodeURIComponent(nfcFilename)}`;

    const playAudio = (audioPath, fallbackPath = null) => {
      const audio = new Audio(audioPath);
      audioRef.current = audio; // Store for pausing later
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        if (fallbackPath) {
          console.warn("Retrying with fallback normalization:", fallbackPath);
          playAudio(fallbackPath);
        } else {
          console.error("Audio Load Error at both normalizations:", audioPath);
          setIsPlaying(false);
        }
      };

      audio.play().catch((err) => {
        console.error("Playback failed:", err);
        setIsPlaying(false);
      });
    };

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Try NFC path first, then NFD as fallback
      const fallbackPath = nfcFilename !== nfdFilename
        ? `${process.env.PUBLIC_URL || ''}/audio/${encodeURIComponent(nfdFilename)}`
        : null;
      playAudio(path, fallbackPath);
    }
  }, [isPlaying, wordData.audio]);

  return (
    <div
      className="group border border-white/5 rounded-2xl p-6 cursor-pointer hover:bg-white/5 hover:border-white/15 transition-all duration-300"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-serif text-white group-hover:text-yellow-400 transition-colors truncate">
            {wordData.word}
          </p>
          <p className="text-white/50 italic text-sm mt-1">{wordData.meaning}</p>
        </div>
        <button
          onClick={handlePlay}
          className={`flex-shrink-0 w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 ${isPlaying
              ? 'bg-yellow-500 border-yellow-500 text-black animate-pulse'
              : 'border-white/10 text-white/50 hover:bg-yellow-500 hover:border-yellow-500 hover:text-black'
            }`}
          title="Nghe phát âm"
        >
          {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {expanded && wordData.description && (
        <p className="mt-4 pt-4 border-t border-white/5 text-slate-300 text-sm leading-relaxed">
          {wordData.description}
        </p>
      )}
    </div>
  );
};

// ─── Chapter Modal ────────────────────────────────────────────────────────────
const ChapterModal = ({ chapter, meta, onClose }) => {
  const [searchQ, setSearchQ] = useState('');

  // Collect all words from this chapter
  const allWords = [];
  chapter.categories.forEach((cat) => {
    (cat.words || []).forEach((w) => allWords.push({ ...w, _cat: cat.title }));
    (cat.subcategories || []).forEach((sub) => {
      (sub.words || []).forEach((w) => allWords.push({ ...w, _cat: sub.title }));
    });
  });

  const filtered = searchQ.trim()
    ? allWords.filter(
      (w) =>
        w.word.toLowerCase().includes(searchQ.toLowerCase()) ||
        w.meaning.toLowerCase().includes(searchQ.toLowerCase())
    )
    : null;

  // Group by category for the non-search view
  const grouped = [];
  chapter.categories.forEach((cat) => {
    const catWords = cat.words || [];
    const subcatWords = [];
    (cat.subcategories || []).forEach((sub) =>
      (sub.words || []).forEach((w) => subcatWords.push({ ...w, _sub: sub.title }))
    );
    grouped.push({ title: cat.title, words: [...catWords, ...subcatWords] });
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 ml-auto w-full md:w-[55vw] h-full bg-[#080b10] flex flex-col shadow-2xl">
        {/* Explore Background Image Layer */}
        {meta.exploreImage && (
          <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
            <img
              src={meta.exploreImage}
              alt=""
              className="w-full h-full object-cover grayscale opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#080b10] via-transparent to-[#080b10]" />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header image strip */}
          <div className="relative h-56 flex-shrink-0 overflow-hidden">
            <img
              src={meta.image}
              alt={chapter.title}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080b10]" />
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90 duration-300"
            >
              <X size={22} />
            </button>
            <div className="absolute bottom-10 left-8">
              <p className="text-xs font-bold tracking-[0.4em] uppercase mb-2" style={{ color: meta.accent }}>
                {meta.tag}
              </p>
              <h2 className="text-4xl font-serif text-white tracking-wide">{chapter.title}</h2>
            </div>
          </div>

          {/* Search */}
          <div className="px-8 pt-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-yellow-500/40 transition-colors">
              <Search size={16} className="text-white/40" />
              <input
                type="text"
                placeholder={`Tìm trong ${chapter.title}...`}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="text-white/30 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Word list */}
          <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-10">
            {filtered !== null ? (
              filtered.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
                    {filtered.length} kết quả
                  </p>
                  {filtered.map((w, i) => <WordItem key={i} wordData={w} />)}
                </div>
              ) : (
                <div className="text-center py-20 text-white/30">
                  <BookOpen size={40} className="mx-auto mb-4 opacity-40" />
                  <p>Không tìm thấy từ nào phù hợp</p>
                </div>
              )
            ) : (
              grouped.map((group, gi) => (
                <div key={gi}>
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-4 pb-3 border-b border-white/5" style={{ color: meta.accent }}>
                    {group.title}
                  </h3>
                  <div className="space-y-2">
                    {group.words.map((w, wi) => <WordItem key={wi} wordData={w} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Cinematic chapter section ────────────────────────────────────────────────
const ChapterSection = ({ chapter, index, meta, onExplore }) => {
  const isEven = index % 2 === 0;

  const wordCount = chapter.categories.reduce((t, cat) => {
    return (
      t +
      (cat.words || []).length +
      (cat.subcategories || []).reduce((s, sub) => s + (sub.words || []).length, 0)
    );
  }, 0);

  return (
    <section className="relative h-screen w-full flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={meta.image}
          alt={chapter.title}
          className="w-full h-full object-cover"
        />
        <div
          className={`absolute inset-0 ${isEven
              ? 'bg-gradient-to-r from-black/85 via-black/50 to-transparent'
              : 'bg-gradient-to-l from-black/85 via-black/50 to-transparent'
            }`}
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className={`relative z-10 w-full px-12 md:px-20 flex ${isEven ? 'justify-start' : 'justify-end'}`}>
        <div className="max-w-xl space-y-6">
          <div className="flex items-center gap-3 text-xs font-bold tracking-[0.3em] uppercase" style={{ color: meta.accent }}>
            <span className="h-px w-8 inline-block" style={{ background: meta.accent }}></span>
            Chương {index + 1} · {meta.tag}
          </div>

          <h2 className="text-5xl md:text-7xl font-serif font-light text-white leading-tight">
            {chapter.title}
          </h2>

          <div className="flex items-center gap-6 text-white/40 text-sm">
            <span>{chapter.categories.length} chủ đề</span>
            <span className="w-1 h-1 rounded-full bg-white/20"></span>
            <span>{wordCount} từ vựng</span>
          </div>

          <button
            onClick={() => onExplore(chapter, meta)}
            className="group flex items-center gap-4 px-7 py-4 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white hover:text-black transition-all duration-500 rounded-full mt-4"
          >
            <PlayCircle size={20} />
            <span className="font-semibold tracking-wider text-sm">KHÁM PHÁ NGÔN NGỮ</span>
            <div
              className="p-1.5 rounded-full transition-colors"
              style={{ background: meta.accent }}
            >
              <ChevronRight size={14} className="text-black" />
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};

// ─── Global Search Overlay ────────────────────────────────────────────────────
const GlobalSearch = ({ query, setQuery, onClose }) => {
  const allWords = [];
  dictionaryData.forEach((ch) => {
    ch.categories.forEach((cat) => {
      (cat.words || []).forEach((w) => allWords.push({ ...w, _chapter: ch.title }));
      (cat.subcategories || []).forEach((sub) =>
        (sub.words || []).forEach((w) => allWords.push({ ...w, _chapter: ch.title }))
      );
    });
  });

  const results = query.trim()
    ? allWords.filter(
      (w) =>
        w.word.toLowerCase().includes(query.toLowerCase()) ||
        w.meaning.toLowerCase().includes(query.toLowerCase())
    )
    : [];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex flex-col">
      <div className="px-8 md:px-20 pt-12 pb-6">
        <button onClick={onClose} className="mb-8 text-white/50 hover:text-white flex items-center gap-2 text-sm transition-colors">
          <X size={16} /> Đóng
        </button>
        <div className="flex items-center gap-4 border-b border-white/10 pb-4">
          <Search size={24} className="text-yellow-500" />
          <input
            autoFocus
            type="text"
            placeholder="Tìm từ Tày hoặc nghĩa Việt..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-3xl text-white outline-none placeholder:text-white/20 font-serif"
          />
        </div>
        {query && (
          <p className="mt-3 text-white/30 text-sm">
            {results.length} từ tìm thấy
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 md:px-20 pb-20">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {results.map((w, i) => <WordItem key={i} wordData={w} />)}
          </div>
        ) : query ? (
          <div className="text-center py-24 text-white/20">
            <p className="text-xl font-serif">Không tìm thấy kết quả</p>
            <p className="text-sm mt-2">Thử từ khác nhé!</p>
          </div>
        ) : (
          <div className="text-center py-24 text-white/20">
            <p className="text-lg">Gõ để bắt đầu tra cứu từ điển Tày...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
const App = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    const t = setTimeout(() => setIsLoaded(true), 600);
    return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(t); };
  }, []);

  const handleExplore = (chapter, meta) => {
    setSelectedChapter(chapter);
    setSelectedMeta(meta);
  };

  const totalWords = dictionaryData.reduce(
    (t, ch) =>
      t +
      ch.categories.reduce((ct, cat) => {
        return (
          ct +
          (cat.words || []).length +
          (cat.subcategories || []).reduce((s, sub) => s + (sub.words || []).length, 0)
        );
      }, 0),
    0
  );

  return (
    <div className="bg-[#05070a] text-slate-100 font-sans overflow-x-hidden">

      {/* ── Loading Curtain ── */}
      <div
        className={`fixed inset-0 z-[200] bg-black flex items-center justify-center transition-transform duration-1000 ease-in-out ${isLoaded ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-px bg-yellow-500 mx-auto"></div>
          <p className="text-white/60 tracking-[0.5em] text-xs uppercase">
            Đang mở trang sách cổ...
          </p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 md:px-12 py-6 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={logoImg} alt="Tày Logo" className="h-10 w-auto group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
          <div className="flex flex-col">
            <span className="font-serif italic text-xl tracking-wide text-white group-hover:text-yellow-400 transition-colors">Tày Heritage</span>
            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-white/40">Multimedia Dictionary</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-6">
          <button
            onClick={() => { setShowSearch(true); setSearchQuery(''); }}
            className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-white/60 hover:text-yellow-500 transition-colors"
          >
            <Search size={16} />
            <span className="hidden md:inline">Tra từ</span>
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative h-screen w-full flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/60 z-10" />
          <img
            src={image1}
            alt="Rừng Tây Bắc"
            className="w-full h-full object-cover"
            style={{ transform: `scale(1.1) translateY(${scrollY * 0.15}px)` }}
          />
        </div>

        <div className="relative z-10 space-y-8 max-w-3xl">
          <div className="flex items-center justify-center gap-3 text-white/50 text-xs font-bold tracking-[0.4em] uppercase">
            <Wind size={14} />
            Thanh âm của gió ngàn
          </div>

          <h1 className="text-6xl md:text-8xl font-serif text-white leading-tight">
            Chạm vào <br />
            <span className="italic text-yellow-400">Bản sắc Tày</span>
          </h1>

          <p className="text-lg text-slate-300 font-light max-w-md mx-auto leading-relaxed">
            Không chỉ là từ điển — đây là hành trình đi sâu vào linh hồn của những bản làng ẩn mình sau mây.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-10 pt-4">
            {[
              { n: `${totalWords}+`, l: 'Từ vựng' },
              { n: `${dictionaryData.length}`, l: 'Chương' },
              { n: `${dictionaryData.reduce((t, ch) => t + ch.categories.length, 0)}`, l: 'Chủ đề' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className="text-3xl font-serif text-yellow-400">{s.n}</p>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">{s.l}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3 pt-6">
            <div className="w-px h-16 bg-gradient-to-b from-yellow-500 to-transparent"></div>
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-yellow-500">Cuộn để bắt đầu</span>
            <ArrowDown size={16} className="text-yellow-500 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── Chapter Sections ── */}
      <main>
        {dictionaryData.map((chapter, idx) => {
          const meta = CHAPTER_META[idx] || CHAPTER_META[0];
          return (
            <ChapterSection
              key={idx}
              chapter={chapter}
              index={idx}
              meta={meta}
              onExplore={handleExplore}
            />
          );
        })}
      </main>

      {/* ── Footer ── */}
      <footer className="relative h-[55vh] flex flex-col items-center justify-center text-center px-8 bg-white text-black overflow-hidden">
        <BookOpen size={48} className="mx-auto mb-6 opacity-10" />
        <h2 className="text-4xl md:text-5xl font-serif mb-4">Di sản nằm trong bàn tay bạn</h2>
        <p className="max-w-md text-sm uppercase tracking-widest leading-loose opacity-50 mb-8">
          Dự án bảo tồn và lan toả ngôn ngữ dân tộc Tày qua trải nghiệm thị giác hiện đại.
        </p>
        <button
          onClick={() => { setShowSearch(true); setSearchQuery(''); }}
          className="px-10 py-4 border-2 border-black font-bold hover:bg-black hover:text-white transition-all duration-300 rounded-full tracking-widest text-xs uppercase"
        >
          Tra cứu từ điển
        </button>
      </footer>

      {/* ── Chapter Word Modal ── */}
      {selectedChapter && selectedMeta && (
        <ChapterModal
          chapter={selectedChapter}
          meta={selectedMeta}
          onClose={() => { setSelectedChapter(null); setSelectedMeta(null); }}
        />
      )}

      {/* ── Global Search Overlay ── */}
      {showSearch && (
        <GlobalSearch
          query={searchQuery}
          setQuery={setSearchQuery}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* ── Fonts + base styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-serif { font-family: 'Playfair Display', serif !important; }
        ::selection { background: #f59e0b; color: black; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #05070a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #ca8a04; }
      `}</style>
    </div>
  );
};

export default App;
