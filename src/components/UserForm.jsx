// src/components/UserForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 
// Hapus StatusModal, ganti dengan notifikasi inline dan ActionMenu
// import StatusModal from './StatusModal'; 
import ActionMenu from './ActionMenu'; // Diperlukan untuk konfirmasi Hapus

function UserForm({ fetchAllData, onDone }) { 
    // State untuk Form Tambah Pengguna
    const [name, setName] = useState('');
    const [role, setRole] = useState('mahasiswa');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    // --- State Baru untuk Daftar Pengguna dan Edit ---
    const [users, setUsers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    
    // --- State untuk Notifikasi Inline (Mengganti Modal) ---
    const [notification, setNotification] = useState({
        message: '',
        type: '', // 'success' atau 'error'
    });

    // --- State untuk Action Menu Konfirmasi Hapus ---
    const [actionMenu, setActionMenu] = useState({
        isOpen: false,
        title: '',
        options: [],
    });

    // --- FUNGSI UMUM ---
    
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

    const closeActionMenu = () => {
        setActionMenu({ isOpen: false, title: '', options: [] });
    };


    // --- FUNGSI FETCH DATA PENGGUNA ---
    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*, created_at')
            .order('name', { ascending: true }); 

        if (error) {
            console.error('Error fetching users:', error);
            if (users.length === 0) {
                 showNotification('Gagal memuat daftar pengguna.', 'error');
            }
        } else {
            setUsers(data);
        }
    };

    // Load data saat komponen dimuat
    useEffect(() => {
        fetchUsers();
    }, []); 
    
    // --- FUNGSI CREATE PENGGUNA ---
    const handleAddUserSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setNotification({ message: '', type: '' }); 

        if (!name.trim() || (role === 'admin' && !password)) {
             showNotification('Nama atau Password Admin harus diisi dengan benar.', 'error');
            setLoading(false);
            return;
        }

        const newUser = {
            name: name.trim(),
            role: role,
            ...(role === 'admin' && { password: password }),
        };

        const { error } = await supabase.from('users').insert([newUser]);

        if (error) {
            console.error('Error menambahkan pengguna:', error);
            const errorMessage = (error.code === '23505') 
                ? `Gagal! Pengguna "${name}" sudah terdaftar.`
                : 'Gagal menambahkan pengguna! Cek konsol.';
            showNotification(errorMessage, 'error'); 
        } else {
            showNotification(
                `🎉 Pengguna "${name}" (${role}) berhasil ditambahkan.`, 
                'success',
                handleSuccessAndClose 
            );
            // Reset form
            setName('');
            setPassword('');
            setRole('mahasiswa');
            fetchUsers(); // Refresh daftar lokal
        }
        setLoading(false);
    };

    // --- FUNGSI EDIT ---

    const handleEditClick = (user) => {
        setEditingId(user.id);
        setEditData({
            name: user.name,
            role: user.role,
        });
        setNotification({ message: '', type: '' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleUpdateUser = async (id) => {
        setLoading(true);
        setNotification({ message: '', type: '' });
        
        if (!editData.name.trim()) {
            showNotification('Nama pengguna wajib diisi.', 'error');
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('users')
            .update({
                name: editData.name.trim(),
                role: editData.role,
            })
            .eq('id', id);

        if (error) {
            console.error('Error mengupdate pengguna:', error);
             const errorMessage = (error.code === '23505') 
                ? `Gagal! Pengguna dengan nama "${editData.name}" sudah ada.`
                : 'Gagal mengupdate pengguna! Cek konsol.';
            showNotification(errorMessage, 'error');
        } else {
            showNotification(`✅ Pengguna "${editData.name}" berhasil diperbarui.`, 'success');
            setEditingId(null); 
            fetchUsers(); 
            fetchAllData(); 
        }
        setLoading(false);
    };

    // --- FUNGSI HAPUS ---

    const handleDeleteUser = async (id, name) => {
        setLoading(true);
        setNotification({ message: '', type: '' });
        closeActionMenu(); 

        // NOTE: Diasumsikan tidak ada Foreign Key yang merujuk ke tabel 'users' 
        // yang dapat memblokir penghapusan. Jika ada, Anda akan mendapat error 23503.

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error menghapus pengguna:', error);
            showNotification('Gagal menghapus pengguna. Cek konsol.', 'error');
        } else {
            showNotification(`🗑️ Pengguna "${name}" berhasil dihapus.`, 'success');
            fetchUsers(); 
            fetchAllData(); 
        }
        setLoading(false);
    };
    
    // Fungsi untuk membuka Action Menu konfirmasi
    const handleConfirmDeleteClick = (user) => {
        setActionMenu({
            isOpen: true,
            title: `Konfirmasi Hapus Pengguna: ${user.name}`,
            options: [
                { 
                    label: `Ya, Hapus Pengguna "${user.name}"`, 
                    type: 'delete', 
                    action: () => handleDeleteUser(user.id, user.name) 
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
            
            {/* 1. FORM TAMBAH PENGGUNA */}
            <h2>Tambah Pengguna Baru</h2>
            <form onSubmit={handleAddUserSubmit}>
                
                <div className="form-group">
                    <label>Peran (Role):</label>
                    <select 
                        value={role} 
                        onChange={(e) => {
                            setRole(e.target.value);
                            if (e.target.value === 'mahasiswa') setPassword('');
                        }}
                    >
                        <option value="mahasiswa">Mahasiswa</option>
                        <option value="admin">Admin Bendahara</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Nama Lengkap:</label>
                    <input
                        type="text"
                        placeholder="mis. Ahmad Zahid Zulvi"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                {role === 'admin' && (
                    <div className="form-group">
                        <label>Password Login (Admin):</label>
                        <input
                            type="password"
                            placeholder="Password Rahasia"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                         <small className='small-text'>
                            Password hanya wajib diisi jika peran adalah **Admin Bendahara**.
                        </small>
                    </div>
                )}
                
                <button 
                    type="submit" 
                    className="btn-submit" 
                    disabled={loading || !name.trim() || (role === 'admin' && !password)}
                >
                    {loading ? 'Menambahkan...' : `Tambah ${role === 'admin' ? 'Admin' : 'Mahasiswa'}`}
                </button>
            </form>
            
            {/* 2. NOTIFIKASI INLINE */}
            {notification.message && (
                <div className={`inline-notification inline-notification-${notification.type}`}>
                    {notification.message}
                </div>
            )}
            
            {/* 3. DAFTAR PENGGUNA */}
            {users.length > 0 && (
                <div className="dues-list-container">
                    <h2 style={{ marginTop: '40px' }}>Daftar Pengguna ({users.length})</h2>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nama Lengkap</th>
                                <th>Peran (Role)</th>
                                <th>Tanggal Dibuat</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    {editingId === user.id ? (
                                        <>
                                            {/* Mode Edit Inline */}
                                            <td>
                                                <input
                                                    type="text"
                                                    value={editData.name}
                                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                    disabled={loading}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    value={editData.role}
                                                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                                    disabled={loading}
                                                >
                                                    <option value="mahasiswa">Mahasiswa</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                {/* Catatan: Password admin tidak diubah di sini untuk keamanan */}
                                            </td>
                                            <td>
                                                {new Date(user.created_at).toLocaleDateString('id-ID')}
                                            </td> 
                                            <td>
                                                <button 
                                                    onClick={() => handleUpdateUser(user.id)} 
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
                                            <td>{user.name}</td>
                                            <td>
                                                <span style={{ 
                                                    fontWeight: 'bold',
                                                    color: user.role === 'admin' ? 'var(--accent-error)' : 'var(--text-primary)'
                                                }}>
                                                    {user.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>
                                                {new Date(user.created_at).toLocaleDateString('id-ID')}
                                            </td>
                                            
                                            <td>
                                                <button 
                                                    onClick={() => handleEditClick(user)} 
                                                    className="btn-action btn-edit"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleConfirmDeleteClick(user)} 
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

export default UserForm;