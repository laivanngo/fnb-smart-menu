// Tệp: pages/dashboard/vouchers.js
// (BẢN VÁ 1.7 - ĐÃ THÊM PHÂN TRANG)

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

// --- Component Form (dùng cho cả Tạo mới và Sửa) ---
// (Component này giữ nguyên, không thay đổi)
function VoucherForm({ initialData, onSubmit, onCancel }) {
    const [voucher, setVoucher] = useState(initialData || {
        code: '', description: '', type: 'fixed', value: 0, min_order_value: 0, max_discount: null, is_active: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setVoucher(initialData);
        } else {
            setVoucher({ code: '', description: '', type: 'fixed', value: 0, min_order_value: 0, max_discount: null, is_active: true });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let processedValue = value;
        if (['value', 'min_order_value', 'max_discount'].includes(name)) {
            processedValue = value === '' ? null : parseFloat(value) || 0;
            if (name === 'max_discount' && processedValue === 0) {
                 processedValue = null; 
            }
        }
        setVoucher(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : processedValue
        }));
    };

     const handleTypeChange = (e) => {
        const newType = e.target.value;
        setVoucher(prev => ({
            ...prev,
            type: newType,
            max_discount: newType === 'fixed' ? null : prev.max_discount
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const payload = {
            ...voucher,
            max_discount: voucher.type === 'fixed' ? null : voucher.max_discount,
             value: voucher.value || 0,
             min_order_value: voucher.min_order_value || 0,
        };
        await onSubmit(payload);
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} style={styles.formPopup}>
            <h3>{initialData ? 'Sửa Mã Giảm Giá' : 'Thêm Mã Giảm Giá Mới'}</h3>
            <input name="code" value={voucher.code} onChange={handleChange} placeholder="Mã Voucher (Vd: GIAM10)" style={styles.input} required />
            <input name="description" value={voucher.description || ''} onChange={handleChange} placeholder="Mô tả (Vd: Giảm 10% đơn tối thiểu 100k)" style={styles.input} />
            <select name="type" value={voucher.type} onChange={handleTypeChange} style={styles.input} required>
                <option value="fixed">Giảm số tiền cố định (Vd: 20000)</option>
                <option value="percentage">Giảm theo phần trăm (Vd: 10)</option>
            </select>
            <input name="value" type="number" value={voucher.value} onChange={handleChange} placeholder={voucher.type === 'percentage' ? "Giá trị % (Vd: 10)" : "Số tiền giảm (Vd: 20000)"} style={styles.input} required min="0" />
            <input name="min_order_value" type="number" value={voucher.min_order_value} onChange={handleChange} placeholder="Giá trị đơn tối thiểu (Vd: 100000)" style={styles.input} min="0" />
            {voucher.type === 'percentage' && (
                <input name="max_discount" type="number" value={voucher.max_discount || ''} onChange={handleChange} placeholder="Giảm tối đa (để trống nếu không giới hạn)" style={styles.input} min="0" />
            )}
             <div>
                <input name="is_active" type="checkbox" checked={voucher.is_active} onChange={handleChange} id="is_active" />
                <label htmlFor="is_active"> Kích hoạt mã này?</label>
            </div>
            <div style={styles.formActions}>
                <button type="button" onClick={onCancel} style={{ ...styles.buttonAction, background: '#ccc', color: '#333' }}>Hủy</button>
                <button type="submit" style={styles.buttonAction} disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : (initialData ? 'Lưu thay đổi' : 'Thêm Mã')}
                </button>
            </div>
        </form>
    );
}
// ---------------------------------------------

