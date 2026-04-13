import { MessageSquarePlus } from 'lucide-react';

export function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
        <MessageSquarePlus className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">欢迎使用多 AI 协作平台</h2>
      <p className="text-gray-500 max-w-md">
        创建一个新群聊以开始与多个 AI 助手协作。您可以向同一个群聊中添加不同的 AI 角色，让它们协同工作。
      </p>
    </div>
  );
}
