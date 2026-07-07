import React from 'react';

export const Modal = ({ isOpen, title, children, onClose, footer = null }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-between mb-3">
          <h3>{title}</h3>
          <button
            className="close-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--secondary)',
            }}
          >
            ×
          </button>
        </div>

        {children}

        {footer && (
          <div className="modal-footer mt-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
