// Tệp: components/ProductModal.js (Theme màu Cam)
import React, { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function ProductModal({ product, onClose }) {
    if (!product) return null;

    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    
    const [selectedOptions, setSelectedOptions] = useState(() => {
        const defaults = {};
        (product.options || []).forEach(option => {
            if (option.type === 'CHON_1' && option.values.length > 0) {
                const firstAvailableValue = option.values.find(v => !v.is_out_of_stock);
                defaults[option.id] = firstAvailableValue ? firstAvailableValue.id : null;
            } else {
                defaults[option.id] = [];
            }
        });
        return defaults;
    });

    const handleQuantityChange = (delta) => {
        const newQty = quantity + delta;
        if (newQty >= 1) setQuantity(newQty);
    };
    
    const handleOptionChange = (option, value) => {
        if (value.is_out_of_stock) return;

        setSelectedOptions(prev => {
            const newState = { ...prev };
            const optionId = option.id;
            const valueId = value.id;

            if (option.type === 'CHON_1') { 
                newState[optionId] = valueId; 
            } else {
                const currentSelection = prev[optionId] || [];
                if (currentSelection.includes(valueId)) {
                    newState[optionId] = currentSelection.filter(id => id !== valueId);
                } else {
                    newState[optionId] = [...currentSelection, valueId];
                }
            }
            return newState;
        });
    };

    const totalPrice = useMemo(() => {
        let itemPrice = product.base_price; 
        Object.keys(selectedOptions).forEach(optionId => {
            const selected = selectedOptions[optionId];
            const optionGroup = (product.options || []).find(o => o.id == optionId);
            if (!optionGroup) return;

            if (Array.isArray(selected)) {
                selected.forEach(valueId => {
                    const value = optionGroup.values.find(v => v.id == valueId);
                    if (value) itemPrice += value.price_adjustment;
                });
            } else if (selected) {
                const value = optionGroup.values.find(v => v.id == selected);
                if (value) itemPrice += value.price_adjustment;
            }
        });
        return itemPrice * quantity;
    }, [product, selectedOptions, quantity]);

    const handleAddToCart = () => {
        const allOptionValueIds = Object.values(selectedOptions).flat().filter(id => id !== null);
        const itemPricePerUnit = totalPrice / quantity;
        let optionsDisplay = [];
        
        (product.options || []).forEach(option => {
            const selected = selectedOptions[option.id];
            if (Array.isArray(selected) && selected.length > 0) {
                selected.forEach(valueId => {
                    const value = option.values.find(v => v.id == valueId);
                    if(value) optionsDisplay.push(value.name);
                });
            } else if (!Array.isArray(selected) && selected) {
                const value = option.values.find(v => v.id == selected);
                if(value) optionsDisplay.push(value.name);
            }
        });

        const cartItem = {
            product_id: product.id, 
            quantity: quantity, 
            note: note, 
            options: allOptionValueIds, 
            _display: { 
                name: product.name, 
                image: product.image_url, 
                itemPrice: itemPricePerUnit, 
                optionsText: optionsDisplay.join(', ')
            }
        };
        addToCart(cartItem);
        onClose(); 
    };

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
                <button style={styles.closeButton} onClick={onClose}>&times;</button>
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

                    {(product.options || []).map(option => (
                        <div key={option.id} style={styles.section}>
                            <label style={styles.label}>{option.name} ({option.type === 'CHON_1' ? 'Chọn 1' : 'Chọn nhiều'})</label>
                            {(option.values || []).map(value => (
                                <div key={value.id} style={styles.optionItem}>
                                    <label style={styles.optionLabel}>
                                        <input
                                            type={option.type === 'CHON_1' ? 'radio' : 'checkbox'}
                                            name={`option-${option.id}`}
                                            style={styles.optionInput}
                                            checked={
                                                option.type === 'CHON_1'
                                                    ? selectedOptions[option.id] === value.id
                                                    : selectedOptions[option.id]?.includes(value.id)
                                            }
                                            onChange={() => handleOptionChange(option, value)}
                                            disabled={value.is_out_of_stock}
                                        />
                                        <span style={styles.optionName}>
                                            {value.name}
                                            {value.is_out_of_stock && <span style={styles.outOfStockLabel}>(Hết hàng)</span>}
                                        </span>
                                        {value.price_adjustment !== 0 && (
                                            <span style={styles.optionPrice}>
                                                {value.price_adjustment > 0 ? '+' : ''}{value.price_adjustment.toLocaleString('vi-VN')}đ
                                            </span>
                                        )}
                                    </label>
                                </div>
                            ))}
                        </div>
                    ))}

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

                    <div style={styles.footer}>
                        <div style={styles.quantityControl}>
                            <button style={styles.qtyBtn} onClick={() => handleQuantityChange(-1)}>-</button>
                            <span style={styles.qtyValue}>{quantity}</span>
                            <button style={styles.qtyBtn} onClick={() => handleQuantityChange(1)}>+</button>
                        </div>
                        
                        <button style={styles.addButton} onClick={handleAddToCart}>
                            Thêm vào giỏ - {totalPrice.toLocaleString('vi-VN')}đ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Styles
const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    modal: { backgroundColor: 'white', width: '100%', maxWidth: '450px', borderRadius: '16px', overflow: 'hidden', position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
    closeButton: { position: 'absolute', top: '10px', right: '10px', width: '30px', height: '30px', borderRadius: '50%', border: 'none', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '20px', cursor: 'pointer', zIndex: 2 },
    imageContainer: { width: '100%', paddingTop: '60%', position: 'relative', backgroundColor: '#fff5ec' },
    image: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
    emojiImage: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '5rem' },
    content: { padding: '20px', overflowY: 'auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' },
    title: { margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#333' },
    price: { margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#FF6600' }, // Giá màu Cam
    description: { color: '#666', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' },
    section: { marginBottom: '20px' },
    label: { display: 'block', fontWeight: '700', marginBottom: '10px', fontSize: '1rem', color: '#333' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem', backgroundColor: '#f9f9f9' },

    optionItem: { marginBottom: '10px', padding: '8px 0', borderBottom: '1px solid #f5f5f5' },
    optionLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' },
    optionInput: { marginRight: '10px', accentColor: '#FF6600' }, // Radio/Checkbox màu Cam
    optionName: { flex: 1, fontSize: '0.95rem', fontWeight: '500' },
    optionPrice: { fontSize: '0.9rem', fontWeight: '700', color: '#FF6600' },
    outOfStockLabel: { color: '#dc3545', fontSize: '0.8rem', fontWeight: '500', marginLeft: '8px' },
    
    footer: { marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #eee', display: 'flex', gap: '15px' },
    quantityControl: { display: 'flex', alignItems: 'center', border: '1px solid #eee', borderRadius: '8px', padding: '4px', backgroundColor: '#f9f9f9' },
    qtyBtn: { width: '32px', height: '32px', border: 'none', backgroundColor: 'transparent', fontSize: '1.2rem', fontWeight: 'bold', color: '#FF6600', cursor: 'pointer' },
    qtyValue: { width: '30px', textAlign: 'center', fontWeight: '600', fontSize: '1rem' },
    addButton: { flex: 1, backgroundColor: '#FF6600', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 4px 10px rgba(255, 102, 0, 0.3)' } // Nút thêm màu Cam
};