import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import AudioForm from './AudioForm';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';
import { useToast } from '../common/Toast';
import './Audio.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];
const ITEMS_PER_PAGE = 100;

function AudioList() {
    const [audios, setAudios] = useState([]);
    const [allAudios, setAllAudios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNivel, setSelectedNivel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingAudio, setEditingAudio] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const toast = useToast();

    useEffect(() => {
        loadAudios();
    }, [selectedNivel]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedNivel, searchTerm]);

    const loadAudios = async () => {
        setLoading(true);
        try {
            const allQuery = query(collection(db, 'audio'));
            const allSnapshot = await getDocs(allQuery);
            const allData = [];
            allSnapshot.forEach((doc) => {
                allData.push({ id: doc.id, ...doc.data() });
            });
            setAllAudios(allData);

            let displayData;
            if (selectedNivel) {
                displayData = allData.filter(a => a.nivel === selectedNivel);
            } else {
                displayData = allData;
            }

            displayData.sort((a, b) => a.pregunta.localeCompare(b.pregunta));
            setAudios(displayData);

            console.log(`Cargados ${displayData.length} audios`);
        } catch (error) {
            console.error('Error al cargar audios:', error);
            toast.error('Error al cargar audios');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (audioId, pregunta) => {
        if (!window.confirm(`¿Eliminar "${pregunta}"?`)) return;

        try {
            await deleteDoc(doc(db, 'audio', audioId));
            toast.success('Audio eliminado');
            loadAudios();
        } catch (error) {
            console.error('Error al eliminar:', error);
            toast.error('Error al eliminar');
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

    const totalPages = Math.ceil(filteredAudios.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedAudios = filteredAudios.slice(startIndex, endIndex);

    const getCountByNivel = (nivel) => {
        return allAudios.filter(a => a.nivel === nivel).length;
    };

    return (
        <div className="split-container">
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
                    <LoadingSkeleton rows={8} />
                ) : filteredAudios.length === 0 ? (
                    searchTerm ? (
                        <EmptyState
                            icon="🔍"
                            title="No se encontraron audios"
                            description={`No hay resultados para "${searchTerm}"`}
                        />
                    ) : (
                        <EmptyState
                            icon="🎧"
                            title={selectedNivel ? `No hay audios en ${selectedNivel}` : "No hay audios todavía"}
                            description={selectedNivel ? `Comienza añadiendo audios de nivel ${selectedNivel}` : "Comienza añadiendo tu primer audio"}
                            actionText="+ Añadir primer audio"
                            onAction={() => setShowForm(true)}
                        />
                    )
                ) : (
                    <div className="content-area">
                        <table className="data-table sticky-header">
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
                            {paginatedAudios.map(audio => (
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
                    </div>
                )}

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredAudios.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
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