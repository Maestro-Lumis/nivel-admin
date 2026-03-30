import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import VocabularioForm from './VocabularioForm';
import VocabularioBulkImport from './VocabularioBulkImport';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';
import { useToast } from '../common/Toast';
import ConfirmDialog from '../common/ConfirmDialog';
import './Vocabulario.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];
const ITEMS_PER_PAGE = 100;

function VocabularioList() {
    const [words, setWords] = useState([]);
    const [allWords, setAllWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNivel, setSelectedNivel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [editingWord, setEditingWord] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'es', direction: 'ascending' });

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        wordId: null,
        wordEs: '',
    });

    const toast = useToast();

    useEffect(() => {
        loadWords();
    }, [selectedNivel]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedNivel, searchTerm]);

    const loadWords = async () => {
        setLoading(true);
        try {
            const allQuery = query(collection(db, 'vocabulario'));
            const allSnapshot = await getDocs(allQuery);
            const allData = [];
            allSnapshot.forEach((doc) => {
                allData.push({ id: doc.id, ...doc.data() });
            });
            setAllWords(allData);

            const displayData = selectedNivel
                ? allData.filter(w => w.nivel === selectedNivel)
                : allData;

            setWords(displayData);
        } catch (error) {
            console.error('Error al cargar palabras:', error);
            toast.error('Error al cargar palabras');
        } finally {
            setLoading(false);
        }
    };

    // Delete flow
    const handleDeleteRequest = (wordId, wordEs) => {
        setConfirmDialog({ isOpen: true, wordId, wordEs });
    };

    const handleDeleteConfirmed = async () => {
        const { wordId, wordEs } = confirmDialog;
        setConfirmDialog({ isOpen: false, wordId: null, wordEs: '' });

        try {
            await deleteDoc(doc(db, 'vocabulario', wordId));
            toast.success(`"${wordEs}" eliminada`);
            loadWords();
        } catch (error) {
            console.error('Error al eliminar:', error);
            toast.error('Error al eliminar');
        }
    };

    const handleDeleteCancelled = () => {
        setConfirmDialog({ isOpen: false, wordId: null, wordEs: '' });
    };

    const handleEdit = (word) => {
        setEditingWord(word);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingWord(null);
        loadWords();
    };

    const handleBulkImportClose = () => {
        setShowBulkImport(false);
        loadWords();
    };

    const requestSort = (key) => {
        const direction =
            sortConfig.key === key && sortConfig.direction === 'ascending'
                ? 'descending'
                : 'ascending';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) return '⇅';
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    const filteredWords = useMemo(() => {
        return words.filter(word =>
            word.es.toLowerCase().includes(searchTerm.toLowerCase()) ||
            word.ru.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [words, searchTerm]);

    const sortedWords = useMemo(() => {
        const sortable = [...filteredWords];
        sortable.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortable;
    }, [filteredWords, sortConfig]);

    const totalPages = Math.ceil(sortedWords.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedWords = sortedWords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const getCountByNivel = (nivel) => allWords.filter(w => w.nivel === nivel).length;

    return (
        <div className="split-container">
            {/*Sidebar*/}
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
                        <span className="nivel-count">{allWords.length}</span>
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

            {/* Main panel */}
            <div className="main-panel">
                <div className="panel-header">
                    <div className="header-top">
                        <h1>Vocabulario</h1>
                        <div className="button-group">
                            <button className="btn-add" onClick={() => setShowForm(true)}>
                                + Añadir palabra
                            </button>
                            <button className="btn-add-bulk" onClick={() => setShowBulkImport(true)}>
                                Añadir varias
                            </button>
                        </div>
                    </div>

                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Buscar palabra en español o ruso..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="results-info">
                            {filteredWords.length} palabras
                        </span>
                    </div>
                </div>

                {loading ? (
                    <LoadingSkeleton rows={10} />
                ) : sortedWords.length === 0 ? (
                    searchTerm ? (
                        <EmptyState
                            icon="🔍"
                            title="No se encontraron palabras"
                            description={`No hay resultados para "${searchTerm}"`}
                        />
                    ) : (
                        <EmptyState
                            icon="📚"
                            title={selectedNivel ? `No hay palabras en ${selectedNivel}` : 'No hay palabras todavía'}
                            description={
                                selectedNivel
                                    ? `Comienza añadiendo palabras de nivel ${selectedNivel}`
                                    : 'Comienza añadiendo tu primera palabra'
                            }
                            actionText="+ Añadir primera palabra"
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
                                <th className="sortable-header" onClick={() => requestSort('es')}>
                                    Español <span className="sort-icon">{getSortIcon('es')}</span>
                                </th>
                                <th className="sortable-header" onClick={() => requestSort('ru')}>
                                    Русский <span className="sort-icon">{getSortIcon('ru')}</span>
                                </th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginatedWords.map(word => (
                                <tr key={word.id}>
                                    <td>
                                            <span className={`badge nivel-${word.nivel.toLowerCase()}`}>
                                                {word.nivel}
                                            </span>
                                    </td>
                                    <td className="word-es">{word.es}</td>
                                    <td className="word-ru">{word.ru}</td>
                                    <td className="actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(word)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDeleteRequest(word.id, word.es)}
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
                    totalItems={sortedWords.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>

            {showForm && (
                <VocabularioForm
                    word={editingWord}
                    onClose={handleFormClose}
                />
            )}

            {showBulkImport && (
                <VocabularioBulkImport
                    onClose={handleBulkImportClose}
                />
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title="¿Eliminar palabra?"
                message={`¿Seguro que quieres eliminar "${confirmDialog.wordEs}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleDeleteConfirmed}
                onCancel={handleDeleteCancelled}
            />
        </div>
    );
}

export default VocabularioList;