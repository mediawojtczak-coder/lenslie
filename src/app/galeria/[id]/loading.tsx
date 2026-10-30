// Ekran ładowania galerii klienta – widać go od razu, zanim zdjęcia się przygotują
export default function GalleryLoading() {
  return (
    <div className="gallery-loading" aria-busy="true">
      <div>
        <div className="spin" />
      </div>
    </div>
  );
}
