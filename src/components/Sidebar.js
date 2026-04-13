import React, { useState } from 'react';
import { BookOpen, ChevronRight, Menu, X } from 'lucide-react';
import './Sidebar.css';
import { dictionaryData } from '../data/dictionaryData';

const Sidebar = ({ activeCategory, setActiveCategory }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <button className="mobile-toggle" onClick={toggleSidebar}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo-container">
          <div className="logo-icon">
            <BookOpen size={24} />
          </div>
          <div className="logo-text">TADA</div>
        </div>

        <div className="nav-chapters">
          {dictionaryData.map((chapter, chapIdx) => (
            <div key={chapIdx} className="chapter-group">
              <h3 className="chapter-title">{chapter.title}</h3>
              <div className="nav-categories">
                {chapter.categories.map((cat, catIdx) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={catIdx}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setActiveCategory(cat);
                        setIsOpen(false);
                      }}
                    >
                      <span className="flex-1">{cat.title}</span>
                      {isActive && <ChevronRight size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90
          }}
        />
      )}
    </>
  );
};

export default Sidebar;
