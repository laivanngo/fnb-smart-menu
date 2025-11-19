// Tệp: components/CartDisplay.js (Theme màu Cam)
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/router';

export default function CartDisplay({ isOpen, setIsOpen }) {
  const { cartItems, itemCount, totalPrice, removeFromCart, updateQuantity } = useCart();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  const handleCheckout = () => {
    setIsOpen(false);
    router.push('/checkout');
  };

  if (isOpen) {
    return (
      <div style={styles.backdrop} onClick={() => setIsOpen(false)}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h3 style={styles.title}>Giỏ hàng ({itemCount})</h3>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>&times;</button>
          </div>
          
          <div style={styles.list}>
            {cartItems.length === 0 ? (
              <p style={styles.empty}>Giỏ hàng trống</p>
            ) : (
              cartItems.map(item => (
                <div key={item.cartId} style={styles.item}>
                  <div style={styles.itemInfo}>
                    <strong style={styles.itemName}>{item._display.name}</strong>
                    <div style={styles.itemOptions}>{item._display.optionsText}</div>
                    {item.note && <div style={styles.itemNote}>Ghi chú: {item.note}</div>}
                  </div>
                  <div style={styles.itemControls}>
                    <div style={styles.qtyControl}>
                      <button style={styles.qtyBtn} onClick={() => updateQuantity(item.cartId, item.quantity - 1)}>-</button>
                      <span style={styles.qtyVal}>{item.quantity}</span>
                      <button style={styles.qtyBtn} onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>+</button>
                    </div>
                    <div style={styles.itemPrice}>
                      {(item._display.itemPrice * item.quantity).toLocaleString('vi-VN')}đ
                    </div>
                    <button onClick={() => removeFromCart(item.cartId)} style={styles.removeBtn}>Xóa</button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div style={styles.footer}>
            <div style={styles.total}>
              Tổng cộng: <span style={{color: '#FF6600'}}>{totalPrice.toLocaleString('vi-VN')}đ</span>
            </div>
            <button style={styles.checkoutBtn} onClick={handleCheckout}>
              Thanh toán ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (itemCount === 0) return null;
  
  return (
    <>
      <div 
        className="floating-cart-bar" 
        style={styles.fab} 
        onClick={() => setIsOpen(true)}
      >
        <span style={styles.fabIcon}>🛒</span>
        <span style={styles.fabCount}>{itemCount}</span>
        <span style={styles.fabTotal}>{totalPrice.toLocaleString('vi-VN')}đ</span>
      </div>

      <style jsx global>{`
        @media (min-width: 769px) {
          .floating-cart-bar {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

// STYLES
const styles = {
  fab: {
    position: 'fixed', bottom: '20px', left: '20px', right: '20px',
    backgroundColor: '#FF6600', color: 'white', borderRadius: '16px', // Màu Cam
    padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 6px 15px rgba(255, 102, 0, 0.4)', cursor: 'pointer', zIndex: 999,
    fontWeight: '800', fontSize: '1.1rem'
  },
  fabIcon: { fontSize: '1.3rem' },
  fabCount: { 
    backgroundColor: 'white', color: '#FF6600', padding: '2px 10px', 
    borderRadius: '12px', fontSize: '0.9rem', marginLeft: '10px', fontWeight: '800'
  },
  fabTotal: { flex: 1, textAlign: 'right' },

  backdrop: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
  },
  modal: {
    backgroundColor: 'white', width: '100%', maxWidth: '500px',
    borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    animation: 'slideUp 0.3s ease-out'
  },
  header: {
    padding: '15px 20px', borderBottom: '1px solid #eee',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  title: { margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#333' },
  closeBtn: { border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' },
  
  list: { padding: '20px', overflowY: 'auto', flex: 1 },
  empty: { textAlign: 'center', color: '#999', padding: '30px' },
  
  item: { marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f5f5f5' },
  itemInfo: { marginBottom: '8px' },
  itemName: { display: 'block', fontSize: '1rem', marginBottom: '4px', fontWeight: '600' },
  itemOptions: { fontSize: '0.85rem', color: '#666' },
  itemNote: { fontSize: '0.85rem', color: '#888', fontStyle: 'italic' },
  
  itemControls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  qtyControl: { display: 'flex', alignItems: 'center', border: '1px solid #eee', borderRadius: '6px', backgroundColor: '#f9f9f9' },
  qtyBtn: { width: '28px', height: '28px', border: 'none', background: 'none', color: '#FF6600', fontWeight: 'bold', cursor: 'pointer' },
  qtyVal: { minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' },
  itemPrice: { fontWeight: 'bold', color: '#FF6600' },
  removeBtn: { border: 'none', background: 'none', color: '#dc3545', fontSize: '0.85rem', cursor: 'pointer' },

  footer: { padding: '20px', borderTop: '1px solid #eee', backgroundColor: '#fff' },
  total: { fontSize: '1.2rem', fontWeight: '800', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', color: '#333' },
  checkoutBtn: {
    width: '100%', padding: '15px', backgroundColor: '#FF6600', color: 'white', // Màu Cam
    border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(255, 102, 0, 0.3)'
  }
};