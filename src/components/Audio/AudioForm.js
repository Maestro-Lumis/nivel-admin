// src/components/Audio/AudioForm.js
import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
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

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log('File selected:', file.name, file.type, file.size);

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
            const timestamp = Date.now();
            const extension = file.name.split('.').pop() || 'mp3';
            const fileName = `audio_${nivel}_${timestamp}.${extension}`;
            const storageRef = ref(storage, `audio/${fileName}`);

            console.log('Uploading to:', `audio/${fileName}`);

            await uploadBytes(storageRef, file);
            console.log('Upload complete, getting URL...');

            const downloadUrl = await getDownloadURL(storageRef);
            console.log('Download URL:', downloadUrl);

            setAudioUrl(downloadUrl);
            setRecordedAudioUrl(null);
            setAudioBlob(null);

            if (errors.audioUrl) {
                setErrors({...errors, audioUrl: false});
            }

            alert('✓ Archivo subido exitosamente');
        } catch (error) {
            console.error('Error completo:', error);
            alert(`Error al subir archivo: ${error.message}\n\nVerifique:\n1. Reglas de Storage en Firebase\n2. Permisos de la cuenta`);
        } finally {
            setUploading(false);
        }
    };

    const startRecording = async () => {
        try {
            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            console.log('Microphone access granted');

            // Проверяем поддержку mime types
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' :
                    'audio/wav';

            console.log('Using mime type:', mimeType);

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log('Audio chunk received:', event.data.size, 'bytes');
                }
            };

            mediaRecorderRef.current.onstop = () => {
                console.log('Recording stopped, total chunks:', audioChunksRef.current.length);

                if (audioChunksRef.current.length === 0) {
                    alert('Error: No se grabó audio. Intente nuevamente.');
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                console.log('Created blob:', blob.size, 'bytes');

                setAudioBlob(blob);
                const tempUrl = URL.createObjectURL(blob);
                setRecordedAudioUrl(tempUrl);

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                alert('Error durante la grabación: ' + event.error);
            };

            mediaRecorderRef.current.start(100); // Collect data every 100ms
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert(`No se pudo acceder al micrófono.\n\nError: ${error.message}\n\nVerifique los permisos en su navegador.`);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            console.log('Stopping recording...');
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const saveRecordedAudio = async () => {
        if (!audioBlob) {
            alert('Error: No hay audio grabado');
            return;
        }

        console.log('Saving recorded audio, blob size:', audioBlob.size);
        setUploading(true);

        try {
            const timestamp = Date.now();
            const extension = audioBlob.type.includes('webm') ? 'webm' :
                audioBlob.type.includes('mp4') ? 'm4a' : 'wav';
            const fileName = `audio_recorded_${nivel}_${timestamp}.${extension}`;
            const storageRef = ref(storage, `audio/${fileName}`);

            console.log('Uploading recording to:', `audio/${fileName}`);

            await uploadBytes(storageRef, audioBlob);
            console.log('Upload complete, getting URL...');

            const downloadUrl = await getDownloadURL(storageRef);
            console.log('Download URL:', downloadUrl);

            setAudioUrl(downloadUrl);

            // Limpieza
            if (recordedAudioUrl) {
                URL.revokeObjectURL(recordedAudioUrl);
            }
            setRecordedAudioUrl(null);
            setAudioBlob(null);

            if (errors.audioUrl) {
                setErrors({...errors, audioUrl: false});
            }

            alert('✓ Audio grabado guardado exitosamente');
        } catch (error) {
            console.error('Error saving recording:', error);
            alert(`Error al guardar audio: ${error.message}\n\nVerifique las reglas de Storage en Firebase.`);
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
            const newOpciones = opciones.filter((_, i) => i !== index);
            setOpciones(newOpciones);
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
        if (newErrors.audioUrl) emptyFields.push('Audio (grabe o suba un archivo)');
        if (newErrors.pregunta) emptyFields.push('Pregunta');

        const emptyOpciones = newErrors.opciones.filter(e => e).length;
        if (emptyOpciones > 0) {
            emptyFields.push(`${emptyOpciones} opción(es) de respuesta`);
        }

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
                console.log('Audio actualizado:', audio.id);
                alert('Audio actualizado exitosamente');
            } else {
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

                    <div className="form-group">
                        <label>Audio:</label>

                        <div className="audio-record-section">
                            <h4>Opción 1: Grabar voz</h4>
                            {!isRecording && !recordedAudioUrl && (
                                <button
                                    type="button"
                                    className="btn-record"
                                    onClick={startRecording}
                                    disabled={uploading || loading}
                                >
                                    🎤 Comenzar grabación
                                </button>
                            )}

                            {isRecording && (
                                <div className="recording-controls">
                                    <div className="recording-indicator">
                                        <span className="recording-dot"></span>
                                        Grabando... {formatTime(recordingTime)}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-stop-record"
                                        onClick={stopRecording}
                                    >
                                        Detener
                                    </button>
                                </div>
                            )}

                            {recordedAudioUrl && (
                                <div className="recorded-audio-preview">
                                    <audio controls src={recordedAudioUrl} className="audio-preview">
                                        Tu navegador no soporta el elemento de audio.
                                    </audio>
                                    <div className="recorded-actions">
                                        <button
                                            type="button"
                                            className="btn-save-recording"
                                            onClick={saveRecordedAudio}
                                            disabled={uploading}
                                        >
                                            ✓ Guardar grabación
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-cancel-recording"
                                            onClick={cancelRecording}
                                            disabled={uploading}
                                        >
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
                                Seleccionar archivo de audio
                            </label>
                            {uploading && (
                                <div className="upload-progress">
                                    Subiendo archivo...
                                </div>
                            )}
                        </div>

                        {errors.audioUrl && (
                            <span className="error-message">Debe grabar o subir un archivo de audio</span>
                        )}
                    </div>

                    {audioUrl && !recordedAudioUrl && (
                        <div className="form-group">
                            <label>Preview del audio guardado:</label>
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
                            onChange={(e) => {
                                setPregunta(e.target.value);
                                if (errors.pregunta && e.target.value.trim()) {
                                    setErrors({...errors, pregunta: false});
                                }
                            }}
                            placeholder="¿Qué escuchaste en el audio?"
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
                            disabled={loading || uploading || isRecording}
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