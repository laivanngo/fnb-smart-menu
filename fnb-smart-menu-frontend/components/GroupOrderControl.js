// Tệp: fnb-smart-menu-frontend/components/GroupOrderControl.js
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function GroupOrderControl() {
    const { groupMode, setGroupMode, currentUser, setCurrentUser } = useCart();

    const startGroup = () => {
        const name = prompt("Nhập tên của bạn:", "Chủ nhóm");
        if (name) {
            setCurrentUser(name);
            setGroupMode(true);
        }
    };

    const copyLink = () => {
        const url = window.location.href.split('?')[0] + `?group=${Math.floor(Math.random() * 10000)}`;
        navigator.clipboard.writeText(url);
        alert(`Đã sao chép link! Hãy gửi cho bạn bè để cùng đặt món.`);
    };

    if (!groupMode) {
        return (
            <div style={styles.container} onClick={startGroup}>
                <span style={{marginRight: '5px'}}>👥</span> 
                <span>Đặt đơn nhóm</span>
            </div>
        );
    }

    return (
        <div style={styles.activeContainer}>
            <div style={{fontSize: '0.9rem', flex:1}}>
                Bạn là: <b style={{color: '#FF6600'}}>{currentUser}</b>
            </div>
            <button style={styles.inviteBtn} onClick={copyLink}>+ Mời bạn</button>
        </div>
    );
}

const styles = {
    container: {
        margin: '10px 0', padding: '12px', backgroundColor: 'white',
        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px dashed #FF6600', color: '#FF6600', fontWeight: '600', cursor: 'pointer', fontSize:'0.9rem'
    },
    activeContainer: {
        margin: '10px 0', padding: '10px 15px', backgroundColor: '#fff5ec',
        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid #FF6600'
    },
    inviteBtn: {
        backgroundColor: '#FF6600', color: 'white', border: 'none',
        padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', cursor:'pointer'
    }
};