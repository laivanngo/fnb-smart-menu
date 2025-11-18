// Tệp: components/ProductModal.js
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function ProductModal({ product, onClose }) {
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');

    const handleQuantityChange = (delta) => {
        const newQty = quantity + delta;
        if (newQty >= 1) setQuantity(newQty);
    };

    const handleAddToCart = () => {
        addToCart({
            product_id: product.id,
            quantity: quantity,
            options: [], // Có thể mở rộng logic options tại đây
            note: note
        }, {
            name: product.name,
            image_url: product.image_url,
            itemPrice: product.base_price
        });
        onClose();
    };

    // Xử lý hiển thị ảnh (giống logic ở index.js)
    const getImageUrl = (url) => {
        if (!url) return null;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return `${apiUrl}${url}`;
        return url;
    };

    const isEmoji = (url) => url && !url.startsWith('http') && !url.startsWith('/') && url.length < 10;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Nút đóng */}
                <button style={styles.closeButton} onClick={onClose}>&times;</button>

                {/* Ảnh sản phẩm */}
                <div style={styles.imageContainer}>
                    {product.image_url ? (
                        isEmoji(product.image_url) ? (
                            <div style={styles.emojiImage}>{product.image_url}</div>
                        ) : (
                            <img 
                                src={getImageUrl(product.image_url)} 
                                alt={product.name} 
                                style={styles.image}
                            />
                        )
                    ) : (
                        <div style={styles.emojiImage}>🍽️</div>
                    )}
                </div>

                <div style={styles.content}>
                    <div style={styles.header}>
                        <h2 style={styles.title}>{product.name}</h2>
                        <p style={styles.price}>{product.base_price.toLocaleString('vi-VN')}đ</p>
                    </div>
                    
                    <p style={styles.description}>{product.description}</p>

                    {/* Ghi chú */}
                    <div style={styles.section}>
                        <label style={styles.label}>Ghi chú cho quán</label>
                        <input 
                            type="text" 
                            placeholder="Ví dụ: Ít đá, nhiều đường..."
                            style={styles.input}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    {/* Footer: Số lượng và Nút thêm */}
                    <div style={styles.footer}>
                        <div style={styles.quantityControl}>
                            <button style={styles.qtyBtn} onClick={() => handleQuantityChange(-1)}>-</button>
                            <span style={styles.qtyValue}>{quantity}</span>
                            <button style={styles.qtyBtn} onClick={() => handleQuantityChange(1)}>+</button>
                        </div>
                        
                        <button style={styles.addButton} onClick={handleAddToCart}>
                            Thêm vào giỏ - {(product.base_price * quantity).toLocaleString('vi-VN')}đ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Styles nội bộ cho Modal (Giống GrabFood)
const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px'
    },
    modal: {
        backgroundColor: 'white', width: '100%', maxWidth: '450px',
        borderRadius: '16px', overflow: 'hidden',
        position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
    },
    closeButton: {
        position: 'absolute', top: '10px', right: '10px',
        width: '30px', height: '30px', borderRadius: '50%',
        border: 'none', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white',
        fontSize: '20px', cursor: 'pointer', zIndex: 2
    },
    imageContainer: {
        width: '100%', paddingTop: '60%', position: 'relative',
        backgroundColor: '#f0f0f0'
    },
    image: {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover'
    },
    emojiImage: {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', fontSize: '5rem'
    },
    content: { padding: '20px', overflowY: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' },
    title: { margin: 0, fontSize: '1.2rem', fontWeight: '700' },
    price: { margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#00b14f' },
    description: { color: '#666', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' },
    section: { marginBottom: '20px' },
    label: { display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '0.9rem' },
    input: {
        width: '100%', padding: '10px', border: '1px solid #ddd',
        borderRadius: '8px', fontSize: '1rem'
    },
    footer: {
        marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #eee',
        display: 'flex', gap: '15px'
    },
    quantityControl: {
        display: 'flex', alignItems: 'center', border: '1px solid #ddd',
        borderRadius: '8px', padding: '4px'
    },
    qtyBtn: {
        width: '32px', height: '32px', border: 'none', backgroundColor: 'transparent',
        fontSize: '1.2rem', fontWeight: 'bold', color: '#00b14f', cursor: 'pointer'
    },
    qtyValue: { width: '30px', textAlign: 'center', fontWeight: '600' },
    addButton: {
        flex: 1, backgroundColor: '#00b14f', color: 'white', border: 'none',
        borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem'
    }
};