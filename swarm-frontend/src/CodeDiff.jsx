import React, { useState } from 'react';

/**
 * CodeDiff Component
 * Displays a visual comparison of code changes before PR creation.
 */
const CodeDiff = ({ originalCode, newCode, fileName, onApprove, onReject, isOpen, onClose }) => {
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' or 'unified'

  if (!isOpen) return null;

  const renderDiffLines = () => {
    const originalLines = originalCode.split('\n');
    const newLines = newCode.split('\n');

    if (viewMode === 'unified') {
      return (
        <div className="diff-unified">
          {originalLines.map((line, idx) => (
            <div key={`orig-${idx}`} className="diff-line diff-removed">
              <span className="diff-line-num">-{idx + 1}</span>
              <span className="diff-content">{line}</span>
            </div>
          ))}
          {newLines.map((line, idx) => (
            <div key={`new-${idx}`} className="diff-line diff-added">
              <span className="diff-line-num">+{idx + 1}</span>
              <span className="diff-content">{line}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="diff-side-by-side">
        <div className="diff-column">
          <h4>Original</h4>
          {originalLines.map((line, idx) => (
            <div key={`orig-${idx}`} className="diff-line">
              <span className="diff-line-num">{idx + 1}</span>
              <span className="diff-content">{line}</span>
            </div>
          ))}
        </div>
        <div className="diff-column">
          <h4>New</h4>
          {newLines.map((line, idx) => (
            <div key={`new-${idx}`} className="diff-line diff-added">
              <span className="diff-line-num">{idx + 1}</span>
              <span className="diff-content">{line}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="code-diff-overlay">
      <div className="code-diff-container">
        <div className="code-diff-header">
          <h3>Code Diff — {fileName}</h3>
          <div className="diff-controls">
            <button 
              className={`view-mode-btn ${viewMode === 'unified' ? 'active' : ''}`}
              onClick={() => setViewMode('unified')}
            >
              Unified
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
            >
              Side-by-Side
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="code-diff-body">
          {renderDiffLines()}
        </div>

        <div className="code-diff-footer">
          <button className="diff-btn diff-reject" onClick={onReject}>Reject Changes</button>
          <button className="diff-btn diff-approve" onClick={onApprove}>Approve & Create PR</button>
        </div>
      </div>
    </div>
  );
};

export default CodeDiff;
