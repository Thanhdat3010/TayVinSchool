import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dictionaryData } from './data/dictionaryData';
import FlashcardRescue from './components/FlashcardRescue';
import VideoGallery from './components/VideoGallery';


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
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        if (fallbackPath) {
          playAudio(fallbackPath);
        } else {
          setIsPlaying(false);
        }
      };

      audio.play().catch((err) => {
        setIsPlaying(false);
      });
    };

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const fallbackPath = nfcFilename !== nfdFilename
        ? `${process.env.PUBLIC_URL || ''}/audio/${encodeURIComponent(nfdFilename)}`
        : null;
      playAudio(path, fallbackPath);
    }
  }, [isPlaying, wordData.audio]);

  return (
    <div
      className="group border border-white/5 bg-white/[0.02] rounded-xl p-4 md:p-6 cursor-pointer hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xl md:text-2xl font-serif text-white group-hover:text-yellow-400 transition-colors truncate">
            {wordData.word}
          </p>
          <p className="text-white/40 italic text-xs md:text-sm mt-0.5 md:mt-1 truncate">{wordData.meaning}</p>
        </div>
        <button
          onClick={handlePlay}
          className={`flex-shrink-0 px-4 py-2 rounded-full border flex items-center justify-center transition-all duration-500 text-xs font-bold tracking-widest ${isPlaying
            ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]'
            : 'border-white/10 text-white/50 hover:bg-yellow-500 hover:border-yellow-500 hover:text-black'
            }`}
        >
          {isPlaying ? 'DỪNG' : 'NGHE'}
        </button>
      </div>

      {expanded && wordData.description && (
        <div className="mt-3 pt-3 border-t border-white/5 animate-fade">
          <p className="text-slate-400 text-[11px] md:text-sm leading-relaxed">
            {wordData.description}
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Chapter Modal ────────────────────────────────────────────────────────────
const ChapterModal = ({ chapter, meta, onClose }) => {
  const [searchQ, setSearchQ] = useState('');

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
    <div className="fixed inset-0 z-[100] overflow-hidden flex animate-fade">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 ml-auto w-full md:w-[600px] lg:w-[700px] h-full bg-[#080b10] flex flex-col shadow-2xl border-l border-white/5 animate-reveal">
        {/* Explore Background Image Layer */}
        {meta.exploreImage && (
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <img
              src={meta.exploreImage}
              alt=""
              className="w-full h-full object-cover grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#080b10] via-transparent to-[#080b10]" />
          </div>
        )}

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="relative h-48 md:h-64 flex-shrink-0 overflow-hidden">
            <img
              src={meta.image}
              alt={chapter.title}
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080b10]" />
            <button
              onClick={onClose}
              className="absolute top-6 right-6 px-4 py-2 bg-black/40 hover:bg-white hover:text-black rounded-full text-white text-[10px] font-bold tracking-widest transition-all duration-500 z-50"
            >
              ĐÓNG
            </button>
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase mb-2" style={{ color: meta.accent }}>
                {meta.tag}
              </p>
              <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight break-words">{chapter.title}</h2>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 md:px-8 pt-4 md:pt-8 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 focus-within:border-yellow-500/50 transition-all shadow-inner">
              <input
                type="text"
                placeholder="Tìm kiến trong chương này..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm md:text-base outline-none placeholder:text-white/20"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="text-[10px] font-bold tracking-widest text-white/30 hover:text-yellow-500 transition-colors">
                  XOÁ
                </button>
              )}
            </div>
          </div>

          {/* Word list */}
          <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-12 space-y-12">
            {filtered !== null ? (
              <div className="space-y-4">
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">
                  Đã tìm thấy {filtered.length} kết quả
                </p>
                <div className="space-y-3">
                  {filtered.map((w, i) => <WordItem key={i} wordData={w} />)}
                </div>
              </div>
            ) : (
              grouped.map((group, gi) => (
                <div key={gi} className="space-y-6">
                  <h3 className="text-[11px] font-bold tracking-[0.3em] uppercase opacity-70 flex items-center gap-4" style={{ color: meta.accent }}>
                    {group.title}
                    <div className="h-px flex-1 bg-white/5" />
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
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
    <section className="relative min-h-[80vh] md:h-screen w-full flex items-center overflow-hidden py-20 md:py-0">
      {/* Background with optimized overlay */}
      <div className="absolute inset-0 z-0 scale-105">
        <img
          src={meta.image}
          alt={chapter.title}
          className="w-full h-full object-cover"
        />
        <div
          className={`absolute inset-0 transition-all duration-500 ${isEven
            ? 'bg-gradient-to-r from-black/90 via-black/40 to-transparent'
            : 'md:bg-gradient-to-l from-black/90 via-black/40 to-transparent bg-black/70'
            }`}
        />
      </div>

      <div className={`relative z-10 w-full px-6 sm:px-12 md:px-20 flex ${isEven ? 'justify-start' : 'md:justify-end justify-start'}`}>
        <div className="max-w-2xl space-y-6 md:space-y-8 animate-reveal">
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase" style={{ color: meta.accent }}>
            <span className="h-[2px] w-8 md:w-12 inline-block" style={{ background: meta.accent }}></span>
            Chương {index + 1} · {meta.tag}
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-8xl font-serif font-light text-white leading-[1.15] md:leading-tight break-words">
            {chapter.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-white/50 text-[10px] md:text-sm font-medium tracking-wide">
            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">{chapter.categories.length} chủ đề</span>
            <span className="bg-white/5 px-3 py-1 rounded-full border border-white/10">{wordCount} từ vựng</span>
          </div>

          <button
            onClick={() => onExplore(chapter, meta)}
            className="group flex items-center gap-4 px-6 md:px-8 py-3.5 md:py-5 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white hover:text-black transition-all duration-300 rounded-full mt-4"
          >
            <span className="font-bold tracking-[0.1em] text-[11px] md:text-sm uppercase">KHÁM PHÁ NGÔN NGỮ</span>
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
    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex flex-col animate-fade">
      <div className="px-6 md:px-20 pt-10 md:pt-16 pb-6">
        <button onClick={onClose} className="mb-6 md:mb-12 text-white/40 hover:text-white flex items-center gap-2 text-[10px] md:text-sm font-bold tracking-widest uppercase transition-all hover:gap-4">
          Đóng cửa sổ tìm kiếm
        </button>
        <div className="relative flex items-center gap-4 border-b border-white/10 pb-4 md:pb-6">
          <input
            autoFocus
            type="text"
            placeholder="Tìm từ Tày hoặc nghĩa Việt..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-2xl md:text-5xl text-white outline-none placeholder:text-white/10 font-serif lowercase"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-0 text-[10px] font-bold tracking-widest text-white/20 hover:text-yellow-500 uppercase">
              XOÁ
            </button>
          )}
        </div>
        {query && (
          <p className="mt-4 text-yellow-500/50 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
            {results.length} kết quả được tìm thấy
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-20 pb-20">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-4">
            {results.map((w, i) => <WordItem key={i} wordData={w} />)}
          </div>
        ) : query ? (
          <div className="text-center py-20 md:py-32 text-white/10 animate-fade">
            <p className="text-xl md:text-3xl font-serif">Chưa thấy thanh âm này...</p>
            <p className="text-xs md:text-sm mt-4 tracking-widest uppercase opacity-40">Thử tìm kiếm với một từ khoá khác nhé</p>
          </div>
        ) : (
          <div className="text-center py-20 md:py-32 text-white/10">
            <p className="text-lg md:text-xl font-light tracking-widest uppercase">Gõ để bắt đầu hành trình...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
const App = () => {
  const [pathname, setPathname] = useState(window.location.pathname);
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

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToFlashcard = () => {
    if (window.location.pathname !== '/flashcard') {
      window.history.pushState({}, '', '/flashcard');
      setPathname('/flashcard');
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToHome = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      setPathname('/');
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const navigateToMultimedia = () => {
    if (window.location.pathname !== '/multimedia') {
      window.history.pushState({}, '', '/multimedia');
      setPathname('/multimedia');
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  if (pathname === '/flashcard') {
    return <FlashcardRescue onExit={navigateToHome} />;
  }

  if (pathname === '/multimedia') {
    return <VideoGallery onExit={navigateToHome} />;
  }

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
        className={`fixed inset-0 z-[200] bg-black flex items-center justify-center transition-transform duration-700 ease-in-out ${isLoaded ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <div className="text-center space-y-4">
          <div className="w-12 h-px bg-yellow-500 mx-auto"></div>
          <p className="text-white/60 tracking-[0.5em] text-xs uppercase">
            Đang mở trang sách cổ...
          </p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className={`fixed top-0 left-0 w-full z-50 px-6 md:px-12 py-5 flex justify-between items-center transition-all duration-500 ${scrollY > 50 ? 'bg-black/80 backdrop-blur-lg border-b border-white/5 py-4' : 'bg-transparent'}`}>
        <div className="flex items-center gap-3 md:gap-4 group cursor-pointer pointer-events-auto" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={logoImg} alt="Tày Logo" className="h-8 md:h-10 w-auto group-hover:rotate-12 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <div className="flex flex-col">
            <span className="font-serif italic text-lg md:text-xl tracking-wide text-white group-hover:text-yellow-400 transition-colors">Tày Heritage</span>
            <span className="text-[7px] md:text-[8px] font-bold tracking-[0.3em] uppercase text-white/40">Multimedia Dictionary</span>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8 pointer-events-auto">
          <button
            onClick={navigateToFlashcard}
            className="flex items-center gap-2 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-emerald-300 hover:text-emerald-200 transition-all"
          >
            <span className="hidden sm:inline">ĐÁNH THỨC TỪ TÀY</span>
            <span className="sm:hidden">Flashcard</span>
          </button>
          <button
            onClick={navigateToMultimedia}
            className="flex items-center gap-2 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-yellow-500 hover:text-yellow-400 transition-all"
          >
            <span className="hidden sm:inline">HOẠT CẢNH</span>
            <span className="sm:hidden">Video</span>
          </button>
          <button
            onClick={() => { setShowSearch(true); setSearchQuery(''); }}
            className="flex items-center gap-2 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white/70 hover:text-yellow-500 transition-all"
          >
            <span className="hidden sm:inline">Tra từ</span>
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen w-full flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20">
        <div className="absolute inset-0 z-0 scale-110">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#05070a] z-10" />
          <img
            src={image1}
            alt="Rừng Tây Bắc"
            className="w-full h-full object-cover opacity-60 md:opacity-100"
            style={{
              transform: `translateY(${scrollY * 0.2}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
        </div>

        <div className="relative z-10 space-y-6 md:space-y-10 max-w-4xl animate-reveal">
          <div className="flex items-center justify-center gap-3 text-yellow-500/80 text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase">
            <div className="h-px w-6 md:w-10 bg-yellow-500/50" />
            <span className="flex items-center gap-2">Thanh âm của gió ngàn</span>
            <div className="h-px w-6 md:w-10 bg-yellow-500/50" />
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-9xl font-serif text-white leading-[1.1] md:leading-tight">
            Chạm vào <br />
            <span className="italic text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.2)]">Bản sắc Tày</span>
          </h1>

          <p className="text-sm md:text-lg text-slate-300 font-light max-w-lg mx-auto leading-relaxed px-4 opacity-80">
            Không chỉ là từ điển — đây là hành trình đi sâu vào linh hồn của những bản làng ẩn mình sau mây.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 md:gap-16 pt-4 max-w-2xl mx-auto">
            {[
              { n: `${totalWords}+`, l: 'Từ vựng' },
              { n: `${dictionaryData.length}`, l: 'Chương' },
              { n: `${dictionaryData.reduce((t, ch) => t + ch.categories.length, 0)}`, l: 'Chủ đề' },
            ].map((s) => (
              <div key={s.l} className="text-center group">
                <p className="text-2xl md:text-4xl font-serif text-yellow-400 group-hover:scale-110 transition-transform">{s.n}</p>
                <p className="text-[8px] md:text-xs text-white/40 uppercase tracking-[0.2em] mt-2">{s.l}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4 pt-8 opacity-60">
            <div className="w-px h-12 md:h-20 bg-gradient-to-b from-yellow-500 to-transparent"></div>
            <span className="text-[9px] md:text-[10px] font-bold tracking-[0.4em] uppercase text-yellow-500/70">Cuộn xuống</span>
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

      <footer className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20 bg-white text-black overflow-hidden">
        <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif mb-6 leading-tight max-w-2xl">
          Di sản nằm trong <br /> bàn tay bạn
        </h2>
        <p className="max-w-md text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] leading-loose opacity-60 mb-10">
          Dự án bảo tồn và lan toả ngôn ngữ dân tộc Tày qua trải nghiệm thị giác hiện đại.
        </p>

        <button
          onClick={() => { setShowSearch(true); setSearchQuery(''); }}
          className="group relative px-10 py-5 bg-black text-white font-bold hover:bg-yellow-500 hover:text-black transition-all duration-500 rounded-full tracking-[0.2em] text-[10px] md:text-xs uppercase overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-3">
            Tra cứu hành trình
          </span>
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </button>

        <button
          onClick={navigateToFlashcard}
          className="mt-4 group relative px-10 py-5 bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all duration-500 rounded-full tracking-[0.2em] text-[10px] md:text-xs uppercase overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-3">
            Đánh Thức Từ Tày
          </span>
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </button>

        <button
          onClick={navigateToMultimedia}
          className="mt-4 group relative px-10 py-5 bg-yellow-600 text-white font-bold hover:bg-yellow-500 hover:text-black transition-all duration-500 rounded-full tracking-[0.2em] text-[10px] md:text-xs uppercase overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-3">
            Xem Hoạt Cảnh
          </span>
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </button>

        <div className="mt-20 pt-10 border-t border-black/5 w-full max-w-lg">
          <p className="text-[8px] font-bold tracking-[0.5em] uppercase opacity-30">© 2026 Tày Heritage Multimedia Project</p>
        </div>
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