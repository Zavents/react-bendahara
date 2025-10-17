import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
// import './MahasiswaDashboard.css'; // Dihapus karena file tidak ada di struktur folder Anda

// --- KOMPONEN CARD STATUS ---
const StatusCard = ({ title, count, type }) => {
    let className = "status-card";
    let indicatorColor;
    if (type === 'lunas') {
        className += " success";
        indicatorColor = 'var(--accent-success, #4CAF50)';
    } else if (type === 'cicil') {
        className += " warning";
        indicatorColor = 'var(--accent-warning, #FFC107)';
    } else if (type === 'belum') {
        className += " danger";
        indicatorColor = 'var(--accent-error, #F44336)';
    }

    return (
        <div 
            className={className} 
            style={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '8px',
                borderLeft: `5px solid ${indicatorColor}`, 
                backgroundColor: 'var(--bg-secondary)', 
            }}
        >
            <div style={{ paddingLeft: '10px' }}>
                <p 
                    className="status-title" 
                    style={{ 
                        margin: 0, 
                        fontWeight: 'bold', 
                        fontSize: '1.2em',
                        color: indicatorColor 
                    }}
                >
                    {title}
                </p>
                <p 
                    className="status-count" 
                    style={{ 
                        margin: '5px 0 0 0', 
                        fontSize: '0.9em',
                        color: 'var(--text-primary)'
                    }}
                >
                    {count} iuran yang telah {type}
                </p>
            </div>
        </div>
    );
};

