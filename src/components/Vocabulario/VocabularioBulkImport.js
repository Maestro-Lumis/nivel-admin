// src/components/Vocabulario/VocabularioBulkImport.js
import React, {useEffect, useState} from 'react';
import {collection, addDoc, query, getDocs} from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Vocabulario.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function VocabularioBulkImport({ onClose }) {
    const [activeTab, setActiveTab] = useState('text'); // 'text' or 'csv'
    const [nivel, setNivel] = useState('A1');
    const [textInput, setTextInput] = useState('');
    const [parsedWords, setParsedWords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [parseError, setParseError] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [duplicateCheck, setDuplicateCheck] = useState({ duplicates: [], uniqueWords: [] }); // ← НОВОЕ

    // Parse text input (formato: español - русский)
    const parseTextInput = (text) => {
        if (!text.trim()) {
            setParsedWords([]);
            setParseError('');
            return;
        }

        const lines = text.split('\n').filter(line => line.trim());
        const words = [];
        const errors = [];

        lines.forEach((line, index) => {
            const parts = line.split('-').map(p => p.trim());

            if (parts.length !== 2) {
                errors.push(`Línea ${index + 1}: formato incorrecto`);
            } else if (!parts[0] || !parts[1]) {
                errors.push(`Línea ${index + 1}: campos vacíos`);
            } else {
                words.push({
                    nivel: nivel.toUpperCase(),
                    es: parts[0],
                    ru: parts[1]
                });
            }
        });

        if (errors.length > 0) {
            setParseError(errors.join('\n'));
            setParsedWords([]);
        } else {
            setParseError('');
            setParsedWords(words);
        }
    };

    // Handle text input change
    const handleTextChange = (value) => {
        setTextInput(value);
        parseTextInput(value);
    };

    // Проверка дубликатов при изменении parsedWords
    useEffect(() => {
        if (parsedWords.length > 0) {
            checkDuplicatesInPreview();
        } else {
            setDuplicateCheck({ duplicates: [], uniqueWords: [] });
        }
    }, [parsedWords]);

    // Проверка дубликатов для preview
    const checkDuplicatesInPreview = async () => {
        try {
            const q = query(collection(db, 'vocabulario'));
            const querySnapshot = await getDocs(q);
            const existingWords = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                existingWords.push({
                    es: data.es.toLowerCase().trim(),
                    ru: data.ru.toLowerCase().trim()
                });
            });

            const duplicates = [];
            const uniqueWords = [];

            parsedWords.forEach(word => {
                const isDuplicate = existingWords.some(existing =>
                    existing.es === word.es.toLowerCase().trim() ||
                    existing.ru === word.ru.toLowerCase().trim()
                );

                if (isDuplicate) {
                    duplicates.push(word);
                } else {
                    uniqueWords.push(word);
                }
            });

            setDuplicateCheck({ duplicates, uniqueWords });
        } catch (error) {
            console.error('Error checking duplicates:', error);
        }
    };

    // Parse CSV file
    const parseCSV = (fileContent) => {
        const lines = fileContent.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            setParseError('El archivo CSV está vacío');
            return;
        }

        // Check if first line is header
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('nivel') && firstLine.includes('es') && firstLine.includes('ru');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        const words = [];
        const errors = [];

        dataLines.forEach((line, index) => {
            const parts = line.split(',').map(p => p.trim());

            if (parts.length < 3) {
                errors.push(`Línea ${index + 1}: faltan columnas`);
            } else {
                const [nivelValue, esValue, ruValue] = parts;

                if (!NIVELES.includes(nivelValue.toUpperCase())) {
                    errors.push(`Línea ${index + 1}: nivel inválido "${nivelValue}"`);
                } else if (!esValue || !ruValue) {
                    errors.push(`Línea ${index + 1}: campos vacíos`);
                } else {
                    words.push({
                        nivel: nivelValue.toUpperCase(),
                        es: esValue,
                        ru: ruValue
                    });
                }
            }
        });

        if (errors.length > 0) {
            setParseError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...' : ''));
            setParsedWords([]);
        } else {
            setParseError('');
            setParsedWords(words);
        }
    };

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setParseError('Por favor, seleccione un archivo CSV');
            return;
        }

        setCsvFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            parseCSV(e.target.result);
        };
        reader.onerror = () => {
            setParseError('Error al leer el archivo');
        };
        reader.readAsText(file);
    };

    // Download CSV template
    const downloadTemplate = () => {
        const template = `nivel,es,ru
        A1,casa,дом
        A1,perro,собака
        A2,libro,книга
        A2,escuela,школа
        B1,desarrollo,развитие`;

        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'vocabulario_plantilla.csv';
        link.click();
    };

    // Проверка на дубликаты
    const checkDuplicates = async () => {
        try {
            const q = query(collection(db, 'vocabulario'));
            const querySnapshot = await getDocs(q);
            const existingWords = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                existingWords.push({
                    es: data.es.toLowerCase().trim(),
                    ru: data.ru.toLowerCase().trim()
                });
            });

            const duplicates = [];
            const uniqueWords = [];

            parsedWords.forEach(word => {
                const isDuplicate = existingWords.some(existing =>
                    existing.es === word.es.toLowerCase().trim() ||
                    existing.ru === word.ru.toLowerCase().trim()
                );

                if (isDuplicate) {
                    duplicates.push(word);
                } else {
                    uniqueWords.push(word);
                }
            });

            return { duplicates, uniqueWords };
        } catch (error) {
            console.error('Error checking duplicates:', error);
            return { duplicates: [], uniqueWords: parsedWords };
        }
    };

    // Save all words to Firebase
    const handleSave = async () => {
        if (parsedWords.length === 0) {
            alert('No hay palabras para guardar');
            return;
        }

        setLoading(true);

        try {
            // Проверка на дубликаты
            const { duplicates, uniqueWords } = await checkDuplicates();

            if (duplicates.length > 0) {
                const duplicateList = duplicates.map(d => `${d.es} - ${d.ru}`).join('\n');
                const confirmMessage = `⚠️ ${duplicates.length} palabra(s) ya existe(n) en la base de datos:\n\n${duplicateList}\n\n¿Desea añadir solo las ${uniqueWords.length} palabra(s) nueva(s)?`;

                if (!window.confirm(confirmMessage)) {
                    setLoading(false);
                    return;
                }
            }

            if (uniqueWords.length === 0) {
                alert('⚠ Todas las palabras ya existen en la base de datos');
                setLoading(false);
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const word of uniqueWords) {
                try {
                    await addDoc(collection(db, 'vocabulario'), word);
                    successCount++;
                } catch (error) {
                    console.error('Error saving word:', word, error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                const message = duplicates.length > 0
                    ? `✓ ${successCount} palabras añadidas exitosamente\n⚠${duplicates.length} duplicado(s) ignorado(s)`
                    : `✓ ${successCount} palabras añadidas exitosamente`;
                alert(message);
                onClose();
            } else {
                alert(`⚠ ${successCount} palabras añadidas, ${errorCount} errores`);
            }
        } catch (error) {
            console.error('Error saving words:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Añadir Varias Palabras</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'text' ? 'active' : ''}`}
                        onClick={() => setActiveTab('text')}
                    >
                        📝 Texto
                    </button>
                    <button
                        className={`tab ${activeTab === 'csv' ? 'active' : ''}`}
                        onClick={() => setActiveTab('csv')}
                    >
                        📄 CSV
                    </button>
                </div>

                {/* Text Tab */}
                {activeTab === 'text' && (
                    <div className="tab-content active">
                        <div className="form-group">
                            <label>Nivel:</label>
                            <select
                                value={nivel}
                                onChange={(e) => {
                                    setNivel(e.target.value);
                                    parseTextInput(textInput);
                                }}
                                disabled={loading}
                            >
                                {NIVELES.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            <span className="helper-text">Todas las palabras se añadirán con este nivel</span>
                        </div>

                        <div className="example-box">
                            <strong>📋 Formato:</strong>
                            <code>español - русский (cada palabra en nueva línea)</code>
                        </div>

                        <div className="form-group">
                            <label>Palabras:</label>
                            <textarea
                                value={textInput}
                                onChange={(e) => handleTextChange(e.target.value)}
                                placeholder="casa - дом&#10;perro - собака&#10;gato - кот&#10;libro - книга&#10;mesa - стол"
                                disabled={loading}
                                style={{ minHeight: '200px' }}
                            />
                            <span className="helper-text">💡 Puedes copiar desde Excel/Google Sheets</span>
                        </div>

                        {parseError && (
                            <div className="status-error">
                                ⚠️ Errores encontrados:
                                <pre style={{ marginTop: '8px', fontSize: '12px' }}>{parseError}</pre>
                            </div>
                        )}

                        {parsedWords.length > 0 && !parseError && (
                            <>
                                <div className="status-success">
                                    ✓ {parsedWords.length} palabra{parsedWords.length !== 1 ? 's' : ''} detectada{parsedWords.length !== 1 ? 's' : ''} correctamente
                                    {duplicateCheck.duplicates.length > 0 && (
                                        <div style={{ marginTop: '8px', color: '#e65100' }}>
                                            ⚠️ {duplicateCheck.duplicates.length} duplicado(s) - solo se añadirán {duplicateCheck.uniqueWords.length} palabra(s) nueva(s)
                                        </div>
                                    )}
                                </div>

                                <div className="preview-section">
                                    <label style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>
                                        Vista previa:
                                    </label>
                                    <table className="data-table">
                                        <thead>
                                        <tr>
                                            <th>Estado</th>
                                            <th>Nivel</th>
                                            <th>Español</th>
                                            <th>Русский</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {parsedWords.slice(0, 10).map((word, index) => {
                                            const isDuplicate = duplicateCheck.duplicates.some(d =>
                                                d.es === word.es && d.ru === word.ru
                                            );
                                            return (
                                                <tr key={index} style={isDuplicate ? { background: '#fff3e0' } : {}}>
                                                    <td>
                                                        {isDuplicate ? (
                                                            <span style={{ color: '#e65100', fontWeight: 600 }}>⚠️ Duplicado</span>
                                                        ) : (
                                                            <span style={{ color: '#2e7d32', fontWeight: 600 }}>✓ Nueva</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                            <span className={`badge nivel-${word.nivel.toLowerCase()}`}>
                                                                {word.nivel}
                                                            </span>
                                                    </td>
                                                    <td>{word.es}</td>
                                                    <td>{word.ru}</td>
                                                </tr>
                                            );
                                        })}
                                        {parsedWords.length > 10 && (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', color: '#867666' }}>
                                                    ... y {parsedWords.length - 10} palabra{parsedWords.length - 10 !== 1 ? 's' : ''} más
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <div className="form-actions">
                            <button className="btn-cancel" onClick={onClose} disabled={loading}>
                                Cancelar
                            </button>
                            <button
                                className="btn-save"
                                onClick={handleSave}
                                disabled={loading || parsedWords.length === 0 || parseError}
                            >
                                {loading ? 'Guardando...' : `💾 Guardar ${parsedWords.length} palabra${parsedWords.length !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                )}

                {/* CSV Tab */}
                {activeTab === 'csv' && (
                    <div className="tab-content active">
                        <div className="example-box">
                            <strong>📋 Formato CSV:</strong>
                            <code>nivel,es,ru<br/>A1,casa,дом<br/>A2,libro,книга</code>
                        </div>

                        <label className="file-upload" htmlFor="csv-upload">
                            <input
                                type="file"
                                id="csv-upload"
                                accept=".csv"
                                onChange={handleFileUpload}
                                disabled={loading}
                            />
                            <div className="upload-icon">📄</div>
                            <div><strong>Arrastra el archivo CSV aquí</strong></div>
                            <div style={{ color: '#867666', marginTop: '8px' }}>o haz clic para seleccionar</div>
                        </label>

                        {csvFile && (
                            <div style={{ textAlign: 'center', marginTop: '12px', color: '#867666' }}>
                                📎 {csvFile.name}
                            </div>
                        )}

                        <div className="helper-text" style={{ marginTop: '16px', textAlign: 'center' }}>
                            💡 <button
                            onClick={downloadTemplate}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#E1B80D',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontSize: '13px'
                            }}
                        >
                            Descargar plantilla CSV
                        </button>
                        </div>

                        {parseError && (
                            <div className="status-error" style={{ marginTop: '16px' }}>
                                ⚠️ Errores encontrados:
                                <pre style={{ marginTop: '8px', fontSize: '12px' }}>{parseError}</pre>
                            </div>
                        )}

                        {parsedWords.length > 0 && !parseError && (
                            <>
                                <div className="status-success" style={{ marginTop: '16px' }}>
                                    ✓ {csvFile?.name}: {parsedWords.length} palabra{parsedWords.length !== 1 ? 's' : ''} detectada{parsedWords.length !== 1 ? 's' : ''}
                                    {duplicateCheck.duplicates.length > 0 && (
                                        <div style={{ marginTop: '8px', color: '#e65100' }}>
                                            ⚠️ {duplicateCheck.duplicates.length} duplicado(s) - solo se añadirán {duplicateCheck.uniqueWords.length} palabra(s) nueva(s)
                                        </div>
                                    )}
                                </div>

                                <div className="preview-section">
                                    <label style={{ marginBottom: '8px', display: 'block', fontWeight: 600 }}>
                                        Vista previa:
                                    </label>
                                    <table className="data-table">
                                        <thead>
                                        <tr>
                                            <th>Estado</th>
                                            <th>Nivel</th>
                                            <th>Español</th>
                                            <th>Русский</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {parsedWords.slice(0, 10).map((word, index) => {
                                            const isDuplicate = duplicateCheck.duplicates.some(d =>
                                                d.es === word.es && d.ru === word.ru
                                            );
                                            return (
                                                <tr key={index} style={isDuplicate ? { background: '#fff3e0' } : {}}>
                                                    <td>
                                                        {isDuplicate ? (
                                                            <span style={{ color: '#e65100', fontWeight: 600 }}>⚠️ Duplicado</span>
                                                        ) : (
                                                            <span style={{ color: '#2e7d32', fontWeight: 600 }}>✓ Nueva</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                            <span className={`badge nivel-${word.nivel.toLowerCase()}`}>
                                                                {word.nivel}
                                                            </span>
                                                    </td>
                                                    <td>{word.es}</td>
                                                    <td>{word.ru}</td>
                                                </tr>
                                            );
                                        })}
                                        {parsedWords.length > 10 && (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', color: '#867666' }}>
                                                    ... y {parsedWords.length - 10} palabra{parsedWords.length - 10 !== 1 ? 's' : ''} más
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        <div className="form-actions">
                            <button className="btn-cancel" onClick={onClose} disabled={loading}>
                                Cancelar
                            </button>
                            <button
                                className="btn-save"
                                onClick={handleSave}
                                disabled={loading || parsedWords.length === 0 || parseError}
                            >
                                {loading ? 'Guardando...' : `💾 Guardar ${parsedWords.length} palabra${parsedWords.length !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VocabularioBulkImport;