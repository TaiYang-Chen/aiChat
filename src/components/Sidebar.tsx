import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getChats, saveChats, saveMembers, deleteChat } from '../lib/localStore';

export function Sidebar({ user, onClose }: { user: any, onClose?: () => void }) {
  const [chats, setChats] = useState<any[]>([]);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { chatId: activeChatId } = useParams();

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

  const handleDeleteConfirm = () => {
    if (chatToDelete) {
      deleteChat(chatToDelete);
      if (activeChatId === chatToDelete) {
        navigate('/');
      }
      setChatToDelete(null);
    }
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full relative">
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
          <div key={chat._id} className="group relative flex items-center">
            <NavLink
              to={`/chat/${chat._id}`}
              onClick={onClose}
              className={({ isActive }) =>
                `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'
                }`
              }
            >
              <MessageSquare className="w-5 h-5 opacity-70 shrink-0" />
              <div className="flex-1 truncate text-sm font-medium">
                {chat.name || '未命名群聊'}
              </div>
            </NavLink>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setChatToDelete(chat._id);
              }}
              className="absolute right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
              title="删除群聊"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
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

      {/* Delete Confirmation Modal */}
      {chatToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">删除群聊</h3>
              <button onClick={() => setChatToDelete(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除这个群聊吗？此操作不可恢复，所有聊天记录和成员配置都将被清除。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setChatToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
