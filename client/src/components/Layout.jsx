import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] bg-bg font-body text-ink-900">
      <Sidebar />
      <div className="max-w-[1180px] px-9 py-7">
        <Outlet />
      </div>
    </div>
  );
}
