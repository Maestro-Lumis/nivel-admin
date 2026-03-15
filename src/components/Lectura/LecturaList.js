import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import LecturaForm from './LecturaForm';
import Pagination from '../common/Pagination';
import { useToast } from '../common/Toast';
import './Lectura.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];
const ITEMS_PER_PAGE = 100;

function LecturaList() {
    const [lecturas, setLecturas] = useState([]);
    const [allLecturas, setAllLecturas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNivel, setSelectedNivel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingLectura, setEditingLectura] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    const toast = useToast();

    useEffect(() => {
        loadLecturas();
    }, [selectedNivel]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedNivel, searchTerm]);

    const loadLecturas = async () => {
        setLoading(true);
        try {
            const allQuery = query(collection(db, 'lectura'));
            const allSnapshot = await getDocs(allQuery);
            const allData = [];
            allSnapshot.forEach((doc) => {
                allData.push({ id: doc.id, ...doc.data() });
            });
            setAllLecturas(allData);

            let displayData;
            if (selectedNivel) {
                displayData = allData.filter(l => l.nivel === selectedNivel);
            } else {
                displayData = allData;
            }

            displayData.sort((a, b) => a.pregunta.localeCompare(b.pregunta));
            setLecturas(displayData);

            console.log(`Cargadas ${displayData.length} lecturas`);
        } catch (error) {
            console.error('Error al cargar lecturas:', error);
            toast.error('Error al cargar lecturas');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (lecturaId, pregunta) => {
        if (!window.confirm(`¿Eliminar "${pregunta}"?`)) return;

        try {
            await deleteDoc(doc(db, 'lectura', lecturaId));
            toast.success('Lectura eliminada');
            loadLecturas();
        } catch (error) {
            console.error('Error al eliminar:', error);
            toast.error('Error al eliminar');
        }
    };

    const handleEdit = (lectura) => {
        setEditingLectura(lectura);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingLectura(null);
        loadLecturas();
    };

    const filteredLecturas = lecturas.filter(lectura =>
        lectura.pregunta.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lectura.texto.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredLecturas.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedLecturas = filteredLecturas.slice(startIndex, endIndex);

    const getCountByNivel = (nivel) => {
        return allLecturas.filter(l => l.nivel === nivel).length;
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
                        <span className="nivel-count">{allLecturas.length}</span>
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
                        <h1>Lectura</h1>
                        <button className="btn-add" onClick={() => setShowForm(true)}>
                            + Añadir lectura
                        </button>
                    </div>

                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Buscar por pregunta o texto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="results-info">
                            {filteredLecturas.length} lecturas
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Cargando lecturas...</div>
                ) : (
                    <div className="content-area">
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Nivel</th>
                                <th>Pregunta</th>
                                <th>Texto (preview)</th>
                                <th>Opciones</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginatedLecturas.map(lectura => (
                                <tr key={lectura.id}>
                                    <td>
                                        <span className={`badge nivel-${lectura.nivel.toLowerCase()}`}>
                                            {lectura.nivel}
                                        </span>
                                    </td>
                                    <td className="pregunta-cell">{lectura.pregunta}</td>
                                    <td className="texto-preview">
                                        {lectura.texto.substring(0, 100)}...
                                    </td>
                                    <td className="opciones-count">
                                        {lectura.opciones?.length || 0} opciones
                                    </td>
                                    <td className="actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(lectura)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(lectura.id, lectura.pregunta)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {filteredLecturas.length === 0 && (
                            <div className="no-results">
                                {searchTerm
                                    ? 'No se encontraron lecturas'
                                    : 'No hay lecturas todavía'}
                            </div>
                        )}
                    </div>
                )}

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredLecturas.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>

            {showForm && (
                <LecturaForm
                    lectura={editingLectura}
                    onClose={handleFormClose}
                />
            )}
        </div>
    );
}

export default LecturaList;