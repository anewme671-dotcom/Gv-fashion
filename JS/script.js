const previousButton = document.querySelector('[data-slider="previous"]');
const nextButton = document.querySelector('[data-slider="next"]');
const status = document.querySelector('.slider-status');
const themeToggle = document.querySelector('.theme-toggle');
const root = document.documentElement;
let slides = [];
let currentSlide = 0;
let timer;

function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
        const isDark = theme === 'dark';
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    }
    localStorage.setItem('theme', theme);
}

const savedTheme = localStorage.getItem('theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
applyTheme(savedTheme || preferredTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
    });
}

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

async function loadOnlineHeroImages() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY) return;

    const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
    const { data, error } = await client
        .from('content_images')
        .select('name, image_url')
        .eq('area', 'hero')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

    if (error || !data?.length) return;

    const slider = document.querySelector('.hero-slider');
    if (!slider) return;
    const onlineSlides = data.map((image) => {
        const slide = document.createElement('img');
        slide.className = 'hero-image';
        slide.src = image.image_url;
        slide.alt = image.name;
        return slide;
    });
    slider.append(...onlineSlides);
}

async function initializeSlider() {
    await loadOnlineHeroImages();
    slides = Array.from(document.querySelectorAll('.hero-image'));
    if (!slides.length) return;
    showSlide(0);
    previousButton?.addEventListener('click', () => { showSlide(currentSlide - 1); resetSlider(); });
    nextButton?.addEventListener('click', () => { showSlide(currentSlide + 1); resetSlider(); });
    startSlider();
}

initializeSlider();
