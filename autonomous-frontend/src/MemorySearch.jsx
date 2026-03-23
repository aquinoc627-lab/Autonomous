import React, { useState } from 'react';
import { MdSearch, MdHistory, MdPsychology } from 'react-icons/md';
import api from './api';

const MemorySearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/analytics/memory?query=${encodeURIComponent(query)}`);
      setResults(response.data.memories || []);
    } catch (error) {
      console.error('Error searching memory:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="memory-search-wrapper">
      <button 
        className={`memory-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Search Memory Palace"
      >
        <MdPsychology size={24} />
      </button>

      {isOpen && (
        <div className="memory-search-panel neon-panel">
          <div className="panel-header">
            <h3><MdHistory /> Memory Palace Recall</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>&times;</button>
          </div>

          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search semantic memories..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="neon-input"
              />
              <button type="submit" className="search-btn" disabled={loading}>
                <MdSearch size={20} />
              </button>
            </div>
          </form>

          <div className="search-results">
            {loading ? (
              <div className="loading-spinner">Recalling memories...</div>
            ) : results.length > 0 ? (
              results.map((memory, index) => (
                <div key={index} className="memory-item">
                  <div className="memory-meta">
                    <span className="relevance-badge">
                      {Math.round((1 - memory.distance) * 100)}% Match
                    </span>
                    <span className="memory-type">{memory.metadata.collection}</span>
                  </div>
                  <p className="memory-text">{memory.text}</p>
                </div>
              ))
            ) : query && !loading ? (
              <div className="no-results">No relevant memories found.</div>
            ) : (
              <div className="search-placeholder">
                Enter a query to retrieve semantic memories from the Autonomous history.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemorySearch;
