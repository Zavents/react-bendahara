import { useEffect, useState } from 'react';
import AdminDashboard from './AdminDashboard';      
import MahasiswaDashboard from './MahasiswaDashboard'; 
import Login from './Login'; // Import komponen Login
import './App.css'; 

function App() {
  // State untuk menyimpan data pengguna yang sudah login
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  // State untuk melacak status autentikasi
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // --- LOGIC TEMA ---
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  );
  
  const toggleTheme = () => {
    setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // Menerapkan class ke elemen body untuk tema
    document.body.className = theme + '-mode'; 
    localStorage.setItem('theme', theme); 
  }, [theme]);
  // --- END LOGIC TEMA ---

  // Fungsi untuk menangani proses login berhasil
  const handleLoginSuccess = (userData) => {
      setUser(userData);
      setIsLoggedIn(true);
      // Anda bisa menyimpan token/info sesi di localStorage di sini jika perlu
  };
  
  // Fungsi untuk menangani proses logout
  const handleLogout = () => {
      setUser(null);
      setIsLoggedIn(false);
      // Hapus info sesi dari localStorage di sini jika ada
  };

  useEffect(() => {
      // Karena kita tidak menggunakan Supabase Auth/sesi otomatis, 
      // kita set loading ke false agar halaman login muncul.
      setLoading(false); 
      // JANGAN ada panggilan ke getCurrentUserForTest() di sini!
  }, []);
  
  // --- Fungsi untuk Render Tampilan ---
  const renderContent = () => {
    if (loading) {
      return <p style={{ textAlign: 'center' }}>Memuat Aplikasi...</p>;
    }
    
    // Jika belum login, tampilkan halaman Login
    if (!isLoggedIn) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
    }
    
    // Jika sudah login, tampilkan Dashboard sesuai Role
    if (user.role === 'admin') {
      // Meneruskan prop handleLogout ke dashboard
      return <AdminDashboard user={user} onLogout={handleLogout} />; 
    } else if (user.role === 'mahasiswa') {
      return <MahasiswaDashboard user={user} onLogout={handleLogout} />;
    } else {
      return <h2>Peran tidak dikenal.</h2>;
    }
  };

  return (
    <div className="App">
      
      {/* Tombol Pengganti Tema */}
      <button 
        onClick={toggleTheme} 
        className="header-controls"
      >
        {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>

      <h1>&nbsp;&nbsp;&nbsp;&nbsp;  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</h1>
      
      <h1>Sistem Uang Iuran Bendahara  </h1>
      <h1>&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </h1>
      {/* Teks Status */}
      {isLoggedIn && (
        <p style={{ textAlign: 'center', fontSize: '1.05em', color: 'var(--text-secondary)' }}>
            Login sebagai: {user.name} ({user.role}) 
            {/* Tambahkan tombol Logout kecil di sini (Opsional) */}
            <button onClick={handleLogout} style={{ marginLeft: '15px', padding: '5px 10px', fontSize: '0.9em' }}>Logout</button>
        </p>
      )}
      <hr />
      
      {renderContent()}
    </div>
  );
}

export default App;