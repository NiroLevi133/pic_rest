/**
 * Downloads an image to the device.
 * On iOS Safari: uses Web Share API with a File object so the user
 * gets the native share sheet and can tap "Save Image" → Photos.
 * On Android/desktop: creates a Blob URL and triggers anchor download.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const ext = blob.type.includes('png') ? '.png' : '.jpg';
    const name = filename.endsWith('.png') || filename.endsWith('.jpg')
      ? filename
      : filename + ext;

    const file = new File([blob], name, { type: blob.type || 'image/jpeg' });

    // iOS Safari: share sheet lets user tap "Save Image" → saves to Photos
    if (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: name });
      return;
    }

    // Desktop / Android: blob URL download
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch {
    // Last-resort fallback: open in new tab
    window.open(url, '_blank');
  }
}
