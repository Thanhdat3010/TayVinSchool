import React, { useState, useEffect } from 'react';
import './VideoGallery.css';

const VIDEOS = [
  { title: 'Đồ dùng sinh hoạt: Nồi', filename: ' ĐỒ DÙNG SINH HOẠT _ Nồi.mov', category: 'Đời sống' },
  { title: 'Con vật', filename: 'CON VẬT.mp4', category: 'Tự nhiên' },
  { title: 'Con dao', filename: 'Con dao.mov', category: 'Lao động' },
  { title: 'Cái cuốc', filename: 'Cái cuốc.mov', category: 'Lao động' },
  { title: 'Cái xẻng', filename: 'Cái xẻng.mov', category: 'Lao động' },
  { title: 'Đồ dùng: Đũa và bát', filename: 'HOẠT CẢNH ĐỒ DÙNG SINH HOẠT _ Đũa và bát.mov', category: 'Đời sống' },
  { title: 'Hát Lượn (Văn Quan)', filename: 'Hát Lượn, Văn Quan-Lạng Sơn.mp4', category: 'Nghệ thuật' },
  { title: 'Hát Sli (Chi Lăng)', filename: 'Hát Sli, Bản Thí-Chi Lăng-Lạng Sơn.mp4', category: 'Nghệ thuật' },
  { title: 'Hát Then', filename: 'Hát Then.mp4', category: 'Nghệ thuật' },
  { title: 'Lễ Thanh Minh', filename: 'Lễ Thanh Minh.mp4', category: 'Văn hoá' },
  { title: 'Mời ăn cơm', filename: 'Mời ăn Cơm_.mov', category: 'Giao tiếp' },
  { title: 'Số đếm', filename: 'Số Đếm.mp4', category: 'Kiến thức' },
];

const VideoGallery = ({ onExit }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = () => {
    onExit();
  };

  const openVideo = (video) => {
    setSelectedVideo(video);
  };

  const closeVideo = () => {
    setSelectedVideo(null);
  };

  return (
    <div className={`video-gallery-root ${isLoaded ? 'loaded' : ''}`}>
      {/* Background Decor */}
      <div className="bg-decor">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <nav className="gallery-nav">
        <button onClick={handleBack} className="back-btn">
          <span className="arrow">←</span>
          <span className="text">QUAY LẠI</span>
        </button>
        <div className="nav-title">
          <p className="subtitle">MULTIMEDIA HERITAGE</p>
          <h1 className="title">Hoạt cảnh Tiếng Tày</h1>
        </div>
        <div className="nav-placeholder"></div>
      </nav>

      <main className="gallery-content">
        <div className="video-grid">
          {VIDEOS.map((video, index) => (
            <div 
              key={index} 
              className="video-card" 
              onClick={() => openVideo(video)}
              style={{ '--delay': `${index * 0.1}s` }}
            >
              <div className="card-inner">
                <div className="card-thumb">
                  {/* We don't have thumbnails, so we use a stylized placeholder */}
                  <div className="thumb-placeholder">
                    <span className="play-icon">▶</span>
                  </div>
                  <div className="category-tag">{video.category}</div>
                </div>
                <div className="card-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p className="video-desc">Phim hoạt cảnh học sinh tự thực hiện</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="video-modal" onClick={closeVideo}>
          <div className="modal-backdrop" />
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={closeVideo}>×</button>
            <div className="video-player-container">
              {selectedVideo.youtubeId ? (
                <iframe
                  className="main-video"
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : selectedVideo.url ? (
                <video controls autoPlay className="main-video">
                  <source src={selectedVideo.url} />
                  Trình duyệt của bạn không hỗ trợ thẻ video.
                </video>
              ) : (
                <video 
                  controls 
                  autoPlay 
                  className="main-video"
                  poster="/assets/video-poster.png"
                >
                  <source src={`${process.env.PUBLIC_URL}/hoat_canh/${encodeURIComponent(selectedVideo.filename)}`} />
                  Trình duyệt của bạn không hỗ trợ xem video.
                </video>
              )}
            </div>
            <div className="video-details">
              <span className="detail-category">{selectedVideo.category}</span>
              <h2 className="detail-title">{selectedVideo.title}</h2>
              <p className="detail-desc">Đây là video thực tế về văn hoá và ngôn ngữ Tày được các bạn học sinh dày công thực hiện nhằm bảo tồn bản sắc quê hương.</p>
            </div>
          </div>
        </div>
      )}

      <footer className="gallery-footer">
        <p>© 2026 Tày Heritage - Gìn giữ bản sắc qua từng thước phim</p>
      </footer>
    </div>
  );
};

export default VideoGallery;
