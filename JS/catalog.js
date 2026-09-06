const catalogClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);

function createCatalogItem(image) {
    const article = document.createElement('article');
    article.className = 'catalog-item';
    const imageElement = document.createElement('img');
    imageElement.src = image.image_url;
    imageElement.alt = image.name;
    imageElement.loading = 'lazy';
    const details = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = image.name;
    const inquiry = document.createElement('a');
    inquiry.href = `https://wa.me/2347043464510?text=Hello%20Great%20Vision%20Fashion%2C%20I%27m%20interested%20in%20the%20${encodeURIComponent(image.name)}.`;
    inquiry.target = '_blank';
    inquiry.rel = 'noopener noreferrer';
    inquiry.innerHTML = 'Inquire on WhatsApp &#8599;';
    details.append(title, inquiry);
    article.append(imageElement, details);
    return article;
}

async function loadCatalogImages() {
    const { data, error } = await catalogClient
        .from('content_images')
        .select('name, area, category, image_url, is_visible, display_order')
        .eq('area', 'catalog')
        .eq('is_visible', true)
        .not('category', 'is', null)
        .order('display_order', { ascending: true });

    if (error) {
        console.error('Could not load uploaded catalog images:', error.message);
        return;
    }

    data.forEach((image) => {
        const grid = document.querySelector(`[data-category="${CSS.escape(image.category)}"]`);
        if (grid) grid.appendChild(createCatalogItem(image));
    });

    if (data.some((image) => image.category === 'baggies')) {
        document.querySelector('[data-baggies-coming-soon]')?.remove();
        const baggiesDescription = document.querySelector('[data-baggies-description]');
        if (baggiesDescription) baggiesDescription.textContent = 'Relaxed Baggie styles for a confident, easy fit.';
    }
}

loadCatalogImages();
