import { useState, useEffect, type FC, type ReactElement } from "react";
import { ChevronLeft, ChevronRight, XIcon, TrashIcon, StarIcon } from "../../ui/icons";

export interface PhotoLightboxModalProps {
  photos: string[];
  initialIndex?: number;
  captions?: string[];
  onClose: () => void;
  onSetHero?: (photoIndex: number) => void;
  onDeletePhoto?: (photoIndex: number) => void;
}

export const PhotoLightboxModal: FC<PhotoLightboxModalProps> = ({
  photos,
  initialIndex = 0,
  captions = [],
  onClose,
  onSetHero,
  onDeletePhoto
}): ReactElement | null => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev: number): number => (prev > 0 ? prev - 1 : photos.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev: number): number => (prev < photos.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length, onClose]);

  if (photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex] || photos[0];
  const currentCaption = captions[currentIndex];

  const handlePrev = (): void => {
    setCurrentIndex((prev: number): number => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (): void => {
    setCurrentIndex((prev: number): number => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "var(--space-4)"
      }}
    >
      {/* Top Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--surface)" }}>
        <div style={{ fontSize: "0.95rem", opacity: 0.85 }}>
          {currentIndex + 1} / {photos.length}
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          {onSetHero && currentIndex > 0 && (
            <button
              type="button"
              onClick={(): void => onSetHero(currentIndex)}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "var(--surface)",
                border: "none",
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem"
              }}
            >
              <StarIcon width={14} height={14} /> Make Hero
            </button>
          )}

          {onDeletePhoto && (
            <button
              type="button"
              onClick={(): void => onDeletePhoto(currentIndex)}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                color: "var(--danger)",
                border: "none",
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem"
              }}
              title="Delete Photo"
            >
              <TrashIcon width={14} height={14} /> Delete
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--surface)",
              cursor: "pointer",
              padding: "8px"
            }}
            title="Close Lightbox"
          >
            <XIcon width={24} height={24} />
          </button>
        </div>
      </div>

      {/* Main Photo View Area */}
      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", margin: "var(--space-4) 0" }}>
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            style={{
              position: "absolute",
              left: "var(--space-2)",
              background: "rgba(255, 255, 255, 0.2)",
              color: "var(--surface)",
              border: "none",
              borderRadius: "var(--radius-full)",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 2
            }}
          >
            <ChevronLeft width={24} height={24} />
          </button>
        )}

        <img
          src={currentPhoto}
          alt={currentCaption || `Photo ${currentIndex + 1}`}
          style={{
            maxWidth: "100%",
            maxHeight: "75vh",
            objectFit: "contain",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
          }}
        />

        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            style={{
              position: "absolute",
              right: "var(--space-2)",
              background: "rgba(255, 255, 255, 0.2)",
              color: "var(--surface)",
              border: "none",
              borderRadius: "var(--radius-full)",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 2
            }}
          >
            <ChevronRight width={24} height={24} />
          </button>
        )}
      </div>

      {/* Caption & Thumbnail Strip */}
      <div>
        {currentCaption && (
          <div style={{ textAlign: "center", color: "var(--surface)", fontSize: "0.95rem", marginBottom: "var(--space-3)", opacity: 0.9 }}>
            {currentCaption}
          </div>
        )}

        {photos.length > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-2)", overflowX: "auto", padding: "4px" }}>
            {photos.map((url: string, idx: number): ReactElement => (
              <button
                key={url + idx}
                type="button"
                onClick={(): void => setCurrentIndex(idx)}
                style={{
                  border: idx === currentIndex ? "2px solid var(--accent)" : "2px solid transparent",
                  padding: 0,
                  background: "none",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  opacity: idx === currentIndex ? 1 : 0.6
                }}
              >
                <img
                  src={url}
                  alt={`Thumbnail ${idx + 1}`}
                  style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "var(--radius-sm)", display: "block" }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
