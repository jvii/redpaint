import { Context } from '../../overmind';
import { countDistinctColors } from '../../algorithm/imageColors';
import { setPendingImage } from '../../canvas/pendingImage';

export const imageFileToPasteBuffer = (context: Context, imageFile: File): void => {
  context.state.app.pasteBufferImageObjectURL = URL.createObjectURL(imageFile);
};

// Starts an image load: decode the file, take stock of it (size, distinct
// colors), and open the requester that asks how to treat its colors. The
// pixels wait in canvas/pendingImage.ts for the requester's answer; the URL
// is consumed (revoked) here either way. Both Image > Open and "Paste as new
// image" come through this.
export const beginImageLoad = async (context: Context, url: string): Promise<void> => {
  context.actions.app.setLoading(true);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject): void => {
      image.onload = (): void => resolve();
      image.onerror = (): void => reject(new Error('image decode failed'));
      image.src = url;
    });
    const decodeCanvas = document.createElement('canvas');
    decodeCanvas.width = image.width;
    decodeCanvas.height = image.height;
    const ctx = decodeCanvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    setPendingImage(imageData);
    context.state.app.imageLoadInfo = {
      width: image.width,
      height: image.height,
      colorCount: countDistinctColors(imageData.data),
    };
    context.actions.dialog.open('IMAGE_LOAD');
  } catch {
    alert('Failed to open file!');
  } finally {
    URL.revokeObjectURL(url);
    context.actions.app.setLoading(false);
  }
};

export const clearImageLoadInfo = (context: Context): void => {
  context.state.app.imageLoadInfo = null;
};

export const setLoading = (context: Context, isLoading: boolean): void => {
  context.state.app.isLoading = isLoading;
};

export const toggleMenu = (context: Context): void => {
  context.state.app.menuOpen = !context.state.app.menuOpen;
};

export const closeMenu = (context: Context): void => {
  context.state.app.menuOpen = false;
};
