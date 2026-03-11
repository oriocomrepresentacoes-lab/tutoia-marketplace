import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchApi } from '../utils/api';
import { getSocket } from '../utils/socket';
import { Socket } from 'socket.io-client';
import { Send, User as UserIcon, MessageCircle } from 'lucide-react';
import { requestNotificationPermission, setupNotifications } from '../utils/pushManager';
import { PushPrompt } from '../components/PushPrompt';
import './Messages.css';

interface Message {
    id: string;
    content: string;
    sender_id: string;
    receiver_id: string;
    ad_id: string;
    created_at: string;
}

export const Messages = () => {
    const { user, token } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any>(null);
    const activeChatRef = useRef<any>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [showPushPrompt, setShowPushPrompt] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Check if we should show push prompt
    useEffect(() => {
        if (Notification.permission === 'default' && !localStorage.getItem('pushPromptDismissed')) {
            // Small delay to not overwhelm on page load
            const timer = setTimeout(() => setShowPushPrompt(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Auto-scroll when messages change or chat selected
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (activeChat) scrollToBottom('auto');
    }, [activeChat]);

    // Handle mobile keyboard (visualViewport)
    useEffect(() => {
        if (window.visualViewport) {
            const handleResize = () => {
                if (activeChat) scrollToBottom('smooth');
            };
            window.visualViewport.addEventListener('resize', handleResize);
            return () => window.visualViewport?.removeEventListener('resize', handleResize);
        }
    }, [activeChat]);

    // Sync ref with state for socket listener
    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        } else {
            const container = document.querySelector('.chat-messages');
            if (container) container.scrollTop = container.scrollHeight;
        }
    };

    const handleRequestPush = async () => {
        const result = await requestNotificationPermission();
        if (result === 'granted') {
            await setupNotifications();
        }
    };

    const handleManualReconnect = () => {
        if (socketRef.current) {
            socketRef.current.connect();
        } else if (token) {
            getSocket(token || '');
        }
    };

    useEffect(() => {
        fetchApi('/messages/conversations').then(data => {
            if (data) {
                const urlAdId = searchParams.get('adId');
                const urlSellerId = searchParams.get('sellerId');

                if (urlAdId && urlSellerId) {
                    const existing = data.find((c: any) => c.ad_id === urlAdId && c.other_user_id === urlSellerId);
                    if (existing) {
                        setActiveChat(existing);
                        loadMessages(existing);
                    } else if (location.state?.tempChat) {
                        const temp = location.state.tempChat;
                        const enrichedTempChat = {
                            ...temp,
                            ad_id: urlAdId,
                            other_user_id: urlSellerId
                        };
                        setChats([enrichedTempChat, ...data]);
                        setActiveChat(enrichedTempChat);
                        loadMessages(enrichedTempChat);
                    }
                } else {
                    setChats(data);
                }
            }
        }).catch(() => { });

        const socket = getSocket(token || '');
        if (socket) {
            socketRef.current = socket;
            setIsConnected(socket.connected);

            const handleConnect = () => {
                console.log('[Messages] Local connected');
                setIsConnected(true);
                socket.emit('join', user?.id);
            };
            const handleDisconnect = () => {
                console.log('[Messages] Local disconnected');
                setIsConnected(false);
            };
            const handleError = (err: any) => {
                console.error('[Messages] Local error:', err);
                setIsConnected(false);
            };

            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            socket.on('connect_error', handleError);

            if (socket.connected) {
                socket.emit('join', user?.id);
            }

            const handleNewMessage = (msg: Message) => {
                const currentActive = activeChatRef.current;
                if (!currentActive) return;

                const matchesAd = msg.ad_id === currentActive.ad_id;
                const matchesUser = (msg.sender_id === currentActive.other_user_id || msg.receiver_id === currentActive.other_user_id);

                if (matchesAd && matchesUser) {
                    setMessages(prev => {
                        if (prev.some(p => p.id === msg.id)) return prev;
                        if (msg.sender_id === user?.id) {
                            const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === msg.content);
                            if (tempIndex !== -1) {
                                const next = [...prev];
                                next[tempIndex] = msg;
                                return next;
                            }
                        }
                        return [...prev, msg];
                    });
                }
            };

            socket.on('new_message', handleNewMessage);

            return () => {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('connect_error', handleError);
                socket.off('new_message', handleNewMessage);
            };
        }
    }, [user, token, location.state]);

    const loadMessages = async (chat: any) => {
        setActiveChat(chat);
        try {
            const data = await fetchApi(`/messages/${chat.ad_id}/${chat.other_user_id}`);
            if (data) setMessages(data);
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat || !user) return;

        const content = newMessage;
        setNewMessage('');

        try {
            const tempId = 'temp-' + Date.now();
            const optimisticMsg: Message = {
                id: tempId,
                content,
                sender_id: user.id,
                receiver_id: activeChat.other_user_id,
                ad_id: activeChat.ad_id,
                created_at: new Date().toISOString()
            };

            setMessages(prev => [...prev, optimisticMsg]);

            await fetchApi('/messages', {
                method: 'POST',
                body: JSON.stringify({
                    receiver_id: activeChat.other_user_id,
                    ad_id: activeChat.ad_id,
                    content
                })
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="messages-page container">
            <div className={`chat-layout ${activeChat ? 'specific-chat' : ''}`}>
                <div className="chat-sidebar">
                    <div className="chat-sidebar-header">
                        <h2 className="chat-sidebar-title">Mensagens</h2>
                    </div>
                    <div className="chat-list">
                        {chats.length > 0 ? chats.map((chat, idx) => (
                            <div
                                key={`${chat.ad_id}-${chat.other_user_id}-${idx}`}
                                className={`chat-item ${activeChat?.ad_id === chat.ad_id && activeChat?.other_user_id === chat.other_user_id ? 'active' : ''}`}
                                onClick={() => loadMessages(chat)}
                            >
                                <div className="chat-avatar">
                                    <UserIcon size={24} />
                                </div>
                                <div className="chat-info">
                                    <h4>{chat.other_user_name}</h4>
                                    <p>{chat.ad_title}</p>
                                </div>
                            </div>
                        )) : (
                            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                                Nenhuma conversa ainda.
                            </div>
                        )}
                    </div>
                </div>

                <div className="chat-window">
                    {activeChat ? (
                        <>
                            <div className="chat-header">
                                <div className="chat-header-info">
                                    {searchParams.get('adId') && (
                                        <button className="btn btn-secondary back-btn" onClick={() => window.history.back()} style={{ marginRight: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                                            &larr; Voltar
                                        </button>
                                    )}
                                    <div style={{ position: 'relative' }}>
                                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            {activeChat.other_user_name}
                                            <span
                                                style={{
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    backgroundColor: isConnected ? '#4caf50' : '#f44336',
                                                    display: 'inline-block',
                                                    cursor: isConnected ? 'default' : 'pointer'
                                                }}
                                                title={isConnected ? "Conectado" : "Desconectado - Clique para reconectar"}
                                                onClick={!isConnected ? handleManualReconnect : undefined}
                                            />
                                        </h3>
                                        <div style={{ marginTop: '4px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Anúncio: {activeChat.ad_title}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="chat-messages">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`message-bubble ${msg.sender_id === user?.id ? 'sent' : 'received'}`}>
                                        <div className="message-content">{msg.content}</div>
                                        <span className="message-time">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} style={{ height: '1px' }} />
                            </div>

                            <form className="chat-input-area" onSubmit={sendMessage}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Digite uma mensagem..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary btn-icon-only" disabled={!newMessage.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Send size={20} color="#ffffff" style={{ minWidth: '20px' }} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="chat-empty">
                            <MessageCircle className="chat-empty-icon" />
                            <p>Selecione uma conversa para começar a enviar mensagens.</p>
                        </div>
                    )}
                </div>
            </div>

            {showPushPrompt && (
                <PushPrompt
                    onAccept={() => {
                        handleRequestPush();
                        setShowPushPrompt(false);
                    }}
                    onClose={() => {
                        setShowPushPrompt(false);
                        localStorage.setItem('pushPromptDismissed', 'true');
                    }}
                />
            )}
        </div>
    );
};
