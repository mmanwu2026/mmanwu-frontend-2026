export async function getCroppedImg(imageSrc: string, crop: any, zoom: number) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const size = Math.min(image.width, image.height);
  canvas.width = size;
  canvas.height = size;

  const scale = image.width / image.naturalWidth;

  const pixelCrop = {
    x: crop.x * scale,
    y: crop.y * scale,
    width: size * scale / zoom,
    height: size * scale / zoom,
  };

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg");
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.src = url;
  });
}
