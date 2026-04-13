import React, { useState, useRef } from 'react';
import { Play, Volume2 } from 'lucide-react';
import './WordCard.css';

const WordCard = ({ wordData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = () => {
    // If not currently possessing an audio implementation, fallback to UI indication
    // To support real audio matching the user's intent
    const audioPath = `${process.env.PUBLIC_URL}/audio/${wordData.audio}`;
    
    if (!audioRef.current) {
      audioRef.current = new Audio(audioPath);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        // Fallback for missing audio files for now
        console.warn('Audio not found:', audioPath);
      };
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setIsPlaying(true);
    audioRef.current.play().catch(e => {
      console.warn('Audio playback failed', e);
      setIsPlaying(false);
    });
  };

  return (
    <div className="word-card glass-panel animate-fade-in">
      <div className="word-header">
        <div className="word-texts">
          <div className="tay-word">{wordData.word}</div>
          <div className="viet-meaning">{wordData.meaning}</div>
        </div>
        <button 
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlay}
          title="Nghe phát âm"
        >
          {isPlaying ? <Volume2 size={24} /> : <Play size={24} fill="currentColor" />}
        </button>
      </div>
      {wordData.description && (
        <div className="word-desc">{wordData.description}</div>
      )}
    </div>
  );
};

export default WordCard;
