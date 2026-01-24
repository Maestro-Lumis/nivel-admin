// src/components/Auth/Login.js
import React, { useState } from 'react';
import './Login.css';

// Список администраторов с хардкод паролями
const ADMINS = {
    'admin': 'admin123',           // username: password
    'editor': 'editor123',
    // Добавь своих админов сюда
};

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Проверяем username и password
        if (ADMINS[username] && ADMINS[username] === password) {
            console.log('Login exitoso:', username);
            // Сохраняем в localStorage
            localStorage.setItem('adminUser', username);
            onLogin({ username });
        } else {
            setError('Usuario o contraseña incorrectos');
        }

        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>🇪🇸 NivelVer Admin</h1>
                <h2>Panel de Administración</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Usuario:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin"
                            required
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label>Contraseña:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Cargando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="login-info">
                    <p>Solo usuarios autorizados pueden acceder</p>
                </div>
            </div>
        </div>
    );
}

export default Login;