// Tệp: components/GroupOrderControl.js
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

export default function GroupOrderControl() {
    const { groupMode, setGroupMode, currentUser, setCurrentUser } = useCart();
    const [isEditing, setIsEditing] = useState(false);
    const [tempName, setTempName] = useState('');

    const startGroup = () => {
        const name = prompt("Nhập tên của bạn để bắt đầu:", "Chủ nhóm");
        if (name) {
            setCurrentUser(name);
            setGroupMode(true);
        }
    };

    const copyLink = () => {
        // Giả lập copy link (Thực tế cần Backend để tạo link thật)
        alert(`Đã sao chép link đơn nhóm! Gửi cho bạn bè: ${window.location.href}?group=123`);
    };

    if (!groupMode) {
        return (
            <div style={styles.container} onClick={startGroup}>
                <span style={styles.icon}>👥</span>
                <span style={styles.text}>Đặt đơn nhóm</span>
            </div>
        );
    }

    return (
        <div style={styles.activeContainer}>
            <div style={styles.info}>
                <span style={{fontSize: '0.85rem', color: '#666'}}>Đang đặt dưới tên:</span>
                <strong style={{color: '#FF6600', cursor: 'pointer'}} onClick={() => {
                     const newName = prompt("Đổi tên hiển thị:", currentUser);
                     if(newName) setCurrentUser(newName);
                }}>{currentUser} ✏️</strong>
            </div>
            <button style={styles.inviteBtn} onClick={copyLink}>+ Mời bạn</button>
        </div>
    );
}

const styles = {
    container: {
        margin: '10px 20px', padding: '12px', backgroundColor: 'white',
        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '10px', cursor: 'pointer', border: '1px dashed #FF6600',
        color: '#FF6600', fontWeight: 'bold', transition: 'all 0.2s'
    },
    activeContainer: {
        margin: '10px 20px', padding: '12px', backgroundColor: '#fff5ec',
        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid #FF6600'
    },
    icon: { fontSize: '1.2rem' },
    inviteBtn: {
        backgroundColor: '#FF6600', color: 'white', border: 'none',
        padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem',
        fontWeight: 'bold', cursor: 'pointer'
    }
};