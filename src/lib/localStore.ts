import { v4 as uuidv4 } from 'uuid';

export const getLocalUser = () => {
  let user = localStorage.getItem('local_user');
  if (!user) {
    user = JSON.stringify({ uid: uuidv4(), displayName: '访客用户' });
    localStorage.setItem('local_user', user);
  }
  return JSON.parse(user);
};

export const getChats = () => JSON.parse(localStorage.getItem('chats') || '[]');

export const saveChats = (chats: any[]) => {
  localStorage.setItem('chats', JSON.stringify(chats));
  window.dispatchEvent(new Event('chats_updated'));
};

export const getMessages = (chatId: string) => JSON.parse(localStorage.getItem(`messages_${chatId}`) || '[]');

export const saveMessages = (chatId: string, messages: any[]) => {
  localStorage.setItem(`messages_${chatId}`, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent('messages_updated', { detail: { chatId } }));
};

export const addMessage = (chatId: string, message: any) => {
  const messages = getMessages(chatId);
  messages.push(message);
  saveMessages(chatId, messages);
};

export const updateMessage = (chatId: string, messageId: string, updates: any) => {
  const messages = getMessages(chatId);
  const index = messages.findIndex((m: any) => m.id === messageId);
  if (index > -1) {
    messages[index] = { ...messages[index], ...updates };
    saveMessages(chatId, messages);
  }
};

export const getMembers = (chatId: string) => JSON.parse(localStorage.getItem(`members_${chatId}`) || '[]');

export const saveMembers = (chatId: string, members: any[]) => {
  localStorage.setItem(`members_${chatId}`, JSON.stringify(members));
  window.dispatchEvent(new CustomEvent('members_updated', { detail: { chatId } }));
};
