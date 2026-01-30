// src/components/Vocabulario/VocabularioList.js
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import VocabularioForm from './VocabularioForm';
import './Vocabulario.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function VocabularioList() {
    const [words, setWords] = useState([]);
    const [allWords, setAllWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNivel, setSelectedNivel] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingWord, setEditingWord] = useState(null);

    useEffect(() => {
        loadWords();
    }, [selectedNivel]);

    const loadWords = async () => {
        setLoading(true);
        try {
            // ВСЕГДА загружаем ВСЕ слова
            const allQuery = query(collection(db, 'vocabulario'));
            const allSnapshot = await getDocs(allQuery);
            const allData = [];
            allSnapshot.forEach((doc) => {
                allData.push({ id: doc.id, ...doc.data() });
            });
            setAllWords(allData); // ← Сохраняем все

            // Фильтруем для отображения
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
            alert('Error al cargar palabras: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (wordId, wordEs) => {
        if (!window.confirm(`¿Eliminar "${wordEs}"?`)) return;

        try {
            await deleteDoc(doc(db, 'vocabulario', wordId));
            console.log('Palabra eliminada:', wordId);
            loadWords();
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar: ' + error.message);
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

    const filteredWords = words.filter(word =>
        word.es.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.ru.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ← ИСПРАВЛЕНО: считаем от allWords
    const getCountByNivel = (nivel) => {
        return allWords.filter(w => w.nivel === nivel).length;
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

            {/* Main Content */}
            <div className="main-panel">
                <div className="panel-header">
                    <div className="header-top">
                        <h1>Vocabulario</h1>
                        <button className="btn-add" onClick={() => setShowForm(true)}>
                            + Añadir palabra
                        </button>
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
                    <div className="loading">Cargando palabras...</div>
                ) : (
                    <div className="content-area">
                        <table className="data-table">
                            <thead>
                            <tr>
                                <th>Nivel</th>
                                <th>Español</th>
                                <th>Русский</th>
                                <th>Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredWords.map(word => (
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

                        {filteredWords.length === 0 && (
                            <div className="no-results">
                                {searchTerm
                                    ? 'No se encontraron palabras'
                                    : 'No hay palabras todavía'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showForm && (
                <VocabularioForm
                    word={editingWord}
                    onClose={handleFormClose}
                />
            )}
        </div>
    );
}

export default VocabularioList;