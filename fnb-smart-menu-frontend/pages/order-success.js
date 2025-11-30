// Tệp: pages/order-success.js
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function OrderSuccess() {
    const router = useRouter();
    const { id } = router.query;
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Có thể thêm logic bắn pháo hoa ở đây nếu muốn
    }, []);

    if (!isMounted) return null;

    return (
        <div style={styles.container}>
            <Head>
                <title>Đặt hàng thành công - Ngon Ngon</title>
            </Head>

            <div style={styles.card}>
                <div style={styles.iconContainer}>
                    <div style={styles.checkmark}>✓</div>
                </div>
                
                <h1 style={styles.title}>Đặt hàng thành công!</h1>
                <p style={styles.message}>
                    Cảm ơn bạn đã ủng hộ <b>Ngon-Ngon</b>.<br/>
                    Đơn hàng của bạn đã được chuyển đến bếp.
                </p>

                {id && (
                    <div style={styles.orderIdBox}>
                        Mã đơn hàng: <b>#{id}</b>
                    </div>
                )}

                <div style={styles.infoBox}>
                    <p>🕒 Quán sẽ gọi xác nhận trong ít phút.</p>
                    <p>📞 Hotline hỗ trợ: <b>0378.148.148</b></p>
                </div>

                <Link href="/" style={styles.homeButton}>
                    ← Quay lại Thực đơn
                </Link>
            </div>

            {/* CSS Animation cho dấu tích */}
            <style jsx>{`
                @keyframes scaleIn {
                    0% { transform: scale(0); opacity: 0; }
                    60% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff5ec', // Nền cam nhạt
        fontFamily: 'sans-serif',
        padding: '20px'
    },
    card: {
        backgroundColor: 'white',
        padding: '40px 30px',
        borderRadius: '20px',
        boxShadow: '0 10px 30px rgba(255, 102, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
    },
    iconContainer: {
        width: '80px',
        height: '80px',
        backgroundColor: '#28a745', // Màu xanh thành công
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px auto',
        animation: 'scaleIn 0.5s ease-out forwards'
    },
    checkmark: {
        color: 'white',
        fontSize: '40px',
        fontWeight: 'bold'
    },
    title: {
        color: '#333',
        margin: '0 0 10px 0',
        fontSize: '1.8rem'
    },
    message: {
        color: '#666',
        fontSize: '1rem',
        lineHeight: '1.5',
        marginBottom: '20px'
    },
    orderIdBox: {
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '8px',
        border: '1px dashed #ccc',
        display: 'inline-block',
        marginBottom: '20px',
        fontSize: '1.1rem',
        color: '#555'
    },
    infoBox: {
        fontSize: '0.9rem',
        color: '#777',
        marginBottom: '30px',
        backgroundColor: '#fff9f4',
        padding: '10px',
        borderRadius: '8px'
    },
    homeButton: {
        display: 'block',
        width: '100%',
        padding: '12px',
        backgroundColor: '#FF6600',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 10px rgba(255, 102, 0, 0.3)',
        transition: 'transform 0.2s'
    }
};