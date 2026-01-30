// src/components/Lectura/LecturaList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import LecturaForm from './LecturaForm';
import './Lectura.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function LecturaList() {
    const [lecturas, setLecturas] = useState([]);
    const [allLecturas, setAllLecturas] = useState([]); // ← НОВОЕ: все лектуры
    const [loading, setLoading] = useState(true);
    const [selectedNivel, setSelectedNivel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingLectura, setEditingLectura] = useState(null);

    useEffect(() => {
        loadLecturas();
    }, [selectedNivel]);

    const loadLecturas = async () => {
        setLoading(true);
        try {
            // ВСЕГДА загружаем ВСЕ лектуры
            const allQuery = query(collection(db, 'lectura'));
            const allSnapshot = await getDocs(allQuery);
            const allData = [];
            allSnapshot.forEach((doc) => {
                allData.push({ id: doc.id, ...doc.data() });
            });
            setAllLecturas(allData); // ← Сохраняем все

            // Фильтруем для отображения
            let displayData;
            if (selectedNivel) {
                displayData = allData.filter(l => l.nivel === selectedNivel);
            } else {
                displayData = allData;
            }

            displayData.sort((a, b) => a.pregunta.localeCompare(b.pregunta));
            setLecturas(displayData);

            console.log(`Cargadas ${displayData.length} lecturas (total: ${allData.length})`);
        } catch (error) {
            console.error('Error al cargar lecturas:', error);
            alert('Error al cargar lecturas: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (lecturaId, pregunta) => {
        if (!window.confirm(`¿Eliminar "${pregunta}"?`)) return;

        try {
            await deleteDoc(doc(db, 'lectura', lecturaId));
            console.log('Lectura eliminada:', lecturaId);
            loadLecturas();
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar: ' + error.message);
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

    // ← ИСПРАВЛЕНО: считаем от allLecturas
    const getCountByNivel = (nivel) => {
        return allLecturas.filter(l => l.nivel === nivel).length;
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

            {/* Main Panel */}
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
                            {filteredLecturas.map(lectura => (
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