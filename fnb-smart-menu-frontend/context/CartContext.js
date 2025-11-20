// Tệp: context/CartContext.js (V5 - Real-time Group Order)
import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';

const CartContext = createContext();

// Helper: Tính tổng tiền
const updateCartState = (items) => {
  items = Array.isArray(items) ? items : [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item._display.itemPrice * item.quantity), 0);
  
  // Chỉ lưu local nếu KHÔNG phải đơn nhóm (đơn nhóm lưu trên RAM để đồng bộ realtime)
  if (typeof window !== 'undefined') {
      // Có thể lưu tạm để F5 không mất, nhưng ở đây ta giữ đơn giản
      localStorage.setItem('cart', JSON.stringify({ items, itemCount, totalPrice }));
  }
  return { items, itemCount, totalPrice };
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const newItem = action.payload;
      // ID bao gồm tên người đặt để tách riêng món của từng người
      const cartId = `${newItem.product_id}-${newItem.options.sort().join('-')}-${newItem.note}-${newItem.orderedBy}`;
      
      const existingItemIndex = state.items.findIndex(item => item.cartId === cartId);
      let newItems;
      if (existingItemIndex > -1) {
        newItems = state.items.map((item, index) => {
          if (index === existingItemIndex) {
            return { ...item, quantity: item.quantity + newItem.quantity };
          }
          return item;
        });
      } else {
        newItems = [...state.items, { ...newItem, cartId: cartId }];
      }
      return updateCartState(newItems);
    }
    case 'REMOVE_FROM_CART': {
      const newItems = state.items.filter(item => item.cartId !== action.payload);
      return updateCartState(newItems);
    }
    case 'UPDATE_QUANTITY': {
      const { cartId, quantity } = action.payload;
      const newItems = state.items.map(item => item.cartId === cartId ? { ...item, quantity } : item).filter(item => item.quantity > 0);
      return updateCartState(newItems);
    }
    case 'CLEAR_CART': {
      if (typeof window !== 'undefined') localStorage.removeItem('cart');
      return { items: [], itemCount: 0, totalPrice: 0 };
    }
    default: return state;
  }
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], itemCount: 0, totalPrice: 0 }, (initial) => {
      if (typeof window === 'undefined') return initial;
      try {
          const localData = localStorage.getItem('cart');
          return localData ? JSON.parse(localData) : initial;
      } catch { return initial; }
  });

  // --- LOGIC ĐƠN NHÓM REAL-TIME ---
  const [groupMode, setGroupMode] = useState(false);
  const [groupId, setGroupId] = useState(null);
  const [currentUser, setCurrentUser] = useState('Tôi');
  const groupWs = useRef(null);

  // 1. Tự động kiểm tra URL khi vào web (Ví dụ: ?group=123)
  useEffect(() => {
      if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const gId = params.get('group');
          if (gId) {
              setGroupId(gId);
              setGroupMode(true);
              // Hỏi tên nếu chưa có
              const savedName = localStorage.getItem('userName');
              if (savedName) {
                  setCurrentUser(savedName);
              } else {
                  // Tạm thời set default, component GroupOrderControl sẽ lo việc hỏi tên sau
                  setCurrentUser('Thành viên mới');
              }
          }
      }
  }, []);

  // 2. Kết nối WebSocket khi có Group ID
  useEffect(() => {
      if (groupMode && groupId) {
          const wsProtocol = process.env.NEXT_PUBLIC_API_URL.startsWith('https') ? 'wss' : 'ws';
          const wsHost = process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, '');
          const wsUrl = `${wsProtocol}://${wsHost}/ws/group/${groupId}`;

          console.log("🔌 Connecting to Group WS:", wsUrl);
          groupWs.current = new WebSocket(wsUrl);

          groupWs.current.onopen = () => console.log("✅ Connected to Group Order!");
          
          groupWs.current.onmessage = (event) => {
              const data = JSON.parse(event.data);
              console.log("📩 Received:", data);

              if (data.type === 'UPDATE_CART') {
                  if (data.action === 'ADD') {
                      // Nhận món từ người khác -> Thêm vào giỏ mình
                      dispatch({ type: 'ADD_TO_CART', payload: data.item });
                  }
                  // (Có thể mở rộng thêm action REMOVE hoặc UPDATE sau này)
              }
          };

          return () => {
              if (groupWs.current) groupWs.current.close();
          };
      }
  }, [groupMode, groupId]);


  // 3. Hàm thêm vào giỏ (Có gửi tín hiệu đi)
  const addToCart = (itemPayload) => {
    const itemWithUser = { ...itemPayload, orderedBy: currentUser };
    
    // A. Thêm vào giỏ hàng của mình trước
    dispatch({ type: 'ADD_TO_CART', payload: itemWithUser });

    // B. Nếu đang trong nhóm -> Gửi tín hiệu cho người khác
    if (groupMode && groupWs.current && groupWs.current.readyState === WebSocket.OPEN) {
        const message = {
            type: 'UPDATE_CART',
            action: 'ADD',
            item: itemWithUser,
            user: currentUser
        };
        groupWs.current.send(JSON.stringify(message));
    }
  };
  
  const removeFromCart = (id) => dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  const updateQuantity = (id, qty) => dispatch({ type: 'UPDATE_QUANTITY', payload: { cartId: id, quantity: qty } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const value = {
    cartItems: state.items,
    itemCount: state.itemCount,
    totalPrice: state.totalPrice,
    addToCart, removeFromCart, updateQuantity, clearCart,
    // Export biến Group
    groupMode, setGroupMode,
    groupId, setGroupId,
    currentUser, setCurrentUser
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { return useContext(CartContext); }