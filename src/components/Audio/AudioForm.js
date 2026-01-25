// src/components/Audio/AudioForm.js
import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Audio.css'

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function AudioForm({ audio, onClose }) {
    const [nivel, setNivel] = useState('A1');
    const [audioUrl, setAudioUrl] = useState('');
    const [pregunta, setPregunta] = useState('');
    const [opciones, setOpciones] = useState([
        { texto: '', correcta: false },
        { texto: '', correcta: false },
        { texto: '', correcta: false }
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (audio) {
            setNivel(audio.nivel || 'A1');
            setAudioUrl(audio.audioUrl || '');
            setPregunta(audio.pregunta || '');
            setOpciones(audio.opciones || [
                { texto: '', correcta: false },
                { texto: '', correcta: false },
                { texto: '', correcta: false }
            ]);
        }
    }, [audio]);

    const handleOpcionChange = (index, field, value) => {
        const newOpciones = [...opciones];
        if (field === 'correcta') {
            // Solo una opción puede ser correcta
            newOpciones.forEach((op, i) => {
                op.correcta = i === index;
            });
        } else {
            newOpciones[index][field] = value;
        }
        setOpciones(newOpciones);
    };

    const addOpcion = () => {
        setOpciones([...opciones, { texto: '', correcta: false }]);
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
        setLoading(true);

        // Валидация
        const hasCorrectAnswer = opciones.some(op => op.correcta);
        if (!hasCorrectAnswer) {
            alert('Debe marcar una opción como correcta');
            setLoading(false);
            return;
        }

        const allFilled = opciones.every(op => op.texto.trim());
        if (!allFilled) {
            alert('Todas las opciones deben tener texto');
            setLoading(false);
            return;
        }

        const audioData = {
            nivel: nivel.toUpperCase(),
            audioUrl: audioUrl.trim(),
            pregunta: pregunta.trim(),
            opciones: opciones.map(op => ({
                texto: op.texto.trim(),
                correcta: op.correcta
            }))
        };

        try {
            if (audio) {
                // Editar audio existente
                await updateDoc(doc(db, 'audio', audio.id), audioData);
                console.log('Audio actualizado:', audio.id);
                alert('Audio actualizado exitosamente');
            } else {
                // Añadir nuevo audio
                const docRef = await addDoc(collection(db, 'audio'), audioData);
                console.log('Audio añadido:', docRef.id);
                alert('Audio añadido exitosamente');
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
                    <h2>{audio ? 'Editar Audio' : 'Añadir Audio'}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="audio-form">
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

                    <div className="form-group">
                        <label>URL del Audio:</label>
                        <input
                            type="url"
                            value={audioUrl}
                            onChange={(e) => setAudioUrl(e.target.value)}
                            placeholder="https://example.com/audio.mp3"
                            required
                            disabled={loading}
                        />
                        <small className="help-text">
                            Sube el archivo de audio a Firebase Storage u otro servicio y pega aquí la URL
                        </small>
                    </div>

                    {audioUrl && (
                        <div className="form-group">
                            <label>Preview:</label>
                            <audio controls src={audioUrl} className="audio-preview">
                                Tu navegador no soporta el elemento de audio.
                            </audio>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Pregunta:</label>
                        <input
                            type="text"
                            value={pregunta}
                            onChange={(e) => setPregunta(e.target.value)}
                            placeholder="¿Qué escuchaste en el audio?"
                            required
                            disabled={loading}
                        />
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
                                        required
                                        disabled={loading}
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

export default AudioForm;