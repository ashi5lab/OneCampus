import { useState } from 'react';
import { useCheckInVisitor } from '../hooks/useVisitors';

export function CheckInModal({ onClose }) {
  const checkIn = useCheckInVisitor();

  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hostName, setHostName] = useState('');
  const [idProof, setIdProof] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    checkIn.mutate(
      {
        visitor_name: visitorName,
        visitor_phone: visitorPhone || null,
        purpose,
        host_name: hostName,
        id_proof: idProof || null
      },
      { onSuccess: () => onClose() }
    );
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="w-full max-w-[440px] rounded border border-border bg-surface p-6 my-auto">
        <div className="mb-4 text-base font-bold text-ink-900">Check In Visitor</div>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Visitor Name</div>
          <input className="input w-full" required value={visitorName} onChange={(e) => setVisitorName(e.target.value)} />
        </label>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Phone (optional)</div>
          <input className="input w-full" value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} />
        </label>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Purpose of Visit</div>
          <input className="input w-full" required value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </label>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">Meeting Whom</div>
          <input className="input w-full" required value={hostName} onChange={(e) => setHostName(e.target.value)} />
        </label>

        <label className="mb-4 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">ID Proof (optional)</div>
          <input className="input w-full" placeholder="e.g. Aadhar - 1234" value={idProof} onChange={(e) => setIdProof(e.target.value)} />
        </label>

        {checkIn.error && <div className="mb-3 text-xs font-semibold text-danger">{checkIn.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={checkIn.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {checkIn.isPending ? 'Checking In…' : 'Check In'}
          </button>
        </div>
      </form>
    </div>
  );
}
