// Tệp: fnb-smart-menu-frontend/components/ProductModal.js
// (BẢN FINAL - POPUP CHUẨN GRAB)

import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function ProductModal({ product, onClose }) {
    if (!product) return null;
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [selectedOptions, setSelectedOptions] = useState({});

    // Xử lý ảnh
    const getImageUrl = (url) => (url && url.startsWith('/')) ? `${apiUrl}${url}` : url;

    const calculatePrice = () => {
        let price = product.base_price;
        if (product.options) {
            product.options.forEach(opt => {
                const selectedValIds = selectedOptions[opt.id];
                if (selectedValIds) {
                    if (Array.isArray(selectedValIds)) {
                        selectedValIds.forEach(id => {
                            const val = opt.values.find(v => v.id === id);
                            if (val) price += val.price_adjustment;
                        });
                    } else {
                        const val = opt.values.find(v => v.id === selectedValIds);
                        if (val) price += val.price_adjustment;
                    }
                }
            });
        }
        return price;
    };

    const handleOptionChange = (optId, valId, type) => {
        setSelectedOptions(prev => {
            if (type === 'CHON_1') return { ...prev, [optId]: valId };
            const current = prev[optId] || [];
            return { ...prev, [optId]: current.includes(valId) ? current.filter(id => id !== valId) : [...current, valId] };
        });
    };

    const handleAddToCart = () => {
        // Logic gộp options... (như cũ)
        let flatOptions = [];
        let optionsTextArr = [];
        Object.values(selectedOptions).forEach(val => {
            if (Array.isArray(val)) flatOptions.push(...val); else flatOptions.push(val);
        });
        if (product.options) {
            product.options.forEach(opt => {
                const selected = selectedOptions[opt.id];
                if (selected) {
                    if (Array.isArray(selected)) {
                        selected.forEach(id => {
                            const v = opt.values.find(x => x.id === id);
                            if (v) optionsTextArr.push(v.name);
                        });
                    } else {
                        const v = opt.values.find(x => x.id === selected);
                        if (v) optionsTextArr.push(v.name);
                    }
                }
            });
        }

        addToCart({
            product_id: product.id,
            quantity,
            note,
            options: flatOptions,
            _display: {
                name: product.name,
                itemPrice: calculatePrice(),
                optionsText: optionsTextArr.join(', ')
            }
        });
        onClose();
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                
                {/* Header: Nút X */}
                <div style={styles.header}>
                    <h3 style={styles.productName}>{product.name}</h3>
                    <button onClick={onClose} style={styles.closeBtn}>&times;</button>
                </div>

                {/* Body: Cuộn nội dung */}
                <div style={styles.body}>
                    {product.image_url && (
                        <div style={styles.imgWrapper}>
                            <img src={getImageUrl(product.image_url)} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        </div>
                    )}
                    
                    <div style={styles.desc}>{product.description}</div>
                    <div style={styles.basePrice}>{product.base_price.toLocaleString()}đ</div>

                    {/* Options */}
                    {product.options?.map(opt => (
                        <div key={opt.id} style={styles.optionGroup}>
                            <div style={styles.optHeader}>
                                <b>{opt.name}</b>
                                <span style={styles.optBadge}>{opt.type === 'CHON_1' ? 'Bắt buộc' : 'Tùy chọn'}</span>
                            </div>
                            {opt.values.map(val => (
                                <label key={val.id} style={styles.optRow}>
                                    <div style={{display:'flex', alignItems:'center'}}>
                                        <input 
                                            type={opt.type === 'CHON_1' ? 'radio' : 'checkbox'}
                                            name={`opt-${opt.id}`}
                                            className="custom-input"
                                            checked={opt.type === 'CHON_1' ? selectedOptions[opt.id] === val.id : (selectedOptions[opt.id] || []).includes(val.id)}
                                            onChange={() => handleOptionChange(opt.id, val.id, opt.type)}
                                        />
                                        <span style={{marginLeft:'10px'}}>{val.name}</span>
                                    </div>
                                    <span style={{color:'#666'}}>+{val.price_adjustment.toLocaleString()}đ</span>
                                </label>
                            ))}
                        </div>
                    ))}

                    <textarea placeholder="Ghi chú thêm..." style={styles.noteInput} value={note} onChange={e=>setNote(e.target.value)} />
                </div>

                {/* Footer: Dính ở dưới */}
                <div style={styles.footer}>
                    <div style={styles.qtyControl}>
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={styles.qtyBtn}>-</button>
                        <span style={styles.qtyVal}>{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)} style={styles.qtyBtn}>+</button>
                    </div>
                    <button onClick={handleAddToCart} style={styles.addBtn}>
                        Thêm vào giỏ - {(calculatePrice() * quantity).toLocaleString()}đ
                    </button>
                </div>
            </div>

            <style jsx global>{`
                .custom-input { accent-color: #FF6600; width: 18px; height: 18px; cursor: pointer; }
            `}</style>
        </div>
    );
}

const styles = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modal: { background: 'white', width: '100%', maxWidth: '550px', maxHeight: '90vh', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
    
    header: { padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    productName: { margin: 0, fontSize: '1.1rem', color: '#333' },
    closeBtn: { border: 'none', background: 'transparent', fontSize: '2rem', cursor: 'pointer', lineHeight: '1rem', color: '#888' },

    body: { padding: '20px', overflowY: 'auto', flex: 1 },
    imgWrapper: { width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px', backgroundColor:'#f9f9f9' },
    desc: { color: '#666', fontSize: '0.9rem', marginBottom: '5px' },
    basePrice: { fontSize: '1.2rem', fontWeight: 'bold', color: '#333', marginBottom: '20px' },

    optionGroup: { marginBottom: '25px' },
    optHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    optBadge: { background: '#eee', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', color: '#666' },
    optRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer' },

    noteInput: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '10px' },

    footer: { padding: '15px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', background: '#fff' },
    qtyControl: { display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '8px' },
    qtyBtn: { width: '35px', height: '35px', border: 'none', background: 'white', fontSize: '1.2rem', cursor: 'pointer', color: '#FF6600', fontWeight: 'bold' },
    qtyVal: { minWidth: '30px', textAlign: 'center', fontWeight: '600' },
    addBtn: { flex: 1, background: '#FF6600', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }
};