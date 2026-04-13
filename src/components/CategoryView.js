import React from 'react';
import WordCard from './WordCard';
import './CategoryView.css';

const CategoryView = ({ category, searchQuery }) => {
  if (!category) return null;

  // Render everything inside the category or filter by search query
  const renderWords = (words) => {
    if (!words) return null;
    
    let filteredWords = words;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filteredWords = words.filter(w => 
        w.word.toLowerCase().includes(lowerQuery) || 
        w.meaning.toLowerCase().includes(lowerQuery)
      );
    }

    if (filteredWords.length === 0) return null;

    return (
      <div className="words-grid">
        {filteredWords.map((word, idx) => (
          <WordCard key={idx} wordData={word} />
        ))}
      </div>
    );
  };

  return (
    <div className="category-view">
      <div className="category-header animate-fade-in">
        <h2 className="category-title">{category.title}</h2>
      </div>

      {category.words && category.words.length > 0 && (
        <div className="subcategory-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {renderWords(category.words)}
        </div>
      )}

      {category.subcategories && category.subcategories.map((subcat, idx) => {
        // If we have a search query, we only render subcategories that have matching words
        let hasMatches = true;
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          hasMatches = subcat.words.some(w => 
            w.word.toLowerCase().includes(lowerQuery) || 
            w.meaning.toLowerCase().includes(lowerQuery)
          );
        }

        if (!hasMatches) return null;

        return (
          <div key={idx} className="subcategory-section animate-fade-in" style={{ animationDelay: `${0.1 * (idx + 1)}s` }}>
            <h3 className="subcategory-title">{subcat.title}</h3>
            {renderWords(subcat.words)}
          </div>
        );
      })}
    </div>
  );
};

export default CategoryView;
