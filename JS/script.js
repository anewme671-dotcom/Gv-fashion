const slides = Array.from(document.querySelectorAll('.hero-image'));
const previousButton = document.querySelector('[data-slider="previous"]');
const nextButton = document.querySelector('[data-slider="next"]');
const status = document.querySelector('.slider-status');
let currentSlide = 0;
let timer;

// Smoothly move to sections linked with #story or #contact.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
        const target = document.querySelector(link.getAttribute('href'));

        if (!target) return;

        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', link.getAttribute('href'));
    });
});

function showSlide(index) {
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === currentSlide));
    if (status) status.textContent = `${String(currentSlide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
}

function startSlider() {
    if (slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer = window.setInterval(() => showSlide(currentSlide + 1), 5000);
}

function resetSlider() {
    window.clearInterval(timer);
    startSlider();
}

if (slides.length) {
    previousButton?.addEventListener('click', () => { showSlide(currentSlide - 1); resetSlider(); });
    nextButton?.addEventListener('click', () => { showSlide(currentSlide + 1); resetSlider(); });
    startSlider();
}
