/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Layout } from './components/Layout';
import { ChatView } from './components/ChatView';
import { Home } from './components/Home';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ensure user doc exists
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            email: 'anonymous@local',
            displayName: '访客用户',
            photoURL: '',
            createdAt: serverTimestamp()
          });
        }
        setUser(currentUser);
        setLoading(false);
      } else {
        // Automatically sign in anonymously if no user
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous auth error:", error);
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
        <div className="text-red-500">登录失败，请检查网络或 Firebase 配置。</div>
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
