import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Badge } from '../../../components/Badge';
import { useBroadcastConfigs } from '../hooks/useBroadcast';
import { SmsTab } from './SmsTab';
import { VoicemailTab } from './VoicemailTab';
import { WhatsappTab } from './WhatsappTab';
import { WhatsappAbsenteeTab } from './WhatsappAbsenteeTab';
import { ChannelConfigModal } from './ChannelConfigModal';

const TABS = [
  { value: 'sms', label: 'SMS' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'whatsapp_absentee', label: 'WhatsApp (Absentee Alerts)' }
];

export function BroadcastPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState('sms');
  const [configuring, setConfiguring] = useState(false);
  const canConfigure = can('broadcast.configure');
  const { data: configs } = useBroadcastConfigs({ enabled: canConfigure });

  const activeConfig = (configs || []).find((c) => c.channel === tab);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Broadcast</div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Broadcast</h1>
        </div>
        {canConfigure && (
          <div className="flex items-center gap-2">
            {activeConfig && (
              <Badge variant={activeConfig.is_active ? 'active' : 'pending'}>
                {activeConfig.is_active ? 'API active' : 'API inactive'}
              </Badge>
            )}
            <button
              onClick={() => setConfiguring(true)}
              className="rounded border border-border px-4 py-2 text-[13px] font-semibold text-ink-700 hover:bg-surface-muted"
            >
              Configure {TABS.find((t) => t.value === tab)?.label} API
            </button>
          </div>
        )}
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t.value ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sms' && <SmsTab />}
      {tab === 'voicemail' && <VoicemailTab />}
      {tab === 'whatsapp' && <WhatsappTab />}
      {tab === 'whatsapp_absentee' && <WhatsappAbsenteeTab />}

      {configuring && (
        <ChannelConfigModal channel={tab} existing={activeConfig} onClose={() => setConfiguring(false)} />
      )}
    </div>
  );
}
