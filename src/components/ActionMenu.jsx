// src/components/ActionMenu.jsx
import React from 'react';
import './ActionMenu.css'; 

const ActionMenu = ({ isOpen, title, options, onClose }) => {
    if (!isOpen) return null;

    return (
        // ✅ FIX 1: Add onClick={onClose} to the overlay to close the modal when background is clicked.
        // This also ensures the component behaves correctly during state updates.
        <div className="action-menu-overlay" onClick={onClose}> 
            
            {/* ✅ FIX 2: Stop click events on the modal itself from bubbling up to the overlay. */}
            <div className="action-menu-modal" onClick={(e) => e.stopPropagation()}>
                
                <h3>{title}</h3>
                <div className="action-menu-options">
                    {options.map((option, index) => (
                        <button
                            key={index}
                            className={`btn-action btn-${option.type || 'default'}`}
                            // This is CORRECT: It calls handleDeleteUser from UserForm
                            onClick={option.action} 
                            disabled={option.disabled} 
                        >
                            {/* Minor enhancement: Show status when loading */}
                            {option.disabled ? 'Memproses...' : option.label} 
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActionMenu;