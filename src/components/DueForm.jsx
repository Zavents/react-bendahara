// src/components/DueForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 
import ActionMenu from './ActionMenu'; // Diperlukan untuk konfirmasi Hapus

function DueForm({ fetchAllData, onDone }) { 
    // State untuk Form Tambah Iuran
    const [dueTitle, setDueTitle] = useState('');
    const [requiredAmount, setRequiredAmount] = useState('');
    const [loading, setLoading] = useState(false);
    
    // State untuk Notifikasi Inline
    const [notification, setNotification] = useState({
        message: '',
        type: '', // 'success' atau 'error'
    });

    // State untuk Daftar Iuran dan Edit
    const [dues, setDues] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    
    // State untuk Action Menu Konfirmasi Hapus
    const [actionMenu, setActionMenu] = useState({
        isOpen: false,
        title: '',
        options: [],
    });

    // --- FUNGSI UTAMA ---

    // Menampilkan notifikasi dan menghapusnya setelah 3 detik
    const showNotification = (message, type, callback) => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification({ message: '', type: '' });
            if (callback) callback();
        }, 3000); 
    };

    // Callback Sukses (Refresh data di parent dan navigasi)
    const handleSuccessAndClose = () => {
        fetchAllData(); 
        if (onDone) onDone(); 
    };
    
    // Fungsi untuk menutup Action Menu
    const closeActionMenu = () => {
        setActionMenu({ isOpen: false, title: '', options: [] });
    };


    // --- FUNGSI FETCH DATA IURAN ---
    const fetchDues = async () => {
        const { data, error } = await supabase
            .from('dues')
            .select('*, created_at') // Mengambil kolom created_at
            .order('id', { ascending: true }); 

        if (error) {
            console.error('Error fetching dues:', error);
            if (dues.length === 0) {
                 showNotification('Gagal memuat daftar iuran.', 'error');
            }
        } else {
            setDues(data);
        }
    };

    // Load data saat komponen dimuat
    useEffect(() => {
        fetchDues();
    }, []); 

    // --- FUNGSI CREATE IURAN ---
    const handleAddDueSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setNotification({ message: '', type: '' }); 

        if (!dueTitle || !requiredAmount || parseInt(requiredAmount) <= 0) {
            showNotification('Gagal! Judul Iuran dan Jumlah Wajib Bayar harus diisi dengan benar.', 'error');
            setLoading(false);
            return;
        }

        const newDue = {
            title: dueTitle,
            required_amount: parseInt(requiredAmount),
        };

        const { error } = await supabase.from('dues').insert([newDue]);

        if (error) {
            console.error('Error menambahkan iuran:', error);
            const errorMessage = (error.code === '23505') 
                ? `Gagal! Iuran dengan judul "${dueTitle}" sudah ada.`
                : 'Gagal menambahkan iuran! Cek konsol.';
            showNotification(errorMessage, 'error'); 
        } else {
            const formattedAmount = parseInt(requiredAmount).toLocaleString('id-ID');
            showNotification(
                `🎉 Iuran "${dueTitle}" (Rp ${formattedAmount}) berhasil ditambahkan.`, 
                'success',
                handleSuccessAndClose 
            );
            setDueTitle('');
            setRequiredAmount('');
            fetchDues(); // Refresh daftar lokal
        }
        setLoading(false);
    };

    // --- FUNGSI EDIT ---

    const handleEditClick = (due) => {
        // Masuk mode edit
        setEditingId(due.id);
        setEditData({
            title: due.title,
            required_amount: due.required_amount,
        });
        setNotification({ message: '', type: '' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleUpdateDue = async (id) => {
        setLoading(true);
        setNotification({ message: '', type: '' });
        
        if (!editData.title || parseInt(editData.required_amount) <= 0) {
            showNotification('Judul dan Jumlah Wajib Bayar harus diisi.', 'error');
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('dues')
            .update({
                title: editData.title,
                required_amount: parseInt(editData.required_amount),
            })
            .eq('id', id);

        if (error) {
            console.error('Error mengupdate iuran:', error);
             const errorMessage = (error.code === '23505') 
                ? `Gagal! Iuran dengan judul "${editData.title}" sudah ada.`
                : 'Gagal mengupdate iuran! Cek konsol.';
            showNotification(errorMessage, 'error');
        } else {
            showNotification(`✅ Iuran "${editData.title}" berhasil diperbarui.`, 'success');
            setEditingId(null); // Keluar dari mode edit
            fetchDues(); // Refresh daftar lokal
            fetchAllData(); // Memberi tahu parent komponen
        }
        setLoading(false);
    };

    // --- FUNGSI HAPUS ---

    // Fungsi inti untuk menghapus dari DB (asumsi Foreign Key sudah disetel CASCADE atau NULL)
    const handleDeleteDue = async (id, title) => {
        setLoading(true);
        setNotification({ message: '', type: '' });
        
        // Tutup Action Menu terlebih dahulu
        closeActionMenu(); 

        // Untuk mengatasi error 409 (Foreign Key Constraint):
        // Jika Anda belum mengatur ON DELETE CASCADE di Supabase, hapus transaksi terkait dulu.
        // Jika Anda sudah mengatur CASCADE di Supabase, langkah ini tidak perlu.

        const { error } = await supabase
            .from('dues')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error menghapus iuran:', error);
            const errorMessage = (error.code === '23503') 
                ? 'Gagal menghapus! Iuran ini masih memiliki transaksi terkait. Atur database untuk CASCADE DELETE.'
                : 'Gagal menghapus iuran. Cek konsol.';
            showNotification(errorMessage, 'error');
        } else {
            showNotification(`🗑️ Iuran "${title}" berhasil dihapus.`, 'success');
            fetchDues(); // Refresh daftar lokal
            fetchAllData(); // Memberi tahu parent komponen
        }
        setLoading(false);
    };
    
    // Fungsi untuk membuka Action Menu konfirmasi
    const handleConfirmDeleteClick = (due) => {
        setActionMenu({
            isOpen: true,
            title: 'Konfirmasi Penghapusan',
            options: [
                { 
                    label: `Ya, Hapus "${due.title}"`, 
                    type: 'delete', 
                    action: () => handleDeleteDue(due.id, due.title) 
                },
                { 
                    label: 'Batal', 
                    type: 'default', 
                    action: closeActionMenu 
                }
            ],
        });
    };

    // --- JSX RENDER ---

    return (
        <div className="card">
            
            {/* 1. FORM TAMBAH IURAN */}
            <h2 style={{ marginBottom: dues.length > 0 ? '40px' : '20px' }}>Tambah Jenis Iuran Baru</h2>
            <form onSubmit={handleAddDueSubmit}>
                
                <div className="form-group">
                    <label>Judul Iuran:</label>
                    <input
                        type="text"
                        placeholder="mis. BAJU PDH (Angkatan 2024)"
                        value={dueTitle}
                        onChange={(e) => setDueTitle(e.target.value)}
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label>Jumlah Wajib Bayar (Rp):</label>
                    <input
                        type="number"
                        placeholder="mis. 230000"
                        value={requiredAmount}
                        onChange={(e) => setRequiredAmount(e.target.value)}
                        required
                        min="1"
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="btn-submit" 
                    disabled={loading || !dueTitle || !requiredAmount || requiredAmount <= 0}
                >
                    {loading ? 'Menyimpan...' : 'Tambah Iuran'}
                </button>
            </form>

            {/* 2. NOTIFIKASI INLINE */}
            {notification.message && (
                <div className={`inline-notification inline-notification-${notification.type}`}>
                    {notification.message}
                </div>
            )}

            {/* 3. DAFTAR IURAN */}
            {dues.length > 0 && (
                <div className="dues-list-container">
                    <h2 style={{ marginTop: '40px' }}>Daftar Iuran Saat Ini ({dues.length})</h2>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Judul Iuran</th>
                                <th>Wajib Bayar</th>
                                <th>Tanggal Dibuat</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dues.map((due) => (
                                <tr key={due.id}>
                                    <td>{due.id}</td>
                                    {editingId === due.id ? (
                                        <>
                                            {/* Mode Edit Inline */}
                                            <td>
                                                <input
                                                    type="text"
                                                    value={editData.title}
                                                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                                    disabled={loading}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={editData.required_amount}
                                                    onChange={(e) => setEditData({ ...editData, required_amount: e.target.value })}
                                                    disabled={loading}
                                                    min="1"
                                                />
                                            </td>
                                            {/* Tanggal tidak dapat diedit */}
                                            <td>
                                                {new Date(due.created_at).toLocaleDateString('id-ID')}
                                            </td> 

                                            <td>
                                                <button 
                                                    onClick={() => handleUpdateDue(due.id)} 
                                                    className="btn-action btn-save" 
                                                    disabled={loading}
                                                >
                                                    Simpan
                                                </button>
                                                <button 
                                                    onClick={handleCancelEdit} 
                                                    className="btn-action btn-cancel" 
                                                    disabled={loading}
                                                >
                                                    Batal
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            {/* Mode Tampil Normal */}
                                            <td>{due.title}</td>
                                            <td>Rp {due.required_amount.toLocaleString('id-ID')}</td>
                                            <td>
                                                {new Date(due.created_at).toLocaleDateString('id-ID')}
                                            </td>
                                            
                                            <td>
                                                <button 
                                                    onClick={() => handleEditClick(due)} 
                                                    className="btn-action btn-edit"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleConfirmDeleteClick(due)} 
                                                    className="btn-action btn-delete" 
                                                    disabled={loading}
                                                >
                                                    🗑️ Hapus
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* 4. ACTION MENU (UNTUK KONFIRMASI HAPUS) */}
            <ActionMenu
                isOpen={actionMenu.isOpen}
                title={actionMenu.title}
                options={actionMenu.options}
                onClose={closeActionMenu}
            />
        </div>
    );
}

export default DueForm;