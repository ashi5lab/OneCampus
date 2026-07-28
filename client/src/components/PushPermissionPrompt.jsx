import { useEffect, useState } from 'react';
import { requestPushPermission, fcmLog } from '../lib/firebase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const PROMPT_KEY = 'onecampus.fcm_prompt_shown';
const DEFER_KEY = 'onecampus.fcm_prompt_defer_until';
const DEFER_DAYS = 3;

export function PushPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      // Check if we should show the prompt
      if (Capacitor.isNativePlatform()) {
        try {
          const permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'granted') return; // already granted
        } catch (e) {
          // If plugin fails, still allow user to click 'Enable' which might trigger it.
        }
      } else {
        if (typeof Notification === 'undefined' || Notification.permission === 'granted') {
          return; // No browser support or already granted
        }
      }

      const hasShownBefore = localStorage.getItem(PROMPT_KEY);
      const deferUntil = localStorage.getItem(DEFER_KEY);

      if (hasShownBefore && deferUntil) {
        const deferDate = new Date(deferUntil);
        if (new Date() < deferDate) {
          return; // Still in defer period
        }
      }

      // Show the prompt
      setShow(true);
    };

    checkStatus();
  }, []);

  if (!show) return null;

  const handleEnable = async () => {
    setIsRequesting(true);
    const token = await requestPushPermission(import.meta.env.VITE_FIREBASE_VAPID_KEY);
    setIsRequesting(false);

    if (token) {
      fcmLog('User enabled push notifications from prompt');
      localStorage.setItem(PROMPT_KEY, 'true');
      setShow(false);
    }
  };

  const handleDeferLater = () => {
    const deferUntil = new Date();
    deferUntil.setDate(deferUntil.getDate() + DEFER_DAYS);
    localStorage.setItem(DEFER_KEY, deferUntil.toISOString());
    localStorage.setItem(PROMPT_KEY, 'true');
    setShow(false);
  };

  const handleDontAskAgain = () => {
    localStorage.setItem(PROMPT_KEY, 'true');
    localStorage.setItem(DEFER_KEY, '');
    setShow(false);
  };

  return (
    <div className="mb-4 rounded border-l-4 border-l-accent bg-accent/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink-900">
            🔔 Get Instant Notifications
          </div>
          <div className="mt-1 text-[13px] text-ink-700">
            Enable push notifications to get instant alerts about attendance, notices, discipline records, and important updates.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleEnable}
              disabled={isRequesting}
              className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
            >
              {isRequesting ? 'Requesting…' : 'Enable'}
            </button>
            <button
              onClick={handleDeferLater}
              disabled={isRequesting}
              className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-60"
            >
              Ask Later
            </button>
            <button
              onClick={handleDontAskAgain}
              disabled={isRequesting}
              className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-surface-muted disabled:opacity-60"
            >
              Don't Ask Again
            </button>
          </div>
        </div>
        <button
          onClick={handleDontAskAgain}
          className="text-ink-500 hover:text-ink-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