// --- KOMPONEN UTAMA DASHBOARD ---
function MahasiswaDashboard({ user }) {
    const [duesToPay, setDuesToPay] = useState([]); 
    const [duesPaid, setDuesPaid] = useState([]);   
    const [statusSummary, setStatusSummary] = useState({ lunas: 0, cicil: 0, belum: 0 });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- FUNGSI UTAMA UNTUK MENGAMBIL DAN MEMPROSES DATA IURAN ---
    const fetchStudentDues = async (userId) => {
        setLoading(true);
        setError(null);
        
        try {
            // Menggunakan tabel 'user_due_status' dan JOIN ke 'dues'
            const { data: userDuesStatus, error: fetchError } = await supabase
                .from('user_due_status') 
                .select(`
                    due_id, 
                    total_required, 
                    total_paid,
                    dues (title)
                `) 
                .eq('user_id', userId); 
            
            if (fetchError) {
                console.error('Error fetching student dues:', fetchError);
                setError(`Kesalahan Query Data: ${fetchError.message}. Hubungi developer.`); 
                setLoading(false);
                return;
            }

            // 2. Proses Data dari user_due_status (LUNAS/NYICIL/BELUM BAYAR DENGAN TRANSAKSI 0)
            let lunasCount = 0;
            let nyicilCount = 0;
            let belumBayarCount = 0;
            const toPayList = [];
            const paidList = [];

            userDuesStatus.forEach(dueStatus => {
                const title = dueStatus.dues?.title || 'Iuran Tidak Dikenal'; 
                const required = Number(dueStatus.total_required);
                const paid = Number(dueStatus.total_paid || 0);
                const remaining = required - paid;
                
                if (required <= 0) return; 

                if (remaining <= 0) {
                    lunasCount++;
                    paidList.push({ ...dueStatus, title, remaining: 0 });
                } else if (paid > 0 && remaining > 0) {
                    nyicilCount++;
                    toPayList.push({ ...dueStatus, title, remaining: remaining, status: 'Dicicil' });
                } else { // (paid == 0 && remaining > 0)
                    belumBayarCount++;
                    toPayList.push({ ...dueStatus, title, remaining: remaining, status: 'Belum Bayar' });
                }
            });

            // LOGIKA TAMBAHAN: Untuk iuran yang belum pernah ada di 'user_due_status' (belum ada transaksi sama sekali)
            const { data: allDues, error: duesError } = await supabase.from('dues').select('id, title, required_amount');

            if (!duesError && allDues) {
                const existingDueIds = new Set(userDuesStatus.map(s => s.due_id));
                
                allDues.forEach(due => {
                    // Cek jika iuran ini tidak ada di data status AND iuran ini wajib (> 0)
                    if (!existingDueIds.has(due.id) && Number(due.required_amount) > 0) {
                        belumBayarCount++;
                        toPayList.push({
                            due_id: due.id,
                            title: due.title,
                            total_required: due.required_amount,
                            total_paid: 0,
                            remaining: Number(due.required_amount),
                            status: 'Belum Bayar'
                        });
                    }
                });
            }

            setStatusSummary({ 
                lunas: lunasCount, 
                cicil: nyicilCount, 
                belum: belumBayarCount 
            });
            // Menggunakan Set untuk menghindari duplikasi dari logika tambahan
            setDuesToPay(Array.from(new Set(toPayList)));
            setDuesPaid(paidList);

        } catch (e) {
            console.error('Exception during data fetch:', e);
            setError(`Terjadi kesalahan pemrosesan data: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    // --- FUNGSI MENGAMBIL RIWAYAT TRANSAKSI ---
    const fetchTransactions = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    paid_amount, 
                    created_at, 
                    dues (title)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                 console.error('Error fetching transactions:', error);
                 setTransactions([]); 
                 return;
            }
            
            setTransactions(data);

        } catch(e) {
             console.error('Exception fetching transactions:', e);
        }
    };


    useEffect(() => {
        if (user && user.id) {
            fetchStudentDues(user.id);
            fetchTransactions(user.id);
        }
    }, [user]);
    
    // --- Render Loading/Error State ---
    if (loading) return <div className="loading">Memuat data iuran...</div>;
    if (error) {
        return (
            <div className="error-message">
                <h2>Terjadi Kesalahan! 😥</h2>
                <p>Tidak dapat memuat status iuran:</p>
                <p className="error-detail">{error}</p>
                <p>Mohon hubungi administrator/developer.</p>
            </div>
        );
    }
    
    // --- Render Dashboard ---
    return (
        // Style untuk Full Width (kiri full)
        <div 
            className="mahasiswa-dashboard"
            style={{ 
                width: '100%',         
                maxWidth: 'none',       
                margin: '0 auto',       
                padding: '20px',        
                boxSizing: 'border-box' 
            }}
        >
            <h1>Dashboard Mahasiswa: Status Iuran</h1>
            
            <div className="contact-admin" style={{ padding: '15px', borderRadius: '8px', backgroundColor: 'var(--accent-blue-dark)', color: '#fff' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Kontak Admin Bendahara</p>
                <p style={{ margin: '5px 0' }}>Untuk melakukan pembayaran iuran, silakan hubungi admin di:</p>
                <a href="https://wa.me/6283186176665" target="_blank" rel="noopener noreferrer">
                    <button className="btn-whatsapp" style={{ padding: '10px 15px', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Chat via WhatsApp (+62 831-8617-6665)
                    </button>
                </a>
            </div>

            <hr style={{ margin: '20px 0' }}/>

            {/* RINGKASAN STATUS IURAN (Card Style) */}
            <h2>Ringkasan Status Iuran</h2>
            <div className="status-summary" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <StatusCard 
                    title="Lunas Sempurna" 
                    count={statusSummary.lunas} 
                    type="lunas" 
                />
                <StatusCard 
                    title="Sedang Dicicil" 
                    count={statusSummary.cicil} 
                    type="cicil" 
                />
                <StatusCard 
                    title="Belum Ada Pembayaran" 
                    count={statusSummary.belum} 
                    type="belum" 
                />
            </div>

            <hr style={{ margin: '20px 0' }}/>

            {/* DAFTAR IURAN YANG PERLU DIBAYAR (Card Style) */}
            <h2>Iuran yang Perlu Dibayar/Dicicil ({duesToPay.length})</h2>
            {duesToPay.length === 0 ? (
                <div className="alert success" style={{ padding: '15px', borderRadius: '5px', backgroundColor: 'var(--accent-success-light)', color: 'var(--text-primary)' }}>SEMUA IURAN ANDA SUDAH LUNAS!</div>
            ) : (
                <div className="dues-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {duesToPay.map((due, index) => (
                        <div key={due.due_id || index} className={`due-item ${due.status === 'Belum Bayar' ? 'danger' : 'warning'}`} style={{ padding: '15px', borderRadius: '5px', borderLeft: `5px solid ${due.status === 'Belum Bayar' ? 'var(--accent-error)' : 'var(--accent-warning)'}`, backgroundColor: 'var(--bg-secondary)' }}>
                            <strong style={{ display: 'block', marginBottom: '5px', fontSize: '1.1em' }}>{due.title}</strong>
                            <p style={{ margin: 0 }}>Status: <span style={{ fontWeight: 'bold', color: due.status === 'Belum Bayar' ? 'var(--accent-error)' : 'var(--accent-warning)' }}>{due.status}</span></p>
                            <p style={{ margin: 0 }}>Sisa Tagihan: <span style={{ fontWeight: 'bold' }}>Rp {due.remaining.toLocaleString('id-ID')}</span></p>
                            <small style={{ color: 'var(--text-secondary)' }}>Wajib Bayar: Rp {Number(due.total_required).toLocaleString('id-ID')}</small>
                        </div>
                    ))}
                </div>
            )}
            
            <hr style={{ margin: '20px 0' }}/>

            {/* RIWAYAT PEMBAYARAN (Card Style) */}
            <h2>Riwayat Pembayaran Anda ({transactions.length})</h2>
            {transactions.length === 0 ? (
                <div className="alert info" style={{ padding: '15px', borderRadius: '5px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>Belum ada riwayat pembayaran yang tercatat.</div>
            ) : (
                <div className="transactions-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {transactions.map((t, index) => (
                        <div key={index} className="transaction-item" style={{ padding: '15px', borderRadius: '5px', borderLeft: '5px solid var(--accent-blue)', backgroundColor: 'var(--bg-secondary)' }}>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{t.dues?.title || 'Iuran Tidak Dikenal'}</p>
                            <p style={{ margin: '5px 0 0 0' }}>Jumlah Bayar: <span className='paid-amount' style={{ fontWeight: 'bold', color: 'var(--accent-success)' }}>Rp {Number(t.paid_amount).toLocaleString('id-ID')}</span></p>
                            <small style={{ color: 'var(--text-secondary)' }}>Tanggal: {new Date(t.created_at).toLocaleDateString('id-ID', {
                                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}</small>
                        </div>
                    ))}
                </div>
            )}
            
            <hr style={{ margin: '20px 0' }}/>
            
            {/* Tombol Logout */}
            <button onClick={() => supabase.auth.signOut()} className="btn-logout" style={{ padding: '10px 20px', backgroundColor: 'var(--accent-error)', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', display: 'block', width: '100%' }}>Logout</button>
        </div>
    );
}

export default MahasiswaDashboard;