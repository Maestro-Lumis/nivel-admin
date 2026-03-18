import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import GramaticaBulkImport from './GramaticaBulkImport';
import GramaticaForm from "./GramaticaForm";
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';
import { useToast } from '../common/Toast';
import './Gramatica.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];
const ITEMS_PER_PAGE = 100;

function GramaticaList() {
    const [questions, setQuestions] = useState([]);
    const [allQuestions, setAllQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNivel, setSelectedNivel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'pregunta', direction: 'ascending' });

    const toast = useToast();

    useEffect(() => {
        loadQuestions();
    }, [selectedNivel]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedNivel, searchTerm]);

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

            setQuestions(displayData);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al cargar preguntas');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (questionId, pregunta) => {
        if (!window.confirm(`¿Eliminar "${pregunta}"?`)) return;

        try {
            await deleteDoc(doc(db, 'grammar_questions', questionId));
            toast.success('Pregunta eliminada');
            loadQuestions();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al eliminar');
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

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return '⇅';
        }
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    const filteredQuestions = useMemo(() => {
        return questions.filter(q =>
            q.pregunta.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [questions, searchTerm]);

    const sortedQuestions = useMemo(() => {
        let sortable = [...filteredQuestions];
        if (sortConfig !== null) {
            sortable.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortable;
    }, [filteredQuestions, sortConfig]);

    const totalPages = Math.ceil(sortedQuestions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedQuestions = sortedQuestions.slice(startIndex, endIndex);

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
                                Añadir varias
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
                    <LoadingSkeleton rows={8} />
                ) : sortedQuestions.length === 0 ? (
                    searchTerm ? (
                        <EmptyState
                            icon="🔍"
                            title="No se encontraron preguntas"
                            description={`No hay resultados para "${searchTerm}"`}
                        />
                    ) : (
                        <EmptyState
                            icon="✏️"
                            title={selectedNivel ? `No hay preguntas en ${selectedNivel}` : "No hay preguntas todavía"}
                            description={selectedNivel ? `Comienza añadiendo preguntas de nivel ${selectedNivel}` : "Comienza añadiendo tu primera pregunta"}
                            actionText="+ Añadir primera pregunta"
                            onAction={() => setShowForm(true)}
                        />
                    )
                ) : (
                    <div className="content-area">
                        <table className="data-table sticky-header">
                            <thead>
                            <tr>
                                <th className="sortable-header" onClick={() => requestSort('nivel')}>
                                    Nivel <span className="sort-icon">{getSortIcon('nivel')}</span>
                                </th>
                                <th className="sortable-header" onClick={() => requestSort('tipo')}>
                                    Tipo <span className="sort-icon">{getSortIcon('tipo')}</span>
                                </th>
                                <th className="sortable-header" onClick={() => requestSort('pregunta')}>
                                    Pregunta <span className="sort-icon">{getSortIcon('pregunta')}</span>
                                </th>
                                <th>Items</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginatedQuestions.map(q => (
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
                    </div>
                )}

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sortedQuestions.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
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