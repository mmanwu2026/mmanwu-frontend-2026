export async function resizeTo256(imageSrc: string): Promise<Blob> {
  const img = await createImage(imageSrc);

  const SIZE = 256;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = SIZE;
  canvas.height = SIZE;

  ctx.drawImage(img, 0, 0, SIZE, SIZE);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = url;
  });
}
