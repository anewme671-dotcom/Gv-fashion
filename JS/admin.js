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
const formMessage = document.querySelector('#form-message');
let images = [];
let selectedImage = null;

function showLogin(message = '') {
    loginScreen.hidden = false;
    dashboardApp.hidden = true;
    loginMessage.textContent = message;
}

function showDashboard() {
    loginScreen.hidden = true;
    dashboardApp.hidden = false;
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
        displayError(`Could not load images: ${error.message}`);
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
        areaLabel.textContent = image.area === 'hero' ? 'Hero slider' : 'Catalog';
        name.textContent = image.name;
        card.querySelector('.move-up').disabled = imageIndex === 0;
        card.querySelector('.move-down').disabled = imageIndex === images.length - 1;
        card.querySelector('.move-up').addEventListener('click', () => moveImage(imageIndex, -1));
        card.querySelector('.move-down').addEventListener('click', () => moveImage(imageIndex, 1));
        card.querySelector('.delete-button').addEventListener('click', () => deleteImage(image));
        imageLibrary.appendChild(article);
    });
}

async function moveImage(index, direction) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
    const updates = images.map((image, order) => ({ id: image.id, display_order: order }));
    const { error } = await supabaseClient.from('content_images').upsert(updates);
    if (error) {
        displayError(`Could not reorder images: ${error.message}`);
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
    const area = document.querySelector('#image-area').value;
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
document.querySelector('[data-theme-toggle]').addEventListener('click', () => {
    const nextTheme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
});
root.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) {
        showLogin();
        return;
    }
    showDashboard();
    await loadImages();
});
