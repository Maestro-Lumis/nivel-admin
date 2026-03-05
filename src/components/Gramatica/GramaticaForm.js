// src/components/Gramatica/GramaticaForm.js
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Gramatica.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function GramaticaForm({ question, onClose }) {
    const [nivel, setNivel] = useState('A1');
    const [tipo, setTipo] = useState('multiple_choice');
    const [pregunta, setPregunta] = useState('');

    // Multiple Choice & Error Correction
    const [opciones, setOpciones] = useState([
        { texto: '', correcta: false },
        { texto: '', correcta: false },
        { texto: '', correcta: false },
        { texto: '', correcta: false }
    ]);

    // Error Correction specific
    const [fraseIncorrecta, setFraseIncorrecta] = useState('');
    const [errorPalabra, setErrorPalabra] = useState('');
    const [explicacion, setExplicacion] = useState('');

    // Drag & Drop
    const [palabras, setPalabras] = useState(['']);
    const [respuestaCorrecta, setRespuestaCorrecta] = useState('');

    const [loading, setLoading] = useState(false);

    // ✅ НОВОЕ: Автокомплит
    const [allQuestions, setAllQuestions] = useState([]);
    const [preguntaSuggestions, setPreguntaSuggestions] = useState([]);
    const [showPreguntaSuggestions, setShowPreguntaSuggestions] = useState(false);

    const [errors, setErrors] = useState({
        pregunta: false,
        opciones: [],
        fraseIncorrecta: false,
        errorPalabra: false,
        palabras: [],
        respuestaCorrecta: false,
        noCorrect: false
    });

    // ✅ НОВОЕ: Загружаем все вопросы
    useEffect(() => {
        loadAllQuestions();
    }, []);

    useEffect(() => {
        if (question) {
            setNivel(question.nivel || 'A1');
            setTipo(question.tipo || 'multiple_choice');
            setPregunta(question.pregunta || '');

            if (Array.isArray(question.opciones) && question.opciones.length > 0) {
                setOpciones(question.opciones);
            }

            if (question.tipo === 'error_correction') {
                setFraseIncorrecta(question.fraseIncorrecta || '');
                setErrorPalabra(question.errorPalabra || '');
                setExplicacion(question.explicacion || '');
            }

            if (question.tipo === 'drag_drop') {
                if (Array.isArray(question.palabras) && question.palabras.length > 0) {
                    setPalabras(question.palabras);
                }
                setRespuestaCorrecta(question.respuestaCorrecta || '');
            }
        }
    }, [question]);

    // ✅ НОВОЕ: Загрузка всех вопросов
    const loadAllQuestions = async () => {
        try {
            const q = query(collection(db, 'grammar_questions'));
            const querySnapshot = await getDocs(q);
            const questions = [];
            querySnapshot.forEach((doc) => {
                questions.push(doc.data());
            });
            setAllQuestions(questions);
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    };

    // бработка изменения pregunta с автокомплитом
    const handlePreguntaChange = (value) => {
        setPregunta(value);

        if (errors.pregunta && value.trim()) {
            setErrors({...errors, pregunta: false});
        }

        if (value.length >= 3) {
            const suggestions = allQuestions.filter(q =>
                q.pregunta.toLowerCase().includes(value.toLowerCase()) &&
                q.pregunta.toLowerCase() !== value.toLowerCase()
            ).slice(0, 5);

            setPreguntaSuggestions(suggestions);
            setShowPreguntaSuggestions(suggestions.length > 0);
        } else {
            setShowPreguntaSuggestions(false);
        }
    };

    const handleOpcionChange = (index, field, value) => {
        const newOpciones = [...opciones];
        if (field === 'correcta') {
            newOpciones.forEach((op, i) => {
                op.correcta = i === index;
            });
            if (errors.noCorrect) {
                setErrors({...errors, noCorrect: false});
            }
        } else {
            newOpciones[index][field] = value;
            if (value.trim()) {
                const newOpcionErrors = [...errors.opciones];
                newOpcionErrors[index] = false;
                setErrors({...errors, opciones: newOpcionErrors});
            }
        }
        setOpciones(newOpciones);
    };

    const addOpcion = () => {
        setOpciones([...opciones, { texto: '', correcta: false }]);
    };

    const removeOpcion = (index) => {
        if (opciones.length > 2) {
            setOpciones(opciones.filter((_, i) => i !== index));
        } else {
            alert('Debe haber al menos 2 opciones');
        }
    };

    const handlePalabraChange = (index, value) => {
        const newPalabras = [...palabras];
        newPalabras[index] = value;
        setPalabras(newPalabras);

        if (value.trim()) {
            const newPalabraErrors = [...errors.palabras];
            newPalabraErrors[index] = false;
            setErrors({...errors, palabras: newPalabraErrors});
        }
    };

    const addPalabra = () => {
        setPalabras([...palabras, '']);
    };

    const removePalabra = (index) => {
        if (palabras.length > 1) {
            setPalabras(palabras.filter((_, i) => i !== index));
        }
    };

    const validate = () => {
        const newErrors = {
            pregunta: !pregunta || !pregunta.trim(),
            opciones: [],
            fraseIncorrecta: false,
            errorPalabra: false,
            palabras: [],
            respuestaCorrecta: false,
            noCorrect: false
        };

        if (tipo === 'multiple_choice' || tipo === 'error_correction') {
            newErrors.opciones = opciones.map(op => !op || !op.texto || !op.texto.trim());
            newErrors.noCorrect = !opciones.some(op => op && op.correcta);
        }

        if (tipo === 'error_correction') {
            newErrors.fraseIncorrecta = !fraseIncorrecta || !fraseIncorrecta.trim();
            newErrors.errorPalabra = !errorPalabra || !errorPalabra.trim();
        }

        if (tipo === 'drag_drop') {
            newErrors.palabras = palabras.map(p => !p || !p.trim());
            newErrors.respuestaCorrecta = !respuestaCorrecta || !respuestaCorrecta.trim();
        }

        setErrors(newErrors);

        const emptyFields = [];
        if (newErrors.pregunta) emptyFields.push('Pregunta');

        if (tipo === 'multiple_choice' || tipo === 'error_correction') {
            const emptyOpciones = newErrors.opciones.filter(e => e).length;
            if (emptyOpciones > 0) {
                emptyFields.push(`${emptyOpciones} opción(es)`);
            }
            if (newErrors.noCorrect) {
                emptyFields.push('Marcar una opción como correcta');
            }
        }

        if (tipo === 'error_correction') {
            if (newErrors.fraseIncorrecta) emptyFields.push('Frase incorrecta');
            if (newErrors.errorPalabra) emptyFields.push('Palabra con error');
        }

        if (tipo === 'drag_drop') {
            const emptyPalabras = newErrors.palabras.filter(e => e).length;
            if (emptyPalabras > 0) {
                emptyFields.push(`${emptyPalabras} palabra(s)`);
            }
            if (newErrors.respuestaCorrecta) emptyFields.push('Respuesta correcta');
        }

        return { isValid: emptyFields.length === 0, emptyFields };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { isValid, emptyFields } = validate();

        if (!isValid) {
            alert(`Por favor, complete los siguientes campos:\n${emptyFields.join('\n')}`);
            return;
        }

        setLoading(true);

        let questionData = {
            nivel: (nivel || 'A1').toUpperCase(),
            tipo: tipo || 'multiple_choice',
            pregunta: (pregunta || '').trim()
        };

        if (tipo === 'multiple_choice') {
            questionData.opciones = Array.isArray(opciones)
                ? opciones
                    .filter(op => op && op.texto)
                    .map(op => ({
                        texto: op.texto.trim(),
                        correcta: Boolean(op.correcta)
                    }))
                : [];
        }

        if (tipo === 'error_correction') {
            questionData.fraseIncorrecta = (fraseIncorrecta || '').trim();
            questionData.errorPalabra = (errorPalabra || '').trim();

            const palabrasArray = (fraseIncorrecta || '').split(' ');
            questionData.indicePalabra = palabrasArray.findIndex(p =>
                p && errorPalabra && p.toLowerCase().includes(errorPalabra.toLowerCase())
            );

            questionData.opciones = Array.isArray(opciones)
                ? opciones
                    .filter(op => op && op.texto)
                    .map(op => ({
                        texto: op.texto.trim(),
                        correcta: Boolean(op.correcta)
                    }))
                : [];

            if (explicacion && explicacion.trim()) {
                questionData.explicacion = explicacion.trim();
            }
        }

        if (tipo === 'drag_drop') {
            questionData.palabras = Array.isArray(palabras)
                ? palabras
                    .filter(p => p && p.trim())
                    .map(p => p.trim())
                : [];
            questionData.respuestaCorrecta = (respuestaCorrecta || '').trim();
        }

        try {
            if (question && question.id) {
                await updateDoc(doc(db, 'grammar_questions', question.id), questionData);
                alert('Pregunta actualizada exitosamente');
            } else {
                await addDoc(collection(db, 'grammar_questions'), questionData);
                alert('Pregunta añadida exitosamente');
            }
            onClose();
        } catch (error) {
            console.error('Error:', error);
            alert('Error: ' + (error?.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{question ? 'Editar' : 'Añadir'} Pregunta</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="gramatica-form">
                    <div className="form-group">
                        <label>Nivel:</label>
                        <select value={nivel} onChange={(e) => setNivel(e.target.value)} disabled={loading}>
                            {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Tipo:</label>
                        <select value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={question || loading}>
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="error_correction">Corrección</option>
                            <option value="drag_drop">Ordenar</option>
                        </select>
                    </div>

                    {/* НОВОЕ: Добавлен autocomplete */}
                    <div className="form-group autocomplete-group">
                        <label>Pregunta:</label>
                        <input
                            type="text"
                            value={pregunta}
                            onChange={(e) => handlePreguntaChange(e.target.value)}
                            onFocus={() => pregunta.length >= 3 && setShowPreguntaSuggestions(preguntaSuggestions.length > 0)}
                            onBlur={() => setTimeout(() => setShowPreguntaSuggestions(false), 200)}
                            placeholder="Yo _____ español"
                            disabled={loading}
                            autoComplete="off"
                            className={errors.pregunta ? 'input-error' : ''}
                        />
                        {errors.pregunta && (
                            <span className="error-message">Este campo es obligatorio</span>
                        )}
                        {/* НОВОЕ: Suggestions dropdown */}
                        {showPreguntaSuggestions && (
                            <div className="suggestions-dropdown">
                                <div className="suggestions-header warning-header">
                                    ⚠️ Preguntas similares ya existen:
                                </div>
                                {preguntaSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="suggestion-item pregunta-suggestion"
                                        onClick={() => {
                                            setPregunta(suggestion.pregunta);
                                            setNivel(suggestion.nivel);
                                            setTipo(suggestion.tipo);

                                            if (suggestion.opciones) {
                                                setOpciones(suggestion.opciones);
                                            }
                                            if (suggestion.fraseIncorrecta) {
                                                setFraseIncorrecta(suggestion.fraseIncorrecta);
                                            }
                                            if (suggestion.errorPalabra) {
                                                setErrorPalabra(suggestion.errorPalabra);
                                            }
                                            if (suggestion.explicacion) {
                                                setExplicacion(suggestion.explicacion);
                                            }
                                            if (suggestion.palabras) {
                                                setPalabras(suggestion.palabras);
                                            }
                                            if (suggestion.respuestaCorrecta) {
                                                setRespuestaCorrecta(suggestion.respuestaCorrecta);
                                            }

                                            setShowPreguntaSuggestions(false);
                                        }}
                                    >
                                        <div className="suggestion-pregunta-text">
                                            {suggestion.pregunta}
                                        </div>
                                        <div className="suggestion-meta">
                                            <span className={`suggestion-nivel nivel-${suggestion.nivel.toLowerCase()}`}>
                                                {suggestion.nivel}
                                            </span>
                                            <span className="tipo-badge">
                                                {suggestion.tipo === 'multiple_choice' ? 'Multiple Choice' :
                                                    suggestion.tipo === 'error_correction' ? 'Corrección' : 'Ordenar'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {tipo === 'multiple_choice' && (
                        <div className="form-group">
                            <label>Opciones:</label>
                            <div className="opciones-list">
                                {Array.isArray(opciones) && opciones.map((op, i) => (
                                    <div key={i} className="opcion-item">
                                        <div className="opcion-number">{i + 1}</div>
                                        <input
                                            value={op?.texto || ''}
                                            onChange={(e) => handleOpcionChange(i, 'texto', e.target.value)}
                                            placeholder="Opción"
                                            disabled={loading}
                                            className={errors.opciones[i] ? 'input-error' : ''}
                                        />
                                        <label className="checkbox-label">
                                            <input
                                                type="radio"
                                                name="correcta"
                                                checked={Boolean(op?.correcta)}
                                                onChange={() => handleOpcionChange(i, 'correcta', true)}
                                                disabled={loading}
                                            />
                                            <span>Correcta</span>
                                        </label>
                                        {opciones.length > 2 && (
                                            <button type="button" className="btn-remove-opcion" onClick={() => removeOpcion(i)} disabled={loading}>
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {errors.opciones.some(e => e) && (
                                <span className="error-message">Complete todas las opciones</span>
                            )}
                            {errors.noCorrect && (
                                <span className="error-message">Debe marcar una opción como correcta</span>
                            )}
                            <button type="button" className="btn-add-opcion" onClick={addOpcion} disabled={loading}>
                                + Añadir opción
                            </button>
                        </div>
                    )}

                    {tipo === 'error_correction' && (
                        <>
                            <div className="form-group">
                                <label>Frase incorrecta:</label>
                                <input
                                    value={fraseIncorrecta}
                                    onChange={(e) => {
                                        setFraseIncorrecta(e.target.value);
                                        if (errors.fraseIncorrecta && e.target.value.trim()) {
                                            setErrors({...errors, fraseIncorrecta: false});
                                        }
                                    }}
                                    placeholder="Yo es estudiante"
                                    disabled={loading}
                                    className={errors.fraseIncorrecta ? 'input-error' : ''}
                                />
                                {errors.fraseIncorrecta && (
                                    <span className="error-message">Este campo es obligatorio</span>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Palabra con error:</label>
                                <input
                                    value={errorPalabra}
                                    onChange={(e) => {
                                        setErrorPalabra(e.target.value);
                                        if (errors.errorPalabra && e.target.value.trim()) {
                                            setErrors({...errors, errorPalabra: false});
                                        }
                                    }}
                                    placeholder="es"
                                    disabled={loading}
                                    className={errors.errorPalabra ? 'input-error' : ''}
                                />
                                {errors.errorPalabra && (
                                    <span className="error-message">Este campo es obligatorio</span>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Correcciones:</label>
                                <div className="opciones-list">
                                    {Array.isArray(opciones) && opciones.map((op, i) => (
                                        <div key={i} className="opcion-item">
                                            <div className="opcion-number">{i + 1}</div>
                                            <input
                                                value={op?.texto || ''}
                                                onChange={(e) => handleOpcionChange(i, 'texto', e.target.value)}
                                                placeholder="Corrección"
                                                disabled={loading}
                                                className={errors.opciones[i] ? 'input-error' : ''}
                                            />
                                            <label className="checkbox-label">
                                                <input
                                                    type="radio"
                                                    name="correcta"
                                                    checked={Boolean(op?.correcta)}
                                                    onChange={() => handleOpcionChange(i, 'correcta', true)}
                                                    disabled={loading}
                                                />
                                                <span>Correcta</span>
                                            </label>
                                            {opciones.length > 2 && (
                                                <button type="button" className="btn-remove-opcion" onClick={() => removeOpcion(i)} disabled={loading}>
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {errors.opciones.some(e => e) && (
                                    <span className="error-message">Complete todas las correcciones</span>
                                )}
                                {errors.noCorrect && (
                                    <span className="error-message">Debe marcar una corrección como correcta</span>
                                )}
                                <button type="button" className="btn-add-opcion" onClick={addOpcion} disabled={loading}>
                                    + Añadir corrección
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Explicación (opcional):</label>
                                <input
                                    value={explicacion}
                                    onChange={(e) => setExplicacion(e.target.value)}
                                    placeholder="Con YO usamos SOY"
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}

                    {tipo === 'drag_drop' && (
                        <>
                            <div className="form-group">
                                <label>Palabras desordenadas:</label>
                                {Array.isArray(palabras) && palabras.map((p, i) => (
                                    <div key={i} className="palabra-item">
                                        <span>{i + 1}</span>
                                        <input
                                            value={p || ''}
                                            onChange={(e) => handlePalabraChange(i, e.target.value)}
                                            placeholder="Palabra"
                                            disabled={loading}
                                            className={errors.palabras[i] ? 'input-error' : ''}
                                        />
                                        {palabras.length > 1 && (
                                            <button type="button" onClick={() => removePalabra(i)} disabled={loading}>
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {errors.palabras.some(e => e) && (
                                    <span className="error-message">Complete todas las palabras</span>
                                )}
                                <button type="button" className="btn-add-opcion" onClick={addPalabra} disabled={loading}>
                                    + Añadir palabra
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Respuesta correcta:</label>
                                <input
                                    value={respuestaCorrecta}
                                    onChange={(e) => {
                                        setRespuestaCorrecta(e.target.value);
                                        if (errors.respuestaCorrecta && e.target.value.trim()) {
                                            setErrors({...errors, respuestaCorrecta: false});
                                        }
                                    }}
                                    placeholder="Ella estudia español"
                                    disabled={loading}
                                    className={errors.respuestaCorrecta ? 'input-error' : ''}
                                />
                                {errors.respuestaCorrecta && (
                                    <span className="error-message">Este campo es obligatorio</span>
                                )}
                            </div>
                        </>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default GramaticaForm;