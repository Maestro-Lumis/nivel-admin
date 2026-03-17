import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import VocabularioForm from './VocabularioForm';
import VocabularioBulkImport from './VocabularioBulkImport';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import LoadingSkeleton from '../common/LoadingSkeleton';
import { useToast } from '../common/Toast';
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

            let displayData;
            if (selectedNivel) {
                displayData = allData.filter(w => w.nivel === selectedNivel);
            } else {
                displayData = allData;
            }

            displayData.sort((a, b) => a.es.localeCompare(b.es));
            setWords(displayData);

            console.log(`Cargadas ${displayData.length} palabras (total: ${allData.length})`);
        } catch (error) {
            console.error('Error al cargar palabras:', error);
            toast.error('Error al cargar palabras');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (wordId, wordEs) => {
        if (!window.confirm(`¿Eliminar "${wordEs}"?`)) return;

        try {
            await deleteDoc(doc(db, 'vocabulario', wordId));
            console.log('Palabra eliminada:', wordId);
            toast.success('Palabra eliminada');
            loadWords();
        } catch (error) {
            console.error('Error al eliminar:', error);
            toast.error('Error al eliminar');
        }
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

    const filteredWords = words.filter(word =>
        word.es.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.ru.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedWords = filteredWords.slice(startIndex, endIndex);

    const getCountByNivel = (nivel) => {
        return allWords.filter(w => w.nivel === nivel).length;
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
                ) : filteredWords.length === 0 ? (
                    searchTerm ? (
                        <EmptyState
                            icon="🔍"
                            title="No se encontraron palabras"
                            description={`No hay resultados para "${searchTerm}"`}
                        />
                    ) : (
                        <EmptyState
                            icon="📚"
                            title={selectedNivel ? `No hay palabras en ${selectedNivel}` : "No hay palabras todavía"}
                            description={selectedNivel ? `Comienza añadiendo palabras de nivel ${selectedNivel}` : "Comienza añadiendo tu primera palabra"}
                            actionText="+ Añadir primera palabra"
                            onAction={() => setShowForm(true)}
                        />
                    )
                ) : (
                    <div className="content-area">
                        <table className="data-table sticky-header">
                            <thead>
                            <tr>
                                <th>Nivel</th>
                                <th>Español</th>
                                <th>Русский</th>
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
                                            onClick={() => handleDelete(word.id, word.es)}
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
                    totalItems={filteredWords.length}
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
        </div>
    );
}

export default VocabularioList;