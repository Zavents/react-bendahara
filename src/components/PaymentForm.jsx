// src/components/PaymentForm.jsx
import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient'; 
import StatusModal from './StatusModal'; 

function PaymentForm({ mahasiswaList, duesList, userDueStatus, fetchAllData, onDone }) {
    // --- State untuk Form Transaksi ---
    const [mahasiswaNameInput, setMahasiswaNameInput] = useState('');
    const [filteredMahasiswa, setFilteredMahasiswa] = useState([]);
    const [finalSelectedMahasiswa, setFinalSelectedMahasiswa] = useState(null); 
    
    const [selectedDueId, setSelectedDueId] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // --- State untuk Perhitungan Cicilan ---
    const [sisaIuran, setSisaIuran] = useState(0);
    const [requiredAmount, setRequiredAmount] = useState(0);

    // --- State untuk Modal ---
    const [modal, setModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'success', 
    });

    const openModal = (title, message, type) => {
        setModal({ isOpen: true, title, message, type });
    };

    const closeModal = () => {
        setModal({ ...modal, isOpen: false });
    };

    // Dipanggil saat Modal sukses ditutup (OK & Kembalikan)
    const handleSuccessAndClose = () => {
        // 1. Refresh data
        fetchAllData(); 
        // 2. Navigasi kembali
        if (onDone) onDone(); 
    };

    // --- LOGIKA FILTER DAN HITUNG SISA IURAN UNTUK DROPDOWN (BARU) ---
    const availableDues = useMemo(() => {
        if (!finalSelectedMahasiswa) {
            // Jika mahasiswa belum dipilih, tampilkan semua due (tapi dinonaktifkan)
            return duesList; 
        }

        const userId = Number(finalSelectedMahasiswa.id);
        const userStatuses = userDueStatus.filter(s => Number(s.user_id) === userId);

        return duesList
            .map(due => {
                const required = Number(due.required_amount);
                
                // Cari status (menggunakan total_paid dari skema database yang sudah diperbaiki)
                const statusEntry = userStatuses.find(s => Number(s.due_id) === Number(due.id));
                const paidTotal = Number(statusEntry ? statusEntry.total_paid : 0);

                const remainingAmount = required - paidTotal;
                
                // Jika sudah lunas, jangan tampilkan di daftar
                if (remainingAmount <= 0) {
                    return null; // Iuran ini Lunas, tidak dimasukkan
                }

                // Jika belum lunas (Nyicil atau Belum Bayar), hitung sisa dan buat label baru
                const displayTitle = (paidTotal > 0)
                    ? `${due.title} (Sisa: Rp ${remainingAmount.toLocaleString('id-ID')})`
                    : `${due.title} (Wajib: Rp ${required.toLocaleString('id-ID')})`;

                return {
                    ...due,
                    remainingAmount: remainingAmount,
                    displayTitle: displayTitle
                };
            })
            .filter(due => due !== null); // Hapus iuran yang sudah lunas
            
    }, [finalSelectedMahasiswa, duesList, userDueStatus]);


    // Hitung sisa tagihan untuk display BUKAN DROPDOWN (Tidak banyak berubah)
    useMemo(() => {
        if (!finalSelectedMahasiswa || !selectedDueId) {
            setRequiredAmount(0);
            setSisaIuran(0);
            return;
        }

        const dueItem = duesList.find(d => String(d.id) === String(selectedDueId));
        const totalWajib = dueItem ? Number(dueItem.required_amount) : 0;
        setRequiredAmount(totalWajib);

        // Cari status yang benar menggunakan total_paid
        const status = userDueStatus.find(s => 
            String(s.user_id) === String(finalSelectedMahasiswa.id) && String(s.due_id) === String(selectedDueId)
        );
        const paidTotal = Number(status ? status.total_paid : 0);

        const sisaAwal = totalWajib - paidTotal;
        const sisaSaatIni = sisaAwal - (parseInt(paidAmount) || 0);

        setSisaIuran(sisaSaatIni > 0 ? sisaSaatIni : 0);
        
    }, [finalSelectedMahasiswa, selectedDueId, duesList, userDueStatus, paidAmount]);


    // --- Handler Autocomplete Mahasiswa ---
    const handleMahasiswaInputChange = (e) => {
        const inputName = e.target.value;
        setMahasiswaNameInput(inputName);
        setFinalSelectedMahasiswa(null); 
        setSelectedDueId('');
        setPaidAmount('');
        setFilteredMahasiswa([]); // Clear filter saat mengetik ulang

        if (inputName.length > 1) {
            const filtered = mahasiswaList
                .filter(u => u.role === 'mahasiswa')
                .filter(m => 
                    m.name.toLowerCase().includes(inputName.toLowerCase())
                )
                .slice(0, 5); 
            setFilteredMahasiswa(filtered);
        }
    };

    const handleMahasiswaSelect = (mahasiswa) => {
        setMahasiswaNameInput(mahasiswa.name);
        setFinalSelectedMahasiswa(mahasiswa);
        setFilteredMahasiswa([]); 
        setSelectedDueId(''); // Reset pilihan iuran saat mahasiswa diganti
    };
    
    const handleDueChange = (e) => {
        setSelectedDueId(e.target.value);
        setPaidAmount(''); 
    };

    // --- Handler Form Transaksi ---
    const handleTransactionSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!finalSelectedMahasiswa || !selectedDueId || paidAmount <= 0) {
            openModal('Gagal!', 'Mahasiswa, Jenis Iuran, dan Jumlah Bayar wajib diisi dengan benar.', 'error');
            setLoading(false);
            return;
        }

        const paidAmountNum = parseInt(paidAmount);
        
        // Cek apakah pembayaran melebihi sisa tagihan (pencegahan double input)
        const dueItemInfo = availableDues.find(d => String(d.id) === String(selectedDueId));
        const currentRemaining = dueItemInfo ? dueItemInfo.remainingAmount : Infinity;
        
        if (paidAmountNum > currentRemaining) {
            openModal('Peringatan!', `Jumlah bayar (Rp ${paidAmountNum.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${currentRemaining.toLocaleString('id-ID')}). Silakan koreksi jumlah bayar.`, 'warning');
            setLoading(false);
            return;
        }

        const newTransaction = {
            user_id: finalSelectedMahasiswa.id, 
            due_id: selectedDueId,
            paid_amount: paidAmountNum,
            notes: notes,
        };

        const { error } = await supabase
            .from('transactions')
            .insert([newTransaction]);

        if (error) {
            console.error('Error mencatat transaksi:', error);
            openModal('Gagal!', 'Gagal mencatat transaksi! Cek konsol untuk detail.', 'error');
        } else {
            const formattedPaid = paidAmountNum.toLocaleString('id-ID');
            const paidDue = duesList.find(d => String(d.id) === String(selectedDueId));
            
            // 1. TAMPILKAN MODAL SUKSES
            openModal(
                'Berhasil!', 
                `${finalSelectedMahasiswa.name} telah membayar Rp ${formattedPaid} untuk iuran ${paidDue?.title || 'Unknown'}. Klik OK untuk kembali.`, 
                'success'
            );
            
            // 2. Reset form
            setPaidAmount('');
            setNotes('');
            setMahasiswaNameInput(''); 
            setFinalSelectedMahasiswa(null); 
            setSelectedDueId(''); 
        }
        setLoading(false);
    };

    return (
        <div className="card">
            <h2>Catat Pembayaran Baru</h2>
            <form onSubmit={handleTransactionSubmit}>
                
                {/* 1. Autocomplete Input Mahasiswa */}
                <div className="form-group" style={{ position: 'relative' }}> 
                    <label>Mahasiswa:</label>
                    <input
                        type="text"
                        placeholder="Ketik nama mahasiswa..."
                        value={mahasiswaNameInput}
                        onChange={handleMahasiswaInputChange}
                        required
                    />
                    
                    {filteredMahasiswa.length > 0 && (
                        <ul className="autocomplete-list">
                            {filteredMahasiswa.map((m) => (
                                <li 
                                    key={m.id} 
                                    className="autocomplete-item"
                                    onClick={() => handleMahasiswaSelect(m)}
                                >
                                    {m.name}
                                </li>
                            ))}
                        </ul>
                    )}
                    
                    {finalSelectedMahasiswa && (
                        <small className='small-text' style={{ color: 'var(--accent-success)' }}>
                            Dipilih: {finalSelectedMahasiswa.name}
                        </small>
                    )}
                </div>
                
                {/* 2. Dropdown Jenis Iuran (Menggunakan availableDues) */}
                <div className="form-group">
                    <label>Jenis Iuran (Sisa Tagihan):</label>
                    <select 
                        value={selectedDueId} 
                        onChange={handleDueChange} 
                        required
                        disabled={!finalSelectedMahasiswa || availableDues.length === 0}
                    >
                        <option value="">
                            -- {finalSelectedMahasiswa && availableDues.length === 0 
                                ? 'SEMUA IURAN SUDAH LUNAS' 
                                : 'Pilih Jenis Iuran'
                            } --
                        </option>
                        {availableDues.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.displayTitle}
                            </option>
                        ))}
                    </select>
                    {finalSelectedMahasiswa && availableDues.length === 0 && (
                        <small className='small-text' style={{ color: 'var(--accent-success)' }}>
                            Mahasiswa ini tidak memiliki tunggakan iuran.
                        </small>
                    )}
                </div>
                
                {/* 3. Jumlah Bayar */}
                <div className="form-group">
                    <label>Jumlah Bayar (Rp):</label>
                    <input
                        type="number"
                        placeholder="mis. 50000"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        required
                        min="1"
                        disabled={!selectedDueId}
                    />
                </div>
                
                {/* 4. Sisa Iuran */}
                {selectedDueId && requiredAmount > 0 && (
                    <div className="form-group">
                        <label>Sisa Iuran Setelah Bayar (Rp):</label>
                        <input
                            type="text"
                            value={`Rp ${sisaIuran.toLocaleString('id-ID')}`}
                            readOnly 
                            className="sisa-iuran-display"
                            style={{ 
                                fontWeight: 'bold', 
                                color: sisaIuran === 0 ? 'var(--accent-success)' : 'var(--accent-gold)' 
                            }}
                        />
                         <small className='small-text'>
                            Total Wajib Bayar: Rp {requiredAmount.toLocaleString('id-ID')}. Sisa di atas sudah memperhitungkan pembayaran saat ini.
                        </small>
                    </div>
                )}

                {/* 5. Catatan */}
                <div className="form-group">
                    <label>Catatan (Opsional):</label>
                    <input
                        type="text"
                        placeholder="mis. Tunai/Transfer"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={!selectedDueId}
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="btn-submit" 
                    disabled={loading || !finalSelectedMahasiswa || !selectedDueId || paidAmount <= 0}
                >
                    {loading ? 'Mencatat...' : 'Catat Transaksi'}
                </button>
            </form>

            <StatusModal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                onClose={closeModal}
                onAction={modal.type === 'success' ? handleSuccessAndClose : null}
                type={modal.type}
            />
        </div>
    );
}

export default PaymentForm;