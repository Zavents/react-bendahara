import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import './App.css'; 

// Import komponen form
import PaymentForm from './components/PaymentForm'; 
import UserForm from './components/UserForm';
import DueForm from './components/DueForm'; 

// Tentukan Tampilan yang Tersedia
const VIEWS = {
    HOME: 'home',
    TRANSACTION: 'transaction',
    ADD_USER: 'addUser',
    ADD_DUE: 'addDue', 
};

const SummaryView = ({ mahasiswaList, duesList, userDueStatus }) => {
    // 1. Filter Mahasiswa dan Urutkan Berdasarkan Nama
    const sortedMahasiswa = mahasiswaList
        .filter(m => m.role === 'mahasiswa')
        .sort((a, b) => a.name.localeCompare(b.name));

    const totalMahasiswa = sortedMahasiswa.length;
    const totalDues = duesList.length;

    // 2. Fungsi untuk Menghitung Status Iuran (DIPERBAIKI FINAL)
    const getDueStatusSummary = (userId) => {
        let lunasCount = 0;
        let nyicilCount = 0;
        let belumBayarCount = 0;

        // Map status pembayaran yang sudah ada untuk pengguna ini
        const userStatuses = userDueStatus.filter(s => 
            Number(s.user_id) === Number(userId)
        );
        
        // Gunakan set dari due_id yang sudah ada di status untuk cek yang 'BELUM ADA' transaksi
        const dueIdsWithStatus = new Set(userStatuses.map(s => Number(s.due_id)));

        // A. Proses iuran yang sudah memiliki status (LUNAS/NYICIL)
        userStatuses.forEach(s => {
            const paid = Number(s.total_paid);
            const required = Number(s.total_required);

            // Kita harus pastikan required amount > 0
            if (required > 0) {
                if (paid >= required) {
                    lunasCount++; // LUNAS
                } else if (paid > 0 && paid < required) {
                    nyicilCount++; // NYICIL
                }
                // Jika paid = 0, ini akan diproses di tahap B jika iuran ini ada di duesList
            }
        });
        
        // B. Proses iuran yang Belum Bayar Sama Sekali (ID Due yang belum ada di user_due_status)
        // Kita bandingkan semua duesList dengan apa yang sudah ada di userStatuses.
        duesList.forEach(due => {
            const dueId = Number(due.id);
            const requiredAmount = Number(due.required_amount);

            // Jika iuran TIDAK ADA di userStatuses, berarti total_paid-nya 0
            if (!dueIdsWithStatus.has(dueId) && requiredAmount > 0) {
                // Ini adalah iuran yang belum pernah tercatat transaksinya sama sekali.
                belumBayarCount++; 
            }
        });
        
        // C. Hitung sisanya (jika ada iuran yang masuk ke userStatuses tapi total_paid-nya 0)
        // Kita juga perlu hitung iuran yang ada di userStatuses tapi total_paid-nya 0
        const duesStillPending = userStatuses.filter(s => Number(s.total_paid) === 0);
        belumBayarCount += duesStillPending.length;


        // Format: Jumlah Lunas ✅ | Jumlah Nyicil 💳🗓️ | Jumlah Belum ❌
        return (
            <span style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                {lunasCount} ✅ &nbsp; 
                {nyicilCount} 💳🗓️ &nbsp; 
                {belumBayarCount} ❌ 
            </span>
        );
    };


    return (
        <div className="card">
            <h2>Ringkasan Data</h2>
            <div>
                {/* Ringkasan Statistik */}
                <p>Total Mahasiswa: <strong>{totalMahasiswa}</strong></p>
                <p>Total Jenis Iuran: <strong>{totalDues}</strong></p>
                
                <hr style={{ margin: '15px 0' }}/>
                
                {/* Keterangan Emoji */}
                <div style={{ marginBottom: '15px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9em' }}>Keterangan Status Iuran:</p>
                    <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '5px 0 0 0', fontSize: '0.85em' }}>
                        <li>✅ : Lunas (Lunas Sempurna)</li>
                        <li>💳🗓️ : Nyicil (Sedang dalam proses pembayaran)</li>
                        <li>❌ : Belum Bayar (Belum ada catatan pembayaran)</li>
                    </ul>
                </div>
                
                <hr style={{ margin: '15px 0' }}/>

                <h3>Daftar Mahasiswa & Status Iuran:</h3>
                <ul style={{ listStyleType: 'none', paddingLeft: '0' }}>
                    
                    {sortedMahasiswa.map((m, index) => (
                        <li 
                            key={m.id} 
                            style={{ 
                                marginBottom: '15px', 
                                borderBottom: '1px dotted var(--border-color)', 
                                paddingBottom: '10px' 
                            }}
                        >
                            {/* Nomor dan Nama */}
                            <p style={{ margin: 0, fontWeight: 'bold' }}>
                                <strong style={{ marginRight: '8px', color: 'var(--accent-gold)' }}>
                                    {index + 1}.
                                </strong>
                                {m.name} 
                            </p>
                            
                            {/* Status Iuran di bawah Nama */}
                            <div style={{ marginLeft: '25px', marginTop: '5px' }}>
                                {getDueStatusSummary(m.id)}
                            </div>
                        </li>
                    ))}
                </ul>
                
                {sortedMahasiswa.length === 0 && (
                    <p className="small-text" style={{ textAlign: 'center' }}>Belum ada data mahasiswa yang terdaftar.</p>
                )}

            </div>
        </div>
    );
};

