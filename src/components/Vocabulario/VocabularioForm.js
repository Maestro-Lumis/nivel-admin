import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useToast } from '../common/Toast';
import './Vocabulario.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function VocabularioForm({ word, onClose }) {
    const [nivel, setNivel] = useState('A1');
    const [es, setEs] = useState('');
    const [ru, setRu] = useState('');
    const [loading, setLoading] = useState(false);
    const [allWords, setAllWords] = useState([]);
    const [esSuggestions, setEsSuggestions] = useState([]);
    const [ruSuggestions, setRuSuggestions] = useState([]);
    const [showEsSuggestions, setShowEsSuggestions] = useState(false);
    const [showRuSuggestions, setShowRuSuggestions] = useState(false);
    const [quickAdd, setQuickAdd] = useState(false);
    const [errors, setErrors] = useState({
        es: '',
        ru: ''
    });
    const [touched, setTouched] = useState({
        es: false,
        ru: false
    });

    const toast = useToast();

    useEffect(() => {
        loadAllWords();
    }, []);

    useEffect(() => {
        if (word) {
            setNivel(word.nivel || 'A1');
            setEs(word.es || '');
            setRu(word.ru || '');
        }
    }, [word]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit(e);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [es, ru, nivel, quickAdd]);

    const loadAllWords = async () => {
        try {
            const q = query(collection(db, 'vocabulario'));
            const querySnapshot = await getDocs(q);
            const words = [];
            querySnapshot.forEach((docSnap) => {
                words.push({ id: docSnap.id, ...docSnap.data() });
            });
            setAllWords(words);
        } catch (error) {
            console.error('Error loading words:', error);
        }
    };

    const validateEs = (value) => {
        if (!value.trim()) {
            return 'Este campo es obligatorio';
        }
        if (value.trim().length < 2) {
            return 'Mínimo 2 caracteres';
        }
        return '';
    };

    const validateRu = (value) => {
        if (!value.trim()) {
            return 'Это поле обязательно';
        }
        if (value.trim().length < 2) {
            return 'Минимум 2 символа';
        }
        return '';
    };

    const handleEsChange = (value) => {
        setEs(value);
        if (touched.es) {
            setErrors(prev => ({ ...prev, es: validateEs(value) }));
        }

        if (value.length >= 3) {
            const suggestions = allWords.filter(w =>
                w.es.toLowerCase().startsWith(value.toLowerCase()) &&
                w.es.toLowerCase() !== value.toLowerCase()
            ).slice(0, 5);

            setEsSuggestions(suggestions);
            setShowEsSuggestions(suggestions.length > 0);
        } else {
            setShowEsSuggestions(false);
        }
    };

    const handleRuChange = (value) => {
        setRu(value);
        if (touched.ru) {
            setErrors(prev => ({ ...prev, ru: validateRu(value) }));
        }

        if (value.length >= 3) {
            const suggestions = allWords.filter(w =>
                w.ru.toLowerCase().startsWith(value.toLowerCase()) &&
                w.ru.toLowerCase() !== value.toLowerCase()
            ).slice(0, 5);

            setRuSuggestions(suggestions);
            setShowRuSuggestions(suggestions.length > 0);
        } else {
            setShowRuSuggestions(false);
        }
    };

    const handleEsBlur = () => {
        setTouched(prev => ({ ...prev, es: true }));
        setErrors(prev => ({ ...prev, es: validateEs(es) }));
    };

    const handleRuBlur = () => {
        setTouched(prev => ({ ...prev, ru: true }));
        setErrors(prev => ({ ...prev, ru: validateRu(ru) }));
    };

    const clearForm = () => {
        setEs('');
        setRu('');
        setErrors({ es: '', ru: '' });
        setTouched({ es: false, ru: false });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const esError = validateEs(es);
        const ruError = validateRu(ru);

        setErrors({ es: esError, ru: ruError });
        setTouched({ es: true, ru: true });

        if (esError || ruError) {
            toast.warning('Por favor, completa todos los campos correctamente');
            return;
        }

        setLoading(true);

        const wordData = {
            nivel: nivel.toUpperCase(),
            es: es.trim(),
            ru: ru.trim()
        };

        try {
            if (word) {
                const duplicate = allWords.find(w =>
                    w.id !== word.id &&
                    w.es.toLowerCase().trim() === wordData.es.toLowerCase() &&
                    w.ru.toLowerCase().trim() === wordData.ru.toLowerCase()
                );

                if (duplicate) {
                    toast.warning(`Esta combinación ya existe: ${duplicate.es} - ${duplicate.ru} (${duplicate.nivel})`);
                    setLoading(false);
                    return;
                }

                await updateDoc(doc(db, 'vocabulario', word.id), wordData);
                toast.success('Palabra actualizada');
                onClose();
            } else {
                const duplicate = allWords.find(w =>
                    w.es.toLowerCase().trim() === wordData.es.toLowerCase() &&
                    w.ru.toLowerCase().trim() === wordData.ru.toLowerCase()
                );

                if (duplicate) {
                    toast.error(`⚠️ Esta palabra ya existe:\n${duplicate.es} - ${duplicate.ru} (${duplicate.nivel})`);

                    setErrors({
                        es: 'Esta combinación ya existe',
                        ru: 'Эта комбинация уже существует'
                    });
                    setTouched({ es: true, ru: true });

                    setLoading(false);
                    return;
                }

                await addDoc(collection(db, 'vocabulario'), wordData);

                if (quickAdd) {
                    clearForm();
                    await loadAllWords();
                    toast.success('Palabra añadida');
                } else {
                    toast.success('Palabra añadida');
                    onClose();
                }
            }
        } catch (error) {
            console.error('Error al guardar:', error);
            toast.error('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const isEsValid = !errors.es && es.trim().length > 0;
    const isRuValid = !errors.ru && ru.trim().length > 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{word ? 'Editar Palabra' : 'Añadir Palabra'}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nivel:</label>
                        <select
                            value={nivel}
                            onChange={(e) => setNivel(e.target.value)}
                            required
                            disabled={loading}
                        >
                            {NIVELES.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group autocomplete-group">
                        <label>
                            Español:
                            <span className="required-mark">*</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                value={es}
                                onChange={(e) => handleEsChange(e.target.value)}
                                onFocus={() => es.length >= 3 && setShowEsSuggestions(esSuggestions.length > 0)}
                                onBlur={() => {
                                    setTimeout(() => setShowEsSuggestions(false), 200);
                                    handleEsBlur();
                                }}
                                placeholder="la casa"
                                disabled={loading}
                                autoComplete="off"
                                className={`${errors.es ? 'input-error' : ''} ${isEsValid ? 'input-success' : ''}`}
                            />
                            {isEsValid && !showEsSuggestions && (
                                <span className="validation-icon success-icon">✓</span>
                            )}
                            {errors.es && touched.es && (
                                <span className="validation-icon error-icon">✕</span>
                            )}
                        </div>
                        {errors.es && touched.es && (
                            <span className="error-message">{errors.es}</span>
                        )}
                        {showEsSuggestions && (
                            <div className="suggestions-dropdown">
                                <div className="suggestions-header">
                                    Palabras existentes:
                                </div>
                                {esSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="suggestion-item"
                                        onClick={() => {
                                            setEs(suggestion.es);
                                            setRu(suggestion.ru);
                                            setNivel(suggestion.nivel);
                                            setShowEsSuggestions(false);
                                        }}
                                    >
                                        <span className="suggestion-es">{suggestion.es}</span>
                                        <span className="suggestion-separator">→</span>
                                        <span className="suggestion-ru">{suggestion.ru}</span>
                                        <span className={`suggestion-nivel nivel-${suggestion.nivel.toLowerCase()}`}>
                                            {suggestion.nivel}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group autocomplete-group">
                        <label>
                            Русский:
                            <span className="required-mark">*</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                value={ru}
                                onChange={(e) => handleRuChange(e.target.value)}
                                onFocus={() => ru.length >= 3 && setShowRuSuggestions(ruSuggestions.length > 0)}
                                onBlur={() => {
                                    setTimeout(() => setShowRuSuggestions(false), 200);
                                    handleRuBlur();
                                }}
                                placeholder="дом"
                                disabled={loading}
                                autoComplete="off"
                                className={`${errors.ru ? 'input-error' : ''} ${isRuValid ? 'input-success' : ''}`}
                            />
                            {isRuValid && !showRuSuggestions && (
                                <span className="validation-icon success-icon">✓</span>
                            )}
                            {errors.ru && touched.ru && (
                                <span className="validation-icon error-icon">✕</span>
                            )}
                        </div>
                        {errors.ru && touched.ru && (
                            <span className="error-message">{errors.ru}</span>
                        )}
                        {showRuSuggestions && (
                            <div className="suggestions-dropdown">
                                <div className="suggestions-header">
                                    Слова уже существуют:
                                </div>
                                {ruSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="suggestion-item"
                                        onClick={() => {
                                            setEs(suggestion.es);
                                            setRu(suggestion.ru);
                                            setNivel(suggestion.nivel);
                                            setShowRuSuggestions(false);
                                        }}
                                    >
                                        <span className="suggestion-es">{suggestion.es}</span>
                                        <span className="suggestion-separator">→</span>
                                        <span className="suggestion-ru">{suggestion.ru}</span>
                                        <span className={`suggestion-nivel nivel-${suggestion.nivel.toLowerCase()}`}>
                                            {suggestion.nivel}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {!word && (
                        <div className="quick-add-checkbox">
                            <input
                                type="checkbox"
                                id="quickAdd"
                                checked={quickAdd}
                                onChange={(e) => setQuickAdd(e.target.checked)}
                                disabled={loading}
                            />
                            <label htmlFor="quickAdd">Guardar y añadir otra palabra</label>
                        </div>
                    )}

                    <div className="keyboard-hints">
                        <span>Esc - cancelar</span>
                        <span>Ctrl/Cmd + Enter - guardar</span>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-save"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default VocabularioForm;