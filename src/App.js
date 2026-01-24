// src/App.js
import React, { useState, useEffect } from 'react';
import Login from './components/Auth/Login';
import VocabularioList from './components/Vocabulario/VocabularioList';
import LecturaList from './components/Lectura/LecturaList';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('vocabulario'); // vocabulario | lectura

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem('adminUser');
    if (savedUser) {
      setUser({ username: savedUser });
      console.log('Usuario autenticado:', savedUser);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión?')) {
      localStorage.removeItem('adminUser');
      setUser(null);
      console.log('Sesión cerrada');
    }
  };

  if (loading) {
    return (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
      <div className="app">
        <nav className="navbar">
          <div className="nav-content">
            <h1 className="nav-title">🇪🇸 NivelVer Admin</h1>
            <div className="nav-center">
              <button
                  className={`nav-tab ${activeModule === 'vocabulario' ? 'active' : ''}`}
                  onClick={() => setActiveModule('vocabulario')}
              >
                Vocabulario
              </button>
              <button
                  className={`nav-tab ${activeModule === 'lectura' ? 'active' : ''}`}
                  onClick={() => setActiveModule('lectura')}
              >
                Lectura
              </button>
            </div>
            <div className="nav-right">
              <span className="user-email">👤 {user.username}</span>
              <button className="btn-logout" onClick={handleLogout}>
                 Salir
              </button>
            </div>
          </div>
        </nav>

        <main className="main-content">
          {activeModule === 'vocabulario' && <VocabularioList />}
          {activeModule === 'lectura' && <LecturaList />}
        </main>
      </div>
  );
}

export default App;