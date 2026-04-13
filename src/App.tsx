/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChatView } from './components/ChatView';
import { Home } from './components/Home';
import { getLocalUser } from './lib/localStore';

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getLocalUser());
  }, []);

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} />}>
          <Route index element={<Home />} />
          <Route path="chat/:chatId" element={<ChatView user={user} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
