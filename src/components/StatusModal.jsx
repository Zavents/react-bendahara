// src/components/StatusModal.jsx
import React from 'react';
import '../App.css'; // Memastikan style App.css diimpor

/**
 * Komponen Modal Sederhana untuk menampilkan status konfirmasi.
 * NOTE: Untuk debugging, fungsi onAction dihapus dan useEffect dihilangkan.
 * @param {object} props
 * @param {boolean} props.isOpen - Status buka/tutup modal.
 * @param {string} props.title - Judul modal (mis. "Berhasil!", "Gagal").
 * @param {string} props.message - Pesan konfirmasi utama.
 * @param {function} props.onClose - Fungsi untuk menutup modal.
 * @param {string} [props.type='success'] - Jenis modal ('success' atau 'error').
 */
function StatusModal({ isOpen, title, message, onClose, type = 'success' }) { 
    // Jika modal tidak terbuka, langsung kembalikan null
    if (!isOpen) return null;

    // Menentukan warna border berdasarkan tipe
    const borderColor = type === 'success' ? 'var(--accent-success)' : 'var(--accent-error)';
    
    // Fungsi untuk menutup modal saat klik tombol atau overlay
    const handleClose = (e) => {
        // HENTIKAN PROPAGASI JIKA KLIK ADALAH TOMBOL OK
        if (e.target.tagName === 'BUTTON' || e.target.className.includes('modal-close-button')) {
             onClose();
        } 
        // JIKA KLIK ADALAH OVERLAY
        if (e.currentTarget.className === 'modal-overlay') {
            onClose();
        }
    };

    return (
        // Overlay (Latar belakang gelap) - Menggunakan handleClose untuk menutup
        <div className="modal-overlay" onClick={handleClose}>
            {/* Modal Content */}
            <div 
                className="modal-content" 
                // Menghentikan klik di modal content agar tidak menutup overlay
                onClick={e => e.stopPropagation()} 
                style={{ borderLeft: `5px solid ${borderColor}` }}
            >
                <div className="modal-header">
                    <h3 style={{ color: borderColor }}>{title}</h3>
                    <button onClick={onClose} className="modal-close-button">
                        &times;
                    </button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <button 
                        onClick={onClose} // Langsung tutup saat OK
                        className="btn-submit" 
                        style={{ background: borderColor }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StatusModal;