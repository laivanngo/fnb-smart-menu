// Tệp: fnb-smart-menu-admin/pages/dashboard/products.js
// (BẢN FINAL - GOM NHÓM DANH MỤC ĐỂ SẮP XẾP CHUẨN)

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

const getToken = () => {
    if (typeof window !== 'undefined') { return localStorage.getItem('admin_token'); }
    return null;
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// --- Component Form Thêm/Sửa (Giữ nguyên logic cũ) ---
function ProductForm({ initialData, categories, onSubmit, onCancel }) {
    const [product, setProduct] = useState(initialData || {
        name: '', description: '', base_price: 0, image_url: '',
        is_best_seller: false, is_out_of_stock: false, 
        category_id: categories[0]?.id || ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false); 
    const [uploadError, setUploadError] = useState('');

    useEffect(() => {
         if (initialData) setProduct(initialData);
         else setProduct(prev => ({...prev, category_id: categories.length > 0 ? categories[0].id : ''}));
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
        setIsUploading(true);
        setUploadError('');
        const formData = new FormData();
        formData.append("file", file); 
        try {
            const response = await fetch(`${apiUrl}/admin/upload-image`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData, 
            });
            if (!response.ok) throw new Error("Upload thất bại");
            const data = await response.json();
            setProduct(prev => ({ ...prev, image_url: data.image_url }));
        } catch (err) { setUploadError(err.message); } finally { setIsUploading(false); }
    };

    return (
        <div style={styles.popupBackdrop}>
        <form onSubmit={handleSubmit} style={styles.formPopup}>
            <h3>{initialData ? 'Sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}</h3>
            <select name="category_id" value={String(product.category_id)} onChange={handleChange} style={styles.input} required>
                {categories.map(cat => <option key={cat.id} value={String(cat.id)}>{cat.name}</option>)}
            </select>
            <input name="name" value={product.name} onChange={handleChange} placeholder="Tên sản phẩm" style={styles.input} required />
            <input name="base_price" type="number" value={product.base_price} onChange={handleChange} placeholder="Giá gốc" style={styles.input} required min="0" />
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{...styles.input, padding: '5px'}} />
            {isUploading && <small>Đang tải ảnh...</small>}
            <input name="image_url" value={product.image_url || ''} onChange={handleChange} placeholder="Link ảnh" style={styles.input} />
            {product.image_url && <img src={product.image_url.startsWith('/') ? `${apiUrl}${product.image_url}` : product.image_url} alt="Preview" style={{width: '60px', height: '60px', objectFit: 'cover', marginBottom: '10px'}} />}
            <div style={{display:'flex', gap: '15px', marginBottom: '15px'}}>
                <label><input name="is_best_seller" type="checkbox" checked={product.is_best_seller} onChange={handleChange}/> Bán chạy</label>
                <label style={{color: 'red'}}><input name="is_out_of_stock" type="checkbox" checked={product.is_out_of_stock} onChange={handleChange}/> Tạm hết hàng</label>
            </div>
            <div style={styles.formActions}>
                <button type="button" onClick={onCancel} style={{...styles.buttonAction, background:'#ccc', color:'#000'}}>Hủy</button>
                <button type="submit" style={styles.buttonAction} disabled={isSubmitting}>Lưu</button>
            </div>
        </form>
        </div>
    );
}

// --- Component Gắn Options (Giữ nguyên logic cũ) ---
function ManageProductOptions({ product, allOptions, onSave, onCancel }) {
    const [selectedIds, setSelectedIds] = useState(new Set(product.options?.map(o => o.id) || []));
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const token = getToken();
        try {
            await fetch(`${apiUrl}/admin/products/${product.id}/link_options`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ option_ids: Array.from(selectedIds) }),
            });
            onSave();
        } catch (err) { alert(err.message); } finally { setIsSaving(false); }
    };

    return (
        <div style={styles.popupBackdrop}>
            <div style={styles.formPopup}>
                <h3>Tùy chọn cho: {product.name}</h3>
                <div style={{maxHeight:'300px', overflowY:'auto'}}>
                    {allOptions.map(opt => (
                        <div key={opt.id} style={{padding:'5px'}}>
                            <input type="checkbox" checked={selectedIds.has(opt.id)} onChange={() => {
                                const newSet = new Set(selectedIds);
                                if (newSet.has(opt.id)) newSet.delete(opt.id); else newSet.add(opt.id);
                                setSelectedIds(newSet);
                            }}/> {opt.name}
                        </div>
                    ))}
                </div>
                <div style={styles.formActions}>
                    <button onClick={onCancel} style={{...styles.buttonAction, background:'#ccc', color:'#000'}}>Hủy</button>
                    <button onClick={handleSave} style={styles.buttonAction} disabled={isSaving}>Lưu</button>
                </div>
            </div>
        </div>
    );
}

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [allOptions, setAllOptions] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [managingOptionsFor, setManagingOptionsFor] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter(); 

    const fetchData = async () => {
        setIsLoading(true);
        const token = getToken();
        if (!token) { router.replace('/login'); return; }

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            // Lấy TẤT CẢ sản phẩm (không phân trang ở frontend để dễ gom nhóm)
            const [prodRes, catRes, optRes] = await Promise.all([
                fetch(`${apiUrl}/admin/products/?limit=1000`, { headers }),
                fetch(`${apiUrl}/admin/categories/?limit=1000`, { headers }),
                fetch(`${apiUrl}/admin/options/?limit=1000`, { headers }) 
            ]);

            if (prodRes.ok && catRes.ok && optRes.ok) {
                setProducts(await prodRes.json());
                setCategories(await catRes.json());
                setAllOptions(await optRes.json());
            }
        } catch (err) { alert(err.message); } finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // LOGIC SẮP XẾP: Chỉ đổi chỗ trong cùng 1 Category
    const handleMove = async (productToMove, direction, productListInCategory) => {
        const currentIndex = productListInCategory.findIndex(p => p.id === productToMove.id);
        const newIndex = currentIndex + direction;
        
        if (newIndex < 0 || newIndex >= productListInCategory.length) return;

        setIsSubmitting(true);
        const token = getToken();
        const neighborProduct = productListInCategory[newIndex];

        // Hoán đổi display_order
        const payloadA = { display_order: neighborProduct.display_order };
        const payloadB = { display_order: productToMove.display_order };

        try {
            await Promise.all([
                fetch(`${apiUrl}/admin/products/${productToMove.id}`, {
                    method: 'PUT', headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
                    body: JSON.stringify(payloadA)
                }),
                fetch(`${apiUrl}/admin/products/${neighborProduct.id}`, {
                    method: 'PUT', headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
                    body: JSON.stringify(payloadB)
                })
            ]);
            fetchData();
        } catch (err) { alert("Lỗi sắp xếp"); } finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm("Xóa sản phẩm này?")) return;
        const token = getToken();
        await fetch(`${apiUrl}/admin/products/${id}`, { method: 'DELETE', headers: {'Authorization': `Bearer ${token}`} });
        fetchData();
    }

    const handleFormSubmit = async (data) => {
        const token = getToken();
        const url = editingProduct ?(`${apiUrl}/admin/products/${editingProduct.id}`) : (`${apiUrl}/admin/products/`);
        const method = editingProduct ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method, headers: {'Authorization':`Bearer ${token}`, 'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        if(res.ok) { setShowForm(false); setEditingProduct(null); fetchData(); }
    }

    return (
        <div style={styles.container}>
            <Head><title>Quản lý Sản phẩm</title></Head>
            <Link href="/dashboard" style={styles.backLink}>← Quay lại Dashboard</Link>
            <h1>🍔 Quản lý Sản phẩm</h1>

            <button onClick={() => {setEditingProduct(null); setShowForm(true)}} style={styles.button}>+ Thêm Món Mới</button>
            <button onClick={fetchData} style={{...styles.button, background: '#17a2b8', marginLeft:'10px'}}>Tải lại</button>

            {isLoading ? <p>Đang tải...</p> : (
                <div style={{marginTop: '20px'}}>
                    {categories.map(cat => {
                        // Lọc ra các món thuộc danh mục này và Sắp xếp theo display_order
                        const catProducts = products
                            .filter(p => p.category_id === cat.id)
                            .sort((a,b) => a.display_order - b.display_order);

                        if (catProducts.length === 0) return null;

                        return (
                            <div key={cat.id} style={{marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden'}}>
                                <div style={{background: '#f8f9fa', padding: '10px 15px', borderBottom: '1px solid #ddd', fontWeight: 'bold', fontSize: '1.1rem', color: '#FF6600'}}>
                                    {cat.name}
                                </div>
                                <table style={styles.table}>
                                    <tbody>
                                        {catProducts.map((prod, idx) => (
                                            <tr key={prod.id}>
                                                <td style={{...styles.td, width: '50px'}}>
                                                    {prod.image_url && <img src={prod.image_url.startsWith('/') ? `${apiUrl}${prod.image_url}` : prod.image_url} style={styles.tableImage} />}
                                                </td>
                                                <td style={styles.td}>
                                                    <b>{prod.name}</b><br/>
                                                    <small>{prod.base_price.toLocaleString()}đ</small>
                                                </td>
                                                <td style={{...styles.td, width: '120px', textAlign: 'center'}}>
                                                    <button 
                                                        onClick={() => handleMove(prod, -1, catProducts)} 
                                                        disabled={isSubmitting || idx === 0}
                                                        style={styles.moveButton}>↑</button>
                                                    <button 
                                                        onClick={() => handleMove(prod, 1, catProducts)} 
                                                        disabled={isSubmitting || idx === catProducts.length - 1}
                                                        style={styles.moveButton}>↓</button>
                                                </td>
                                                <td style={{...styles.td, width: '100px', textAlign: 'center'}}>
                                                    {prod.is_out_of_stock ? <span style={{color:'red', fontWeight:'bold'}}>Hết hàng</span> : <span style={{color:'green'}}>Có sẵn</span>}
                                                </td>
                                                <td style={{...styles.td, width: '200px', textAlign: 'right'}}>
                                                    <button onClick={() => {setEditingProduct(prod); setShowForm(true)}} style={styles.editButton}>Sửa</button>
                                                    <button onClick={() => setManagingOptionsFor(prod)} style={styles.linkButton}>Gắn Tùy chọn</button>
                                                    <button onClick={() => handleDelete(prod.id)} style={styles.deleteButton}>Xóa</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    })}
                    {products.length === 0 && <p>Chưa có sản phẩm nào.</p>}
                </div>
            )}

            {showForm && <ProductForm initialData={editingProduct} categories={categories} onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} />}
            {managingOptionsFor && <ManageProductOptions product={managingOptionsFor} allOptions={allOptions} onSave={() => {setManagingOptionsFor(null); fetchData()}} onCancel={() => setManagingOptionsFor(null)} />}
        </div>
    );
}

const styles = {
    container: { padding: '30px', maxWidth: '1200px', margin: '0 auto' },
    backLink: { textDecoration: 'none', color: '#666', marginBottom: '15px', display: 'inline-block' },
    button: { padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1rem' },
    table: { width: '100%', borderCollapse: 'collapse' },
    td: { padding: '10px', borderBottom: '1px solid #eee', verticalAlign: 'middle' },
    tableImage: { width: '40px', height: '40px', borderRadius: '5px', objectFit: 'cover' },
    moveButton: { padding: '5px 10px', margin: '0 2px', cursor: 'pointer', background: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px' },
    editButton: { padding: '5px 10px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', color: '#000' },
    linkButton: { padding: '5px 10px', background: '#17a2b8', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', color: '#fff' },
    deleteButton: { padding: '5px 10px', background: '#dc3545', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#fff' },
    popupBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    formPopup: { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
    input: { display: 'block', width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' },
    formActions: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonAction: { padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
};