import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getChats, saveChats, saveMembers } from '../lib/localStore';

export function Sidebar({ user, onClose }: { user: any, onClose?: () => void }) {
  const [chats, setChats] = useState<any[]>([]);
  const navigate = useNavigate();

  const loadChats = () => {
    const loaded = getChats().sort((a: any, b: any) => b.updatedAt - a.updatedAt);
    setChats(loaded);
  };

  useEffect(() => {
    loadChats();
    window.addEventListener('chats_updated', loadChats);
    return () => window.removeEventListener('chats_updated', loadChats);
  }, []);

  const createNewChat = () => {
    const chatId = uuidv4();
    const newChat = {
      _id: chatId,
      id: chatId,
      name: '新群聊',
      description: '',
      ownerId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const currentChats = getChats();
    saveChats([...currentChats, newChat]);
    
    saveMembers(chatId, [{
      _id: uuidv4(),
      id: uuidv4(),
      chatId: chatId,
      memberId: user.uid,
      memberType: 'user',
      role: 'admin',
      name: user.displayName || 'User',
      joinedAt: Date.now()
    }]);

    navigate(`/chat/${chatId}`);
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          新建群聊
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {chats.map(chat => (
          <NavLink
            key={chat._id}
            to={`/chat/${chat._id}`}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'
              }`
            }
          >
            <MessageSquare className="w-5 h-5 opacity-70" />
            <div className="flex-1 truncate text-sm font-medium">
              {chat.name || '未命名群聊'}
            </div>
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
            alt="Profile"
            className="w-10 h-10 rounded-full"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 truncate">
            <div className="text-sm font-medium text-gray-900 truncate">{user.displayName || '访客用户'}</div>
            <div className="text-xs text-gray-500 truncate">本地会话</div>
          </div>
        </div>
      </div>
    </div>
  );
}
