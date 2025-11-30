// Tệp: pages/dashboard/options.js
// (BẢN FINAL - CÓ TÍNH NĂNG SỬA TÊN NHÓM)

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

const getToken = () => {
    if (typeof window !== 'undefined') { return localStorage.getItem('admin_token'); }
    return null;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const ITEMS_PER_PAGE = 50; 

// --- Component Form Sửa Lựa chọn con (Giữ nguyên) ---
function OptionValueEditForm({ initialData, onSave, onCancel }) {
    const [valueData, setValueData] = useState(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { setValueData(initialData); }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setValueData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'price_adjustment' ? parseFloat(value) || 0 : value)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = getToken();
        try {
            const response = await fetch(`${apiUrl}/admin/values/${valueData.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: valueData.name,
                    price_adjustment: valueData.price_adjustment,
                    is_out_of_stock: valueData.is_out_of_stock
                }),
            });
            if (!response.ok) throw new Error('Cập nhật thất bại');
            onSave(); 
        } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
    };

    return (
        <div style={styles.popupBackdrop}>
            <div style={styles.formPopup}>
                <form onSubmit={handleSubmit}>
                    <h3>Sửa Lựa chọn: {initialData.name}</h3>
                    <label style={styles.label}>Tên Lựa chọn</label>
                    <input name="name" value={valueData.name} onChange={handleChange} style={styles.input} required />
                    <label style={styles.label}>Giá thêm</label>
                    <input name="price_adjustment" type="number" value={valueData.price_adjustment} onChange={handleChange} style={styles.input} required />
                    <div style={{marginTop: '10px', marginBottom: '20px'}}>
                        <label style={{color: '#dc3545', fontWeight: 'bold'}}>
                            <input name="is_out_of_stock" type="checkbox" checked={valueData.is_out_of_stock} onChange={handleChange} /> Tạm hết hàng?
                        </label>
                    </div>
                    <div style={styles.formActions}>
                        <button type="button" onClick={onCancel} style={{ ...styles.buttonAction, background: '#ccc', color: '#333' }}>Hủy</button>
                        <button type="submit" style={styles.buttonAction} disabled={isSubmitting}>Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Component Form thêm Lựa chọn con (Giữ nguyên) ---
function OptionValueForm({ optionId, onValueCreated }) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = getToken();
        try {
            const response = await fetch(`${apiUrl}/admin/options/${optionId}/values`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price_adjustment: parseFloat(price) || 0 }),
            });
            if (!response.ok) throw new Error('Thêm thất bại');
            setName(''); setPrice(0); onValueCreated(); 
        } catch (err) { alert(err.message); } finally { setIsSubmitting(false); }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.inlineForm}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tên (Vd: Size L)" required style={styles.inlineInput}/>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Giá thêm" style={{...styles.inlineInput, width: '100px'}} />
            <button type="submit" style={styles.inlineButton} disabled={isSubmitting}>+</button>
        </form>
    );
}

// --- Component Chính ---
export default function OptionsPage() {
    const router = useRouter();
    const [options, setOptions] = useState([]); 
    const [newOption, setNewOption] = useState({ name: '', type: 'CHON_NHIEU' }); 
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);
    const [editingValue, setEditingValue] = useState(null); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // THÊM STATE ĐỂ SỬA TÊN NHÓM
    const [editingOptionId, setEditingOptionId] = useState(null);
    const [tempOptionName, setTempOptionName] = useState('');

    const fetchData = async (currentPage) => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { router.push('/login'); return; }
        
        try {
            const skip = (currentPage - 1) * ITEMS_PER_PAGE;
            const response = await fetch(`${apiUrl}/admin/options/?skip=${skip}&limit=${ITEMS_PER_PAGE}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setOptions(data);
                setIsLastPage(data.length < ITEMS_PER_PAGE);
            }
        } catch (err) { alert(err.message); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(page); }, [page]);

    // Tạo nhóm mới
    const handleCreateOption = async (e) => {
        e.preventDefault();
        const token = getToken();
        try {
            await fetch(`${apiUrl}/admin/options/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newOption.name, type: newOption.type, display_order: 9999 }),
            });
            setNewOption({ name: '', type: 'CHON_NHIEU' });
            fetchData(1); setPage(1);
        } catch (err) { alert(err.message); }
    };

    // Xóa nhóm
    const handleDeleteOption = async (optionId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa Nhóm này?')) return;
        const token = getToken();
        try {
            await fetch(`${apiUrl}/admin/options/${optionId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            fetchData(page);
        } catch (err) { alert(err.message); }
    };

    // Sắp xếp nhóm
    const handleMoveOption = async (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= options.length) return;
        setIsSubmitting(true);
        const token = getToken();
        const optionA = options[index];
        const optionB = options[newIndex];
        try {
            await Promise.all([
                fetch(`${apiUrl}/admin/options/${optionA.id}`, { method: 'PUT', headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}, body: JSON.stringify({ display_order: optionB.display_order }) }),
                fetch(`${apiUrl}/admin/options/${optionB.id}`, { method: 'PUT', headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}, body: JSON.stringify({ display_order: optionA.display_order }) })
            ]);
            fetchData(page);
        } catch (err) { alert("Lỗi sắp xếp"); } finally { setIsSubmitting(false); }
    };

    // --- LOGIC MỚI: SỬA TÊN NHÓM ---
    const startEditingOption = (opt) => {
        setEditingOptionId(opt.id);
        setTempOptionName(opt.name);
    };

    const cancelEditingOption = () => {
        setEditingOptionId(null);
        setTempOptionName('');
    };

    const saveOptionName = async (id) => {
        const token = getToken();
        try {
            const res = await fetch(`${apiUrl}/admin/options/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tempOptionName })
            });
            if(!res.ok) throw new Error("Lỗi lưu tên");
            setEditingOptionId(null);
            fetchData(page);
        } catch (e) { alert(e.message); }
    };
    // --------------------------------

    // Xóa/Sửa Value con
    const handleDeleteValue = async (valueId) => {
        if (!confirm('Xóa lựa chọn này?')) return;
        const token = getToken();
        await fetch(`${apiUrl}/admin/values/${valueId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetchData(page);
    };

    return (
        <div style={styles.container}>
            <Head><title>Quản lý Tùy chọn</title></Head>
            <Link href="/dashboard" style={styles.backLink}>← Quay lại Dashboard</Link>
            <h1>⚙️ Quản lý Tùy chọn</h1>

            <form onSubmit={handleCreateOption} style={styles.form}>
                <h3>Thêm Nhóm Tùy chọn mới</h3>
                <input type="text" value={newOption.name} onChange={(e) => setNewOption({ ...newOption, name: e.target.value })} placeholder="Tên Nhóm (Vd: Kích cỡ)" style={styles.input} required/>
                <select value={newOption.type} onChange={(e) => setNewOption({ ...newOption, type: e.target.value })} style={styles.input}>
                    <option value="CHON_NHIEU">Cho phép Chọn Nhiều (Vd: Topping)</option>
                    <option value="CHON_1">Chỉ Chọn 1 (Vd: Size)</option>
                </select>
                <button type="submit" style={styles.button}>Thêm Nhóm</button>
            </form>

            <button onClick={() => fetchData(page)} style={{...styles.button, background: '#17a2b8', marginBottom:'15px'}}>Tải lại</button>

            {isLoading ? <p>Đang tải...</p> : (
                <div>
                    {options.map((option, index) => (
                        <div key={option.id} style={styles.optionGroup}>
                            <div style={styles.optionHeader}>
                                {/* PHẦN TIÊU ĐỀ: Nếu đang sửa thì hiện Input, không thì hiện Text */}
                                {editingOptionId === option.id ? (
                                    <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                                        <input 
                                            value={tempOptionName} 
                                            onChange={(e) => setTempOptionName(e.target.value)}
                                            style={{padding:'5px', fontSize:'1rem'}}
                                        />
                                        <button onClick={() => saveOptionName(option.id)} style={styles.saveButtonSmall}>Lưu</button>
                                        <button onClick={cancelEditingOption} style={styles.cancelButtonSmall}>Hủy</button>
                                    </div>
                                ) : (
                                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                        <h3 style={{margin: 0}}>
                                            {option.name} 
                                            <span style={styles.optionType}> ({option.type === 'CHON_1' ? 'Chọn 1' : 'Chọn nhiều'})</span>
                                        </h3>
                                        {/* Nút Sửa Tên */}
                                        <button onClick={() => startEditingOption(option)} style={styles.editNameButton} title="Đổi tên nhóm">✎ Sửa tên</button>

                                        <div style={{display: 'flex', gap: '5px', marginLeft:'10px'}}>
                                            <button onClick={() => handleMoveOption(index, -1)} disabled={isSubmitting || index === 0} style={styles.moveButton}>↑</button>
                                            <button onClick={() => handleMoveOption(index, 1)} disabled={isSubmitting || index === options.length - 1} style={styles.moveButton}>↓</button>
                                        </div>
                                    </div>
                                )}
                                
                                <button onClick={() => handleDeleteOption(option.id)} style={styles.deleteButtonSmall}>Xóa Nhóm</button>
                            </div>

                            <ul>
                                {option.values.map((value) => (
                                    <li key={value.id} style={styles.valueItem}>
                                        <span>{value.name} (+{value.price_adjustment.toLocaleString()}₫) {value.is_out_of_stock && <b style={{color:'red'}}>(Hết)</b>}</span>
                                        <div>
                                            <button onClick={() => setEditingValue(value)} style={styles.editButtonSmall}>Sửa</button>
                                            <button onClick={() => handleDeleteValue(value.id)} style={styles.deleteButtonSmall}>x</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <OptionValueForm optionId={option.id} onValueCreated={() => fetchData(page)} /> 
                        </div>
                    ))}
                </div>
            )}
            
            {editingValue && <OptionValueEditForm initialData={editingValue} onSave={() => {setEditingValue(null); fetchData(page)}} onCancel={() => setEditingValue(null)} />}
        </div>
    );
}

const styles = {
    container: { padding: '30px', maxWidth: '1000px', margin: '0 auto' },
    backLink: { textDecoration: 'none', color: '#666', marginBottom: '20px', display: 'block' },
    form: { background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' },
    input: { display: 'block', width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' },
    button: { padding: '10px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    optionGroup: { border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '8px', background:'white' },
    optionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background:'#f8f9fa', padding:'10px', borderRadius:'5px' },
    optionType: { fontSize: '0.8em', color: '#666', fontWeight: 'normal' },
    valueItem: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eee' },
    
    // Button styles
    moveButton: { padding: '2px 8px', cursor: 'pointer', background: '#fff', border: '1px solid #ccc', borderRadius:'3px' },
    deleteButtonSmall: { padding: '4px 8px', background: '#ffcccc', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#b00', fontSize: '0.8rem', marginLeft:'5px' },
    editButtonSmall: { padding: '4px 8px', background: '#fff3cd', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#664d03', fontSize: '0.8rem' },
    editNameButton: { padding: '2px 8px', background: 'transparent', border: '1px solid #007bff', color:'#007bff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginLeft:'10px' },
    saveButtonSmall: { padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    cancelButtonSmall: { padding: '5px 10px', background: '#ccc', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' },

    inlineForm: { display: 'flex', gap: '5px', marginTop: '10px' },
    inlineInput: { padding: '5px', border: '1px solid #ccc', borderRadius: '4px' },
    inlineButton: { padding: '5px 10px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    
    popupBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    formPopup: { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '400px' },
    formActions: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonAction: { padding: '8px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' }
};