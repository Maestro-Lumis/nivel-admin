// src/components/Gramatica/GramaticaList.js
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import GramaticaBulkImport from './GramaticaBulkImport';
import './Gramatica.css';
import GramaticaForm from "./GramaticaForm";

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function GramaticaList() {
    const [questions, setQuestions] = useState([]);
    const [allQuestions, setAllQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNivel, setSelectedNivel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);

    useEffect(() => {
        loadQuestions();
    }, [selectedNivel]);

    const loadQuestions = async () => {
        setLoading(true);
        try {
            const allQuery = query(collection(db, 'grammar_questions'));
            const allSnapshot = await getDocs(allQuery);
            const allData = [];
            allSnapshot.forEach((doc) => {
                allData.push({ id: doc.id, ...doc.data() });
            });
            setAllQuestions(allData);

            let displayData;
            if (selectedNivel) {
                displayData = allData.filter(q => q.nivel === selectedNivel);
            } else {
                displayData = allData;
            }

            displayData.sort((a, b) => a.pregunta.localeCompare(b.pregunta));
            setQuestions(displayData);

            console.log(`Cargadas ${displayData.length} preguntas`);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (questionId, pregunta) => {
        if (!window.confirm(`¿Eliminar "${pregunta}"?`)) return;

        try {
            await deleteDoc(doc(db, 'grammar_questions', questionId));
            loadQuestions();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleEdit = (question) => {
        setEditingQuestion(question);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingQuestion(null);
        loadQuestions();
    };

    const handleBulkImportClose = () => {
        setShowBulkImport(false);
        loadQuestions();
    };

    const filteredQuestions = questions.filter(q =>
        q.pregunta.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCountByNivel = (nivel) => {
        return allQuestions.filter(q => q.nivel === nivel).length;
    };

    const getTipoLabel = (tipo) => {
        const tipos = {
            'multiple_choice': 'Multiple Choice',
            'error_correction': 'Corrección',
            'drag_drop': 'Ordenar'
        };
        return tipos[tipo] || tipo;
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
                        <span className="nivel-count">{allQuestions.length}</span>
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
                        <h1>Gramática</h1>
                        <div className="button-group">
                            <button className="btn-add" onClick={() => setShowForm(true)}>
                                + Añadir pregunta
                            </button>
                            <button className="btn-add-bulk" onClick={() => setShowBulkImport(true)}>
                                📝 Añadir varias
                            </button>
                        </div>
                    </div>

                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Buscar pregunta..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="results-info">
                            {filteredQuestions.length} preguntas
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Cargando...</div>
                ) : (
                    <div className="content-area">
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Nivel</th>
                                <th>Tipo</th>
                                <th>Pregunta</th>
                                <th>Items</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredQuestions.map(q => (
                                <tr key={q.id}>
                                    <td>
                                        <span className={`badge nivel-${q.nivel.toLowerCase()}`}>
                                            {q.nivel}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="tipo-badge">
                                            {getTipoLabel(q.tipo)}
                                        </span>
                                    </td>
                                    <td className="pregunta-cell">
                                        {q.pregunta}
                                        {q.tipo === 'error_correction' && (
                                            <div className="preview-text">
                                                "{q.fraseIncorrecta}"
                                            </div>
                                        )}
                                    </td>
                                    <td className="opciones-count">
                                        {q.opciones?.length || q.palabras?.length || 0}
                                    </td>
                                    <td className="actions">
                                        <button className="btn-edit" onClick={() => handleEdit(q)}>
                                            Editar
                                        </button>
                                        <button className="btn-delete" onClick={() => handleDelete(q.id, q.pregunta)}>
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        {filteredQuestions.length === 0 && (
                            <div className="no-results">
                                {searchTerm ? 'No encontrado' : 'Sin preguntas'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showForm && (
                <GramaticaForm
                    question={editingQuestion}
                    onClose={handleFormClose}
                />
            )}
            {showBulkImport && (
                <GramaticaBulkImport
                    onClose={handleBulkImportClose}
                />
            )}
        </div>
    );
}

export default GramaticaList;