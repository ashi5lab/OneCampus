import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRecipients, useSendMessage } from '../hooks/useMessages';
import { UserSearchSelect } from '../../../components/UserSearchSelect';

const composeSchema = z.object({
  recipient_id: z.coerce.number({ invalid_type_error: 'Choose a recipient' }).int(),
  subject: z.string().max(255).optional(),
  body: z.string().min(1, 'Message body is required')
});

export function ComposeMessageModal({ onClose }) {
  const { data: recipients } = useRecipients();
  const sendMessage = useSendMessage();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({ resolver: zodResolver(composeSchema) });

  function onSubmit(values) {
    sendMessage.mutate(values, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="my-auto w-full max-w-[440px] rounded border border-border bg-surface p-6"
      >
        <div className="mb-4 text-base font-bold text-ink-900">New Message</div>

        <Field label="To" error={errors.recipient_id}>
          <Controller
            name="recipient_id"
            control={control}
            render={({ field }) => (
              <UserSearchSelect users={recipients || []} value={field.value} onChange={field.onChange} placeholder="Search by name…" />
            )}
          />
        </Field>
        <Field label="Subject (optional)" error={errors.subject}>
          <input className="input" {...register('subject')} />
        </Field>
        <Field label="Message" error={errors.body}>
          <textarea rows={5} className="input" {...register('body')} />
        </Field>

        {sendMessage.error && <div className="mb-3 text-xs font-semibold text-danger">{sendMessage.error.message}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sendMessage.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {sendMessage.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-xs font-semibold text-ink-700">{label}</div>
      {children}
      {error && <div className="mt-1 text-[11px] font-semibold text-danger">{error.message}</div>}
    </label>
  );
}
