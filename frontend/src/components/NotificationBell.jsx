import { useState, useEffect, useRef } from 'react';
import { notificationApi } from '../api/notificationApi';
import { Bell, Check, CheckCheck, Trash2, Clock, CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchCount = async () => {
        try {
            const res = await notificationApi.getUnreadCount();
            setUnreadCount(res.data.count);
        } catch {}
    };

    const fetchNotifications = async () => {
        try {
            const res = await notificationApi.getAll({ limit: 15 });
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.non_lues || 0);
        } catch {}
    };

    useEffect(() => { fetchCount(); }, []);
    useEffect(() => { if (isOpen) fetchNotifications(); }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = async (id, e) => {
        e.stopPropagation();
        try { await notificationApi.markAsRead(id); fetchNotifications(); } catch {}
    };

    const handleMarkAllRead = async () => {
        try { await notificationApi.markAllAsRead(); fetchNotifications(); } catch {}
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try { await notificationApi.delete(id); fetchNotifications(); } catch {}
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'danger': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getTypeBg = (type) => {
        switch (type) {
            case 'success': return 'bg-emerald-50 border-emerald-100';
            case 'danger': return 'bg-red-50 border-red-100';
            case 'warning': return 'bg-amber-50 border-amber-100';
            default: return 'bg-blue-50 border-blue-100';
        }
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return "A l'instant";
        if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Notifications">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                        </h3>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead}
                                    className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-violet-50 transition-colors">
                                    <CheckCheck className="w-3.5 h-3.5" /> Tout lire
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="text-center py-8">
                                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-400 text-sm">Aucune notification</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.lu ? 'bg-violet-50/30' : ''}`}>
                                    <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 border ${getTypeBg(n.type)}`}>
                                        {getTypeIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!n.lu ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.titre}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {formatDate(n.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        {!n.lu && (
                                            <button onClick={(e) => handleMarkRead(n.id, e)} className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Marquer comme lue">
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button onClick={(e) => handleDelete(n.id, e)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Supprimer">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}