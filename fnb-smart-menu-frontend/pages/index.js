// Tệp: pages/index.js (Giao diện màu Cam - Orange Style)
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useCart } from '../context/CartContext';
import ProductModal from '../components/ProductModal';
import CartDisplay from '../components/CartDisplay';
import GroupOrderControl from '../components/GroupOrderControl';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function HomePage({ menuData, error }) {
    const { itemCount, totalPrice } = useCart();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    
    const categoryRefs = useRef({});

    useEffect(() => {
        if (menuData && menuData.length > 0) {
            setCategories(menuData);
            const allProducts = menuData.flatMap(cat => 
                (cat.products || []).map(prod => ({
                    ...prod,
                    category_id: cat.id,
                    category_name: cat.name
                }))
            );
            setProducts(allProducts);
            setSelectedCategory(menuData[0].id);
        }
    }, [menuData]);

    const handleCategoryClick = (categoryId) => {
        setSelectedCategory(categoryId);
        if (categoryRefs.current[categoryId]) {
            const element = categoryRefs.current[categoryId];
            const yOffset = -120;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const handleProductClick = (product) => {
        if (product.is_out_of_stock) return;
        setSelectedProduct(product);
    };

    const handleQuickAdd = (e, product) => {
        e.stopPropagation();
        if (product.is_out_of_stock) return;
        setSelectedProduct(product);
    };

    if (error) {
        return (
            <div style={styles.errorContainer}>
                <Head><title>Lỗi tải Menu</title></Head>
                <p style={styles.errorText}>❌ {error}</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <Head>
                <title>Ngon-Ngon - Đặt món ngay</title> {/* Đổi tên Title */}
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.logoSection}>
                        {/* Đổi Logo thành Ngon-Ngon và màu Cam */}
                        <h1 style={styles.logo}>Ngon-Ngon</h1> 
                        <div style={styles.deliveryInfo}>
                            <span style={styles.deliveryIcon}>📍</span>
                            <span style={styles.deliveryText}>Giao hàng Miễn Phí tận công ty - ĐT/Zalo: 0378.148.148</span>
                        </div>
                    </div>
                    
                    {/* NÚT GIỎ HÀNG HEADER (Màu Cam) */}
                    {itemCount > 0 && (
                        <div 
                            className="desktop-cart-btn" 
                            style={{...styles.cartButton, cursor: 'pointer'}} 
                            onClick={() => setIsCartOpen(true)} 
                        >
                            <span style={styles.cartIcon}>🛒</span>
                            <span style={styles.cartCount}>{itemCount}</span>
                            <span style={styles.cartTotal}>
                                {totalPrice.toLocaleString('vi-VN')}đ
                            </span>
                        </div>
                    )}
                </div>
            </header>

            <nav style={styles.categoryNav}>
                <div style={styles.categoryScrollContainer}>
                    {categories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => handleCategoryClick(category.id)}
                            style={{
                                ...styles.categoryTab,
                                ...(selectedCategory === category.id ? styles.categoryTabActive : {})
                            }}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </nav>

            <GroupOrderControl />

            <main style={styles.main}>
                {categories.map(category => {
                    const categoryProducts = category.products || [];
                    if (categoryProducts.length === 0) return null;
                    
                    return (
                        <section 
                            key={category.id}
                            ref={el => categoryRefs.current[category.id] = el}
                            style={styles.categorySection}
                        >
                            <h2 style={styles.categoryTitle}>{category.name}</h2>
                            <div style={styles.productsGrid}>
                                {categoryProducts.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onClick={() => handleProductClick(product)}
                                        onQuickAdd={(e) => handleQuickAdd(e, product)}
                                        apiUrl={apiUrl}
                                    />
                                ))}
                            </div>
                        </section>
                    );
                })}
                
                {(!categories || categories.length === 0) && (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyIcon}>🍽️</p>
                        <p style={styles.emptyText}>Đang tải thực đơn...</p>
                    </div>
                )}
            </main>

            <CartDisplay isOpen={isCartOpen} setIsOpen={setIsCartOpen} />

            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}

            <style jsx global>{`
                @media (max-width: 768px) {
                    .desktop-cart-btn { display: none !important; }
                }
                /* Scrollbar đẹp hơn cho Webkit */
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #f1f1f1; }
                ::-webkit-scrollbar-thumb { background: #FF6600; border-radius: 10px; }
            `}</style>
        </div>
    );
}

export async function getServerSideProps() {
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    try {
        const res = await fetch(`${backendUrl}/menu`);
        if (!res.ok) throw new Error(`Lỗi: ${res.status}`);
        const menuData = await res.json();
        return { props: { menuData: menuData || [], error: null } };
    } catch (err) {
        return { props: { menuData: [], error: "Không thể kết nối Backend" } };
    }
}

