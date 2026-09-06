const root = document.documentElement;
const loginScreen = document.querySelector('#login-screen');
const dashboardApp = document.querySelector('#dashboard-app');
const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
if (!loginForm || !loginMessage) {
    throw new Error('Dashboard login markup is missing.');
}
if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    loginMessage.textContent = 'The Supabase library could not load. Check the internet connection and refresh this page.';
    throw new Error('Supabase client library did not load.');
}
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: async (_name, _acquireTimeout, callback) => callback()
    }
});
const uploadForm = document.querySelector('#upload-form');
const fileInput = document.querySelector('#image-file');
const filePreview = document.querySelector('#file-preview');
const previewImage = document.querySelector('#preview-image');
const removePreview = document.querySelector('#remove-preview');
const imageLibrary = document.querySelector('#image-library');
const imageCount = document.querySelector('#image-count');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-images');
const filterSelect = document.querySelector('#filter-area');
const areaSelect = document.querySelector('#image-area');
const categorySelect = document.querySelector('#image-category');
const formMessage = document.querySelector('#form-message');
const themeToggle = document.querySelector('[data-theme-toggle]');
let images = [];
let selectedImage = null;

function updateThemeToggle(theme) {
    const isDark = theme === 'dark';
    themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
    themeToggle.setAttribute('aria-pressed', String(isDark));
}

function showLogin(message = '') {
    loginScreen.classList.remove('is-hidden');
    dashboardApp.classList.add('is-hidden');
    loginScreen.removeAttribute('hidden');
    dashboardApp.setAttribute('hidden', '');
    loginMessage.textContent = message;
}

function showDashboard() {
    loginScreen.classList.add('is-hidden');
    dashboardApp.classList.remove('is-hidden');
    loginScreen.setAttribute('hidden', '');
    dashboardApp.removeAttribute('hidden');
}

function displayError(message) {
    formMessage.textContent = message;
}

async function loadImages() {
    const { data, error } = await supabaseClient
        .from('content_images')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
    if (error) {
        const message = `Signed in, but the image library could not load: ${error.message}`;
        formMessage.textContent = message;
        loginMessage.textContent = message;
        return;
    }
    images = data || [];
    renderImages();
}

function renderImages() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const area = filterSelect.value;
    const visibleImages = images.filter((image) => {
        const matchesSearch = image.name.toLowerCase().includes(searchTerm);
        const matchesArea = area === 'all' || image.area === area;
        return matchesSearch && matchesArea;
    });

    imageLibrary.replaceChildren();
    imageCount.textContent = `${visibleImages.length} image${visibleImages.length === 1 ? '' : 's'}`;
    emptyState.hidden = visibleImages.length > 0;

    visibleImages.forEach((image) => {
        const card = document.querySelector('#image-card-template').content.cloneNode(true);
        const article = card.querySelector('.image-card');
        const imageElement = card.querySelector('.card-image');
        const areaLabel = card.querySelector('.area-label');
        const name = card.querySelector('.card-name');
        const imageIndex = images.findIndex((item) => item.id === image.id);

        imageElement.src = image.image_url;
        imageElement.alt = image.name;
        areaLabel.textContent = `${image.area === 'hero' ? 'Hero slider' : 'Catalog'}${image.is_visible ? '' : ' - Hidden'}`;
        name.textContent = image.name;
        card.querySelector('.move-up').disabled = imageIndex === 0;
        card.querySelector('.move-down').disabled = imageIndex === images.length - 1;
        card.querySelector('.move-up').addEventListener('click', () => moveImage(imageIndex, -1));
        card.querySelector('.move-down').addEventListener('click', () => moveImage(imageIndex, 1));
        const visibilityButton = card.querySelector('.visibility-button');
        visibilityButton.textContent = image.is_visible ? 'Hide' : 'Show';
        visibilityButton.setAttribute('aria-label', `${image.is_visible ? 'Hide' : 'Show'} ${image.name}`);
        visibilityButton.addEventListener('click', () => toggleVisibility(image));
        card.querySelector('.delete-button').addEventListener('click', () => deleteImage(image));
        imageLibrary.appendChild(article);
    });
}

async function toggleVisibility(image) {
    const nextVisibility = !image.is_visible;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        displayError('Your dashboard session has expired. Sign out and sign in again before changing visibility.');
        return;
    }
    const { error } = await supabaseClient
        .from('content_images')
        .update({ is_visible: nextVisibility })
        .eq('id', image.id);
    if (error) {
        displayError(`Could not update visibility (${session.user.email}): ${error.message}`);
        return;
    }
    image.is_visible = nextVisibility;
    renderImages();
}

