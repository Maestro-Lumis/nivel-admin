// src/components/Audio/AudioForm.js
import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Audio.css'

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

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
    const [errors, setErrors] = useState({
        audioUrl: false,
        pregunta: false,
        opciones: []
    });

    const [uploading, setUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

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

    // Проверка конфигурации
    useEffect(() => {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            console.error('Cloudinary не настроен! Проверьте .env файл');
        }
    }, []);

    const uploadToCloudinary = async (file) => {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            throw new Error('Cloudinary no está configurado. Verifique el archivo .env');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', 'audio');
        formData.append('resource_type', 'video');

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✓ Upload success:', data.secure_url);
            return data.secure_url;
        } catch (error) {
            console.error('✗ Upload error:', error);
            throw error;
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            alert('Por favor, seleccione un archivo de audio válido');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('El archivo es demasiado grande. Máximo 10MB');
            return;
        }

        setUploading(true);

        try {
            const url = await uploadToCloudinary(file);
            setAudioUrl(url);
            setRecordedAudioUrl(null);
            setAudioBlob(null);

            if (errors.audioUrl) {
                setErrors({...errors, audioUrl: false});
            }

            alert('✓ Archivo subido exitosamente');
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/wav';

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                if (audioChunksRef.current.length === 0) {
                    alert('Error: No se grabó audio.');
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                setAudioBlob(blob);
                setRecordedAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start(100);
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            alert(`No se pudo acceder al micrófono: ${error.message}`);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const saveRecordedAudio = async () => {
        if (!audioBlob) return;

        setUploading(true);

        try {
            const extension = audioBlob.type.includes('webm') ? 'webm' :
                audioBlob.type.includes('mp4') ? 'm4a' : 'wav';
            const fileName = `recording_${Date.now()}.${extension}`;
            const file = new File([audioBlob], fileName, { type: audioBlob.type });

            const url = await uploadToCloudinary(file);
            setAudioUrl(url);

            if (recordedAudioUrl) {
                URL.revokeObjectURL(recordedAudioUrl);
            }
            setRecordedAudioUrl(null);
            setAudioBlob(null);

            if (errors.audioUrl) {
                setErrors({...errors, audioUrl: false});
            }

            alert('✓ Audio guardado exitosamente');
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const cancelRecording = () => {
        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
        }
        setRecordedAudioUrl(null);
        setAudioBlob(null);
        setRecordingTime(0);
    };

    const handleOpcionChange = (index, field, value) => {
        const newOpciones = [...opciones];
        if (field === 'correcta') {
            newOpciones.forEach((op, i) => {
                op.correcta = i === index;
            });
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

    const removeOpcion = (index) => {
        if (opciones.length > 2) {
            setOpciones(opciones.filter((_, i) => i !== index));
        } else {
            alert('Debe haber al menos 2 opciones');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {
            audioUrl: !audioUrl.trim(),
            pregunta: !pregunta.trim(),
            opciones: opciones.map(op => !op.texto.trim())
        };

        setErrors(newErrors);

        const emptyFields = [];
        if (newErrors.audioUrl) emptyFields.push('Audio');
        if (newErrors.pregunta) emptyFields.push('Pregunta');
        if (newErrors.opciones.some(e => e)) emptyFields.push('Opciones');

        if (emptyFields.length > 0) {
            alert(`Complete: ${emptyFields.join(', ')}`);
            return;
        }

        const hasCorrectAnswer = opciones.some(op => op.correcta);
        if (!hasCorrectAnswer) {
            alert('Marque una opción como correcta');
            return;
        }

        setLoading(true);

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
                await updateDoc(doc(db, 'audio', audio.id), audioData);
                alert('Audio actualizado');
            } else {
                await addDoc(collection(db, 'audio'), audioData);
                alert('Audio añadido');
            }
            onClose();
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                        <select value={nivel} onChange={(e) => setNivel(e.target.value)} disabled={loading}>
                            {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Audio:</label>

                        <div className="audio-record-section">
                            <h4>Opción 1: Grabar voz</h4>
                            {!isRecording && !recordedAudioUrl && (
                                <button type="button" className="btn-record" onClick={startRecording} disabled={uploading || loading}>
                                    Comenzar grabación
                                </button>
                            )}

                            {isRecording && (
                                <div className="recording-controls">
                                    <div className="recording-indicator">
                                        <span className="recording-dot"></span>
                                        Grabando... {formatTime(recordingTime)}
                                    </div>
                                    <button type="button" className="btn-stop-record" onClick={stopRecording}>
                                        ⏹️ Detener
                                    </button>
                                </div>
                            )}

                            {recordedAudioUrl && (
                                <div className="recorded-audio-preview">
                                    <audio controls src={recordedAudioUrl} className="audio-preview" />
                                    <div className="recorded-actions">
                                        <button type="button" className="btn-save-recording" onClick={saveRecordedAudio} disabled={uploading}>
                                            ✓ Guardar
                                        </button>
                                        <button type="button" className="btn-cancel-recording" onClick={cancelRecording} disabled={uploading}>
                                            ✗ Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="audio-upload-section">
                            <h4>Opción 2: Subir archivo</h4>
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                disabled={uploading || loading || isRecording}
                                className="file-input"
                                id="audio-file-input"
                            />
                            <label htmlFor="audio-file-input" className="btn-upload">
                                Seleccionar archivo
                            </label>
                            {uploading && <div className="upload-progress">Subiendo...</div>}
                        </div>

                        {errors.audioUrl && <span className="error-message">Audio requerido</span>}
                    </div>

                    {audioUrl && !recordedAudioUrl && (
                        <div className="form-group">
                            <label>Preview:</label>
                            <audio controls src={audioUrl} className="audio-preview" />
                        </div>
                    )}

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
                            placeholder="¿Qué escuchaste?"
                            disabled={loading}
                            className={errors.pregunta ? 'input-error' : ''}
                        />
                        {errors.pregunta && <span className="error-message">Campo obligatorio</span>}
                    </div>

                    <div className="form-group">
                        <label>Opciones:</label>
                        <div className="opciones-list">
                            {opciones.map((opcion, index) => (
                                <div key={index} className="opcion-item">
                                    <div className="opcion-number">{index + 1}</div>
                                    <input
                                        type="text"
                                        value={opcion.texto}
                                        onChange={(e) => handleOpcionChange(index, 'texto', e.target.value)}
                                        placeholder="Texto"
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
                        {errors.opciones.some(e => e) && <span className="error-message">Complete todas las opciones</span>}
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-save" disabled={loading || uploading || isRecording}>
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AudioForm;