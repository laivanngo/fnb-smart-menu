// Tệp: pages/dashboard/options.js
// (BẢN VÁ 1.8 - ĐÃ THÊM SẮP XẾP OPTIONS)

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

// Hàm trợ giúp để lấy token
const getToken = () => {
    if (typeof window !== 'undefined') { return localStorage.getItem('admin_token'); }
    return null;
};

// Sử dụng biến này
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const ITEMS_PER_PAGE = 50; 

// --- Component Form Sửa Lựa chọn con ---
// (Component này giữ nguyên, không thay đổi)
function OptionValueEditForm({ initialData, onSave, onCancel }) {
    const [valueData, setValueData] = useState(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setValueData(initialData);
    }, [initialData]);

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
        setError('');
        const token = getToken();
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập.");
            setIsSubmitting(false);
            return;
        }
        const payload = {
            name: valueData.name,
            price_adjustment: valueData.price_adjustment,
            is_out_of_stock: valueData.is_out_of_stock
        };
        try {
            const response = await fetch(`${apiUrl}/admin/values/${valueData.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const d = await response.json();
                throw new Error(d.detail || 'Cập nhật thất bại');
            }
            onSave(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.popupBackdrop} onClick={onCancel}>
            <div style={styles.formPopup} onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <h3>Sửa Lựa chọn: {initialData.name}</h3>
                    <label style={styles.label}>Tên Lựa chọn (Vd: Trân châu)</label>
                    <input name="name" value={valueData.name} onChange={handleChange} style={styles.input} required />
                    <label style={styles.label}>Giá thêm (Vd: 5000)</label>
                    <input name="price_adjustment" type="number" value={valueData.price_adjustment} onChange={handleChange} style={styles.input} required />
                    <div style={{marginTop: '10px', marginBottom: '20px'}}>
                        <input
                            name="is_out_of_stock"
                            type="checkbox"
                            checked={valueData.is_out_of_stock}
                            onChange={handleChange}
                            id="edit_is_out_of_stock"
                        />
                        <label htmlFor="edit_is_out_of_stock" style={{color: '#dc3545', marginLeft: '5px', fontWeight: 'bold'}}>
                            Tạm hết hàng?
                        </label>
                    </div>
                    {error && <p style={styles.error}>{error}</p>}
                    <div style={styles.formActions}>
                        <button type="button" onClick={onCancel} style={{ ...styles.buttonAction, background: '#ccc', color: '#333' }} disabled={isSubmitting}>
                            Hủy
                        </button>
                        <button type="submit" style={styles.buttonAction} disabled={isSubmitting}>
                            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
// ---------------------------------------------

// --- Component Form con để thêm Lựa chọn con (Value) ---
// (Component này giữ nguyên, không thay đổi)
function OptionValueForm({ optionId, onValueCreated }) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = getToken();
        if (!apiUrl) {
            alert("Lỗi cấu hình: API URL chưa được thiết lập.");
            setIsSubmitting(false);
            return;
        }
        try {
            const response = await fetch(`${apiUrl}/admin/options/${optionId}/values/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price_adjustment: parseFloat(price) || 0, is_out_of_stock: false }),
            });
            if (!response.ok) throw new Error('Thêm thất bại');
            setName('');
            setPrice(0);
            onValueCreated(); 
        } catch (err) {
            alert(err.message); 
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.inlineForm}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tên Lựa chọn (Vd: Size L)" required style={styles.inlineInput}/>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Giá thêm (Vd: 5000)" style={{...styles.inlineInput, width: '100px'}} />
            <button type="submit" style={styles.inlineButton} disabled={isSubmitting}>+</button>
        </form>
    );
}
// ---------------------------------------------


