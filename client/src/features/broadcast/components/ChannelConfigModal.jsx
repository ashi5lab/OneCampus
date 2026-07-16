import { useState } from 'react';
import { useSaveBroadcastConfig } from '../hooks/useBroadcast';

// Generic per-channel API configuration editor. The templates/variables
// model mirrors the backend exactly (see server/modules/broadcast/README):
// - variables: static name -> value pairs ({{apikey}} etc.)
// - headers / payload_template (POST body) / params_template (GET query)
//   are string maps whose values may reference {{variables}} plus the
//   runtime ones: {{phone}}, {{message}} (SMS), {{voice_url}} (voicemail).
export function ChannelConfigModal({ channel, existing, onClose }) {
  const saveConfig = useSaveBroadcastConfig();

  const [apiUrl, setApiUrl] = useState(existing?.api_url || '');
  const [method, setMethod] = useState(existing?.http_method || 'POST');
  const [isActive, setIsActive] = useState(existing?.is_active || false);
  const [headers, setHeaders] = useState(toPairs(existing?.headers));
  const [payload, setPayload] = useState(toPairs(existing?.payload_template));
  const [params, setParams] = useState(toPairs(existing?.params_template));
  const [variables, setVariables] = useState(toPairs(existing?.variables));
  const [formError, setFormError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (isActive && !apiUrl.trim()) return setFormError('An API URL is required to activate this channel.');

    saveConfig.mutate(
      {
        channel,
        payload: {
          api_url: apiUrl.trim(),
          http_method: method,
          headers: fromPairs(headers),
          payload_template: fromPairs(payload),
          params_template: fromPairs(params),
          variables: fromPairs(variables),
          is_active: isActive
        }
      },
      { onSuccess: onClose }
    );
  }

  const runtimeVars = channel === 'sms' ? '{{phone}}, {{message}}' : '{{phone}}, {{voice_url}}';

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form onSubmit={handleSubmit} className="my-8 w-full max-w-[640px] rounded border border-border bg-surface p-6">
        <div className="mb-1 text-base font-bold capitalize text-ink-900">{channel} API Configuration</div>
        <div className="mb-4 text-[12px] text-ink-500">
          Describe your provider's HTTP call. Use <code className="rounded bg-surface-muted px-1">{'{{name}}'}</code> placeholders — your
          own variables below, plus the built-in {runtimeVars} at send time.
        </div>

        <label className="mb-3 block">
          <div className="mb-1 text-xs font-semibold text-ink-700">API URL</div>
          <input className="input" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.provider.com/send" />
        </label>

        <div className="mb-3 flex items-center gap-6">
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-ink-700">Method</div>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="POST">POST (JSON payload)</option>
              <option value="GET">GET (query params)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-5 text-[13px] font-semibold text-ink-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>

        <KeyValueEditor title="Variables" hint="Static values, e.g. apikey → your key. Reference as {{apikey}}." pairs={variables} onChange={setVariables} />
        <KeyValueEditor title="Headers" hint='e.g. Authorization → Bearer {{apikey}}' pairs={headers} onChange={setHeaders} />
        {method === 'POST' ? (
          <KeyValueEditor title="Payload (JSON body fields)" hint='e.g. to → {{phone}}, text → {{message}}' pairs={payload} onChange={setPayload} />
        ) : (
          <KeyValueEditor title="Query Params" hint='e.g. to → {{phone}}, msg → {{message}}' pairs={params} onChange={setParams} />
        )}

        {(formError || saveConfig.error) && (
          <div className="mb-3 text-xs font-semibold text-danger">{formError || saveConfig.error.message}</div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveConfig.isPending}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {saveConfig.isPending ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

function toPairs(record) {
  return Object.entries(record || {}).map(([key, value]) => ({ key, value }));
}

function fromPairs(pairs) {
  const out = {};
  for (const { key, value } of pairs) {
    if (key.trim()) out[key.trim()] = value;
  }
  return out;
}

function KeyValueEditor({ title, hint, pairs, onChange }) {
  function update(index, patch) {
    onChange(pairs.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }
  function add() {
    onChange([...pairs, { key: '', value: '' }]);
  }
  function remove(index) {
    onChange(pairs.filter((_, i) => i !== index));
  }

  return (
    <div className="mb-3 rounded border border-border bg-surface-muted p-3">
      <div className="mb-0.5 flex items-center justify-between">
        <div className="text-xs font-bold text-ink-700">{title}</div>
        <button type="button" onClick={add} className="text-[11px] font-semibold text-accent-dark hover:underline">
          + Add
        </button>
      </div>
      <div className="mb-2 text-[11px] text-ink-500">{hint}</div>
      {pairs.length === 0 && <div className="text-[11.5px] text-ink-500">None yet.</div>}
      <div className="space-y-1.5">
        {pairs.map((pair, index) => (
          <div key={index} className="flex items-center gap-2">
            <input className="input w-[35%]" placeholder="name" value={pair.key} onChange={(e) => update(index, { key: e.target.value })} />
            <input className="input flex-1" placeholder="value" value={pair.value} onChange={(e) => update(index, { value: e.target.value })} />
            <button type="button" onClick={() => remove(index)} className="text-xs text-danger">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
