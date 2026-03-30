// src/components/common/ConfirmDialog.js
import React, { useEffect } from 'react';
import './ConfirmDialog.css';

/**
 * ConfirmDialog – a styled replacement for window.confirm
 *
 * Props:
 *   isOpen      {boolean}   – show / hide the dialog
 *   title       {string}    – bold heading (e.g. "Eliminar palabra")
 *   message     {string}    – body text (supports JSX)
 *   confirmText {string}    – label for the confirm button  (default "Confirmar")
 *   cancelText  {string}    – label for the cancel button   (default "Cancelar")
 *   variant     {string}    – "danger" | "warning" | "default"  (default "default")
 *   onConfirm   {function}  – called when the user clicks confirm
 *   onCancel    {function}  – called when the user clicks cancel or the overlay
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showConfirm}
 *     title='¿Eliminar palabra?'
 *     message={`¿Seguro que quieres eliminar "${wordEs}"? Esta acción no se puede deshacer.`}
 *     confirmText='Eliminar'
 *     variant='danger'
 *     onConfirm={handleConfirmedDelete}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
function ConfirmDialog({
                           isOpen,
                           title = 'Confirmar',
                           message,
                           confirmText = 'Confirmar',
                           cancelText = 'Cancelar',
                           variant = 'default',
                           onConfirm,
                           onCancel,
                       }) {
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onCancel?.();
            if (e.key === 'Enter') onConfirm?.();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel, onConfirm]);

    if (!isOpen) return null;

    const icons = {
        danger: '🗑️',
        warning: '⚠️',
        default: '❓',
    };

    return (
        <div className="confirm-overlay" onClick={onCancel}>
            <div
                className={`confirm-dialog confirm-${variant}`}
                onClick={(e) => e.stopPropagation()}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
            >
                <div className="confirm-icon">{icons[variant] ?? icons.default}</div>

                <div className="confirm-body">
                    <h3 id="confirm-title" className="confirm-title">{title}</h3>
                    {message && <p className="confirm-message">{message}</p>}
                </div>

                <div className="confirm-actions">
                    <button
                        className="confirm-btn-cancel"
                        onClick={onCancel}
                        autoFocus
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`confirm-btn-confirm confirm-btn-${variant}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>

                <p className="confirm-keyboard-hint">
                    <span>Esc – cancelar</span>
                    <span>Enter – confirmar</span>
                </p>
            </div>
        </div>
    );
}

export default ConfirmDialog;