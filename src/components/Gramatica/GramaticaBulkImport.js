// src/components/Gramatica/GramaticaBulkImport.js
import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Gramatica.css';

const NIVELES = ['A1', 'A2', 'B1', 'B2'];

function GramaticaBulkImport({ onClose }) {
    const [activeTab, setActiveTab] = useState('text');
    const [nivel, setNivel] = useState('A1');
    const [textInput, setTextInput] = useState('');
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [parseError, setParseError] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [duplicateCheck, setDuplicateCheck] = useState({ duplicates: [], uniqueQuestions: [] });

    // Parse text input (formato: Pregunta|opcion1,opcion2,opcion3,opcion4|correcta)
    const parseTextInput = (text) => {
        if (!text.trim()) {
            setParsedQuestions([]);
            setParseError('');
            return;
        }

        const lines = text.split('\n').filter(line => line.trim());
        const questions = [];
        const errors = [];

        lines.forEach((line, index) => {
            const parts = line.split('|').map(p => p.trim());

            if (parts.length !== 3) {
                errors.push(`Línea ${index + 1}: formato incorrecto (debe ser: pregunta|opciones|correcta)`);
            } else {
                const pregunta = parts[0];
                const opcionesText = parts[1];
                const correctaText = parts[2];

                if (!pregunta || !opcionesText || !correctaText) {
                    errors.push(`Línea ${index + 1}: campos vacíos`);
                } else {
                    const opcionesArray = opcionesText.split(',').map(o => o.trim());

                    if (opcionesArray.length < 2) {
                        errors.push(`Línea ${index + 1}: debe haber al menos 2 opciones`);
                    } else if (!opcionesArray.includes(correctaText)) {
                        errors.push(`Línea ${index + 1}: la respuesta correcta no está en las opciones`);
                    } else {
                        questions.push({
                            nivel: nivel.toUpperCase(),
                            tipo: 'multiple_choice',
                            pregunta: pregunta,
                            opciones: opcionesArray.map(texto => ({
                                texto: texto,
                                correcta: texto === correctaText
                            }))
                        });
                    }
                }
            }
        });

        if (errors.length > 0) {
            setParseError(errors.join('\n'));
            setParsedQuestions([]);
        } else {
            setParseError('');
            setParsedQuestions(questions);
        }
    };

    // Handle text input change
    const handleTextChange = (value) => {
        setTextInput(value);
        parseTextInput(value);
    };

    // Check duplicates when parsedQuestions changes
    useEffect(() => {
        if (parsedQuestions.length > 0) {
            checkDuplicatesInPreview();
        } else {
            setDuplicateCheck({ duplicates: [], uniqueQuestions: [] });
        }
    }, [parsedQuestions]);

    // Check duplicates for preview
    const checkDuplicatesInPreview = async () => {
        try {
            const q = query(collection(db, 'grammar_questions'));
            const querySnapshot = await getDocs(q);
            const existingQuestions = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                existingQuestions.push({
                    pregunta: data.pregunta.toLowerCase().trim()
                });
            });

            const duplicates = [];
            const uniqueQuestions = [];

            parsedQuestions.forEach(question => {
                const isDuplicate = existingQuestions.some(existing =>
                    existing.pregunta === question.pregunta.toLowerCase().trim()
                );

                if (isDuplicate) {
                    duplicates.push(question);
                } else {
                    uniqueQuestions.push(question);
                }
            });

            setDuplicateCheck({ duplicates, uniqueQuestions });
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
        const hasHeader = firstLine.includes('nivel') && firstLine.includes('pregunta');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        const questions = [];
        const errors = [];

        dataLines.forEach((line, index) => {
            const parts = line.split(',').map(p => p.trim());

            if (parts.length < 4) {
                errors.push(`Línea ${index + 1}: faltan columnas (mínimo: nivel,pregunta,opcion1,opcion2,...,correcta)`);
            } else {
                const nivelValue = parts[0];
                const pregunta = parts[1];
                const opciones = parts.slice(2, -1); // All middle columns are options
                const correcta = parts[parts.length - 1]; // Last column is correct answer

                if (!NIVELES.includes(nivelValue.toUpperCase())) {
                    errors.push(`Línea ${index + 1}: nivel inválido "${nivelValue}"`);
                } else if (!pregunta || opciones.length < 2) {
                    errors.push(`Línea ${index + 1}: pregunta vacía o menos de 2 opciones`);
                } else if (!opciones.includes(correcta)) {
                    errors.push(`Línea ${index + 1}: la respuesta correcta no está en las opciones`);
                } else {
                    questions.push({
                        nivel: nivelValue.toUpperCase(),
                        tipo: 'multiple_choice',
                        pregunta: pregunta,
                        opciones: opciones.map(texto => ({
                            texto: texto,
                            correcta: texto === correcta
                        }))
                    });
                }
            }
        });

        if (errors.length > 0) {
            setParseError(errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...' : ''));
            setParsedQuestions([]);
        } else {
            setParseError('');
            setParsedQuestions(questions);
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
        const template = `nivel,pregunta,opcion1,opcion2,opcion3,opcion4,correcta
        A1,Yo _____ español,hablo,hablas,habla,hablan,hablo
        A1,Tú _____ agua,bebo,bebes,bebe,beben,bebes
        A2,Ella _____ en Madrid,vivo,vives,vive,viven,vive
        B1,Nosotros _____ al cine,voy,vas,va,vamos,vamos`;

        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'gramatica_plantilla.csv';
        link.click();
    };

    // Check duplicates before saving
    const checkDuplicates = async () => {
        try {
            const q = query(collection(db, 'grammar_questions'));
            const querySnapshot = await getDocs(q);
            const existingQuestions = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                existingQuestions.push({
                    pregunta: data.pregunta.toLowerCase().trim()
                });
            });

            const duplicates = [];
            const uniqueQuestions = [];

            parsedQuestions.forEach(question => {
                const isDuplicate = existingQuestions.some(existing =>
                    existing.pregunta === question.pregunta.toLowerCase().trim()
                );

                if (isDuplicate) {
                    duplicates.push(question);
                } else {
                    uniqueQuestions.push(question);
                }
            });

            return { duplicates, uniqueQuestions };
        } catch (error) {
            console.error('Error checking duplicates:', error);
            return { duplicates: [], uniqueQuestions: parsedQuestions };
        }
    };

    // Save all questions to Firebase
    const handleSave = async () => {
        if (parsedQuestions.length === 0) {
            alert('No hay preguntas para guardar');
            return;
        }

        setLoading(true);

        try {
            const { duplicates, uniqueQuestions } = await checkDuplicates();

            if (duplicates.length > 0) {
                const duplicateList = duplicates.map(q => q.pregunta).join('\n');
                const confirmMessage = `⚠️ ${duplicates.length} pregunta(s) ya existe(n) en la base de datos:\n\n${duplicateList}\n\n¿Desea añadir solo las ${uniqueQuestions.length} pregunta(s) nueva(s)?`;

                if (!window.confirm(confirmMessage)) {
                    setLoading(false);
                    return;
                }
            }

            if (uniqueQuestions.length === 0) {
                alert('⚠️ Todas las preguntas ya existen en la base de datos');
                setLoading(false);
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const question of uniqueQuestions) {
                try {
                    await addDoc(collection(db, 'grammar_questions'), question);
                    successCount++;
                } catch (error) {
                    console.error('Error saving question:', question, error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                const message = duplicates.length > 0
                    ? `✓ ${successCount} preguntas añadidas exitosamente\n⚠️ ${duplicates.length} duplicado(s) ignorado(s)`
                    : `✓ ${successCount} preguntas añadidas exitosamente`;
                alert(message);
                onClose();
            } else {
                alert(`⚠️ ${successCount} preguntas añadidas, ${errorCount} errores`);
            }
        } catch (error) {
            console.error('Error saving questions:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Añadir Varias Preguntas (Multiple Choice)</h2>
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
                            <span className="helper-text">Todas las preguntas se añadirán con este nivel</span>
                        </div>

                        <div className="example-box">
                            <strong>📋 Formato:</strong>
                            <code>pregunta|opción1,opción2,opción3,opción4|correcta</code>
                        </div>

                        <div className="form-group">
                            <label>Preguntas:</label>
                            <textarea
                                value={textInput}
                                onChange={(e) => handleTextChange(e.target.value)}
                                placeholder="Yo _____ español|hablo,hablas,habla,hablan|hablo&#10;Tú _____ agua|bebo,bebes,bebe,beben|bebes&#10;Ella _____ en Madrid|vivo,vives,vive,viven|vive"
                                disabled={loading}
                                style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '14px' }}
                            />
                            <span className="helper-text">💡 Una pregunta por línea. Usa | para separar pregunta, opciones y respuesta correcta</span>
                        </div>

                        {parseError && (
                            <div className="status-error">
                                ⚠️ Errores encontrados:
                                <pre style={{ marginTop: '8px', fontSize: '12px' }}>{parseError}</pre>
                            </div>
                        )}

                        {parsedQuestions.length > 0 && !parseError && (
                            <>
                                <div className="status-success">
                                    ✓ {parsedQuestions.length} pregunta{parsedQuestions.length !== 1 ? 's' : ''} detectada{parsedQuestions.length !== 1 ? 's' : ''} correctamente
                                    {duplicateCheck.duplicates.length > 0 && (
                                        <div style={{ marginTop: '8px', color: '#e65100' }}>
                                            ⚠️ {duplicateCheck.duplicates.length} duplicado(s) - solo se añadirán {duplicateCheck.uniqueQuestions.length} pregunta(s) nueva(s)
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
                                            <th>Pregunta</th>
                                            <th>Opciones</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {parsedQuestions.slice(0, 10).map((question, index) => {
                                            const isDuplicate = duplicateCheck.duplicates.some(d =>
                                                d.pregunta === question.pregunta
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
                                                            <span className={`badge nivel-${question.nivel.toLowerCase()}`}>
                                                                {question.nivel}
                                                            </span>
                                                    </td>
                                                    <td>{question.pregunta}</td>
                                                    <td style={{ fontSize: '12px', color: '#666' }}>
                                                        {question.opciones.map((op, i) => (
                                                            <span key={i} style={op.correcta ? { fontWeight: 600, color: '#2e7d32' } : {}}>
                                                                    {op.texto}{i < question.opciones.length - 1 ? ', ' : ''}
                                                                </span>
                                                        ))}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {parsedQuestions.length > 10 && (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', color: '#867666' }}>
                                                    ... y {parsedQuestions.length - 10} pregunta{parsedQuestions.length - 10 !== 1 ? 's' : ''} más
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
                                disabled={loading || parsedQuestions.length === 0 || parseError || duplicateCheck.uniqueQuestions.length === 0}
                            >
                                {loading ? 'Guardando...' : `💾 Guardar ${duplicateCheck.uniqueQuestions.length || parsedQuestions.length} pregunta${(duplicateCheck.uniqueQuestions.length || parsedQuestions.length) !== 1 ? 's' : ''} nueva${(duplicateCheck.uniqueQuestions.length || parsedQuestions.length) !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                )}

                {/* CSV Tab */}
                {activeTab === 'csv' && (
                    <div className="tab-content active">
                        <div className="example-box">
                            <strong>📋 Formato CSV:</strong>
                            <code>nivel,pregunta,opcion1,opcion2,opcion3,opcion4,correcta<br/>A1,Yo _____ español,hablo,hablas,habla,hablan,hablo</code>
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

                        {parsedQuestions.length > 0 && !parseError && (
                            <>
                                <div className="status-success" style={{ marginTop: '16px' }}>
                                    ✓ {csvFile?.name}: {parsedQuestions.length} pregunta{parsedQuestions.length !== 1 ? 's' : ''} detectada{parsedQuestions.length !== 1 ? 's' : ''}
                                    {duplicateCheck.duplicates.length > 0 && (
                                        <div style={{ marginTop: '8px', color: '#e65100' }}>
                                            ⚠️ {duplicateCheck.duplicates.length} duplicado(s) - solo se añadirán {duplicateCheck.uniqueQuestions.length} pregunta(s) nueva(s)
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
                                            <th>Pregunta</th>
                                            <th>Opciones</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {parsedQuestions.slice(0, 10).map((question, index) => {
                                            const isDuplicate = duplicateCheck.duplicates.some(d =>
                                                d.pregunta === question.pregunta
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
                                                            <span className={`badge nivel-${question.nivel.toLowerCase()}`}>
                                                                {question.nivel}
                                                            </span>
                                                    </td>
                                                    <td>{question.pregunta}</td>
                                                    <td style={{ fontSize: '12px', color: '#666' }}>
                                                        {question.opciones.map((op, i) => (
                                                            <span key={i} style={op.correcta ? { fontWeight: 600, color: '#2e7d32' } : {}}>
                                                                    {op.texto}{i < question.opciones.length - 1 ? ', ' : ''}
                                                                </span>
                                                        ))}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {parsedQuestions.length > 10 && (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'center', color: '#867666' }}>
                                                    ... y {parsedQuestions.length - 10} pregunta{parsedQuestions.length - 10 !== 1 ? 's' : ''} más
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
                                disabled={loading || parsedQuestions.length === 0 || parseError || duplicateCheck.uniqueQuestions.length === 0}
                            >
                                {loading ? 'Guardando...' : `💾 Guardar ${duplicateCheck.uniqueQuestions.length || parsedQuestions.length} pregunta${(duplicateCheck.uniqueQuestions.length || parsedQuestions.length) !== 1 ? 's' : ''} nueva${(duplicateCheck.uniqueQuestions.length || parsedQuestions.length) !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default GramaticaBulkImport;