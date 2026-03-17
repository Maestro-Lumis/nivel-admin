import React from 'react';
import './EmptyState.css';

function EmptyState({
                        icon,
                        title,
                        description,
                        actionText,
                        onAction
                    }) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h3 className="empty-state-title">{title}</h3>
            {description && (
                <p className="empty-state-description">{description}</p>
            )}
            {actionText && onAction && (
                <button className="empty-state-action" onClick={onAction}>
                    {actionText}
                </button>
            )}
        </div>
    );
}

export default EmptyState;