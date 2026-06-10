export function getRoomDisplayImage(roomTheme, galleryImages = []) {
  const firstGalleryImage = galleryImages
    .map((image) => image?.imageUrl || image)
    .filter(Boolean)[0];

  return firstGalleryImage || roomTheme?.image || roomTheme?.showcaseImage || null;
}

export function normalizeThemeImages(roomTheme, galleryImages = []) {
  return galleryImages;
}
