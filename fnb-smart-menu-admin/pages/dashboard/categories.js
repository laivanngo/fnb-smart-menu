// Tệp: pages/dashboard/categories.js
// (BẢN VÁ 1.8 - NÂNG CẤP TOÀN DIỆN: SỬA, XÓA, SẮP XẾP)

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link'; 

// Hàm trợ giúp để lấy token
const getToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('admin_token');
    }
    return null;
};

// Sử dụng biến này
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const ITEMS_PER_PAGE = 50; // Giữ nguyên phân trang

// === COMPONENT MỚI: Form Sửa Danh mục ===
function CategoryEditForm({ initialData, onSubmit, onCancel }) {
    const [category, setCategory] = useState(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setCategory(initialData);
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCategory(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        
        // Chỉ gửi đi các trường cần update
        const payload = {
            name: category.name,
            display_order: category.display_order
        };
        
        try {
            await onSubmit(payload);
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
                    <h3>Sửa Danh mục: {initialData.name}</h3>
                    <label style={styles.label}>Tên Danh mục</label>
                    <input name="name" value={category.name} onChange={handleChange} style={styles.input} required />
                    
                    <label style={styles.label}>Thứ tự hiển thị</label>
                    <input name="display_order" type="number" value={category.display_order} onChange={handleChange} style={styles.input} required />
                    
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

// === COMPONENT TRANG CHÍNH ===
export default function CategoriesPage() {
    const router = useRouter();
    const [categories, setCategories] = useState([]); 
    const [newCategoryName, setNewCategoryName] = useState(''); 
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true); 
    const [page, setPage] = useState(1); 
    const [isLastPage, setIsLastPage] = useState(false);
    
    // === STATE MỚI: Quản lý Sửa ===
    const [editingCategory, setEditingCategory] = useState(null); // Lưu object category đang sửa
    const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái cho nút (Thêm, Sắp xếp)
    
    // --- Logic Lấy Danh mục (Đã có Phân trang) ---
    const fetchCategories = async (pageNum = 1) => {
        setIsLoading(true);
        setError('');
        const token = getToken();
        if (!token) { router.replace('/login'); return; }
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập.");
            setIsLoading(false);
            return;
        }

        const limit = ITEMS_PER_PAGE;
        const skip = (pageNum - 1) * limit;

        try {
            const response = await fetch(`${apiUrl}/admin/categories/?skip=${skip}&limit=${limit}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.status === 401) throw new Error('Token hết hạn hoặc không hợp lệ.');
            if (!response.ok) throw new Error('Không thể tải danh mục.');

            const data = await response.json();
            // Backend trả về đã sắp xếp, frontend chỉ việc hiển thị
            setCategories(data); 
            setPage(pageNum); 
            setIsLastPage(data.length < ITEMS_PER_PAGE); 

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories(1);
    }, []); 

    // --- Logic Phân trang ---
    const handleNextPage = () => { if (!isLastPage) fetchCategories(page + 1); };
    const handlePrevPage = () => { if (page > 1) fetchCategories(page - 1); };

    // --- Logic Tạo Danh mục Mới ---
    const handleCreateCategory = async (e) => {
        e.preventDefault();
        setError('');
        const token = getToken();
        if (!newCategoryName.trim()) { setError("Tên danh mục không được để trống."); return; }
        if (!apiUrl) { setError("Lỗi cấu hình: API URL chưa được thiết lập."); return; }
        
        setIsSubmitting(true); // Bật loading
        try {
            // Lấy category cuối cùng để +1 display_order
            const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) : 0;
            
            const response = await fetch(`${apiUrl}/admin/categories/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCategoryName,
                    display_order: maxOrder + 1 // Tự động thêm vào cuối
                }),
            });
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.detail || 'Tạo danh mục thất bại'); }
            setNewCategoryName(''); 
            fetchCategories(1); // Tải lại trang 1
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false); // Tắt loading
        }
    };

    // --- LOGIC SỬA/XÓA/SẮP XẾP ---
    const handleOpenEdit = (category) => {
        setEditingCategory(category);
    };
    const handleCloseEdit = () => {
        setEditingCategory(null);
    };

    const handleSaveEdit = async (payload) => {
        setError('');
        const token = getToken();
        if (!editingCategory || !apiUrl) return;

        try {
            const response = await fetch(`${apiUrl}/admin/categories/${editingCategory.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.detail || 'Cập nhật thất bại'); }
            
            handleCloseEdit();
            fetchCategories(page); // Tải lại trang hiện tại
        } catch (err) {
            // Ném lỗi về component con để hiển thị
            throw err; 
        }
    };

    const handleDelete = async (categoryId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa danh mục này? Mọi sản phẩm bên trong cũng sẽ bị xóa!')) return;
        
        setError('');
        const token = getToken();
        if (!apiUrl) { setError("Lỗi cấu hình: API URL chưa được thiết lập."); return; }

        try {
            const response = await fetch(`${apiUrl}/admin/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.detail || 'Xóa thất bại'); }
            fetchCategories(page); // Tải lại trang hiện tại
        } catch (err) {
            setError(err.message);
        }
    };
    
    // Hàm Sắp xếp (Đổi display_order của 2 mục)
    const handleMove = async (index, direction) => {
        const newIndex = index + direction;
        // Kiểm tra xem có di chuyển ra ngoài danh sách không
        if (newIndex < 0 || newIndex >= categories.length) return; 

        setIsSubmitting(true); // Dùng chung trạng thái loading
        setError('');
        const token = getToken();
        
        const catA = categories[index];
        const catB = categories[newIndex];

        // Tạo 2 payload để swap (đổi) display_order
        const payloadA = { display_order: catB.display_order };
        const payloadB = { display_order: catA.display_order };

        try {
            // Gọi 2 API cập nhật cùng lúc
            const [resA, resB] = await Promise.all([
                fetch(`${apiUrl}/admin/categories/${catA.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadA)
                }),
                fetch(`${apiUrl}/admin/categories/${catB.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadB)
                })
            ]);
            
            if (!resA.ok || !resB.ok) throw new Error('Sắp xếp thất bại');
            
            fetchCategories(page); // Tải lại trang hiện tại
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    // --- Giao diện ---
    return (
        <div style={styles.container}>
            <Head><title>Quản lý Danh mục</title></Head>
            <Link href="/dashboard" style={styles.backLink}>← Quay lại Dashboard</Link>
            <h1>📚 Quản lý Danh mục</h1>

            <form onSubmit={handleCreateCategory} style={styles.form}>
                <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Tên danh mục mới (Vd: Trà Sữa)"
                    style={styles.input}
                    disabled={isSubmitting}
                />
                <button type="submit" style={styles.button} disabled={isSubmitting}>
                    {isSubmitting ? 'Đang thêm...' : 'Thêm Danh mục'}
                </button>
            </form>
            
            <button onClick={() => fetchCategories(page)} style={{...styles.buttonAction, background: '#17a2b8', marginBottom: '15px'}} disabled={isLoading || isSubmitting}>
                 {isLoading ? 'Đang tải...' : 'Tải lại trang'}
            </button>

            {error && <p style={styles.error}>{error}</p>}
            
            <div style={styles.paginationControls}>
                <button onClick={handlePrevPage} disabled={isLoading || isSubmitting || page <= 1} style={styles.buttonAction}>
                    ‹ Trang trước
                </button>
                <span style={{padding: '0 15px', color: '#555', fontWeight: 'bold'}}>Trang {page}</span>
                <button onClick={handleNextPage} disabled={isLoading || isSubmitting || isLastPage} style={styles.buttonAction}>
                    Trang sau ›
                </button>
            </div>

            {isLoading ? ( <p>Đang tải danh sách...</p> ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Tên Danh mục</th>
                            {/* === THÊM CỘT SẮP XẾP === */}
                            <th style={styles.th}>Thứ tự</th> 
                            <th style={styles.th}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={styles.tdCenter}>Chưa có danh mục nào.</td>
                            </tr>
                        ) : (
                            categories.map((cat, index) => (
                                <tr key={cat.id}>
                                    <td style={styles.td}>{cat.id}</td>
                                    <td style={styles.td}>{cat.name}</td>
                                    {/* === THÊM NÚT SẮP XẾP === */}
                                    <td style={styles.td}>
                                        <button 
                                            onClick={() => handleMove(index, -1)} 
                                            disabled={isSubmitting || index === 0} 
                                            style={styles.moveButton}>↑ Lên</button>
                                        <button 
                                            onClick={() => handleMove(index, 1)} 
                                            disabled={isSubmitting || index === categories.length - 1} 
                                            style={styles.moveButton}>↓ Xuống</button>
                                    </td>
                                    {/* === THÊM NÚT SỬA/XÓA === */}
                                    <td style={styles.td}>
                                        <button onClick={() => handleOpenEdit(cat)} style={styles.editButton} disabled={isSubmitting}>Sửa</button>
                                        <button onClick={() => handleDelete(cat.id)} style={styles.deleteButton} disabled={isSubmitting}>Xóa</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
            
            <div style={styles.paginationControls}>
                <button onClick={handlePrevPage} disabled={isLoading || isSubmitting || page <= 1} style={styles.buttonAction}>
                    ‹ Trang trước
                </button>
                <span style={{padding: '0 15px', color: '#555', fontWeight: 'bold'}}>Trang {page}</span>
                <button onClick={handleNextPage} disabled={isLoading || isSubmitting || isLastPage} style={styles.buttonAction}>
                    Trang sau ›
                </button>
            </div>
            
            {/* === POPUP SỬA === */}
            {editingCategory && (
                <CategoryEditForm
                    initialData={editingCategory}
                    onSubmit={handleSaveEdit}
                    onCancel={handleCloseEdit}
                />
            )}
        </div>
    );
}

// --- CSS (THÊM STYLE MỚI) ---
const styles = {
    container: { padding: '30px' },
    backLink: { display: 'inline-block', marginBottom: '20px', color: '#555', textDecoration: 'none' },
    form: { display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' },
    input: { display: 'block', width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' }, 
    button: { padding: '10px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' },
    error: { color: 'red', marginBottom: '15px', fontSize: '0.9rem' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { background: '#f4f4f4', padding: '12px', border: '1px solid #ddd', textAlign: 'left' },
    td: { padding: '10px', border: '1px solid #ddd', verticalAlign: 'middle' },
    tdCenter: { padding: '20px', border: '1px solid #ddd', textAlign: 'center', color: '#777' },
    buttonAction: { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', background: '#007bff', color: 'white' },
    paginationControls: { marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    
    // Nút Sửa / Xóa / Sắp xếp
    editButton: { marginRight: '5px', padding: '5px 10px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#333', fontSize: '0.8rem' },
    deleteButton: { padding: '5px 10px', background: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white', fontSize: '0.8rem' },
    moveButton: { marginRight: '5px', padding: '5px 8px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', color: '#333', fontSize: '0.8rem' },
    
    // Popup
    popupBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    formPopup: { background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', width: '90%', maxWidth: '500px' },
    formActions: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
};

// Vô hiệu hóa nút khi disabled
styles.buttonAction[':disabled'] = { background: '#9ec5fe' };
styles.button[':disabled'] = { background: '#a6d7b3' };
styles.moveButton[':disabled'] = { background: '#f8f9fa', color: '#ccc', cursor: 'not-allowed' };
styles.editButton[':disabled'] = { background: '#fff8e1', cursor: 'not-allowed' };
styles.deleteButton[':disabled'] = { background: '#f5c6cb', cursor: 'not-allowed' };