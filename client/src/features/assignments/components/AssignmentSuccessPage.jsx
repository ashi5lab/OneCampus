import { useNavigate, useParams } from 'react-router-dom';

export function AssignmentSuccessPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Checkmark circle */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-10 w-10 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-ink-900">Assignment Created!</h1>
      <p className="mb-8 max-w-sm text-sm text-ink-500">
        Your assignment has been created successfully. Students will be notified once you publish their marks.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate(`/app/assignments/${id}`)}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-ink"
        >
          View Assignment
        </button>
        <button
          onClick={() => navigate('/app/assignments')}
          className="rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-semibold text-ink-700 hover:bg-surface-muted"
        >
          Go to Assignments
        </button>
      </div>
    </div>
  );
}