function ProductCard({ product, onClick, onQuickAdd, apiUrl }) {
    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return `${apiUrl}${url}`;
        return url;
    };
    const isEmoji = (url) => url && !url.startsWith('http') && !url.startsWith('/') && url.length < 10;

    return (
        <div 
            style={{
                ...styles.productCard,
                ...(product.is_out_of_stock ? styles.productCardDisabled : {})
            }}
            onClick={onClick}
        >
            <div style={styles.productImageContainer}>
                {product.image_url ? (
                    isEmoji(product.image_url) ? (
                        <div style={styles.productEmoji}>{product.image_url}</div>
                    ) : (
                        <img src={getImageUrl(product.image_url)} alt={product.name} style={styles.productImage} loading="lazy" />
                    )
                ) : (
                    <div style={styles.productImagePlaceholder}>☕</div>
                )}
                {product.is_best_seller && !product.is_out_of_stock && <div style={styles.bestSellerBadge}>⭐ Bán chạy</div>}
                {product.is_out_of_stock && <div style={styles.outOfStockOverlay}>Hết hàng</div>}
            </div>
            <div style={styles.productInfo}>
                <h3 style={styles.productName}>{product.name}</h3>
                <p style={styles.productDescription}>{product.description}</p>
                <div style={styles.productFooter}>
                    <span style={styles.productPrice}>{product.base_price.toLocaleString('vi-VN')}đ</span>
                    {!product.is_out_of_stock && (
                        <button style={styles.addButton} onClick={onQuickAdd}>+</button>
                    )}
                </div>
            </div>
        </div>
    );
}

// === STYLES MỚI (MÀU CAM) ===
const styles = {
    container: { minHeight: '100vh', backgroundColor: '#fff', paddingBottom: '100px', fontFamily: "'Segoe UI', Roboto, sans-serif" }, // Nền trắng sáng hơn
    errorContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    errorText: { color: '#dc3545', fontSize: '1.1rem', marginBottom: '20px' },
    
    header: { position: 'sticky', top: 0, backgroundColor: '#FF6600', borderBottom: 'none', zIndex: 100, boxShadow: '0 2px 8px rgba(255, 102, 0, 0.2)' }, // Header Cam
    headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '12px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' },
    
    logoSection: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' },
    logo: { fontSize: '1.8rem', fontWeight: '900', color: 'white', margin: 0, whiteSpace: 'nowrap', letterSpacing: '1px' }, // Logo Trắng trên nền Cam
    
    deliveryInfo: { display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '0.85rem' }, // Nền mờ
    deliveryIcon: { fontSize: '0.9rem' },
    deliveryText: { color: 'white', fontWeight: '600', whiteSpace: 'nowrap' }, // Chữ trắng
    
    cartButton: { 
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', 
        backgroundColor: 'white', color: '#FF6600', borderRadius: '20px', // Nút Trắng chữ Cam
        fontWeight: '700', fontSize: '0.9rem', marginLeft: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    cartIcon: { fontSize: '1.1rem' },
    cartCount: { backgroundColor: '#FF6600', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700' },
    cartTotal: { fontSize: '0.9rem' },

    categoryNav: { position: 'sticky', top: '60px', backgroundColor: 'white', borderBottom: '1px solid #eee', zIndex: 99 },
    categoryScrollContainer: { display: 'flex', gap: '10px', padding: '15px 15px', overflowX: 'auto', scrollBehavior: 'smooth', scrollbarWidth: 'none' },
    categoryTab: { padding: '8px 18px', backgroundColor: '#f5f5f5', border: 'none', borderRadius: '25px', fontSize: '0.95rem', fontWeight: '600', color: '#666', whiteSpace: 'nowrap', transition: 'all 0.2s' },
    categoryTabActive: { backgroundColor: '#FF6600', color: 'white', fontWeight: '700', boxShadow: '0 2px 6px rgba(255, 102, 0, 0.3)' }, // Tab Active màu Cam
    
    main: { maxWidth: '1200px', margin: '0 auto', padding: '20px 15px' },
    categorySection: { marginBottom: '35px' },
    categoryTitle: { fontSize: '1.4rem', fontWeight: '800', color: '#333', marginBottom: '15px', borderLeft: '4px solid #FF6600', paddingLeft: '10px' }, // Tiêu đề có gạch cam
    
    productsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' },
    
    productCard: { backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', paddingBottom: '10px', border: '1px solid #f0f0f0' },
    productCardDisabled: { opacity: 0.6, cursor: 'not-allowed' },
    productImageContainer: { width: '100%', paddingTop: '100%', position: 'relative', backgroundColor: '#fff5ec' }, // Nền ảnh màu cam nhạt
    productImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
    productEmoji: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '4rem' },
    productImagePlaceholder: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '3rem', opacity: 0.3 },
    bestSellerBadge: { position: 'absolute', top: '10px', left: '10px', backgroundColor: '#FF4500', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
    outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6600', fontSize: '1.2rem', fontWeight: '700' },
    
    productInfo: { padding: '12px' },
    productName: { fontSize: '1rem', fontWeight: '700', color: '#333', margin: '0 0 6px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    productDescription: { fontSize: '0.85rem', color: '#888', margin: '0 0 10px 0', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    
    productFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    productPrice: { fontSize: '1.1rem', fontWeight: '800', color: '#FF6600' }, // Giá màu Cam
    addButton: { width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#FF6600', color: 'white', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 3px 6px rgba(255, 102, 0, 0.3)' }, // Nút + màu Cam

    emptyState: { textAlign: 'center', padding: '60px 20px', color: '#999' },
    emptyIcon: { fontSize: '4rem', marginBottom: '15px' },
    emptyText: { fontSize: '1.1rem' }
};