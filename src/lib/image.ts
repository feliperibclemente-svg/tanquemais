/**
 * Reduz uma foto escolhida no celular para um quadrado pequeno (JPEG em data URL).
 *
 * A foto fica direto no perfil (coluna avatar_url), sem precisar de armazenamento de
 * arquivos: 256 px em JPEG ocupa uns 15–30 KB, o suficiente para um avatar.
 */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export async function photoToAvatarDataUrl(file: File, size = 256, quality = 0.82) {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Foto muito grande. Use uma de até 15 MB.");

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não conseguimos abrir essa foto."));
      img.src = url;
    });

    // Recorte central quadrado, depois redução.
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não conseguimos processar essa foto.");
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
