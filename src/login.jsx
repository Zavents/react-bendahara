import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css'; 

function Login({ onLoginSuccess }) {
    // State untuk kredensial
    const [name, setName] = useState('');
    const [password, setPassword] = useState(''); 
    // State untuk peran yang dipilih di halaman login
    const [loginRole, setLoginRole] = useState('admin'); 
    
    // State untuk status
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // State untuk daftar nama mahasiswa (untuk searchable dropdown)
    const [mahasiswaList, setMahasiswaList] = useState([]);

    // --- Efek untuk Mengambil Daftar Nama Mahasiswa ---
    useEffect(() => {
        async function fetchMahasiswaList() {
            // Ambil semua nama pengguna dengan peran 'mahasiswa'
            const { data, error } = await supabase
                .from('users')
                .select('name')
                .eq('role', 'mahasiswa');

            if (error) {
                console.error('Error fetching student names:', error);
                // Jika error, tidak perlu menghentikan aplikasi, biarkan list kosong
            } else {
                // Konversi array objek menjadi array string nama
                setMahasiswaList(data.map(user => user.name));
            }
        }
        fetchMahasiswaList();
    }, []);

    // --- Handler Login ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // 1. Persiapan Query Dasar
        let query = supabase
            .from('users')
            .select('*')
            .eq('name', name)
            .eq('role', loginRole)
            .single(); 

        // 2. Tambahkan kondisi Password hanya untuk Admin
        if (loginRole === 'admin') {
            // Admin: WAJIB verifikasi Nama, Role, DAN Password
            if (!password) {
                setError('Admin wajib memasukkan Password.');
                setLoading(false);
                return;
            }
            query = query.eq('password', password);
        } else if (loginRole === 'mahasiswa') {
            // Mahasiswa: CUKUP verifikasi Nama dan Role
            // Kolom 'password' TIDAK disertakan dalam query.
            // Supabase akan mencari baris yang cocok dengan Nama & Role Mahasiswa.
            // Tidak peduli apa isi kolom 'password' di baris tersebut.
        }

        // 3. Eksekusi Query
        const { data: userData, error: fetchError } = await query;

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = No rows found
            console.error('Login Error:', fetchError);
            setError('Terjadi kesalahan saat menghubungi database.');
        } else if (userData) {
            // 4. Login Berhasil
            onLoginSuccess(userData);
        } else {
            // 5. Data tidak ditemukan
            if (loginRole === 'admin') {
                setError('Nama atau Password Admin tidak cocok.');
            } else {
                setError('Nama Mahasiswa tidak terdaftar. Pastikan ejaan benar.');
            }
        }
        
        setLoading(false);
    };

    return (
        <div className="card" style={{ maxWidth: '450px', margin: '30px auto' }}>
            <h2>Login ke Sistem</h2>
            <form onSubmit={handleLogin}>
                
                {/* --- Pemilihan Peran --- */}
                <div className="form-group">
                    <label>Masuk sebagai:</label>
                    <div className="role-selector">
                        <button
                            type="button"
                            onClick={() => setLoginRole('admin')}
                            className={loginRole === 'admin' ? 'active' : ''}
                        >
                            Admin (Bendahara)
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginRole('mahasiswa')}
                            className={loginRole === 'mahasiswa' ? 'active' : ''}
                        >
                            Mahasiswa
                        </button>
                    </div>
                </div>

                {/* --- Input Nama (Conditional) --- */}
                <div className="form-group">
                    <label>Nama Pengguna:</label>
                    {loginRole === 'mahasiswa' ? (
                        <>
                            {/* Input Searchable Dropdown untuk Mahasiswa */}
                            <input
                                list="mahasiswa-names"
                                type="text"
                                placeholder="Ketik atau Pilih Nama Anda"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            {/* Datalist menyediakan opsi autocomplete/searchable */}
                            <datalist id="mahasiswa-names">
                                {mahasiswaList.map((mName) => (
                                    <option key={mName} value={mName} />
                                ))}
                            </datalist>
                        </>
                    ) : (
                        /* Input standar untuk Admin */
                        <input
                            type="text"
                            placeholder="Masukkan Nama Admin"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    )}
                </div>

                {/* --- Input Password (Tampil HANYA untuk Admin) --- */}
                {loginRole === 'admin' && (
                    <div className="form-group">
                        <label>Password Rahasia:</label>
                        <input
                            type="password"
                            placeholder="Masukkan Password Admin"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={4}
                        />
                    </div>
                )}
                
                {error && <p style={{ color: 'var(--accent-gold)', textAlign: 'center' }}>{error}</p>}

                <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Memverifikasi...' : 'Login ke Sistem'}
                </button>
            </form>
        </div>
    );
}

export default Login;