// --- Component Trang chính (ĐÃ NÂNG CẤP) ---
export default function VouchersPage() {
    const router = useRouter();
    const [vouchers, setVouchers] = useState([]);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // === THÊM STATE CHO PHÂN TRANG ===
    const [page, setPage] = useState(1); 
    const [isLastPage, setIsLastPage] = useState(false);
    // ==================================

    // --- NÂNG CẤP LOGIC FETCH DỮ LIỆU ---
    const fetchData = async (pageNum = 1) => {
        setIsLoading(true); setError(''); const token = getToken();
        if (!token) { router.replace('/login'); return; }
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập.");
            setIsLoading(false);
            return;
        }

        // Tính toán skip/limit
        const limit = ITEMS_PER_PAGE;
        const skip = (pageNum - 1) * limit;

        try {
            // Thêm skip và limit vào URL
            const response = await fetch(`${apiUrl}/admin/vouchers/?skip=${skip}&limit=${limit}`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (response.status === 401) throw new Error('Token hết hạn.');
            if (!response.ok) throw new Error('Không thể tải Vouchers.');
            const data = await response.json(); 
            setVouchers(data);
            setPage(pageNum);
            setIsLastPage(data.length < ITEMS_PER_PAGE);
        } catch (err) { setError(err.message); }
        finally { setIsLoading(false); }
    };

    // Tải trang 1 khi mới vào
    useEffect(() => { fetchData(1); }, []);

    // --- CÁC HÀM XỬ LÝ NÚT PHÂN TRANG ---
    const handleNextPage = () => {
        if (!isLastPage) {
            fetchData(page + 1); 
        }
    };
    const handlePrevPage = () => {
        if (page > 1) {
            fetchData(page - 1); 
        }
    };
    // =====================================

    // --- Logic Mở/Đóng Form ---
    const handleAddNew = () => { setEditingVoucher(null); setShowForm(true); };
    const handleEdit = (voucher) => { setEditingVoucher(voucher); setShowForm(true); };
    const handleCloseForm = () => { setShowForm(false); setEditingVoucher(null); };

    // --- Logic Submit Form (Tạo/Sửa) ---
    const handleFormSubmit = async (voucherData) => {
        setError(''); const token = getToken(); const isEditing = !!editingVoucher;
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập.");
            return;
        }
        
        const url = isEditing ? `${apiUrl}/admin/vouchers/${editingVoucher.id}` : `${apiUrl}/admin/vouchers/`;
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, {
                method: method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(voucherData)
            });
            if (response.status === 401) throw new Error('Token hết hạn.');
            if (!response.ok) { const d = await response.json(); throw new Error(d.detail || 'Lưu thất bại'); }
            handleCloseForm();
            fetchData(isEditing ? page : 1); // Tải lại trang 1 nếu Thêm, trang hiện tại nếu Sửa
        } catch (err) { setError(err.message); }
    };

    // --- Logic Xóa Voucher ---
    const handleDelete = async (voucherId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) return;
        setError(''); const token = getToken();
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập.");
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/admin/vouchers/${voucherId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (response.status === 401) throw new Error('Token hết hạn.');
            if (!response.ok) throw new Error('Xóa thất bại.');
            fetchData(page); // Tải lại trang hiện tại
        } catch (err) { setError(err.message); }
    };

    // --- Giao diện ---
    return (
        <div style={styles.container}>
            <Head><title>Quản lý Mã Giảm Giá</title></Head>
            <Link href="/dashboard" style={styles.backLink}>← Quay lại Dashboard</Link>
            <h1>🎟️ Quản lý Mã Giảm Giá</h1>
            <button onClick={handleAddNew} style={styles.button}>+ Thêm Mã Mới</button>
            <button onClick={() => fetchData(page)} style={{...styles.buttonAction, background: '#17a2b8', marginBottom: '15px', marginLeft: '10px'}} disabled={isLoading}>
                 {isLoading ? 'Đang tải...' : 'Tải lại trang'}
            </button>

            {error && <p style={styles.error}>{error}</p>}

            {/* Form Thêm/Sửa (popup) */}
            {showForm && (
                <div style={styles.popupBackdrop}>
                    <VoucherForm initialData={editingVoucher} onSubmit={handleFormSubmit} onCancel={handleCloseForm} />
                </div>
            )}
            
            {/* === THÊM NÚT ĐIỀU HƯỚNG PHÂN TRANG (TRÊN) === */}
            <div style={styles.paginationControls}>
                <button onClick={handlePrevPage} disabled={isLoading || page <= 1} style={styles.buttonAction}>
                    ‹ Trang trước
                </button>
                <span style={{padding: '0 15px', color: '#555', fontWeight: 'bold'}}>Trang {page}</span>
                <button onClick={handleNextPage} disabled={isLoading || isLastPage} style={styles.buttonAction}>
                    Trang sau ›
                </button>
            </div>
            {/* ======================================= */}

            {/* Bảng hiển thị danh sách */}
            {isLoading ? <p>Đang tải...</p> : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Code</th>
                            <th style={styles.th}>Mô tả</th>
                            <th style={styles.th}>Loại</th>
                            <th style={styles.th}>Giá trị</th>
                            <th style={styles.th}>Đơn tối thiểu</th>
                            <th style={styles.th}>Giảm tối đa</th>
                            <th style={styles.th}>Trạng thái</th>
                            <th style={styles.th}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vouchers.length === 0 ? (
                            <tr><td colSpan="8" style={styles.tdCenter}>Chưa có mã nào.</td></tr>
                        ) : (
                            vouchers.map((v) => (
                                <tr key={v.id}>
                                    <td style={{...styles.td, fontWeight: 'bold'}}>{v.code}</td>
                                    <td style={styles.td}>{v.description}</td>
                                    <td style={styles.td}>{v.type === 'percentage' ? 'Phần trăm' : 'Cố định'}</td>
                                    <td style={styles.td}>{v.value}{v.type === 'percentage' ? '%' : 'đ'}</td>
                                    <td style={styles.td}>{v.min_order_value > 0 ? v.min_order_value.toLocaleString('vi-VN')+'đ' : '-'}</td>
                                    <td style={styles.td}>{v.max_discount ? v.max_discount.toLocaleString('vi-VN')+'đ' : '-'}</td>
                                    <td style={styles.td}><span style={v.is_active ? styles.activeBadge : styles.inactiveBadge}>{v.is_active ? 'Kích hoạt' : 'Vô hiệu'}</span></td>
                                    <td style={styles.td}>
                                        <button onClick={() => handleEdit(v)} style={styles.editButton}>Sửa</button>
                                        <button onClick={() => handleDelete(v.id)} style={styles.deleteButton}>Xóa</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
            
            {/* === THÊM NÚT ĐIỀU HƯỚNG PHÂN TRANG (DƯỚI) === */}
            <div style={styles.paginationControls}>
                <button onClick={handlePrevPage} disabled={isLoading || page <= 1} style={styles.buttonAction}>
                    ‹ Trang trước
                </button>
                <span style={{padding: '0 15px', color: '#555', fontWeight: 'bold'}}>Trang {page}</span>
                <button onClick={handleNextPage} disabled={isLoading || isLastPage} style={styles.buttonAction}>
                    Trang sau ›
                </button>
            </div>
            {/* ======================================= */}
            
        </div>
    );
}

// --- CSS (THÊM STYLE MỚI) ---
const styles = {
    container: { padding: '30px' },
    backLink: { display: 'inline-block', marginBottom: '20px', color: '#555', textDecoration: 'none' },
    button: { padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', marginBottom: '20px' },
    error: { color: 'red', marginBottom: '15px', fontSize: '0.9rem' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { background: '#f4f4f4', padding: '12px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' },
    td: { padding: '10px', border: '1px solid #ddd', verticalAlign: 'middle', fontSize: '0.9rem' },
    tdCenter: { padding: '20px', border: '1px solid #ddd', textAlign: 'center', color: '#777' },
    buttonAction: { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', background: '#007bff', color: 'white' },
    editButton: { marginRight: '5px', padding: '5px 10px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#333', fontSize: '0.8rem' },
    deleteButton: { padding: '5px 10px', background: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '0.8rem' },
    popupBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    formPopup: { background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', width: '90%', maxWidth: '600px', overflowY: 'auto', maxHeight: '90vh' },
    input: { display: 'block', width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
    formActions: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    activeBadge: { background: '#28a745', color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '0.8em' },
    inactiveBadge: { background: '#6c757d', color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '0.8em' },
    paginationControls: { marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, // Style cho Nút phân trang
};