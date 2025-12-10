// Tệp: fnb-smart-menu-frontend/pages/index.js
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useCart } from '../context/CartContext';
import ProductModal from '../components/ProductModal';
import CartDisplay from '../components/CartDisplay';
import GroupOrderControl from '../components/GroupOrderControl';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const PRIMARY_COLOR = '#FF6600'; 

export default function HomePage({ menuData, error }) {
    const { itemCount, totalPrice } = useCart();
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    const categoryRefs = useRef({});

    useEffect(() => {
        if (menuData && menuData.length > 0) {
            setCategories(menuData);
            setSelectedCategory(menuData[0].id);
        }
    }, [menuData]);

    const handleCategoryClick = (categoryId) => {
        setSelectedCategory(categoryId);
        if (categoryRefs.current[categoryId]) {
            const yOffset = -110;
            const element = categoryRefs.current[categoryId];
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    if (error) return <div style={styles.centerError}><h3>⚠️ {error}</h3></div>;

    return (
        <div style={styles.container}>
            <Head>
                <title>Ngon-Ngon - Đặt món</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            </Head>

            {/* --- HEADER ĐƯỢC CHỈNH SỬA --- */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.headerTop}>
                        <h1 style={styles.storeName}>Ngon-Ngon Coffee & Tea</h1>
                        {/* Badge thông tin liên hệ nền trong suốt */}
                        <div style={styles.contactBadge}>
                            📍 Giao hàng tận công ty - ĐT/Zalo: 0378.148.148
                        </div>
                    </div>
                </div>
            </header>

            <nav style={styles.stickyNav}>
                <div style={styles.navScroll}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategoryClick(cat.id)}
                            className={selectedCategory === cat.id ? 'nav-tab active' : 'nav-tab'}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </nav>

            <div style={{padding: '0 15px', maxWidth: '1200px', margin: '0 auto'}}>
                <GroupOrderControl />
            </div>

            <main style={styles.main}>
                {categories.map((category, index) => {
                    if (!category.products?.length) return null;
                    const isHighlight = index === 0;

                    return (
                        <section key={category.id} ref={el => categoryRefs.current[category.id] = el} style={styles.section}>
                            {/* Tiêu đề danh mục có border cam bên trái giống hình */}
                            <div style={styles.categoryHeader}>
                                <div style={styles.orangeBar}></div>
                                <h3 style={styles.categoryTitle}>{category.name}</h3>
                            </div>
                            
                            <div className={isHighlight ? "highlight-container" : "list-container"}>
                                {isHighlight ? (
                                    <>
                                        {category.products.map(product => (
                                            <ProductCardHighlight 
                                                key={product.id} 
                                                product={product} 
                                                onClick={() => !product.is_out_of_stock && setSelectedProduct(product)}
                                            />
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {category.products.map(product => (
                                            <ProductCardList 
                                                key={product.id} 
                                                product={product} 
                                                onClick={() => !product.is_out_of_stock && setSelectedProduct(product)}
                                            />
                                        ))}
                                    </>
                                )}
                            </div>
                        </section>
                    );
                })}
            </main>

            {isMounted && itemCount > 0 && (
                <div style={styles.floatingCartBar} onClick={() => setIsCartOpen(true)}>
                    <div style={styles.cartInfo}>
                        <div style={styles.cartIconCircle}>{itemCount}</div>
                        <span style={styles.cartText}>Giỏ hàng • {itemCount} món</span>
                    </div>
                    <span style={styles.cartPrice}>{totalPrice.toLocaleString('vi-VN')}đ</span>
                </div>
            )}

            <CartDisplay isOpen={isCartOpen} setIsOpen={setIsCartOpen} />

            {selectedProduct && (
                <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
            )}

            <style jsx global>{`
                body { margin: 0; background-color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                
                /* Nút điều hướng */
                .nav-tab {
                    border: none; background: #f5f5f5; padding: 8px 18px; margin-right: 10px;
                    border-radius: 20px; font-size: 0.9rem; color: #666; font-weight: 500;
                    white-space: nowrap; transition: all 0.2s; cursor: pointer;
                }
                /* Nút đang kích hoạt: Nền Cam, Chữ Trắng */
                .nav-tab.active {
                    background-color: ${PRIMARY_COLOR}; 
                    color: white; 
                    font-weight: 700;
                    box-shadow: 0 2px 5px rgba(255, 102, 0, 0.4);
                }
                
                ::-webkit-scrollbar { width: 0px; background: transparent; }

                /* --- CSS RESPONSIVE & DESKTOP GRID --- */
                .highlight-container {
                    display: flex;
                    overflow-x: auto;
                    gap: 15px;
                    padding-bottom: 10px;
                }
                .list-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                @media (min-width: 1024px) {
                    .highlight-container, .list-container {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 20px !important;
                        overflow-x: visible !important;
                        flex-direction: row !important;
                    }

                    .product-card-list {
                        border: 1px solid #eee !important;
                        border-radius: 8px !important;
                        padding: 15px !important;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        transition: transform 0.2s;
                        background: white;
                    }
                    .product-card-list:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        border-color: ${PRIMARY_COLOR} !important;
                    }
                    
                    .product-card-highlight {
                        display: flex !important;
                        flex-direction: row !important;
                        width: 100% !important;
                        min-width: auto !important;
                        border: 1px solid #eee;
                        border-radius: 8px;
                        padding: 15px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    }
                    .product-card-highlight .highlight-img-box {
                        width: 110px !important;
                        height: 110px !important;
                        margin-right: 15px;
                    }
                    .product-card-highlight .highlight-info {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        margin-top: 0 !important;
                    }
                    .product-card-highlight .highlight-name {
                        height: auto !important;
                        -webkit-line-clamp: 2;
                    }
                    .highlight-add-btn {
                        width: 30px !important;
                        height: 30px !important;
                        font-size: 1.5rem !important;
                    }
                }
            `}</style>
        </div>
    );
}

export async function getServerSideProps() {
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    try {
        const res = await fetch(`${backendUrl}/menu`);
        const menuData = await res.json();
        return { props: { menuData: menuData || [], error: null } };
    } catch (err) {
        return { props: { menuData: [], error: "Lỗi kết nối" } };
    }
}

// --- SUB COMPONENTS ---

function ProductCardHighlight({ product, onClick }) {
    const getImageUrl = (url) => (url && url.startsWith('/')) ? `${process.env.NEXT_PUBLIC_API_URL}${url}` : url;
    return (
        <div onClick={onClick} style={styles.cardHighlight} className="product-card-highlight">
            <div style={styles.imgHighlightBox} className="highlight-img-box">
                {product.image_url ? (
                    <img src={getImageUrl(product.image_url)} style={styles.imgHighlight} />
                ) : <div style={styles.placeholder}>🥘</div>}
                {product.is_out_of_stock && <div style={styles.overlay}>Hết</div>}
                {/* Badge Bán chạy nếu cần */}
                <div style={{position:'absolute', top:'5px', left:'5px', background: PRIMARY_COLOR, color:'white', fontSize:'0.7rem', padding:'2px 6px', borderRadius:'4px', fontWeight:'bold'}}>🔥 Bán chạy</div>
            </div>
            <div style={styles.infoHighlight} className="highlight-info">
                <h4 style={styles.nameHighlight} className="highlight-name">{product.name}</h4>
                <div style={styles.priceRow}>
                    <span style={styles.price}>{product.base_price.toLocaleString()}đ</span>
                    <button style={styles.addBtnSmall} className="highlight-add-btn">+</button>
                </div>
            </div>
        </div>
    );
}

function ProductCardList({ product, onClick }) {
    const getImageUrl = (url) => (url && url.startsWith('/')) ? `${process.env.NEXT_PUBLIC_API_URL}${url}` : url;
    return (
        <div onClick={onClick} style={styles.cardList} className="product-card-list">
            <div style={styles.imgListBox}>
                {product.image_url ? (
                    <img src={getImageUrl(product.image_url)} style={styles.imgList} />
                ) : <div style={styles.placeholder}>☕</div>}
                {product.is_out_of_stock && <div style={styles.overlay}>Hết</div>}
            </div>
            <div style={styles.infoList}>
                <h4 style={styles.nameList}>{product.name}</h4>
                <p style={styles.descList}>{product.description}</p>
                <div style={styles.footerList}>
                    <span style={styles.price}>{product.base_price.toLocaleString()}đ</span>
                    {!product.is_out_of_stock && <div style={styles.addBtnBig}>+</div>}
                </div>
            </div>
        </div>
    );
}

// --- STYLES ---
const styles = {
    container: { paddingBottom: '80px', backgroundColor: '#fff' },
    centerError: { minHeight:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'red' },
    
    // HEADER STYLE MỚI (Màu cam)
    header: { padding: '15px 0 20px 0', backgroundColor: PRIMARY_COLOR },
    headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '0 15px' },
    headerTop: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '15px', flexWrap: 'wrap' },
    
    storeName: { fontSize: '1.6rem', fontWeight: '800', margin: 0, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.1)' },
    
    // Badge liên hệ (Nền trong suốt)
    contactBadge: { 
        backgroundColor: 'rgba(255, 255, 255, 0.2)', 
        padding: '6px 15px', 
        borderRadius: '20px', 
        fontSize: '0.9rem', 
        color: 'white', 
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: '500',
        backdropFilter: 'blur(5px)' // Hiệu ứng mờ nền nếu trình duyệt hỗ trợ
    },

    stickyNav: { position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 90, padding: '12px 0', borderBottom: '1px solid #f0f0f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    navScroll: { display: 'flex', overflowX: 'auto', padding: '0 15px', maxWidth: '1200px', margin: '0 auto' },
    main: { padding: '20px 15px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
    
    section: { marginBottom: '35px', scrollMarginTop: '130px' },
    
    // Tiêu đề danh mục có vạch cam
    categoryHeader: { display: 'flex', alignItems: 'center', marginBottom: '15px' },
    orangeBar: { width: '4px', height: '20px', backgroundColor: PRIMARY_COLOR, marginRight: '8px', borderRadius: '2px' },
    categoryTitle: { fontSize: '1.3rem', fontWeight: '800', color: '#333', margin: 0 },
    
    // Highlight (Mobile)
    cardHighlight: { minWidth: '150px', width: '150px', display: 'flex', flexDirection: 'column' },
    imgHighlightBox: { width: '100%', height: '150px', borderRadius: '12px', overflow: 'hidden', position: 'relative', backgroundColor: '#f0f0f0' },
    imgHighlight: { width: '100%', height: '100%', objectFit: 'cover' },
    infoHighlight: { marginTop: '10px' },
    nameHighlight: { fontSize: '0.95rem', fontWeight: '700', margin: '0 0 4px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 'auto', color: '#333' },
    priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' },
    addBtnSmall: { width: '28px', height: '28px', borderRadius: '50%', background: PRIMARY_COLOR, color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    
    // List (Mobile)
    cardList: { display: 'flex', gap: '15px', borderBottom: '1px solid #f9f9f9', paddingBottom: '15px' },
    imgListBox: { width: '110px', height: '110px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, position: 'relative', backgroundColor: '#f0f0f0' },
    imgList: { width: '100%', height: '100%', objectFit: 'cover' },
    placeholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' },
    overlay: { position: 'absolute', top:0, left:0, right:0, bottom:0, background:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'#888' },
    infoList: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
    nameList: { fontSize: '1rem', fontWeight: '700', margin: '0 0 4px 0', color: '#333' },
    descList: { fontSize: '0.85rem', color: '#888', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
    footerList: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
    price: { fontSize: '1.05rem', fontWeight: '700', color: '#333' }, // Màu cam cho giá
    addBtnBig: { width: '32px', height: '32px', borderRadius: '50%', background: PRIMARY_COLOR, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', cursor: 'pointer' },
    
    // Cart
    floatingCartBar: { position: 'fixed', bottom: '15px', left: '15px', right: '15px', maxWidth:'400px', margin:'0 auto', backgroundColor: PRIMARY_COLOR, color: 'white', borderRadius: '12px', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', zIndex: 999, cursor: 'pointer' },
    cartInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
    cartIconCircle: { backgroundColor: 'rgba(0,0,0,0.2)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold' },
    cartText: { fontWeight: '600', fontSize: '1rem' },
    cartPrice: { fontWeight: '800', fontSize: '1.1rem' }
};