// Mobile haptic tactile feedback utility for Haven-like physical feel

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'buzz' | 'heartbeat' | 'success';

export const triggerHaptic = (style: HapticStyle = 'light') => {
  if (typeof window === 'undefined' || !('navigator' in window)) return;
  if (!navigator.vibrate) return;

  try {
    switch (style) {
      case 'light':
        navigator.vibrate(15);
        break;
      case 'medium':
        navigator.vibrate(35);
        break;
      case 'heavy':
        navigator.vibrate(55);
        break;
      case 'buzz':
        navigator.vibrate([80, 40, 80, 40, 120]);
        break;
      case 'heartbeat':
        navigator.vibrate([35, 100, 60]);
        break;
      case 'success':
        navigator.vibrate([20, 60, 40]);
        break;
    }
  } catch {
    // Gracefully ignore on devices with restricted vibration permissions
  }
};
