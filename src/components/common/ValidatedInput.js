import React from 'react';
import './ValidatedInput.css';

function ValidatedInput({
                            label,
                            value,
                            onChange,
                            onBlur,
                            error,
                            success,
                            placeholder,
                            type = 'text',
                            required = false,
                            disabled = false,
                            autoFocus = false
                        }) {
    const showError = error && error.length > 0;
    const showSuccess = success && !showError && value.length > 0;

    return (
        <div className="validated-input-group">
            <label>
                {label}
                {required && <span className="required-mark">*</span>}
            </label>
            <div className="input-wrapper">
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    className={`validated-input ${showError ? 'error' : ''} ${showSuccess ? 'success' : ''}`}
                />
                {showSuccess && (
                    <span className="validation-icon success-icon">✓</span>
                )}
                {showError && (
                    <span className="validation-icon error-icon">✕</span>
                )}
            </div>
            {showError && (
                <span className="error-message">{error}</span>
            )}
        </div>
    );
}

export default ValidatedInput;