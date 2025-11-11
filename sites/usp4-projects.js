const track = document.querySelector('.carousel-track');
const slides = Array.from(track.children);
const nextButton = document.querySelector('.carousel-btn.next');
const prevButton = document.querySelector('.carousel-btn.prev');
let currentIndex = 0;

function updateCarousel() {
  const slideWidth = slides[0].getBoundingClientRect().width;
  track.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
}

nextButton.addEventListener('click', () => {
  if (currentIndex < slides.length - 1) currentIndex++;
  updateCarousel();
});

prevButton.addEventListener('click', () => {
  if (currentIndex > 0) currentIndex--;
  updateCarousel();
});

window.addEventListener('resize', updateCarousel);