async function moveImage(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
    const results = await Promise.all(images.map((image, order) => supabaseClient
        .from('content_images')
        .update({ display_order: order })
        .eq('id', image.id)));
    const failedUpdate = results.find((result) => result.error);
    if (failedUpdate) {
        displayError(`Could not reorder images: ${failedUpdate.error.message}`);
        await loadImages();
        return;
    }
    renderImages();
}

async function deleteImage(image) {
    if (!window.confirm(`Remove “${image.name}” from the online library?`)) return;
    const { error } = await supabaseClient.from('content_images').delete().eq('id', image.id);
    if (error) {
        displayError(`Could not delete image: ${error.message}`);
        return;
    }
    images = images.filter((item) => item.id !== image.id);
    renderImages();
}

function showPreview(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        displayError('Please choose an image smaller than 5 MB.');
        fileInput.value = '';
        return;
    }
    selectedImage = file;
    previewImage.src = URL.createObjectURL(file);
    filePreview.hidden = false;
    formMessage.textContent = '';
}

async function uploadImage(event) {
    event.preventDefault();
    if (!selectedImage) {
        displayError('Choose an image before adding it.');
        return;
    }

    const submitButton = uploadForm.querySelector('button[type="submit"]');
    const name = document.querySelector('#image-name').value.trim();
    const area = areaSelect.value;
    const category = categorySelect.value || null;
    if (area === 'catalog' && !category) {
        displayError('Choose a catalog category before adding this image.');
        return;
    }
    const filePath = `${area}/${crypto.randomUUID()}-${selectedImage.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    submitButton.disabled = true;
    formMessage.textContent = 'Uploading image...';

    const { error: uploadError } = await supabaseClient.storage.from('site-images').upload(filePath, selectedImage, { upsert: false });
    if (uploadError) {
        submitButton.disabled = false;
        displayError(`Upload failed: ${uploadError.message}`);
        return;
    }

    const { data: publicFile } = supabaseClient.storage.from('site-images').getPublicUrl(filePath);
    const { error: insertError } = await supabaseClient.from('content_images').insert({
        name,
        area,
        category,
        image_url: publicFile.publicUrl,
        display_order: images.length
    });
    submitButton.disabled = false;

    if (insertError) {
        displayError(`Image uploaded but could not be listed: ${insertError.message}`);
        return;
    }

    uploadForm.reset();
    selectedImage = null;
    filePreview.hidden = true;
    formMessage.textContent = 'Image uploaded successfully.';
    await loadImages();
}

fileInput.addEventListener('change', () => showPreview(fileInput.files[0]));
uploadForm.addEventListener('submit', uploadImage);
removePreview.addEventListener('click', () => {
    selectedImage = null;
    fileInput.value = '';
    filePreview.hidden = true;
    previewImage.removeAttribute('src');
});
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button');
    button.disabled = true;
    loginMessage.textContent = 'Signing in...';
    const timeout = new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('The login request timed out. Check your internet connection and Supabase project URL.')), 15000);
    });
    try {
        const signIn = supabaseClient.auth.signInWithPassword({
            email: document.querySelector('#login-email').value,
            password: document.querySelector('#login-password').value
        });
        const { error } = await Promise.race([signIn, timeout]);
        if (error) {
            loginMessage.textContent = error.message;
            return;
        }
        loginMessage.textContent = 'Signed in. Loading your dashboard...';
        showDashboard();
        await loadImages();
    } catch (error) {
        loginMessage.textContent = `Login failed: ${error.message}`;
    } finally {
        button.disabled = false;
    }
});
document.querySelector('#logout-button').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});
searchInput.addEventListener('input', renderImages);
filterSelect.addEventListener('change', renderImages);
areaSelect.addEventListener('change', () => {
    const isCatalog = areaSelect.value === 'catalog';
    categorySelect.required = isCatalog;
    if (!isCatalog) categorySelect.value = '';
});
categorySelect.required = areaSelect.value === 'catalog';
themeToggle.addEventListener('click', () => {
    const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    updateThemeToggle(nextTheme);
});
const initialTheme = localStorage.getItem('theme') || 'light';
root.setAttribute('data-theme', initialTheme);
updateThemeToggle(initialTheme);
supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) {
        showLogin();
        return;
    }
    showDashboard();
    await loadImages();
});
