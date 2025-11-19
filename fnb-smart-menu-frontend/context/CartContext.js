// Tệp: context/CartContext.js (ĐÃ GIA CỐ BẢO VỆ)

import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

// --- BỘ NÃO CỦA GIỎ HÀNG (REDUCER) ---
// Thêm kiểm tra Array để ngăn lỗi reduce is not a function
const updateCartState = (items) => {
  // BẢO VỆ 1: Đảm bảo items là một mảng, nếu không thì dùng mảng rỗng
  items = Array.isArray(items) ? items : []; 
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item._display.itemPrice * item.quantity), 0);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('cart', JSON.stringify({ items, itemCount, totalPrice }));
  }
  
  return { items, itemCount, totalPrice };
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const newItem = action.payload;
      // Logic tạo ID giỏ hàng (giữ nguyên)
      const cartId = `${newItem.product_id}-${newItem.options.sort().join('-')}-${newItem.note}`;
      
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
    
    // Giữ nguyên các case khác (REMOVE_FROM_CART, UPDATE_QUANTITY, CLEAR_CART)
    case 'REMOVE_FROM_CART': {
      const cartIdToRemove = action.payload;
      const newItems = state.items.filter(item => item.cartId !== cartIdToRemove);
      return updateCartState(newItems);
    }

    case 'UPDATE_QUANTITY': {
      const { cartId, quantity } = action.payload;
      const newItems = state.items.map(item => {
        if (item.cartId === cartId) {
          return { ...item, quantity: quantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
      return updateCartState(newItems);
    }

    case 'CLEAR_CART': {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart');
      }
      return { items: [], itemCount: 0, totalPrice: 0 };
    }
    
    default:
      return state;
  }
};

// --- CHIẾC TÚI (PROVIDER) ---
export function CartProvider({ children }) {
  
  // BẢO VỆ 2: Thêm kiểm tra trong Initializer
  const [state, dispatch] = useReducer(cartReducer, { items: [], itemCount: 0, totalPrice: 0 }, (initial) => {
      if (typeof window === 'undefined') { return initial; }
      try {
          const localData = localStorage.getItem('cart');
          const parsedData = localData ? JSON.parse(localData) : initial;
          
          // Đảm bảo parsedData.items là một mảng
          if (parsedData && !Array.isArray(parsedData.items)) {
              console.warn("Dữ liệu giỏ hàng bị hỏng, đã reset.");
              return initial; 
          }
          return parsedData;
          
      } catch (error) { 
          console.error("Lỗi parse LocalStorage, đã reset:", error);
          return initial; 
      }
  });

  // Giữ nguyên logic của các hàm addToCart, removeFromCart, updateQuantity, clearCart
  const addToCart = (itemPayload) => { dispatch({ type: 'ADD_TO_CART', payload: itemPayload }); };
  const removeFromCart = (cartId) => { dispatch({ type: 'REMOVE_FROM_CART', payload: cartId }); };
  const updateQuantity = (cartId, quantity) => { dispatch({ type: 'UPDATE_QUANTITY', payload: { cartId, quantity } }); };
  const clearCart = () => { dispatch({ type: 'CLEAR_CART' }); };

  const value = {
    cartItems: state.items,
    itemCount: state.itemCount,
    totalPrice: state.totalPrice,
    addToCart, removeFromCart, updateQuantity, clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// --- CÁI MÓC (HOOK) ---
export function useCart() {
  return useContext(CartContext);
}