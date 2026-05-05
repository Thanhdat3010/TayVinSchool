import React, { useState, useEffect } from 'react';
import './VideoGallery.css';

const VIDEOS = [
  { title: 'Đồ dùng sinh hoạt: Nồi', filename: ' ĐỒ DÙNG SINH HOẠT _ Nồi.mp4', category: 'Đời sống' },
  { title: 'Con vật', filename: 'CON VẬT.mp4', category: 'Tự nhiên' },
  { title: 'Con dao', filename: 'Con dao.mp4', category: 'Lao động' },
  { title: 'Cái cuốc', filename: 'Cái cuốc.mp4', category: 'Lao động' },
  { title: 'Cái xẻng', filename: 'Cái xẻng.mp4', category: 'Lao động' },
  { title: 'Đồ dùng: Đũa và bát', filename: 'HOẠT CẢNH ĐỒ DÙNG SINH HOẠT _ Đũa và bát.mp4', category: 'Đời sống' },
  { title: 'Hát Then', filename: 'Hát Then.mp4', category: 'Nghệ thuật' },
  { title: 'Lễ Thanh Minh', filename: 'Lễ Thanh Minh.mp4', category: 'Văn hoá' },
  { title: 'Mời ăn cơm', filename: 'Mời ăn Cơm_.mp4', category: 'Giao tiếp' },
  { title: 'Bờ ruộng', filename: 'Bờ ruộng.mp4', category: 'Tự nhiên' },
  { title: 'Cái bừa', filename: 'Cái bừa.mp4', category: 'Lao động' },
  { title: 'Cái cày', filename: 'Cái cày.mp4', category: 'Lao động' },
  { title: 'Cái gùi gánh', filename: 'Cái gùi_gánh.mp4', category: 'Lao động' },
  { title: 'Cái liềm', filename: 'Cái liềm.mp4', category: 'Lao động' },
  { title: 'Cây lúa', filename: 'cây lúa.mp4', category: 'Tự nhiên' },
  { title: 'Đất, trồng', filename: 'Đất, trồng.mp4', category: 'Lao động' },
  { title: 'Đồi', filename: 'Đồi.mp4', category: 'Tự nhiên' },
  { title: 'Đốt nương', filename: 'Đốt nương.mp4', category: 'Lao động' },
  { title: 'Lấy củi', filename: 'Lấy củi.mp4', category: 'Lao động' },
  { title: 'Nhổ cỏ', filename: 'Nhổ cỏ.mp4', category: 'Lao động' },
  { title: 'Nương', filename: 'Nương.mp4', category: 'Tự nhiên' },
  { title: 'Rau', filename: 'Rau.mp4', category: 'Tự nhiên' },
  { title: 'Ruộng', filename: 'Ruộng.mp4', category: 'Tự nhiên' },
  { title: 'Trồng trọt: Sắn, cà chua, ngô', filename: 'Trồng trọt_ Sắn, cà chua, ngô.mp4', category: 'Lao động' },
  { title: 'Cầu thang', filename: 'Cầu thang .MOV', category: 'Đời sống' },
  { title: 'Chảo', filename: 'Chảo.MOV', category: 'Đời sống' },
  { title: 'Cột nhà', filename: 'Cột nhà.MOV', category: 'Đời sống' },
  { title: 'Cửa chính', filename: 'Cửa chính.MOV', category: 'Đời sống' },
  { title: 'Cửa sổ', filename: 'Cửa sổ.MOV', category: 'Đời sống' },
  { title: 'Cửa', filename: 'Cửa.MOV', category: 'Đời sống' },
  { title: 'Đánh trống', filename: 'Đánh trống.mov', category: 'Nghệ thuật' },
  { title: 'Đĩa', filename: 'Đĩa.MOV', category: 'Đời sống' },
  { title: 'Dọn mộ', filename: 'Dọn mộ.mov', category: 'Văn hoá' },
  { title: 'Gầm nhà', filename: 'Gầm nhà.MOV', category: 'Đời sống' },
  { title: 'Gian nhà', filename: 'Gian nhà .MOV', category: 'Đời sống' },
  { title: 'Hiên nhà', filename: 'Hiên nhà.MOV', category: 'Đời sống' },
  { title: 'Hoa', filename: 'Hoa.mov', category: 'Tự nhiên' },
  { title: 'Mái nhà', filename: 'Mái nhà .MOV', category: 'Đời sống' },
  { title: 'Mâm', filename: 'Mâm .MOV', category: 'Đời sống' },
  { title: 'Mộ', filename: 'Mộ.mov', category: 'Văn hoá' },
  { title: 'Múa sư tử mèo', filename: 'Múa sư tử mèo.mov', category: 'Nghệ thuật' },
  { title: 'Ném còn', filename: 'Ném còn.mov', category: 'Văn hoá' },
  { title: 'Nhóm lửa', filename: 'Nhóm lửa.MOV', category: 'Đời sống' },
  { title: 'Rổ', filename: 'Rổ.MOV', category: 'Đời sống' },
  { title: 'Sàn nhà', filename: 'Sàn nhà.MOV', category: 'Đời sống' },
  { title: 'Thớt', filename: 'Thớt.MOV', category: 'Đời sống' },
  { title: 'Trái cây', filename: 'Trái cây.mov', category: 'Tự nhiên' },
  { title: 'Xôi cẩm', filename: 'Xôi cẩm.mov', category: 'Văn hoá' },
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