// ... (Sisa kode AdminDashboard.jsx tetap sama)

// Component MenuCard (Kartu Menu - Tidak Berubah)
const MenuCard = ({ title, description, onClick, accentColor }) => (
    <div 
        className="card menu-card-button" 
        onClick={onClick}
        style={{ 
            cursor: 'pointer', 
            borderLeft: `5px solid var(--accent-${accentColor})`,
            marginBottom: '15px' 
        }}
        tabIndex="0" 
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                onClick();
            }
        }}
    >
        <h3 style={{ margin: 0, color: `var(--accent-${accentColor})` }}>{title}</h3>
        <p className='small-text' style={{ marginTop: '5px' }}>{description}</p>
    </div>
);


// Component Menu Tombol (MenuButtons)
const MenuButtons = ({ setCurrentView, onLogout }) => (
    <div className="card">
        <h2>Menu Utama</h2>
        <p className='small-text'>Pilih menu di bawah untuk melanjutkan.</p>
        
        <hr style={{ margin: '15px 0' }}/>
        
        {/* 1. Catat Pembayaran Baru - Biru */}
        <MenuCard 
            title="Catat Pembayaran Baru"
            description="Lakukan pencatatan transaksi iuran mahasiswa."
            onClick={() => setCurrentView(VIEWS.TRANSACTION)}
            accentColor="blue" 
        />
        
        {/* 2. Tambah Jenis Iuran - Emas */}
        <MenuCard 
            title="Tambah Jenis Iuran Baru" 
            description="Buat jenis iuran baru (mis. PDH 2025, Jaket)."
            onClick={() => setCurrentView(VIEWS.ADD_DUE)} 
            accentColor="gold" 
        />


        {/* 3. Tambah Pengguna Baru - Emas */}
        <MenuCard 
            title="Tambah Pengguna Baru"
            description="Daftarkan Mahasiswa atau Admin baru ke sistem."
            onClick={() => setCurrentView(VIEWS.ADD_USER)}
            accentColor="gold" 
        />
        
        
        <hr style={{ margin: '25px 0' }}/>
        
        {/* Tombol Logout standar */}
        <button 
            className="btn-submit" 
            onClick={onLogout} 
            style={{ 
                background: 'var(--accent-error)', 
                marginTop: '10px' 
            }}
        >
            Logout
        </button>
    </div>
);


