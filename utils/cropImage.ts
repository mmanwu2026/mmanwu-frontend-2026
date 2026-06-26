export async function getCroppedImg(
  imageSrc: string,
  crop: { x: number; y: number },
  zoom: number
): Promise<Blob> {
  const image = await createImage(imageSrc);

  // Final enforced output size
  const OUTPUT_SIZE = 300;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;

  // Scale factor between displayed image and natural image
  const scale = naturalWidth / image.width;

  // Convert crop values into natural pixel coordinates
  const pixelCrop = {
    x: crop.x * scale,
    y: crop.y * scale,
    width: naturalWidth / zoom,
    height: naturalHeight / zoom,
  };

  // Draw the cropped area into a fixed 300x300 canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      "image/jpeg",
      0.9 // high quality
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = url;
  });
}
