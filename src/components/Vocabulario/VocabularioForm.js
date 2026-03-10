// src/components/Vocabulario/VocabularioForm.js
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
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
    const [quickAdd, setQuickAdd] = useState(false); // ← НОВОЕ
    const [errors, setErrors] = useState({
        es: false,
        ru: false
    });

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

    const loadAllWords = async () => {
        try {
            const q = query(collection(db, 'vocabulario'));
            const querySnapshot = await getDocs(q);
            const words = [];
            querySnapshot.forEach((doc) => {
                words.push(doc.data());
            });
            setAllWords(words);
        } catch (error) {
            console.error('Error loading words:', error);
        }
    };

    const handleEsChange = (value) => {
        setEs(value);
        if (errors.es && value.trim()) {
            setErrors({...errors, es: false});
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
        if (errors.ru && value.trim()) {
            setErrors({...errors, ru: false});
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

    // Очистить поля для быстрого добавления
    const clearForm = () => {
        setEs('');
        setRu('');
        setErrors({ es: false, ru: false });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {
            es: !es.trim(),
            ru: !ru.trim()
        };

        setErrors(newErrors);

        if (newErrors.es || newErrors.ru) {
            const emptyFields = [];
            if (newErrors.es) emptyFields.push('Español');
            if (newErrors.ru) emptyFields.push('Русский');

            alert(`Por favor, complete los siguientes campos: ${emptyFields.join(', ')}`);
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
                // Редактирование: проверяем дубликаты, кроме самого себя
                const duplicate = allWords.find(w =>
                        w.id !== word.id && (
                            w.es.toLowerCase().trim() === wordData.es.toLowerCase() ||
                            w.ru.toLowerCase().trim() === wordData.ru.toLowerCase()
                        )
                );

                if (duplicate) {
                    alert(`⚠️ Esta palabra ya existe:\n${duplicate.es} - ${duplicate.ru}`);
                    setLoading(false);
                    return;
                }

                await updateDoc(doc(db, 'vocabulario', word.id), wordData);
                console.log('Palabra actualizada:', word.id);
                alert('Palabra actualizada exitosamente');
                onClose(); // Всегда закрываем при редактировании
            } else {
                // роверяем дубликаты
                const duplicate = allWords.find(w =>
                    w.es.toLowerCase().trim() === wordData.es.toLowerCase() ||
                    w.ru.toLowerCase().trim() === wordData.ru.toLowerCase()
                );

                if (duplicate) {
                    const confirmAdd = window.confirm(
                        `⚠️ Esta palabra ya existe:\n${duplicate.es} - ${duplicate.ru}\n\n¿Desea añadirla de todos modos?`
                    );
                    if (!confirmAdd) {
                        setLoading(false);
                        return;
                    }
                }

                const docRef = await addDoc(collection(db, 'vocabulario'), wordData);
                console.log('Palabra añadida:', docRef.id);

                // Если quickAdd включен, очищаем форму и продолжаем
                if (quickAdd) {
                    clearForm();
                    await loadAllWords();
                } else {
                    alert('Palabra añadida exitosamente');
                    onClose();
                }
            }
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

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
                        <label>Español:</label>
                        <input
                            type="text"
                            value={es}
                            onChange={(e) => handleEsChange(e.target.value)}
                            onFocus={() => es.length >= 3 && setShowEsSuggestions(esSuggestions.length > 0)}
                            onBlur={() => setTimeout(() => setShowEsSuggestions(false), 200)}
                            placeholder="la casa"
                            disabled={loading}
                            autoComplete="off"
                            className={errors.es ? 'input-error' : ''}
                        />
                        {errors.es && (
                            <span className="error-message">Este campo es obligatorio</span>
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
                        <label>Русский:</label>
                        <input
                            type="text"
                            value={ru}
                            onChange={(e) => handleRuChange(e.target.value)}
                            onFocus={() => ru.length >= 3 && setShowRuSuggestions(ruSuggestions.length > 0)}
                            onBlur={() => setTimeout(() => setShowRuSuggestions(false), 200)}
                            placeholder="дом"
                            disabled={loading}
                            autoComplete="off"
                            className={errors.ru ? 'input-error' : ''}
                        />
                        {errors.ru && (
                            <span className="error-message">Это поле обязательно</span>
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

                    {/* Quick Add Checkbox */}
                    {!word && (
                        <div className="quick-add-checkbox">
                            <input
                                type="checkbox"
                                id="quickAdd"
                                checked={quickAdd}
                                onChange={(e) => setQuickAdd(e.target.checked)}
                                disabled={loading}
                            />
                            <label htmlFor="quickAdd">⚡ Guardar y añadir otra palabra</label>
                        </div>
                    )}

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