function AdminDashboard({ user, onLogout }) {
    // --- State untuk Data Database ---
    const [mahasiswaList, setMahasiswaList] = useState([]);
    const [duesList, setDuesList] = useState([]);
    const [userDueStatus, setUserDueStatus] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // STATE UNTUK NAVIGASI
    const [currentView, setCurrentView] = useState(VIEWS.HOME);
    
    // --- Fungsi Pengambilan Data ---
const fetchAllData = async () => {
        setLoading(true);

        const { data: usersData, error: usersError } = await supabase.from('users').select('*').order('name', { ascending: true });
        const { data: duesData, error: duesError } = await supabase.from('dues').select('*');
        
        // UBAH PENGAMBILAN DATA STATUS DI SINI:
        // Ambil total_paid (sesuai skema SQL baru Anda)
        const { data: statusData, error: statusError } = await supabase.from('user_due_status').select('user_id, due_id, total_paid, total_required'); 
        // -----------------------------

        if (usersError || duesError || statusError) {
            console.error('Error fetching data:', usersError || duesError || statusError);
        } else {
            setMahasiswaList(usersData);
            setDuesList(duesData);
            // Simpan status baru
            setUserDueStatus(statusData); 
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Fungsi untuk kembali ke Home/Ringkasan - Dipakai sebagai prop 'onDone'
    const handleGoHome = () => setCurrentView(VIEWS.HOME); 


    // Fungsi untuk menentukan komponen yang akan dirender
    const renderView = () => {
        switch (currentView) {
            case VIEWS.TRANSACTION:
                return (
                    <PaymentForm 
                        mahasiswaList={mahasiswaList} 
                        duesList={duesList} 
                        userDueStatus={userDueStatus} 
                        fetchAllData={fetchAllData} 
                        onDone={handleGoHome} 
                    />
                );
            case VIEWS.ADD_USER:
                return (
                    <UserForm 
                        fetchAllData={fetchAllData} 
                        onDone={handleGoHome} 
                    />
                );
            case VIEWS.ADD_DUE:
                return (
                    <DueForm 
                        fetchAllData={fetchAllData} 
                        onDone={handleGoHome} 
                    />
                );
            case VIEWS.HOME:
            default:
                // Tampilan Tumpukan Vertikal
                return (
                    <div className="dashboard-stacked"> 
                        
                        {/* 1. Menu Tombol */}
                        <MenuButtons setCurrentView={setCurrentView} onLogout={onLogout} />

                        {/* 2. Ringkasan Data - Mengirim semua data yang diperlukan */}
                        <SummaryView 
                            mahasiswaList={mahasiswaList} 
                            duesList={duesList} 
                            userDueStatus={userDueStatus}
                        />
                    </div>
                );
        }
    };


    if (loading) {
        return <p style={{ textAlign: 'center' }}>Memuat Dashboard...</p>;
    }
    
    // --- Render Tampilan Utama Dashboard ---
    return (
        <div className="dashboard-layout">
            
            {/* Navigasi / Header Kontrol */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', borderBottom: '1px solid var(--border-color)' }}>
                
                {/* Tombol Kembali (hanya muncul jika tidak di HOME) */}
                {currentView !== VIEWS.HOME && (
                    <button 
                        onClick={handleGoHome} // Tombol kembali yang eksplisit
                        style={{ 
                            background: 'var(--accent-error)', 
                            color: '#fff', 
                            border: 'none', 
                            padding: '8px 15px', 
                            borderRadius: 'var(--radius)', 
                            cursor: 'pointer' 
                        }}
                    >
                        &larr; Batalkan & Kembali
                    </button>
                )}
                
                {/* Info User */}
                <p style={{ margin: 0 }}>Admin Saat Ini: <span style={{ color: 'var(--accent-gold)' }}>{user.name}</span></p>
                
                {/* Tombol Logout (hanya muncul jika di HOME) */}
                {currentView === VIEWS.HOME && (
                    <button 
                        onClick={onLogout} 
                        style={{ 
                            background: 'var(--accent-error)', 
                            color: 'var(--text-primary)', 
                            border: 'none', 
                            padding: '8px 15px', 
                            borderRadius: 'var(--radius)', 
                            cursor: 'pointer' 
                        }}
                    >
                        Logout
                    </button>
                )}
            </div>
            
            <div style={{ marginTop: '20px' }}>
                {renderView()}
            </div>
            
        </div>
    );
}

export default AdminDashboard;