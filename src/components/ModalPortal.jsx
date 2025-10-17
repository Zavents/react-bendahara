// src/components/ModalPortal.jsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const modalRoot = document.getElementById('modal-root');

function ModalPortal({ children }) {
    const elRef = useRef(null);
    const [mounted, setMounted] = useState(false);

    // Pastikan elemen div untuk modal ada
    if (!elRef.current) {
        elRef.current = document.createElement('div');
    }

    // Pasang dan lepas elemen div ke/dari modal-root saat mounting/unmounting
    useEffect(() => {
        if (modalRoot) {
            modalRoot.appendChild(elRef.current);
            setMounted(true);
        }
        
        return () => {
            if (modalRoot && elRef.current) {
                modalRoot.removeChild(elRef.current);
            }
        };
    }, []);

    // Jangan render apa-apa sebelum node DOM siap
    if (!mounted || !modalRoot) {
        return null;
    }

    // Render children (StatusModal) ke node modal-root
    return createPortal(children, elRef.current);
}

export default ModalPortal;