// Tệp: pages/index.js (Giao diện GrabFood + Server Side Rendering)

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useCart } from '../context/CartContext'; // Đảm bảo bạn đã có file này
import ProductModal from '../components/ProductModal'; // Đảm bảo bạn đã có file này

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function HomePage({ menuData, error }) {
    // ============ STATE MANAGEMENT ============
    const { addToCart, itemCount, totalPrice } = useCart();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    
    // Refs cho smooth scroll
    const categoryRefs = useRef({});

    // ============ XỬ LÝ DỮ LIỆU TỪ SERVER (SSR) ============
    useEffect(() => {
        if (menuData && menuData.length > 0) {
            // 1. Set Categories
            setCategories(menuData);
            
            // 2. Làm phẳng Products (Flatten) để dễ xử lý
            const allProducts = menuData.flatMap(cat => 
                (cat.products || []).map(prod => ({
                    ...prod,
                    category_id: cat.id,
                    category_name: cat.name
                }))
            );
            setProducts(allProducts);

            // 3. Chọn category đầu tiên mặc định
            setSelectedCategory(menuData[0].id);
        }
    }, [menuData]);

    // ============ HANDLERS ============
    const handleCategoryClick = (categoryId) => {
        setSelectedCategory(categoryId);
        // Smooth scroll đến section
        if (categoryRefs.current[categoryId]) {
            const element = categoryRefs.current[categoryId];
            const yOffset = -120; // Offset cho sticky header
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
        
        // Nếu có options, mở modal
        if (product.options && product.options.length > 0) {
            setSelectedProduct(product);
        } else {
            // Thêm trực tiếp vào giỏ
            addToCart({
                product_id: product.id,
                quantity: 1,
                options: []
            }, {
                name: product.name,
                itemPrice: product.base_price,
                optionsText: ''
            });
        }
    };

    // ============ RENDER ERROR ============
    if (error) {
        return (
            <div style={styles.errorContainer}>
                <Head><title>Lỗi tải Menu</title></Head>
                <p style={styles.errorText}>❌ {error}</p>
                <p>Hãy kiểm tra Backend đang chạy tại: {apiUrl}</p>
            </div>
        );
    }

    // ============ RENDER MAIN UI ============
    return (
        <div style={styles.container}>
            <Head>
                <title>Ngon-Ngon - Menu Đặt Món</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            {/* 1. STICKY HEADER */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.logoSection}>
                        <h1 style={styles.logo}>☕ Ngon-Ngon</h1>
                        <div style={styles.deliveryInfo}>
                            <span style={styles.deliveryIcon}>📍</span>
                            <span style={styles.deliveryText}>Giao đến bạn</span>
                        </div>
                    </div>
                    
                    {/* Giỏ hàng trên Desktop */}
                    {itemCount > 0 && (
                        <a href="/checkout" style={styles.cartButton}>
                            <span style={styles.cartIcon}>🛒</span>
                            <span style={styles.cartCount}>{itemCount}</span>
                            <span style={styles.cartTotal}>
                                {totalPrice.toLocaleString('vi-VN')}đ
                            </span>
                        </a>
                    )}
                </div>
            </header>

            {/* 2. CATEGORY TABS (Cuộn ngang) */}
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

            {/* 3. DANH SÁCH SẢN PHẨM */}
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
                
                {/* Empty state */}
                {(!categories || categories.length === 0) && (
                    <div style={styles.emptyState}>
                        <p style={styles.emptyIcon}>🍽️</p>
                        <p style={styles.emptyText}>Đang tải thực đơn...</p>
                    </div>
                )}
            </main>

            {/* 4. FLOATING CART BUTTON (Mobile only) */}
            {itemCount > 0 && (
                <a href="/checkout" style={styles.floatingCartButton}>
                    <div style={styles.floatingCartContent}>
                        <span style={styles.floatingCartCount}>{itemCount}</span>
                        <span style={styles.floatingCartText}>Xem giỏ hàng</span>
                        <span style={styles.floatingCartPrice}>
                            {totalPrice.toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                </a>
            )}

            {/* 5. PRODUCT MODAL */}
            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}
        </div>
    );
}

// ============ DATA FETCHING (SSR) ============
export async function getServerSideProps() {
    // Dùng biến môi trường nội bộ Docker nếu có, không thì dùng public
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    
    try {
        // Gọi endpoint /menu (Đã fix lỗi 404)
        const res = await fetch(`${backendUrl}/menu`);
        
        if (!res.ok) {
            throw new Error(`Backend trả về lỗi: ${res.status}`);
        }
        
        const menuData = await res.json();
        return { 
            props: { 
                menuData: menuData || [], 
                error: null 
            } 
        };
    } catch (err) {
        console.error("Lỗi SSR:", err);
        return { 
            props: { 
                menuData: [], 
                error: "Không thể kết nối đến Backend. Hãy kiểm tra lại!" 
            } 
        };
    }
}

// ============ SUB-COMPONENTS & STYLES ============
// Component thẻ sản phẩm
function ProductCard({ product, onClick, onQuickAdd, apiUrl }) {
    const getImageUrl = (url) => {
        if (!url) return null;
        // Logic xử lý ảnh: Link tuyệt đối giữ nguyên, link tương đối nối thêm API URL
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return `${apiUrl}${url}`;
        return url; // Trường hợp là Emoji
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
                        <img 
                            src={getImageUrl(product.image_url)} 
                            alt={product.name}
                            style={styles.productImage}
                            loading="lazy"
                        />
                    )
                ) : (
                    <div style={styles.productImagePlaceholder}>☕</div>
                )}
                
                {product.is_best_seller && !product.is_out_of_stock && (
                    <div style={styles.bestSellerBadge}>⭐ Bán chạy</div>
                )}
                
                {product.is_out_of_stock && (
                    <div style={styles.outOfStockOverlay}>Hết hàng</div>
                )}
            </div>

            <div style={styles.productInfo}>
                <h3 style={styles.productName}>{product.name}</h3>
                <p style={styles.productDescription}>{product.description}</p>
                
                <div style={styles.productFooter}>
                    <span style={styles.productPrice}>
                        {product.base_price.toLocaleString('vi-VN')}đ
                    </span>
                    
                    {!product.is_out_of_stock && (
                        <button style={styles.addButton} onClick={onQuickAdd}>+</button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Styles (Copy từ menu.js)
const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '100px' },
    errorContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    errorText: { color: '#dc3545', fontSize: '1.1rem', marginBottom: '20px' },
    header: { position: 'sticky', top: 0, backgroundColor: 'white', borderBottom: '1px solid #e0e0e0', zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logoSection: { display: 'flex', alignItems: 'center', gap: '15px' },
    logo: { fontSize: '1.5rem', fontWeight: '700', color: '#00b14f', margin: 0 },
    deliveryInfo: { display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', backgroundColor: '#f8f8f8', borderRadius: '20px' },
    deliveryIcon: { fontSize: '0.9rem' },
    deliveryText: { fontSize: '0.85rem', color: '#666', fontWeight: '500' },
    cartButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#00b14f', color: 'white', borderRadius: '20px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s' },
    cartIcon: { fontSize: '1.1rem' },
    cartCount: { backgroundColor: 'white', color: '#00b14f', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '700' },
    cartTotal: { fontSize: '0.95rem' },
    categoryNav: { position: 'sticky', top: '60px', backgroundColor: 'white', borderBottom: '1px solid #e0e0e0', zIndex: 99, overflow: 'hidden' },
    categoryScrollContainer: { display: 'flex', gap: '8px', padding: '12px 20px', overflowX: 'auto', maxWidth: '1200px', margin: '0 auto', scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' },
    categoryTab: { padding: '8px 20px', backgroundColor: 'transparent', border: 'none', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '500', color: '#666', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 },
    categoryTabActive: { backgroundColor: '#00b14f', color: 'white', fontWeight: '600' },
    main: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
    categorySection: { marginBottom: '40px' },
    categoryTitle: { fontSize: '1.3rem', fontWeight: '700', color: '#333', marginBottom: '20px', paddingLeft: '4px' },
    productsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
    productCard: { backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', position: 'relative' },
    productCardDisabled: { opacity: 0.6, cursor: 'not-allowed' },
    productImageContainer: { position: 'relative', width: '100%', paddingTop: '75%', backgroundColor: '#f8f8f8', overflow: 'hidden' },
    productImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' },
    productEmoji: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '5rem' },
    productImagePlaceholder: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '4rem', opacity: 0.3 },
    bestSellerBadge: { position: 'absolute', top: '8px', left: '8px', backgroundColor: '#ff6b35', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' },
    outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.1rem', fontWeight: '600' },
    productInfo: { padding: '12px' },
    productName: { fontSize: '1rem', fontWeight: '600', color: '#333', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
    productDescription: { fontSize: '0.85rem', color: '#666', margin: '0 0 12px 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' },
    productFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    productPrice: { fontSize: '1.05rem', fontWeight: '700', color: '#00b14f' },
    addButton: { width: '32px', height: '32px', borderRadius: '50%', border: 'none', backgroundColor: '#00b14f', color: 'white', fontSize: '1.5rem', fontWeight: '300', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,177,79,0.3)' },
    floatingCartButton: { position: 'fixed', bottom: '20px', left: '20px', right: '20px', backgroundColor: '#00b14f', color: 'white', padding: '16px', borderRadius: '12px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,177,79,0.4)', zIndex: 98, display: 'none' }, // Cần media query từ CSS file
    floatingCartContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
    floatingCartCount: { backgroundColor: 'white', color: '#00b14f', padding: '4px 12px', borderRadius: '16px', fontSize: '0.9rem', fontWeight: '700' },
    floatingCartText: { flex: 1, fontSize: '1rem', fontWeight: '600' },
    floatingCartPrice: { fontSize: '1.05rem', fontWeight: '700' },
    emptyState: { textAlign: 'center', padding: '60px 20px', color: '#999' },
    emptyIcon: { fontSize: '4rem', marginBottom: '10px' },
    emptyText: { fontSize: '1.1rem' }
};