// --- Component Trang chính (ĐÃ NÂNG CẤP VỚI SẮP XẾP) ---
export default function OptionsPage() {
    const router = useRouter();
    const [options, setOptions] = useState([]); 
    const [newOption, setNewOption] = useState({ name: '', type: 'CHON_NHIEU' }); 
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);
    const [editingValue, setEditingValue] = useState(null); 
    const [isSubmitting, setIsSubmitting] = useState(false); // ⬅️ THÊM MỚI: Trạng thái khi đang sắp xếp

    // --- Lấy dữ liệu từ API ---
    const fetchData = async (currentPage) => {
        setError('');
        setIsLoading(true);
        const token = getToken();
        if (!token) {
            router.push('/login');
            return;
        }
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập.");
            setIsLoading(false);
            return;
        }
        
        const skip = (currentPage - 1) * ITEMS_PER_PAGE;
        
        try {
            const response = await fetch(`${apiUrl}/admin/options/?skip=${skip}&limit=${ITEMS_PER_PAGE}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) {
                router.push('/login');
                return;
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Tải dữ liệu thất bại');
            }
            const data = await response.json();
            setOptions(data);
            
            if (data.length < ITEMS_PER_PAGE) {
                setIsLastPage(true);
            } else {
                setIsLastPage(false);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData(page);
    }, [page]);

    // --- Logic Phân trang ---
    const handleNextPage = () => {
        if (!isLastPage && !isLoading) {
            setPage(prev => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (page > 1 && !isLoading) {
            setPage(prev => prev - 1);
        }
    };

    // --- Logic Tạo Nhóm Tùy chọn ---
    const handleCreateOption = async (e) => {
        e.preventDefault();
        setError('');
        const token = getToken();
        if (!apiUrl) { setError("Lỗi cấu hình: API URL chưa được thiết lập."); return; }

        try {
            const response = await fetch(`${apiUrl}/admin/options/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: newOption.name, 
                    type: newOption.type,
                    display_order: 9999 // Tạm thời, backend sẽ tự điều chỉnh
                }),
            });
            if (!response.ok) throw new Error('Tạo thất bại');
            setNewOption({ name: '', type: 'CHON_NHIEU' });
            fetchData(1); // Quay về trang 1
            setPage(1);
        } catch (err) { setError(err.message); }
    };

    // --- Logic Xóa Nhóm Tùy chọn ---
    const handleDeleteOption = async (optionId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa Nhóm Tùy chọn này?')) return;
        setError('');
        const token = getToken();
        if (!apiUrl) { setError("Lỗi cấu hình: API URL chưa được thiết lập."); return; }

        try {
            const response = await fetch(`${apiUrl}/admin/options/${optionId}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Xóa thất bại');
            fetchData(page); // Tải lại trang hiện tại
        } catch (err) { setError(err.message); }
    };

    // --- Logic Xóa Lựa chọn con ---
    const handleDeleteValue = async (valueId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa Lựa chọn này?')) return;
        setError('');
        const token = getToken();
        if (!apiUrl) { setError("Lỗi cấu hình: API URL chưa được thiết lập."); return; }

        try {
            const response = await fetch(`${apiUrl}/admin/values/${valueId}`, { 
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Xóa thất bại');
            fetchData(page); // Tải lại trang hiện tại
        } catch (err) { setError(err.message); }
    };
    
    // --- Các hàm Sửa Lựa chọn con ---
    const handleStartEditValue = (value) => {
        setEditingValue(value);
    };
    const handleCancelEditValue = () => {
        setEditingValue(null);
    };
    const handleSaveValue = () => {
        setEditingValue(null);
        fetchData(page); // Tải lại trang hiện tại
    };

    // === LOGIC MỚI: SẮP XẾP NHÓM TÙY CHỌN ===
    const handleMoveOption = async (index, direction) => {
        const newIndex = index + direction;
        
        // Kiểm tra di chuyển hợp lệ
        if (newIndex < 0 || newIndex >= options.length) {
            return; 
        }

        setIsSubmitting(true); // Bật loading
        setError('');
        const token = getToken();
        
        const optionA = options[index];
        const optionB = options[newIndex];

        // Tạo 2 payload để swap (đổi) display_order
        const payloadA = { display_order: optionB.display_order };
        const payloadB = { display_order: optionA.display_order };

        try {
            // Gọi 2 API cập nhật cùng lúc
            const [resA, resB] = await Promise.all([
                fetch(`${apiUrl}/admin/options/${optionA.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadA)
                }),
                fetch(`${apiUrl}/admin/options/${optionB.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadB)
                })
            ]);
            
            if (!resA.ok || !resB.ok) throw new Error('Sắp xếp thất bại');
            
            fetchData(page); // Tải lại trang hiện tại
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false); // Tắt loading
        }
    };
    // ===================================

    // --- Giao diện ---
    return (
        <div style={styles.container}>
            <Head><title>Quản lý Tùy chọn</title></Head>
            <Link href="/dashboard" style={styles.backLink}>← Quay lại Dashboard</Link>
            <h1>⚙️ Quản lý Tùy chọn</h1>

            <form onSubmit={handleCreateOption} style={styles.form}>
                <h3>Thêm Nhóm Tùy chọn mới</h3>
                <input
                    type="text" value={newOption.name}
                    onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                    placeholder="Tên Nhóm (Vd: Kích cỡ, Topping)" style={styles.input}
                />
                <select
                    value={newOption.type}
                    onChange={(e) => setNewOption({ ...newOption, type: e.target.value })}
                    style={styles.input} >
                    <option value="CHON_NHIEU">Cho phép Chọn Nhiều (Vd: Topping)</option>
                    <option value="CHON_1">Chỉ Chọn 1 (Vd: Size, Độ ngọt)</option>
                </select>
                <button type="submit" style={styles.button}>Thêm Nhóm</button>
            </form>
            
             <button onClick={() => fetchData(page)} style={{...styles.buttonAction, background: '#17a2b8', marginBottom: '15px'}} disabled={isLoading || isSubmitting}>
                 {isLoading ? 'Đang tải...' : 'Tải lại trang'}
            </button>

            {error && <p style={styles.error}>{error}</p>}

            {/* === THÊM NÚT ĐIỀU HƯỚNG PHÂN TRANG (TRÊN) === */}
            <div style={styles.paginationControls}>
                <button onClick={handlePrevPage} disabled={isLoading || isSubmitting || page <= 1} style={styles.buttonAction}>
                    ‹ Trang trước
                </button>
                <span style={{padding: '0 15px', color: '#555', fontWeight: 'bold'}}>Trang {page}</span>
                <button onClick={handleNextPage} disabled={isLoading || isSubmitting || isLastPage} style={styles.buttonAction}>
                    Trang sau ›
                </button>
            </div>
            {/* ======================================= */}

            <h2>Thư viện Tùy chọn hiện có:</h2>
            {isLoading ? <p>Đang tải...</p> : (
                <div style={{ marginTop: '20px' }}>
                    {options.length === 0 ? <p>Chưa có Nhóm Tùy chọn nào.</p> :
                        options.map((option, index) => {
                            // === LOGIC KIỂM TRA NÚT SẮP XẾP ===
                            const canMoveUp = index > 0;
                            const canMoveDown = index < options.length - 1;
                            // =================================
                            
                            return (
                                <div key={option.id} style={styles.optionGroup}>
                                    <div style={styles.optionHeader}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                            <h3 style={{margin: 0}}>
                                                {option.name} 
                                                <span style={styles.optionType}>
                                                    ({option.type === 'CHON_1' ? 'Chọn 1' : 'Chọn nhiều'})
                                                </span>
                                            </h3>
                                            {/* === THÊM CÁC NÚT SẮP XẾP === */}
                                            <div style={{display: 'flex', gap: '5px'}}>
                                                <button 
                                                    onClick={() => handleMoveOption(index, -1)} 
                                                    disabled={isSubmitting || !canMoveUp} 
                                                    style={styles.moveButton}
                                                    title="Di chuyển lên">
                                                    ↑ Lên
                                                </button>
                                                <button 
                                                    onClick={() => handleMoveOption(index, 1)} 
                                                    disabled={isSubmitting || !canMoveDown} 
                                                    style={styles.moveButton}
                                                    title="Di chuyển xuống">
                                                    ↓ Xuống
                                                </button>
                                            </div>
                                            {/* ============================= */}
                                        </div>
                                        <button onClick={() => handleDeleteOption(option.id)} style={styles.deleteButtonSmall} disabled={isSubmitting}>
                                            Xóa Nhóm
                                        </button>
                                    </div>
                                    <ul>
                                        {option.values.map((value) => (
                                            <li key={value.id} style={styles.valueItem}>
                                                <span>
                                                    {value.name} (+{value.price_adjustment.toLocaleString('vi-VN')}₫)
                                                    {value.is_out_of_stock && <span style={styles.inactiveBadge}> (Hết hàng)</span>}
                                                </span>
                                                <div style={{display: 'flex', gap: '5px'}}>
                                                    <button onClick={() => handleStartEditValue(value)} style={styles.editButtonSmall} disabled={isSubmitting}>Sửa</button>
                                                    <button onClick={() => handleDeleteValue(value.id)} style={styles.deleteButtonSmall} disabled={isSubmitting}>x</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <OptionValueForm optionId={option.id} onValueCreated={() => fetchData(page)} /> 
                                </div>
                            );
                        })
                    }
                </div>
            )}
            
            {/* === THÊM NÚT ĐIỀU HƯỚNG PHÂN TRANG (DƯỚI) === */}
            <div style={styles.paginationControls}>
                <button onClick={handlePrevPage} disabled={isLoading || isSubmitting || page <= 1} style={styles.buttonAction}>
                    ‹ Trang trước
                </button>
                <span style={{padding: '0 15px', color: '#555', fontWeight: 'bold'}}>Trang {page}</span>
                <button onClick={handleNextPage} disabled={isLoading || isSubmitting || isLastPage} style={styles.buttonAction}>
                    Trang sau ›
                </button>
            </div>
            {/* ======================================= */}
            
            {editingValue && (
                <OptionValueEditForm
                    initialData={editingValue}
                    onSave={handleSaveValue}
                    onCancel={handleCancelEditValue}
                />
            )}

        </div>
    );
}

// --- CSS (THÊM STYLE MỚI CHO NÚT SẮP XẾP) ---
const styles = {
    container: { padding: '30px' },
    backLink: { display: 'inline-block', marginBottom: '20px', color: '#555', textDecoration: 'none' },
    form: { background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' },
    input: { display: 'block', width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }, 
    button: { padding: '10px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
    error: { color: 'red', marginBottom: '15px', fontSize: '0.9rem' },
    optionGroup: { border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '8px' },
    optionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    optionType: { fontSize: '0.8em', color: '#666', fontWeight: 'normal' },
    valueItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px dashed #f0f0f0' },
    deleteButtonSmall: { padding: '3px 8px', background: '#ffcccc', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#b00', fontSize: '0.8rem' },
    editButtonSmall: { padding: '3px 8px', background: '#fff3cd', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#664d03', fontSize: '0.8rem' }, 
    moveButton: { padding: '5px 8px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', color: '#333', fontSize: '0.8rem', fontWeight: '500' }, // ⬅️ THÊM MỚI
    inlineForm: { display: 'flex', gap: '5px', marginTop: '10px' },
    inlineInput: { padding: '5px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.9rem' },
    inlineButton: { padding: '5px 10px', background: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    popupBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    formPopup: { background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', width: '90%', maxWidth: '500px' },
    formActions: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonAction: { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', background: '#007bff', color: 'white' },
    inactiveBadge: { color: '#dc3545', fontWeight: 'bold', fontSize: '0.9em' },
    paginationControls: { marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};

// Vô hiệu hóa nút khi disabled
styles.buttonAction[':disabled'] = { background: '#9ec5fe', cursor: 'not-allowed' };
styles.button[':disabled'] = { background: '#9eceff', cursor: 'not-allowed' };
styles.moveButton[':disabled'] = { background: '#f8f9fa', color: '#ccc', cursor: 'not-allowed' };
styles.deleteButtonSmall[':disabled'] = { background: '#f5c6cb', cursor: 'not-allowed' };
styles.editButtonSmall[':disabled'] = { background: '#fff8e1', cursor: 'not-allowed' };