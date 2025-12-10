import React, { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function ProductModal({ product, onClose }) {
    if (!product) return null;
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    
    // Khởi tạo state rỗng để KHÔNG chọn sẵn cái nào
    const [selectedOptions, setSelectedOptions] = useState({});

    // --- (ĐÃ XÓA PHẦN TỰ ĐỘNG CHỌN ĐỂ NÚT LUÔN MỜ LÚC ĐẦU) ---

    // --- 1. KIỂM TRA ĐIỀU KIỆN (VALIDATION) ---
    const isFormValid = useMemo(() => {
        if (!product.options) return true;
        
        // Duyệt qua tất cả option
        for (const opt of product.options) {
            // Nếu là bắt buộc (CHON_1)
            if (opt.type === 'CHON_1') {
                // Nếu chưa có giá trị nào được chọn -> KHÔNG HỢP LỆ (NÚT SẼ MỜ)
                if (!selectedOptions[opt.id]) {
                    return false;
                }
            }
        }
        return true; // Đã chọn đủ -> NÚT SẼ SÁNG
    }, [product.options, selectedOptions]);

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

    const handleOptionChange = (optId, valId, type, isOutOfStock) => {
        if (isOutOfStock) return; // Chặn click nếu hết hàng

        setSelectedOptions(prev => {
            if (type === 'CHON_1') return { ...prev, [optId]: valId };
            const current = prev[optId] || [];
            // Nếu là chọn nhiều (checkbox), cho phép chọn/bỏ chọn
            return { ...prev, [optId]: current.includes(valId) ? current.filter(id => id !== valId) : [...current, valId] };
        });
    };

    const handleAddToCart = () => {
        if (!isFormValid) return; // Chặn nếu chưa đủ

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
                
                <div style={styles.header}>
                    <h3 style={styles.productName}>{product.name}</h3>
                    <button onClick={onClose} style={styles.closeBtn}>&times;</button>
                </div>

                <div style={styles.body}>
                    {product.image_url && (
                        <div style={styles.imgWrapper}>
                            <img src={getImageUrl(product.image_url)} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        </div>
                    )}
                    
                    <div style={styles.desc}>{product.description}</div>
                    <div style={styles.basePrice}>{product.base_price.toLocaleString()}đ</div>

                    {product.options?.map(opt => (
                        <div key={opt.id} style={styles.optionGroup}>
                            <div style={styles.optHeader}>
                                <b>{opt.name}</b>
                                <span style={opt.type === 'CHON_1' ? styles.badgeRequired : styles.badgeOptional}>
                                    {opt.type === 'CHON_1' ? 'Bắt buộc' : 'Tùy chọn'}
                                </span>
                            </div>
                            {opt.values.map(val => {
                                const isOutOfStock = val.is_out_of_stock;
                                return (
                                    <label 
                                        key={val.id} 
                                        style={{
                                            ...styles.optRow,
                                            opacity: isOutOfStock ? 0.5 : 1,
                                            pointerEvents: isOutOfStock ? 'none' : 'auto',
                                            backgroundColor: isOutOfStock ? '#f9f9f9' : 'transparent'
                                        }}
                                    >
                                        <div style={{display:'flex', alignItems:'center'}}>
                                            <input 
                                                type={opt.type === 'CHON_1' ? 'radio' : 'checkbox'}
                                                name={`opt-${opt.id}`}
                                                className="custom-input"
                                                checked={opt.type === 'CHON_1' ? selectedOptions[opt.id] === val.id : (selectedOptions[opt.id] || []).includes(val.id)}
                                                onChange={() => handleOptionChange(opt.id, val.id, opt.type, isOutOfStock)}
                                                disabled={isOutOfStock}
                                            />
                                            <span style={{marginLeft:'10px', textDecoration: isOutOfStock ? 'line-through' : 'none'}}>
                                                {val.name}
                                            </span>
                                            {isOutOfStock && <span style={{color:'red', fontSize:'0.8rem', marginLeft:'5px', fontWeight:'bold'}}>(Hết)</span>}
                                        </div>
                                        <span style={{color:'#666'}}>+{val.price_adjustment.toLocaleString()}đ</span>
                                    </label>
                                );
                            })}
                        </div>
                    ))}

                    <textarea placeholder="Ghi chú thêm..." style={styles.noteInput} value={note} onChange={e=>setNote(e.target.value)} />
                </div>

                <div style={styles.footer}>
                    <div style={styles.qtyControl}>
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={styles.qtyBtn}>-</button>
                        <span style={styles.qtyVal}>{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)} style={styles.qtyBtn}>+</button>
                    </div>
                    
                    {/* --- NÚT BẤM SẼ THAY ĐỔI MÀU --- */}
                    <button 
                        onClick={handleAddToCart} 
                        disabled={!isFormValid} // Vô hiệu hóa nút
                        style={{
                            ...styles.addBtn,
                            // Logic đổi màu: Xám nếu chưa chọn, Xanh lá nếu đã chọn
                            background: isFormValid ? '#28a745' : '#cccccc',
                            color: isFormValid ? 'white' : '#666666',
                            cursor: isFormValid ? 'pointer' : 'not-allowed',
                            boxShadow: isFormValid ? '0 4px 10px rgba(40, 167, 69, 0.3)' : 'none'
                        }}
                    >
                        {isFormValid 
                            ? `Thêm vào giỏ - ${(calculatePrice() * quantity).toLocaleString()}đ`
                            : 'Vui lòng chọn đủ món'}
                    </button>
                </div>
            </div>

            <style jsx global>{`
                .custom-input { accent-color: #28a745; width: 18px; height: 18px; cursor: pointer; }
                .custom-input:disabled { accent-color: #ccc; cursor: not-allowed; }
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
    badgeRequired: { background: '#FFF0E6', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', color: '#FF6600', border: '1px solid #FF6600', fontWeight: 'bold' },
    badgeOptional: { background: '#eee', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', color: '#666' },
    optRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer' },
    noteInput: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '10px' },
    footer: { padding: '15px 20px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', background: '#fff' },
    qtyControl: { display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '8px' },
    qtyBtn: { width: '35px', height: '35px', border: 'none', background: 'white', fontSize: '1.2rem', cursor: 'pointer', color: '#28a745', fontWeight: 'bold' },
    qtyVal: { minWidth: '30px', textAlign: 'center', fontWeight: '600' },
    addBtn: { flex: 1, border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.2s' }
};