import React from 'react';
import './SearchBar.css';

const SearchBar = ({ searchQuery, setSearchQuery, resultCount }) => {
  return (
    <div className="searchbar-wrapper">
      <div className="searchbar glass-panel">
        <input
          id="search-input"
          type="text"
          placeholder="Tìm kiếm từ Tày hoặc nghĩa tiếng Việt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          autoComplete="off"
        />
        {searchQuery && (
          <button
            className="clear-btn"
            onClick={() => setSearchQuery('')}
          >
            XOÁ
          </button>
        )}
      </div>
      {searchQuery && (
        <div className="search-hint">
          Tìm thấy <span className="result-count">{resultCount}</span> từ phù hợp với "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default SearchBar;
