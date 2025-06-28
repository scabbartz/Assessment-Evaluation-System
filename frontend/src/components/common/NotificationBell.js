import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import notificationService from '../../api/notificationService';
import authService from '../../api/authService'; // To check if user is logged in
import { toast } from 'react-toastify';

// Basic styling (can be moved to a CSS file)
const styles = {
    bellContainer: {
        position: 'relative',
        cursor: 'pointer',
        marginRight: '20px', // Adjust as needed
    },
    bellIcon: {
        fontSize: '1.5em', // Adjust size
        color: '#333',
    },
    badge: {
        position: 'absolute',
        top: '-5px',
        right: '-8px',
        background: 'red',
        color: 'white',
        borderRadius: '50%',
        padding: '2px 6px',
        fontSize: '0.7em',
        fontWeight: 'bold',
        minWidth: '18px',
        textAlign: 'center',
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        right: 0,
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '300px', // Adjust width
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 1000,
    },
    notificationItem: {
        padding: '10px',
        borderBottom: '1px solid #eee',
        fontSize: '0.9em',
    },
    notificationItemUnread: {
        backgroundColor: '#f0f8ff', // Light blue for unread
    },
    notificationLink: {
        textDecoration: 'none',
        color: 'inherit',
    },
    noNotifications: {
        padding: '20px',
        textAlign: 'center',
        color: '#777',
    },
    actions: {
        padding: '10px',
        textAlign: 'right',
        borderTop: '1px solid #eee',
    }
};

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef(null);
    const currentUser = authService.getLocalUser();

    const fetchNotifications = async () => {
        if (!currentUser) return; // Don't fetch if no user
        setIsLoading(true);
        try {
            const data = await notificationService.getUserNotifications({ limit: 10, unreadOnly: 'false' }); // Fetch all, sort by date
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            // toast.error("Failed to load notifications."); // Avoid too many toasts on initial load
            console.error("Failed to load notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchNotifications();
            // TODO: Implement polling or WebSocket for real-time updates if needed.
            // const interval = setInterval(fetchNotifications, 60000); // Poll every minute
            // return () => clearInterval(interval);
        } else {
            // Clear notifications if user logs out
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [currentUser]); // Re-fetch if user changes (login/logout)

    // Close dropdown if clicked outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);


    const handleToggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) { // If opening and there are unread, refresh
             fetchNotifications();
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        try {
            await notificationService.markNotificationAsRead(notificationId);
            // Optimistically update UI or re-fetch
            setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1)); // Decrement unread count
            // fetchNotifications(); // Or re-fetch for consistency
        } catch (error) {
            toast.error("Failed to mark notification as read.");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllNotificationsAsRead();
            toast.success("All notifications marked as read.");
            fetchNotifications(); // Refresh all
        } catch (error) {
            toast.error("Failed to mark all notifications as read.");
        }
    };

    if (!currentUser) { // Don't render the bell if no user is logged in
        return null;
    }

    return (
        <div style={styles.bellContainer} ref={dropdownRef}>
            <span onClick={handleToggleDropdown} style={styles.bellIcon} role="button" aria-label="Notifications">
                🔔 {/* Simple bell emoji, can be replaced with an icon library */}
                {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </span>

            {isOpen && (
                <div style={styles.dropdown}>
                    {isLoading && <div style={styles.notificationItem}>Loading...</div>}
                    {!isLoading && notifications.length === 0 && (
                        <div style={styles.noNotifications}>No new notifications.</div>
                    )}
                    {!isLoading && notifications.map(notif => (
                        <div
                            key={notif._id}
                            style={{...styles.notificationItem, ...(notif.isRead ? {} : styles.notificationItemUnread)}}
                        >
                            {notif.link ? (
                                <Link to={notif.link} style={styles.notificationLink} onClick={() => { if(!notif.isRead) handleMarkAsRead(notif._id); setIsOpen(false);}}>
                                    <strong>{notif.title || notif.type}</strong>
                                    <p style={{margin: '5px 0 0', fontSize: '0.9em'}}>{notif.message}</p>
                                </Link>
                            ) : (
                                <div onClick={() => { if(!notif.isRead) handleMarkAsRead(notif._id); }}>
                                   <strong>{notif.title || notif.type}</strong>
                                   <p style={{margin: '5px 0 0', fontSize: '0.9em'}}>{notif.message}</p>
                                </div>
                            )}
                             <small style={{color: '#777', fontSize: '0.8em'}}>{new Date(notif.createdAt).toLocaleString()}</small>
                             {!notif.isRead && (
                                <button onClick={() => handleMarkAsRead(notif._id)} style={{float: 'right', fontSize: '0.7em', padding: '2px 4px'}}>Mark Read</button>
                             )}
                        </div>
                    ))}
                    {notifications.length > 0 && (
                         <div style={styles.actions}>
                            <button onClick={handleMarkAllAsRead} style={{fontSize: '0.8em'}}>Mark all as read</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
