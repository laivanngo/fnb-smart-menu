// Tệp: fnb-smart-menu-admin/pages/dashboard/products.js
// (BẢN VÁ 1.9 - ĐÃ THÊM SẮP XẾP SẢN PHẨM)

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

// (Các component con: getToken, ProductForm, ManageProductOptions... giữ nguyên)
// ... (Phần code của 3 component này không đổi, tôi sẽ rút gọn)
const getToken = () => {
    if (typeof window !== 'undefined') { return localStorage.getItem('admin_token'); }
    return null;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const ITEMS_PER_PAGE = 20; 
function ProductForm({ initialData, categories, onSubmit, onCancel }) {
    const [product, setProduct] = useState(initialData || {
        name: '', description: '', base_price: 0, image_url: '',
        is_best_seller: false,
        is_out_of_stock: false, 
        category_id: categories[0]?.id || ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false); 
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
         if (initialData) {
            setProduct(initialData);
        } else {
             setProduct({
                name: '', description: '', base_price: 0, image_url: '',
                is_best_seller: false,
                is_out_of_stock: false, 
                category_id: categories.length > 0 ? categories[0].id : ''
            });
         }
    }, [categories, initialData]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProduct(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'base_price' ? parseFloat(value) || 0 : value)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Sửa: Chỉ gửi đi các trường có trong ProductUpdate/Create
        const { id, options, ...payload } = product;
        payload.category_id = parseInt(payload.category_id);
        payload.base_price = parseFloat(payload.base_price) || 0;
        await onSubmit(payload); 
        setIsSubmitting(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const token = getToken();
        if (!apiUrl || !token) {
            setUploadError("Lỗi cấu hình hoặc chưa đăng nhập.");
            return;
        }
        setIsUploading(true);
        setUploadError('');
        const formData = new FormData();
        formData.append("file", file); 
        try {
            const response = await fetch(`${apiUrl}/admin/upload-image`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData, 
            });
            if (!response.ok) { const d = await response.json(); throw new Error(d.detail || "Upload thất bại"); }
            const data = await response.json();
            setProduct(prev => ({ ...prev, image_url: data.image_url }));
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.formPopup}>
            <h3>{initialData ? 'Sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}</h3>
            <select name="category_id" value={String(product.category_id)} onChange={handleChange} style={styles.input} required>
                {categories.length === 0 ? <option>Vui lòng tạo Danh mục trước</option> :
                    categories.map(cat => <option key={cat.id} value={String(cat.id)}>{cat.name}</option>)
                }
            </select>
            <input name="name" value={product.name} onChange={handleChange} placeholder="Tên sản phẩm" style={styles.input} required />
            <input name="base_price" type="number" value={product.base_price} onChange={handleChange} placeholder="Giá gốc" style={styles.input} required min="0" />
            <label style={styles.label}>Ảnh sản phẩm (Tải lên hoặc dán Emoji/link)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} style={{...styles.input, padding: '5px'}} />
            {isUploading && <p style={{fontSize: '0.9em', color: '#555'}}>Đang tải ảnh lên...</p>}
            {uploadError && <p style={styles.error}>{uploadError}</p>}
            <input name="image_url" value={product.image_url || ''} onChange={handleChange} placeholder="Hoặc dán Emoji/Link ảnh vào đây" style={styles.input} />
            {product.image_url && (
                <div style={{marginTop: '10px', marginBottom: '10px'}}>
                    <p style={{fontSize: '0.8em', color: '#555'}}>Ảnh xem trước:</p>
                    <img 
                        src={product.image_url.startsWith('/') ? `${apiUrl}${product.image_url}` : product.image_url} 
                        alt="Preview" 
                        style={{width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd'}} 
                    />
                </div>
            )}
            <input name="description" value={product.description || ''} onChange={handleChange} placeholder="Mô tả ngắn" style={styles.input} />
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                <div>
                    <input name="is_best_seller" type="checkbox" checked={product.is_best_seller} onChange={handleChange} id="is_best_seller" />
                    <label htmlFor="is_best_seller" style={{marginLeft: '5px'}}> Bán chạy?</label>
                </div>
                <div>
                    <input name="is_out_of_stock" type="checkbox" checked={product.is_out_of_stock} onChange={handleChange} id="is_out_of_stock" />
                    <label htmlFor="is_out_of_stock" style={{color: '#dc3545', marginLeft: '5px'}}> Tạm hết hàng?</label>
                </div>
            </div>
            <div style={styles.formActions}>
                <button type="button" onClick={onCancel} style={{ ...styles.buttonAction, background: '#ccc', color: '#333' }}>Hủy</button>
                <button type="submit" style={styles.buttonAction} disabled={isSubmitting || categories.length === 0}>
                    {isSubmitting ? 'Đang lưu...' : (initialData ? 'Lưu thay đổi' : 'Thêm Sản phẩm')}
                </button>
            </div>
        </form>
    );
}
function ManageProductOptions({ product, allOptions, onSave, onCancel }) {
    const [selectedOptionIds, setSelectedOptionIds] = useState(() => {
        const initialIds = product.options?.map(opt => opt.id) || [];
        return new Set(initialIds);
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleCheckboxChange = (optionId) => {
        setSelectedOptionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(optionId)) {
                newSet.delete(optionId);
            } else {
                newSet.add(optionId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        const token = getToken();
        if (!apiUrl) {
            setError("Lỗi cấu hình: API URL chưa được thiết lập.");
            setIsSaving(false);
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/admin/products/${product.id}/link_options`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', },
                body: JSON.stringify({ option_ids: Array.from(selectedOptionIds) }),
            });
            if (response.status === 401) throw new Error('Token hết hạn.');
            if (!response.ok) throw new Error('Lưu liên kết thất bại.');
            onSave(); 
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={styles.formPopup}>
            <h3>Gắn Tùy chọn cho: {product.name}</h3>
            <p>Chọn các Nhóm Tùy chọn sẽ áp dụng:</p>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
                {allOptions.length === 0 ? <p>Không có Tùy chọn nào. Vui lòng tạo ở trang "Quản lý Tùy chọn".</p> :
                    allOptions.map(option => (
                        <div key={option.id} style={{ padding: '5px 0' }}>
                            <input
                                type="checkbox"
                                id={`opt-${product.id}-${option.id}`}
                                checked={selectedOptionIds.has(option.id)}
                                onChange={() => handleCheckboxChange(option.id)}
                            />
                            <label htmlFor={`opt-${product.id}-${option.id}`} style={{ marginLeft: '8px' }}>
                                {option.name} ({option.type === 'CHON_1' ? 'Chọn 1' : 'Chọn nhiều'})
                            </label>
                        </div>
                    ))
                }
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.formActions}>
                <button onClick={onCancel} style={{ ...styles.buttonAction, background: '#ccc', color: '#333' }} disabled={isSaving}>Hủy</button>
                <button onClick={handleSave} style={styles.buttonAction} disabled={isSaving || allOptions.length === 0}>
                    {isSaving ? 'Đang lưu...' : 'Lưu liên kết'}
                </button>
            </div>
        </div>
    );
}

// --- Component Trang chính (ĐÃ NÂNG CẤP) ---
export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [allOptions, setAllOptions] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [managingOptionsFor, setManagingOptionsFor] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // State chung cho Sắp xếp
    const router = useRouter(); 

    const [page, setPage] = useState(1); 
    const [isLastPage, setIsLastPage] = useState(false);

    // --- Logic Fetch Dữ liệu (Đã có phân trang) ---
    const fetchData = async (pageNum = 1) => {
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
            const headers = { 'Authorization': `Bearer ${token}` };
            const [prodRes, catRes, optRes] = await Promise.all([
                fetch(`${apiUrl}/admin/products/?skip=${skip}&limit=${limit}`, { headers }),
                fetch(`${apiUrl}/admin/categories/?limit=1000`, { headers }),
                fetch(`${apiUrl}/admin/options/?limit=1000`, { headers }) 
            ]);

            if (prodRes.status === 401 || catRes.status === 401 || optRes.status === 401) throw new Error('Token hết hạn.');
            if (!prodRes.ok || !catRes.ok || !optRes.ok) throw new Error('Không thể tải dữ liệu.');

            const prodData = await prodRes.json();
            const catData = await catRes.json();
            const optData = await optRes.json();

            // Backend đã sắp xếp, chỉ việc set
            setProducts(prodData);
            setCategories(catData);
            setAllOptions(optData);
            setPage(pageNum);
            setIsLastPage(prodData.length < ITEMS_PER_PAGE);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(1); }, []);
    
    // --- Logic Phân trang ---
    const handleNextPage = () => { if (!isLastPage) fetchData(page + 1); };
    const handlePrevPage = () => { if (page > 1) fetchData(page - 1); };

    // --- Logic Mở Form ---
    const handleAddNew = () => { setEditingProduct(null); setShowForm(true); };
    const handleEdit = (product) => { setEditingProduct(product); setShowForm(true); };
    const handleCloseForm = () => { setShowForm(false); setEditingProduct(null); };
    const handleManageOptions = (product) => { setManagingOptionsFor(product); };
    const handleCloseOptionsForm = () => { setManagingOptionsFor(null); };

    // --- Logic Submit Form (Tạo/Sửa) ---
    const handleFormSubmit = async (productData) => {
        setError('');
        const token = getToken();
        if (!apiUrl) { setError("Lỗi cấu hình: API URL chưa được thiết lập."); return; }
        
        const isEditing = !!editingProduct;
        const url = isEditing ? `${apiUrl}/admin/products/${editingProduct.id}` : `${apiUrl}/admin/products/`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(productData) // Gửi payload đã xử lý từ component con
            });
            if (response.status === 401) throw new Error('Token hết hạn.');
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.detail || 'Lưu thất bại'); }
            handleCloseForm();
            fetchData(isEditing ? page : 1); 
        } catch (err) { setError(err.message); }
    };

    // --- Logic Xóa Sản phẩm ---
    const handleDelete = async (productId) => {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
        setError('');
        const token = getToken();
        if (!apiUrl) { setError("Lỗi cấu hình: API URL chưa được thiết lập."); return; }

        try {
            const response = await fetch(`${apiUrl}/admin/products/${productId}`, {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.status === 401) throw new Error('Token hết hạn.');
            if (!response.ok) throw new Error('Xóa thất bại.');
            fetchData(page); 
        } catch (err) { setError(err.message); }
    };

    // === LOGIC MỚI: SẮP XẾP SẢN PHẨM ===
    const handleMove = async (index, direction) => {
        const newIndex = index + direction;
        // Kiểm tra di chuyển hợp lệ (chỉ trong cùng 1 category)
        if (newIndex < 0 || newIndex >= products.length || products[index].category_id !== products[newIndex].category_id) {
            return; 
        }

        setIsSubmitting(true); // Bật loading
        setError('');
        const token = getToken();
        
        const prodA = products[index];
        const prodB = products[newIndex];

        // Tạo 2 payload để swap (đổi) display_order
        const payloadA = { display_order: prodB.display_order };
        const payloadB = { display_order: prodA.display_order };

        try {
            // Gọi 2 API cập nhật cùng lúc
            const [resA, resB] = await Promise.all([
                fetch(`${apiUrl}/admin/products/${prodA.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadA)
                }),
                fetch(`${apiUrl}/admin/products/${prodB.id}`, {
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
            <Head><title>Quản lý Sản phẩm</title></Head>
            <Link href="/dashboard" style={styles.backLink}>← Quay lại Dashboard</Link>
            <h1>🍔 Quản lý Sản phẩm</h1>

            <button onClick={handleAddNew} style={styles.button} disabled={isSubmitting}>+ Thêm Sản phẩm Mới</button>
             <button onClick={() => fetchData(page)} style={{...styles.buttonAction, background: '#17a2b8', marginBottom: '15px', marginLeft: '10px'}} disabled={isLoading || isSubmitting}>
                 {isLoading ? 'Đang tải...' : 'Tải lại trang'}
            </button>

            {error && <p style={styles.error}>{error}</p>}

            {/* Component ProductForm */}
            {showForm && (
                <div style={styles.popupBackdrop}>
                    <ProductForm
                        initialData={editingProduct}
                        categories={categories}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCloseForm}
                    />
                </div>
            )}

            {/* Component ManageProductOptions */}
            {managingOptionsFor && (
                 <div style={styles.popupBackdrop}>
                    <ManageProductOptions
                        product={managingOptionsFor}
                        allOptions={allOptions}
                        onSave={() => { handleCloseOptionsForm(); fetchData(page); }} 
                        onCancel={handleCloseOptionsForm}
                    />
                </div>
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
            
            {isLoading ? ( <p>Đang tải danh sách...</p> ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Ảnh</th>
                            <th style={styles.th}>Tên Sản phẩm</th>
                            <th style={styles.th}>Giá</th>
                            <th style={styles.th}>Danh mục</th>
                            {/* === THÊM CỘT SẮP XẾP === */}
                            <th style={styles.th}>Thứ tự</th>
                            <th style={styles.th}>Trạng thái</th>
                            <th style={styles.th}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                             <tr><td colSpan="8" style={styles.tdCenter}>Chưa có sản phẩm nào.</td></tr>
                        ) : (
                            products.map((prod, index) => {
                                // === LOGIC KIỂM TRA NÚT SẮP XẾP ===
                                // Chỉ cho phép sắp xếp KHI ở CÙNG danh mục
                                const canMoveUp = index > 0 && products[index - 1].category_id === prod.category_id;
                                const canMoveDown = index < products.length - 1 && products[index + 1].category_id === prod.category_id;
                                // =================================
                                
                                return (
                                    <tr key={prod.id}>
                                        <td style={styles.td}>{prod.id}</td>
                                        <td style={styles.td}>
                                            {prod.image_url && (
                                                prod.image_url.startsWith('/') ?
                                                <img src={`${apiUrl}${prod.image_url}`} alt={prod.name} style={styles.tableImage} />
                                                : <span style={{fontSize: '1.5rem'}}>{prod.image_url}</span>
                                            )}
                                        </td>
                                        <td style={styles.td}>{prod.name}</td>
                                        <td style={styles.td}>{prod.base_price.toLocaleString('vi-VN')}đ</td>
                                        <td style={styles.td}>
                                            {categories.find(c => c.id === prod.category_id)?.name || 'N/A'}
                                        </td>
                                        
                                        {/* === THÊM CÁC NÚT SẮP XẾP === */}
                                        <td style={styles.td}>
                                            <button 
                                                onClick={() => handleMove(index, -1)} 
                                                disabled={isSubmitting || !canMoveUp} 
                                                style={styles.moveButton}>↑ Lên</button>
                                            <button 
                                                onClick={() => handleMove(index, 1)} 
                                                disabled={isSubmitting || !canMoveDown} 
                                                style={styles.moveButton}>↓ Xuống</button>
                                        </td>
                                        {/* ============================= */}
                                        
                                        <td style={styles.td}>
                                            {prod.is_out_of_stock 
                                                ? <span style={styles.inactiveBadge}>Hết hàng</span> 
                                                : <span style={styles.activeBadge}>Đang bán</span>
                                            }
                                        </td>
                                        <td style={styles.td}>
                                            <button onClick={() => handleEdit(prod)} style={styles.editButton} disabled={isSubmitting}>Sửa</button>
                                            <button onClick={() => handleManageOptions(prod)} style={styles.linkButton} disabled={isSubmitting}>Gắn</button>
                                            <button onClick={() => handleDelete(prod.id)} style={styles.deleteButton} disabled={isSubmitting}>Xóa</button>
                                        </td>
                                    </tr>
                                )
                            })
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
            
        </div>
    );
}

// --- CSS (THÊM STYLE MỚI) ---
const styles = {
    container: { padding: '30px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '600', color: '#555' },
    backLink: { display: 'inline-block', marginBottom: '20px', color: '#555', textDecoration: 'none' },
    button: { padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', marginBottom: '20px' },
    error: { color: 'red', marginBottom: '15px', fontSize: '0.9rem' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    th: { background: '#f4f4f4', padding: '12px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' },
    td: { padding: '10px', border: '1px solid #ddd', verticalAlign: 'middle' },
    tableImage: { width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' },
     tdSmall: { padding: '10px', border: '1px solid #ddd', verticalAlign: 'middle', fontSize: '0.85em', color: '#555' },
    tdCenter: { padding: '20px', border: '1px solid #ddd', textAlign: 'center', color: '#777' },
    buttonAction: { padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', background: '#007bff', color: 'white' },
    editButton: { marginRight: '5px', padding: '5px 10px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#333' },
    linkButton: { marginRight: '5px', padding: '5px 10px', background: '#17a2b8', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' },
    deleteButton: { padding: '5px 10px', background: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' },
    moveButton: { marginRight: '5px', padding: '5px 8px', background: '#f0f0f0', border: '1Kpx solid #ccc', borderRadius: '4px', cursor: 'pointer', color: '#333', fontSize: '0.8rem' },
    popupBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    formPopup: { background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
    input: { display: 'block', width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
    formActions: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    activeBadge: { background: '#28a745', color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '0.8em' },
    inactiveBadge: { background: '#6c757d', color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '0.8em' },
    paginationControls: { marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};

// Vô hiệu hóa nút khi disabled
styles.buttonAction[':disabled'] = { background: '#9ec5fe' };
styles.button[':disabled'] = { background: '#9eceff' };
styles.moveButton[':disabled'] = { background: '#f8f9fa', color: '#ccc', cursor: 'not-allowed' };
styles.editButton[':disabled'] = { background: '#fff8e1', cursor: 'not-allowed' };
styles.deleteButton[':disabled'] = { background: '#f5c6cb', cursor: 'not-allowed' };
styles.linkButton[':disabled'] = { background: '#a4dae3', cursor: 'not-allowed' };