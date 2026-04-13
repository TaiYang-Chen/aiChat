import { Outlet } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Sidebar } from './Sidebar';

export function Layout({ user }: { user: User }) {
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
