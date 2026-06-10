const VERSIONED_ROOM_IMAGES_BY_CITY = {
  bath: "/uploads/system/room-warm-suite.jpg",
  beijing: "/uploads/system/room-zen-suite.jpg",
  edinburgh: "/uploads/system/room-city-suite.jpg",
  florence: "/uploads/system/room-city-suite.jpg",
  kyoto: "/uploads/system/room-zen-suite.jpg",
  madeira: "/uploads/system/room-warm-suite.jpg",
  marrakech: "/uploads/system/room-warm-suite.jpg",
  tokyo: "/uploads/system/room-zen-suite.jpg"
};

function normalizeCity(value) {
  return String(value || "").trim().toLowerCase();
}

export function getVersionedRoomImage(roomTheme) {
  return VERSIONED_ROOM_IMAGES_BY_CITY[normalizeCity(roomTheme?.city)] || null;
}

export function getRoomDisplayImage(roomTheme, galleryImages = []) {
  const versionedImage = getVersionedRoomImage(roomTheme);
  if (versionedImage) return versionedImage;

  const firstGalleryImage = galleryImages
    .map((image) => image?.imageUrl || image)
    .filter(Boolean)[0];

  return firstGalleryImage || roomTheme?.image || roomTheme?.showcaseImage || null;
}

export function normalizeThemeImages(roomTheme, galleryImages = []) {
  const versionedImage = getVersionedRoomImage(roomTheme);
  if (versionedImage) {
    return [
      {
        imageUrl: versionedImage,
        isPrimary: true,
        orderIndex: 0
      }
    ];
  }

  return galleryImages;
}
