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

    // Загрузить все слова при монтировании
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

    // Загрузить все существующие слова
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

    // Обработка изменения испанского слова
    const handleEsChange = (value) => {
        setEs(value);

        if (value.length >= 3) {
            const suggestions = allWords.filter(w =>
                w.es.toLowerCase().includes(value.toLowerCase()) &&
                w.es.toLowerCase() !== value.toLowerCase()
            ).slice(0, 5);

            setEsSuggestions(suggestions);
            setShowEsSuggestions(suggestions.length > 0);
        } else {
            setShowEsSuggestions(false);
        }
    };

    // Обработка изменения русского слова
    const handleRuChange = (value) => {
        setRu(value);

        if (value.length >= 3) {
            const suggestions = allWords.filter(w =>
                w.ru.toLowerCase().includes(value.toLowerCase()) &&
                w.ru.toLowerCase() !== value.toLowerCase()
            ).slice(0, 5);

            setRuSuggestions(suggestions);
            setShowRuSuggestions(suggestions.length > 0);
        } else {
            setShowRuSuggestions(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const wordData = {
            nivel: nivel.toUpperCase(),
            es: es.trim(),
            ru: ru.trim()
        };

        try {
            if (word) {
                await updateDoc(doc(db, 'vocabulario', word.id), wordData);
                console.log('Palabra actualizada:', word.id);
                alert('Palabra actualizada exitosamente');
            } else {
                const docRef = await addDoc(collection(db, 'vocabulario'), wordData);
                console.log('Palabra añadida:', docRef.id);
                alert('Palabra añadida exitosamente');
            }
            onClose();
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
                            required
                            disabled={loading}
                            autoComplete="off"
                        />
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
                            required
                            disabled={loading}
                            autoComplete="off"
                        />
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