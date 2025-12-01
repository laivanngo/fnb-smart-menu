// Tệp: fnb-smart-menu-frontend/components/CartDisplay.js
import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/router';

export default function CartDisplay({ isOpen, setIsOpen }) {
  const { cartItems, itemCount, totalPrice, removeFromCart, updateQuantity, groupMode } = useCart();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);
  
  // Quan trọng: Nếu chưa mở thì return null để không vẽ gì cả (tránh lỗi xung đột)
  if (!hasMounted || !isOpen) return null;

  const handleCheckout = () => { setIsOpen(false); router.push('/checkout'); };

  const groupedItems = cartItems.reduce((acc, item) => {
    const user = item.orderedBy || 'Bạn';
    if (!acc[user]) acc[user] = [];
    acc[user].push(item);
    return acc;
  }, {});

  return (
    <div style={styles.backdrop} onClick={() => setIsOpen(false)}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Giỏ hàng của bạn <span style={{color:'#FF6600'}}>({itemCount} món)</span></h3>
          <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>&times;</button>
        </div>
        
        <div style={styles.list}>
          {cartItems.length === 0 ? (
            <div style={styles.empty}>
                <div style={{fontSize: '4rem', marginBottom:'10px'}}>🛒</div>
                <p>Chưa có món nào. Hãy chọn món nhé!</p>
            </div>
          ) : (
            Object.keys(groupedItems).map(user => (
              <div key={user} style={styles.userGroup}>
                {groupMode && (
                  <div style={styles.userHeader}>
                      <span style={styles.userAvatar}>{user.charAt(0).toUpperCase()}</span>
                      <span style={styles.userName}>{user}</span>
                  </div>
                )}
                
                {groupedItems[user].map(item => (
                  <div key={item.cartId} style={styles.item}>
                    <div style={styles.itemInfo}>
                      <strong style={styles.itemName}>{item._display?.name}</strong>
                      <div style={styles.itemOptions}>{item._display?.optionsText}</div>
                      {item.note && <div style={styles.itemNote}>Note: {item.note}</div>}
                    </div>
                    <div style={styles.itemControls}>
                      <div style={styles.qtyControl}>
                        <button style={styles.qtyBtn} onClick={() => updateQuantity(item.cartId, item.quantity - 1)}>-</button>
                        <span style={styles.qtyVal}>{item.quantity}</span>
                        <button style={styles.qtyBtn} onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>+</button>
                      </div>
                      <div style={styles.itemPrice}>
                        {(item._display?.itemPrice * item.quantity).toLocaleString('vi-VN')}đ
                      </div>
                      <button onClick={() => removeFromCart(item.cartId)} style={styles.removeBtn}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
        
        {cartItems.length > 0 && (
            <div style={styles.footer}>
                <div style={styles.totalRow}>
                    <span>Tạm tính:</span>
                    <span style={{fontWeight:'bold'}}>{totalPrice.toLocaleString('vi-VN')}đ</span>
                </div>
                <button style={styles.checkoutBtn} onClick={handleCheckout}>Thanh toán</button>
            </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s' },
  modal: { backgroundColor: 'white', width: '100%', maxWidth: '500px', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' },
  header: { padding: '15px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
  title: { margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#333' },
  closeBtn: { border: 'none', background: '#f5f5f5', width:'30px', height:'30px', borderRadius:'50%', fontSize: '1.5rem', cursor: 'pointer', color: '#666', display:'flex', alignItems:'center', justifyContent:'center', paddingBottom:'4px' },
  list: { padding: '0', overflowY: 'auto', flex: 1, backgroundColor: '#f9f9f9' },
  empty: { textAlign: 'center', color: '#999', padding: '60px 20px' },
  userGroup: { backgroundColor: 'white', marginBottom: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  userHeader: { padding: '10px 20px', backgroundColor: '#fff5ec', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #ffefe0' },
  userAvatar: { width: '24px', height: '24px', backgroundColor: '#FF6600', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' },
  userName: { fontWeight: '700', color: '#333', fontSize: '0.9rem' },
  item: { padding: '15px 20px', borderBottom: '1px solid #f0f0f0' },
  itemInfo: { marginBottom: '10px' },
  itemName: { display: 'block', fontSize: '1rem', marginBottom: '4px', fontWeight: '600', color: '#333' },
  itemOptions: { fontSize: '0.85rem', color: '#666' },
  itemNote: { fontSize: '0.8rem', color: '#888', fontStyle: 'italic', marginTop: '2px' },
  itemControls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop:'5px' },
  qtyControl: { display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff', overflow:'hidden' },
  qtyBtn: { width: '28px', height: '28px', border: 'none', background: '#fff', color: '#FF6600', fontWeight: 'bold', fontSize:'1.1rem', cursor: 'pointer' },
  qtyVal: { minWidth: '24px', textAlign: 'center', fontSize: '0.9rem', fontWeight:'600' },
  itemPrice: { fontWeight: '700', color: '#333', fontSize: '1rem' },
  removeBtn: { border: 'none', background: 'none', color: '#dc3545', fontSize: '1.2rem', cursor: 'pointer', padding:'0 10px' },
  footer: { padding: '20px', borderTop: '1px solid #eee', backgroundColor: '#fff', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' },
  totalRow: { display:'flex', justifyContent:'space-between', marginBottom:'15px', fontSize:'1.1rem' },
  checkoutBtn: { width: '100%', padding: '15px', background: 'linear-gradient(to right, #FF6600, #FF8800)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 102, 0, 0.3)' }
};