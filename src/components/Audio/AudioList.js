// src/components/Audio/AudioList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AudioForm from './AudioForm';
import './Audio.css'

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function AudioList() {
    const [audios, setAudios] = useState([]);
    const [allAudios, setAllAudios] = useState([]); // ← НОВОЕ: храним ВСЕ аудио
    const [loading, setLoading] = useState(true);
    const [selectedNivel, setSelectedNivel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAudio, setEditingAudio] = useState(null);

    useEffect(() => {
        loadAudios();
    }, [selectedNivel]);

    const loadAudios = async () => {
        setLoading(true);
        try {
            // ВСЕГДА загружаем ВСЕ аудио для счетчиков
            const allQuery = query(collection(db, 'audio'));
            const allSnapshot = await getDocs(allQuery);
            const allData = [];
            allSnapshot.forEach((doc) => {
                allData.push({ id: doc.id, ...doc.data() });
            });
            setAllAudios(allData);

            // Фильтруем для отображения
            let displayData;
            if (selectedNivel) {
                displayData = allData.filter(a => a.nivel === selectedNivel);
            } else {
                displayData = allData;
            }

            // Сортируем
            displayData.sort((a, b) => a.pregunta.localeCompare(b.pregunta));
            setAudios(displayData);

            console.log(`Cargados ${displayData.length} audios (total: ${allData.length})`);
        } catch (error) {
            console.error('Error al cargar audios:', error);
            alert('Error al cargar audios: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (audioId, pregunta) => {
        if (!window.confirm(`¿Eliminar "${pregunta}"?`)) return;

        try {
            await deleteDoc(doc(db, 'audio', audioId));
            console.log('Audio eliminado:', audioId);
            loadAudios();
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar: ' + error.message);
        }
    };

    const handleEdit = (audio) => {
        setEditingAudio(audio);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingAudio(null);
        loadAudios();
    };

    const filteredAudios = audios.filter(audio =>
        audio.pregunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (audio.audioUrl && audio.audioUrl.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getCountByNivel = (nivel) => {
        return allAudios.filter(a => a.nivel === nivel).length;
    };

    return (
        <div className="split-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>Niveles</h2>
                </div>

                <div className="sidebar-items">
                    <div
                        className={`sidebar-item ${selectedNivel === '' ? 'active' : ''}`}
                        onClick={() => setSelectedNivel('')}
                    >
                        <span className="nivel-indicator all"></span>
                        <span className="nivel-name">Todos</span>
                        <span className="nivel-count">{allAudios.length}</span>
                    </div>

                    {NIVELES.map(nivel => (
                        <div
                            key={nivel}
                            className={`sidebar-item ${selectedNivel === nivel ? 'active' : ''}`}
                            onClick={() => setSelectedNivel(nivel)}
                        >
                            <span className={`nivel-indicator nivel-${nivel.toLowerCase()}`}></span>
                            <span className="nivel-name">{nivel}</span>
                            <span className="nivel-count">{getCountByNivel(nivel)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Panel */}
            <div className="main-panel">
                <div className="panel-header">
                    <div className="header-top">
                        <h1>Audio</h1>
                        <button className="btn-add" onClick={() => setShowForm(true)}>
                            + Añadir audio
                        </button>
                    </div>

                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Buscar por pregunta..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="results-info">
                            {filteredAudios.length} audios
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Cargando audios...</div>
                ) : (
                    <div className="content-area">
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Nivel</th>
                                <th>Pregunta</th>
                                <th>Audio</th>
                                <th>Opciones</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredAudios.map(audio => (
                                <tr key={audio.id}>
                                    <td>
                                        <span className={`badge nivel-${audio.nivel.toLowerCase()}`}>
                                            {audio.nivel}
                                        </span>
                                    </td>
                                    <td className="pregunta-cell">{audio.pregunta}</td>
                                    <td className="audio-url">
                                        {audio.audioUrl ? (
                                            <a href={audio.audioUrl} target="_blank" rel="noopener noreferrer">
                                                Ver
                                            </a>
                                        ) : (
                                            <span className="no-audio">Sin audio</span>
                                        )}
                                    </td>
                                    <td className="opciones-count">
                                        {audio.opciones?.length || 0} opciones
                                    </td>
                                    <td className="actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(audio)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(audio.id, audio.pregunta)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {filteredAudios.length === 0 && (
                            <div className="no-results">
                                {searchTerm
                                    ? 'No se encontraron audios'
                                    : 'No hay audios todavía'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showForm && (
                <AudioForm
                    audio={editingAudio}
                    onClose={handleFormClose}
                />
            )}
        </div>
    );
}

export default AudioList;