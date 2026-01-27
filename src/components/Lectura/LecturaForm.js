// src/components/Lectura/LecturaForm.js
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Lectura.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function LecturaForm({ lectura, onClose }) {
    const [nivel, setNivel] = useState('A1');
    const [texto, setTexto] = useState('');
    const [pregunta, setPregunta] = useState('');
    const [opciones, setOpciones] = useState([
        { texto: '', correcta: false },
        { texto: '', correcta: false },
        { texto: '', correcta: false }
    ]);
    const [loading, setLoading] = useState(false);
    const [allLecturas, setAllLecturas] = useState([]);
    const [textoSuggestions, setTextoSuggestions] = useState([]);
    const [showTextoSuggestions, setShowTextoSuggestions] = useState(false);
    const [errors, setErrors] = useState({
        texto: false,
        pregunta: false,
        opciones: []
    });

    useEffect(() => {
        loadAllLecturas();
    }, []);

    useEffect(() => {
        if (lectura) {
            setNivel(lectura.nivel || 'A1');
            setTexto(lectura.texto || '');
            setPregunta(lectura.pregunta || '');
            setOpciones(lectura.opciones || [
                { texto: '', correcta: false },
                { texto: '', correcta: false },
                { texto: '', correcta: false }
            ]);
        }
    }, [lectura]);

    const loadAllLecturas = async () => {
        try {
            const q = query(collection(db, 'lectura'));
            const querySnapshot = await getDocs(q);
            const lecturas = [];
            querySnapshot.forEach((doc) => {
                lecturas.push(doc.data());
            });
            setAllLecturas(lecturas);
        } catch (error) {
            console.error('Error loading lecturas:', error);
        }
    };

    const handleTextoChange = (value) => {
        setTexto(value);
        if (errors.texto && value.trim()) {
            setErrors({...errors, texto: false});
        }

        if (value.length >= 5) {
            const searchText = value.toLowerCase();
            const suggestions = allLecturas.filter(l => {
                const textLower = l.texto.toLowerCase();
                return textLower.includes(searchText) && textLower !== searchText;
            }).slice(0, 3);

            setTextoSuggestions(suggestions);
            setShowTextoSuggestions(suggestions.length > 0);
        } else {
            setShowTextoSuggestions(false);
        }
    };

    const handleOpcionChange = (index, field, value) => {
        const newOpciones = [...opciones];
        if (field === 'correcta') {
            newOpciones.forEach((op, i) => {
                op.correcta = i === index;
            });
        } else {
            newOpciones[index][field] = value;
            // Clear error for this option if text is added
            if (value.trim()) {
                const newOpcionErrors = [...errors.opciones];
                newOpcionErrors[index] = false;
                setErrors({...errors, opciones: newOpcionErrors});
            }
        }
        setOpciones(newOpciones);
    };

    const removeOpcion = (index) => {
        if (opciones.length > 2) {
            const newOpciones = opciones.filter((_, i) => i !== index);
            setOpciones(newOpciones);
        } else {
            alert('Debe haber al menos 2 opciones');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Проверка на пустые поля
        const newErrors = {
            texto: !texto.trim(),
            pregunta: !pregunta.trim(),
            opciones: opciones.map(op => !op.texto.trim())
        };

        setErrors(newErrors);

        // Собираем список пустых полей
        const emptyFields = [];
        if (newErrors.texto) emptyFields.push('Texto de lectura');
        if (newErrors.pregunta) emptyFields.push('Pregunta');

        const emptyOpciones = newErrors.opciones.filter(e => e).length;
        if (emptyOpciones > 0) {
            emptyFields.push(`${emptyOpciones} opción(es) de respuesta`);
        }

        // Если есть ошибки, блокируем сохранение
        if (emptyFields.length > 0) {
            alert(`Por favor, complete los siguientes campos:\n${emptyFields.join('\n')}`);
            return;
        }

        setLoading(true);

        const hasCorrectAnswer = opciones.some(op => op.correcta);
        if (!hasCorrectAnswer) {
            alert('Debe marcar una opción como correcta');
            setLoading(false);
            return;
        }

        const lecturaData = {
            nivel: nivel.toUpperCase(),
            texto: texto.trim(),
            pregunta: pregunta.trim(),
            opciones: opciones.map(op => ({
                texto: op.texto.trim(),
                correcta: op.correcta
            }))
        };

        try {
            if (lectura) {
                await updateDoc(doc(db, 'lectura', lectura.id), lecturaData);
                console.log('Lectura actualizada:', lectura.id);
                alert('Lectura actualizada exitosamente');
            } else {
                const docRef = await addDoc(collection(db, 'lectura'), lecturaData);
                console.log('Lectura añadida:', docRef.id);
                alert('Lectura añadida exitosamente');
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
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{lectura ? 'Editar Lectura' : 'Añadir Lectura'}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="lectura-form">
                    <div className="form-group">
                        <label>Nivel:</label>
                        <select
                            value={nivel}
                            onChange={(e) => setNivel(e.target.value)}
                            disabled={loading}
                        >
                            {NIVELES.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group autocomplete-group">
                        <label>Texto de lectura:</label>
                        <textarea
                            value={texto}
                            onChange={(e) => handleTextoChange(e.target.value)}
                            onFocus={() => texto.length >= 5 && setShowTextoSuggestions(textoSuggestions.length > 0)}
                            onBlur={() => setTimeout(() => setShowTextoSuggestions(false), 200)}
                            placeholder="En un reino lejano..."
                            disabled={loading}
                            rows={10}
                            autoComplete="off"
                            className={errors.texto ? 'input-error' : ''}
                        />
                        <small className="char-count">{texto.length} caracteres</small>
                        {errors.texto && (
                            <span className="error-message">Este campo es obligatorio</span>
                        )}

                        {showTextoSuggestions && (
                            <div className="suggestions-dropdown texto-suggestions">
                                <div className="suggestions-header warning-header">
                                    Похожие тексты уже существуют:
                                </div>
                                {textoSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="suggestion-item texto-suggestion"
                                        onClick={() => {
                                            setTexto(suggestion.texto);
                                            setPregunta(suggestion.pregunta);
                                            setNivel(suggestion.nivel);
                                            setOpciones(suggestion.opciones);
                                            setShowTextoSuggestions(false);
                                        }}
                                    >
                                        <div className="texto-preview-suggestion">
                                            {suggestion.texto.substring(0, 120)}...
                                        </div>
                                        <div className="suggestion-meta">
                                            <span className={`suggestion-nivel nivel-${suggestion.nivel.toLowerCase()}`}>
                                                {suggestion.nivel}
                                            </span>
                                            <span className="suggestion-pregunta">
                                                {suggestion.pregunta}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Pregunta:</label>
                        <input
                            type="text"
                            value={pregunta}
                            onChange={(e) => {
                                setPregunta(e.target.value);
                                if (errors.pregunta && e.target.value.trim()) {
                                    setErrors({...errors, pregunta: false});
                                }
                            }}
                            placeholder="¿Qué sucedió al final?"
                            disabled={loading}
                            className={errors.pregunta ? 'input-error' : ''}
                        />
                        {errors.pregunta && (
                            <span className="error-message">Este campo es obligatorio</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Opciones de respuesta:</label>
                        <div className="opciones-list">
                            {opciones.map((opcion, index) => (
                                <div key={index} className="opcion-item">
                                    <div className="opcion-number">{index + 1}</div>
                                    <input
                                        type="text"
                                        value={opcion.texto}
                                        onChange={(e) => handleOpcionChange(index, 'texto', e.target.value)}
                                        placeholder="Texto de la opción"
                                        disabled={loading}
                                        className={errors.opciones[index] ? 'input-error' : ''}
                                    />
                                    <label className="checkbox-label">
                                        <input
                                            type="radio"
                                            name="correcta"
                                            checked={opcion.correcta}
                                            onChange={() => handleOpcionChange(index, 'correcta', true)}
                                            disabled={loading}
                                        />
                                        <span>Correcta</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                        {errors.opciones.some(e => e) && (
                            <span className="error-message">Todas las opciones deben tener texto</span>
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

export default LecturaForm;