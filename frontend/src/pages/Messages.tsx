import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { fetchApi } from '../utils/api';
import { getSocket } from '../utils/socket';
import { Socket } from 'socket.io-client';
import { Send, User as UserIcon, MessageCircle } from 'lucide-react';
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
    const [newMessage, setNewMessage] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const location = useLocation();
    const [searchParams] = useSearchParams();

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        if (!user || !token) return;

        // Fetch user's chat history
        fetchApi('/messages/conversations').then(apiData => {
            const data = Array.isArray(apiData) ? apiData : [];
            if (data) {
                // If coming from ad detail page
                const state = location.state as { adId?: string, sellerId?: string } | null;
                const adId = searchParams.get('adId') || state?.adId;
                const sellerId = searchParams.get('sellerId') || state?.sellerId;

                if (adId && sellerId) {
                    const existingChat = data.find((c: any) => c.ad_id === adId && c.other_user_id === sellerId);
                    if (existingChat) {
                        setChats(data);
                        loadMessages(existingChat);
                    } else {
                        // Create a temporary chat object so the user can send the first message
                        const tempChat = {
                            ad_id: adId,
                            other_user_id: sellerId,
                            ad_title: 'Carregando anúncio...',
                            other_user_name: 'Usuário...',
                        };
                        setChats([tempChat, ...data]);
                        setActiveChat(tempChat);

                        // Fetch ad details to get correct title and name
                        fetchApi(`/ads/${adId}`).then(adData => {
                            if (adData) {
                                const enrichedTempChat = {
                                    ad_id: adId,
                                    other_user_id: sellerId,
                                    ad_title: adData.title,
                                    other_user_name: adData.user.name,
                                };
                                setChats([enrichedTempChat, ...data]);
                                setActiveChat(enrichedTempChat);
                            }
                        });
                    }
                } else {
                    setChats(data);
                }
            }
        }).catch(() => { });

        const socket = getSocket(token);
        if (socket) {
            socketRef.current = socket;

            const onConnect = () => {
                console.log('[Socket] Joining room: user_', user.id);
                socket.emit('join', user.id);
            };

            if (socket.connected) {
                onConnect();
            } else {
                socket.on('connect', onConnect);
            }

            socket.on('new_message', (msg: Message) => {
                console.log('[Socket] New message received:', msg);
                setActiveChat((currentActive: any) => {
                    if (currentActive &&
                        msg.ad_id === currentActive.ad_id &&
                        (msg.sender_id === currentActive.other_user_id || msg.receiver_id === currentActive.other_user_id)) {
                        setMessages(prev => [...prev, msg]);
                        scrollToBottom();
                    }
                    return currentActive;
                });
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('connect');
                socketRef.current.off('new_message');
            }
        };
    }, [user, token, location.state]);

    const loadMessages = async (chat: any) => {
        setActiveChat(chat);
        try {
            const data = await fetchApi(`/messages/${chat.ad_id}/${chat.other_user_id}`);
            if (data) setMessages(data);
            scrollToBottom();
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        const content = newMessage;
        setNewMessage('');

        try {
            const tempMsg = {
                content,
                receiver_id: activeChat.other_user_id,
                ad_id: activeChat.ad_id,
            };

            const savedMsg = await fetchApi('/messages', {
                method: 'POST',
                body: JSON.stringify(tempMsg)
            });

            if (savedMsg) {
                setMessages(prev => [...prev, savedMsg]);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Failed to send msg', error);
        }
    };

    if (!user) return <div className="container mt-4"><h3>Por favor, faça login para ver suas mensagens.</h3></div>;

    return (
        <div className="messages-page container">
            <div className={`chat-layout box-card ${searchParams.get('adId') ? 'specific-chat' : ''}`}>
                <div className="chat-sidebar">
                    <h3 className="chat-sidebar-title">Conversas</h3>
                    <div className="chat-list">
                        {chats.length === 0 ? (
                            <p className="p-3 text-light text-center">Nenhuma conversa encontrada</p>
                        ) : (
                            chats.map((chat, idx) => (
                                <div
                                    key={idx}
                                    className={`chat-item ${activeChat === chat ? 'active' : ''}`}
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
                            ))
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
                                    <div>
                                        <h3 style={{ margin: 0 }}>{activeChat.other_user_name}</h3>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Ref: {activeChat.ad_title}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="chat-messages">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`message-bubble ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                                        <div className="message-content">{msg.content}</div>
                                        <span className="message-time">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="chat-input-area" onSubmit={sendMessage}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Digite uma mensagem..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary btn-icon-only">
                                    <Send size={20} />
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
        </div>
    );
};
