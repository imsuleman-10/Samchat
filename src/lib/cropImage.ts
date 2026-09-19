export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number, y: number, width: number, height: number },
  rotation = 0
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Calculate bounding box of the rotated image
  const boundingBox = {
    width: image.width,
    height: image.height,
  };

  canvas.width = boundingBox.width;
  canvas.height = boundingBox.height;

  // Translate canvas context to center to allow rotating around center
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw image
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // Create final crop canvas
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Paste generated rotate image with correct offsets
  ctx.putImageData(data, 0, 0);

  // As a blob
  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, 'image/jpeg', 0.95);
  });
}
