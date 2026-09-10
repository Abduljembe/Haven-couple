/**
 * Utility functions for custom avatar processing and compression
 */

export const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
];

/**
 * Resizes and center-crops any image file or data URL into a clean square avatar base64 string
 */
export async function cropAndCompressAvatar(
  input: File | string,
  targetSize: number = 256,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isObjectUrl = false;

    if (typeof input === 'string') {
      srcUrl = input;
    } else {
      srcUrl = URL.createObjectURL(input);
      isObjectUrl = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isObjectUrl) {
        URL.revokeObjectURL(srcUrl);
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Center-crop to square
        const { width, height } = img;
        const minDim = Math.min(width, height);
        const sx = (width - minDim) / 2;
        const sy = (height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (isObjectUrl) {
        URL.revokeObjectURL(srcUrl);
      }
      reject(err);
    };

    img.src = srcUrl;
  });
}

/**
 * Resizes and watermarks an ID document scan for privacy and secure verification
 */
export async function compressIdDocumentImage(
  input: File | string,
  maxWidth: number = 700,
  maxHeight: number = 450,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    let srcUrl = '';
    let isObjectUrl = false;

    if (typeof input === 'string') {
      srcUrl = input;
    } else {
      srcUrl = URL.createObjectURL(input);
      isObjectUrl = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isObjectUrl) {
        URL.revokeObjectURL(srcUrl);
      }

      try {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Add privacy watermark
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(0, height - 32, width, 32);
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('🔒 HAVEN VERIFIED IDENTITY SCAN • ENCRYPTED • FOR DATING SAFETY ONLY', 12, height - 12);
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (isObjectUrl) {
        URL.revokeObjectURL(srcUrl);
      }
      reject(err);
    };

    img.src = srcUrl;
  });
}

/**
 * Creates a clean simulated digital ID pass card for fast instant testing
 */
export function generateDemoIdCard(name: string, idType: string = "Driver's License"): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 380;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Card background
  const grad = ctx.createLinearGradient(0, 0, 600, 380);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.5, '#0f172a');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 380);

  // Border
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 588, 368);

  // Header band
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(6, 6, 588, 55);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(`OFFICIAL ${idType.toUpperCase()}`, 24, 40);

  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#bae6fd';
  ctx.fillText('VERIFIED RESIDENT CREDENTIAL', 400, 40);

  // Photo placeholder box
  ctx.fillStyle = '#334155';
  ctx.fillRect(28, 85, 130, 160);
  ctx.strokeStyle = '#64748b';
  ctx.strokeRect(28, 85, 130, 160);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('PHOTO ID', 65, 170);

  // Details
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('FULL LEGAL NAME', 180, 110);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(name.toUpperCase() || 'HAVEN MEMBER', 180, 135);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('DOCUMENT NUMBER', 180, 175);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px monospace';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  ctx.fillText(`ID-•••• •••• ${randomSuffix}`, 180, 198);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText('STATUS & AUTHENTICITY', 180, 235);
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('✓ BIOMETRIC & HOLOGRAM VALIDATED', 180, 255);

  // Security Hologram / Watermark band
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(6, 320, 588, 54);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText('🔒 HAVEN TRUST & SAFETY • 256-BIT ENCRYPTED ID VERIFICATION PASS', 24, 350);

  return canvas.toDataURL('image/jpeg', 0.85);
}
