import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSuperAdminAuth } from '../../../contexts/SuperAdminAuthContext';
import { superAdminApiClient } from '../../../lib/superAdminApiClient';

export function SuperAdminInboxPage() {
  const { admin, logout } = useSuperAdminAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const data = await superAdminApiClient.get('/super-admin/inquiries');
      setInquiries(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, currentStatus) => {
    try {
      await superAdminApiClient.patch(`/super-admin/inquiries/${id}/read`, { is_read: !currentStatus });
      fetchInquiries();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteInquiry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      await superAdminApiClient.delete(`/super-admin/inquiries/${id}`);
      fetchInquiries();
      setSelectedInquiry(null);
    } catch (err) {
      console.error(err);
    }
  };

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  if (loading) return <div className="min-h-screen bg-bg font-body p-8">Loading...</div>;
  if (error) return <div className="min-h-screen bg-bg font-body p-8 text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-bg font-body">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[15px] font-semibold text-ink-900">Super Admin</div>
            <div className="text-[11px] text-ink-500">{admin?.username}</div>
          </div>
          <div className="flex gap-4 border-l border-border pl-6">
            <Link to="/super-admin" className="text-sm font-semibold text-ink-500 hover:text-ink-900 pb-1">Tenants</Link>
            <Link to="/super-admin/inquiries" className="text-sm font-semibold text-microsoft-blue border-b-2 border-microsoft-blue pb-1">Inbox</Link>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
          Log out
        </button>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Inbox ({inquiries.length})</h1>
        </div>
      
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Source</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-ink-500">No inquiries yet</td>
              </tr>
            )}
            {inquiries.map((inq) => (
              <tr key={inq.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!inq.is_read ? 'font-semibold bg-blue-50/30' : ''}`}>
                <td className="p-4">{new Date(inq.created_at).toLocaleDateString()}</td>
                <td className="p-4 uppercase text-xs tracking-wider">
                  <span className={`px-2 py-1 rounded ${inq.type === 'demo' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {inq.type}
                  </span>
                </td>
                <td className="p-4">{inq.name}</td>
                <td className="p-4">{inq.email}</td>
                <td className="p-4">{inq.source || '-'}</td>
                <td className="p-4">
                  <button 
                    onClick={() => markAsRead(inq.id, inq.is_read)}
                    className={`text-xs px-2 py-1 rounded ${inq.is_read ? 'text-gray-500 hover:bg-gray-200' : 'bg-microsoft-blue text-white'}`}
                  >
                    {inq.is_read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                </td>
                <td className="p-4">
                  <button onClick={() => setSelectedInquiry(inq)} className="text-microsoft-blue hover:underline mr-4">View</button>
                  <button onClick={() => deleteInquiry(inq.id)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
            <button 
              onClick={() => setSelectedInquiry(null)}
              className="absolute top-4 right-4 text-ink-500 hover:text-ink-900 font-bold"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 capitalize">{selectedInquiry.type} Request</h2>
            
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="font-semibold text-ink-500">Date:</span>
                <span className="col-span-2">{new Date(selectedInquiry.created_at).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="font-semibold text-ink-500">Name:</span>
                <span className="col-span-2">{selectedInquiry.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <span className="font-semibold text-ink-500">Email:</span>
                <span className="col-span-2">{selectedInquiry.email}</span>
              </div>
              
              {selectedInquiry.phone && (
                <div className="grid grid-cols-3 gap-2 border-b pb-2">
                  <span className="font-semibold text-ink-500">Phone:</span>
                  <span className="col-span-2">{selectedInquiry.phone}</span>
                </div>
              )}
              {selectedInquiry.institution_name && (
                <div className="grid grid-cols-3 gap-2 border-b pb-2">
                  <span className="font-semibold text-ink-500">Institution:</span>
                  <span className="col-span-2">{selectedInquiry.institution_name} {selectedInquiry.institution_type ? `(${selectedInquiry.institution_type})` : ''}</span>
                </div>
              )}
              {selectedInquiry.address && (
                <div className="grid grid-cols-3 gap-2 border-b pb-2">
                  <span className="font-semibold text-ink-500">Address:</span>
                  <span className="col-span-2">{selectedInquiry.address}</span>
                </div>
              )}
              {selectedInquiry.source && (
                <div className="grid grid-cols-3 gap-2 border-b pb-2">
                  <span className="font-semibold text-ink-500">Source:</span>
                  <span className="col-span-2">{selectedInquiry.source}</span>
                </div>
              )}
              {selectedInquiry.message && (
                <div className="border-t pt-4">
                  <span className="block font-semibold text-ink-500 mb-2">Message:</span>
                  <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded text-ink-700">{selectedInquiry.message}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-2">
              <button onClick={() => deleteInquiry(selectedInquiry.id)} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded">Delete</button>
              <button onClick={() => setSelectedInquiry(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded">Close</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
