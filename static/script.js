const dropZone = document.getElementById('drop-zone');
const processingArea = document.getElementById('processing-area');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

let translations = {};
let currentLang = localStorage.getItem('lang') || 'en';
const uploadedFileNames = new Set();
const fileRegistry = new Map();
const fileDataStore = new Map();
// customSelectRegistry removed - using native selects now

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await initLanguages();
    await setLanguage(currentLang);
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    initBatchDropdown();
});

async function initLanguages() {
    const selector = document.getElementById('language-selector');
    if (!selector) return;

    try {
        const res = await fetch('/api/languages');
        const data = await res.json();

        selector.innerHTML = '';
        data.languages.forEach(lang => {
            const btn = document.createElement('button');
            btn.onclick = () => setLanguage(lang);
            btn.dataset.lang = lang;
            btn.className = "lang-btn px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 transition-all uppercase hover:text-white";
            btn.textContent = lang;
            selector.appendChild(btn);
        });
    } catch {
        // Fallback for offline or error
        selector.innerHTML = `
            <button onclick="setLanguage('tr')" data-lang="tr" class="lang-btn px-2 py-0.5 rounded text-[10px] text-gray-400">TR</button>
            <button onclick="setLanguage('en')" data-lang="en" class="lang-btn px-2 py-0.5 rounded text-[10px] text-gray-400">EN</button>
        `;
    }
}


// --- Language System ---
async function loadTranslations(lang) {
    try {
        const res = await fetch(`/static/locales/${lang}.json?v=1.0.3`);
        if (!res.ok) throw new Error('Language not found');
        translations[lang] = await res.json();
    } catch (e) {
        if (lang !== 'en') await loadTranslations('en');
    }
}

async function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;

    if (!translations[lang]) await loadTranslations(lang);
    updateUI();

    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-lang') === lang;
        btn.className = isActive
            ? 'lang-btn px-2 py-0.5 rounded text-[10px] font-bold transition-all bg-white text-black shadow-sm'
            : 'lang-btn px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 transition-all hover:text-white';
    });
}

function t(keyPath) {
    const keys = keyPath.split('.');
    let val = translations[currentLang];
    for (const k of keys) {
        val = val ? val[k] : null;
    }
    return val || keyPath;
}

function updateUI() {
    const tr = translations[currentLang];
    if (!tr) return;

    // Smart data-i18n bindings (handles nested objects)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val && val !== key) {
            // Handle nested objects (e.g., features.formats.title)
            if (typeof val === 'object' && val.title) {
                el.textContent = val.title;
            } else {
                el.textContent = val;
            }
        }
    });

    // Special bindings
    document.title = tr.title;

    // Update Batch Dropdown
    updateBatchDropdownUI();

    // Update Buttons in cards
    document.querySelectorAll('[id^="card-"]').forEach(card => {
        const btnConvert = card.querySelector('button[onclick^="startConversion"]');
        if (btnConvert) btnConvert.textContent = t('buttons.convert');

        const btnRemove = card.querySelector('button[onclick^="removeFile"]');
        if (btnRemove) btnRemove.title = t('buttons.remove');
    });
}

// --- Theme System ---
function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

function applyTheme(theme) {
    const html = document.documentElement;
    const isLight = theme === 'light';

    html.classList.toggle('dark', !isLight);
    html.classList.toggle('light', isLight);

    // Header styles
    const header = document.querySelector('header');
    if (header) {
        header.classList.toggle('bg-white/90', isLight);
        header.classList.toggle('bg-black/80', !isLight);
    }

    // Toggle Button
    const toggle = document.getElementById('theme-toggle');
    const knob = document.getElementById('toggle-knob');
    if (toggle) toggle.classList.toggle('bg-blue-500', isLight);
    if (toggle) toggle.classList.toggle('bg-gray-600', !isLight);
    if (knob) knob.style.transform = isLight ? 'translateX(24px)' : 'translateX(0)';

    // Body styles - Use classList instead of className override
    const body = document.body;
    if (isLight) {
        body.classList.remove('bg-black', 'text-gray-200');
        body.classList.add('bg-gradient-to-br', 'from-gray-50', 'via-white', 'to-gray-100', 'text-gray-900');
    } else {
        body.classList.remove('bg-gradient-to-br', 'from-gray-50', 'via-white', 'to-gray-100', 'text-gray-900');
        body.classList.add('bg-black', 'text-gray-200');
    }

    // Glass elements
    document.querySelectorAll('.glass').forEach(el => {
        el.classList.toggle('bg-white/80', isLight);
        el.classList.toggle('bg-white/5', !isLight);
        el.classList.toggle('shadow-md', isLight);
        el.classList.toggle('border-gray-200', isLight);
        el.classList.toggle('border-white/10', !isLight);
    });
}

// --- Drag & Drop ---
let dragCounter = 0;
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    document.addEventListener(evt, e => e.preventDefault());
    dropZone.addEventListener(evt, e => e.preventDefault());
});

document.addEventListener('dragenter', () => {
    dragCounter++;
    document.body.classList.add('ring-4', 'ring-blue-500/50');
});
document.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter === 0) document.body.classList.remove('ring-4', 'ring-blue-500/50');
});
document.addEventListener('drop', (e) => {
    dragCounter = 0;
    document.body.classList.remove('ring-4', 'ring-blue-500/50');
    if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files);
});
dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
document.addEventListener('paste', e => {
    if (e.clipboardData?.files.length) {
        showToast(t('toasts.pasting').replace('files', e.clipboardData.files.length));
        handleFiles(e.clipboardData.files);
    }
});

// --- File Handling ---
function goBack() {
    // Clear all file cards
    processingArea.querySelectorAll('[id^="card-"]').forEach(card => card.remove());

    // Clear all data stores
    uploadedFileNames.clear();
    fileRegistry.clear();
    fileDataStore.clear();

    // Hide progress bar if visible
    document.getElementById('batch-progress')?.classList.add('hidden');
    document.getElementById('btn-download-all')?.classList.add('hidden');

    // Show main screens
    processingArea.classList.add('hidden');
    dropZone.classList.remove('hidden');
    document.getElementById('hero-section').classList.remove('hidden');

    // Reset file input
    document.getElementById('file-input').value = '';
}

async function handleFiles(files) {
    if (!files.length) return;

    // Show processing area on first file
    dropZone.classList.add('hidden');
    document.getElementById('hero-section').classList.add('hidden');
    processingArea.classList.remove('hidden');

    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) showToast(`⚠️ ${t('toasts.largeFile')}`);
        if (uploadedFileNames.has(file.name)) {
            showToast(`⚠️ ${t('toasts.duplicate')}`);
            continue;
        }

        uploadedFileNames.add(file.name);
        const fileId = Math.random().toString(36).substring(7);
        createFileCard(file, fileId);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                updateCardWithOptions(fileId, data);
            } else {
                updateCardError(fileId, t('toasts.uploadFailed'));
            }
        } catch {
            updateCardError(fileId, t('toasts.serverError'));
        }
    }
}

function createFileCard(file, id) {
    const fileCards = document.getElementById('file-cards') || processingArea;
    const card = document.createElement('div');
    card.id = `card-${id}`;
    card.className = "file-card fade-in";
    card.innerHTML = `
        <div class="file-info">
            <div class="file-icon">⏳</div>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${t('status.loading')}</div>
            </div>
        </div>`;
    fileCards.appendChild(card);
}

function updateCardWithOptions(id, data) {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;

    // Store data
    fileRegistry.set(id, data.type);
    fileDataStore.set(id, data);
    updateBatchVisibility();

    // Prepare Data
    const icon = getIconForType(data.type);
    const formatOptions = getFormatOptions(data.type);
    const initialFormat = formatOptions[0]?.value || 'txt';
    const sizeMB = (data.size / 1024 / 1024).toFixed(2);

    card.innerHTML = `
        <div class="file-info">
            <div class="file-icon">${icon}</div>
            <div class="file-details">
                <div class="file-name">${data.original_name}</div>
                <div class="file-size">
                    <span class="bg-white/10 px-2 py-0.5 rounded text-[10px] uppercase mr-2">${data.extension}</span>
                    ${sizeMB} MB
                </div>
            </div>
        </div>
        <div class="file-actions" id="actions-${id}">
            <div id="select-wrapper-${id}" style="min-width: 140px;"></div>
            ${['image', 'pdf', 'docx', 'pptx', 'data'].includes(data.type.toLowerCase()) ? `
                <button onclick="openInWorkspace('${id}')" class="btn btn-secondary btn-sm flex items-center gap-1">
                    <span>📝</span> <span>Edit</span>
                </button>
            ` : ''}
            <button onclick="startConversion('${id}', '${data.filename}')" class="btn btn-primary btn-sm">
                ${t('buttons.convert')}
            </button>
            <button onclick="removeFile('${id}', '${data.original_name}')" class="btn btn-icon btn-secondary" title="${t('buttons.remove')}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
        </div>
        <div id="progress-${id}" class="progress-bar" style="width: 0%;"></div>
    `;

    // Render Custom Select
    const container = document.getElementById(`select-wrapper-${id}`);
    createCustomSelect(container, id, formatOptions, initialFormat);
}

// --- Native Dropdown Implementation (v3.0) ---

function createCustomSelect(container, id, options, initialValue) {
    const select = document.createElement('select');
    // Use CSS class instead of inline styles for theme support
    select.className = "custom-select";

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        if (opt.value === initialValue) option.selected = true;
        select.appendChild(option);
    });

    container.innerHTML = '';
    container.appendChild(select);

    // Add custom-select CSS if not exists
    addSelectStyles();
}

function addSelectStyles() {
    if (document.getElementById('custom-select-styles')) return;

    const style = document.createElement('style');
    style.id = 'custom-select-styles';
    style.textContent = `
        .custom-select {
            appearance: none;
            -webkit-appearance: none;
            width: 100%;
            padding: 10px 36px 10px 14px;
            font-size: 13px;
            font-family: inherit;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            background-color: var(--bg-input);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 12px;
        }
        .custom-select:hover {
            background-color: var(--bg-hover);
            border-color: var(--border-hover);
        }
        .custom-select:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.2);
        }
        .custom-select option {
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            padding: 8px;
        }
        .custom-select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}


// --- Batch Dropdown ---
function initBatchDropdown() {
    const container = document.getElementById('batch-select-container');
    if (!container) return;

    addSelectStyles();

    // Get formats that are applicable to current files
    const availableFormats = getAvailableBatchFormats();

    if (availableFormats.length === 0) {
        // No files or no common formats - show placeholder
        const select = document.createElement('select');
        select.className = 'custom-select';
        select.disabled = true;
        select.innerHTML = `<option>${t('applyAll') || 'Apply All'}</option>`;
        container.innerHTML = '';
        container.appendChild(select);
        return;
    }

    // Build options without groups (cleaner)
    const allOptions = [{ value: '', text: t('applyAll') || 'Apply All' }].concat(availableFormats);
    createCustomSelect(container, 'batch', allOptions, '');

    // Add change listener for batch dropdown
    const batchSelect = container.querySelector('select');
    if (batchSelect) {
        batchSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                applyBatchFormat(e.target.value);
            }
        });
    }
}

function getAvailableBatchFormats() {
    // Collect all file types currently loaded
    const loadedTypes = new Set();
    fileRegistry.forEach((type) => {
        loadedTypes.add(type.toLowerCase());
    });

    if (loadedTypes.size === 0) return [];

    // Find COMMON formats that can be applied to ALL loaded file types
    let commonFormats = null;

    loadedTypes.forEach(type => {
        const typeFormats = new Set(getFormatOptions(type).map(f => f.value));

        if (commonFormats === null) {
            commonFormats = typeFormats;
        } else {
            // Intersection: keep only formats that exist in both sets
            commonFormats = new Set([...commonFormats].filter(f => typeFormats.has(f)));
        }
    });

    if (!commonFormats || commonFormats.size === 0) return [];

    // Convert to array - NO GROUP to avoid "groups.common" issue
    return Array.from(commonFormats).map(f => {
        let label = f.toUpperCase();
        if (f === 'txt_ocr') label = 'TXT (OCR)';
        else if (f === 'docx_ocr') label = 'DOCX (OCR)';
        else if (f === 'pdf_ocr') label = 'PDF (OCR)';
        return {
            value: f,
            text: label
        };
    });
}

function updateBatchDropdownUI() {
    // Re-init to update based on current files
    initBatchDropdown();
}


function getFormatOptions(type) {
    // Returns array of {value, text, group}
    const map = {
        image: ['webp', 'png', 'jpg', 'gif', 'bmp', 'tiff', 'ico', 'pdf', 'txt_ocr', 'docx_ocr', 'pdf_ocr'],
        data: ['csv', 'xlsx', 'json', 'xml', 'html', 'txt'],
        pdf: ['docx', 'txt', 'html', 'md', 'png', 'jpg'],
        docx: ['pdf', 'txt', 'html', 'md'],
        pptx: ['pdf', 'png', 'jpg', 'txt'],
        archive: ['zip', '7z', 'tar']
    };

    const list = map[type.toLowerCase()] || ['txt'];
    return list.map(f => {
        let label = f.toUpperCase();
        if (f === 'txt_ocr') label = 'TXT (OCR)';
        else if (f === 'docx_ocr') label = 'DOCX (OCR)';
        else if (f === 'pdf_ocr') label = 'PDF (OCR)';
        return {
            value: f,
            text: label,
            group: type.toLowerCase()
        };
    });
}

function getAllFormatsGrouped() {
    // Only return formats for currently loaded file types
    return getAvailableBatchFormats();
}

function getIconForType(type) {
    const icons = {
        image: '🖼️',
        pdf: '📕',
        docx: '📄',
        pptx: '📊',
        document: '📄',
        archive: '📦',
        data: '📊'
    };
    return icons[type] || '📁';
}

// --- Conversion Logic ---
async function startConversion(id, filename) {
    const actionsDiv = document.getElementById(`actions-${id}`);
    const progressBar = document.getElementById(`progress-${id}`);

    // Get value from select element
    const selectEl = document.querySelector(`#select-wrapper-${id} select`);
    const format = selectEl?.value;
    if (!format) return showToast(t('toasts.error'));

    actionsDiv.innerHTML = `<span class="text-xs text-apple-accent animate-pulse">${t('status.converting')}</span>`;

    try {
        const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: filename, target_format: format })
        });
        const result = await res.json();

        if (result.success) {
            progressBar.style.width = "100%";
            progressBar.classList.add('success');

            actionsDiv.innerHTML = `
                <div class="flex items-center gap-2">
                    <button onclick="resetCard('${id}', '${filename}')" class="btn btn-secondary btn-icon" title="${t('buttons.convertAgain')}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    </button>
                    <a href="/api/download/${result.filename}" download class="btn btn-success btn-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        <span>${t('buttons.download')}</span>
                    </a>
                </div>`;
            checkDownloadAllButton();
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        actionsDiv.innerHTML = `
            <div class="flex flex-col items-end gap-2">
                <span class="text-xs text-red-500 font-medium">${e.message || t('toasts.error')}</span>
                <button onclick="resetCard('${id}', '${filename}')" class="btn btn-secondary btn-sm">${t('buttons.retry')}</button>
            </div>`;
        progressBar.style.width = "100%";
        progressBar.classList.add('error');
        triggerShake(`card-${id}`);
    }
}

function resetCard(id, filename) {
    const data = fileDataStore.get(id);
    if (data) updateCardWithOptions(id, data);
}

function removeFile(id, originalName) {
    const card = document.getElementById(`card-${id}`);
    if (card) {
        card.style.opacity = '0';
        setTimeout(() => {
            card.remove();
            uploadedFileNames.delete(originalName);
            fileRegistry.delete(id);
            fileDataStore.delete(id);
            updateBatchVisibility();
            const remaining = document.querySelectorAll('[id^="card-"]');
            if (remaining.length === 0) {
                processingArea.classList.add('hidden');
                dropZone.classList.remove('hidden');
                document.getElementById('hero-section')?.classList.remove('hidden');
                document.getElementById('btn-download-all')?.classList.add('hidden');
            }
        }, 300);
    }
}

// --- Utils ---
function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (toast && toastMessage) {
        toastMessage.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function updateCardError(id, msg) {
    const card = document.getElementById(`card-${id}`);
    const data = fileDataStore.get(id);
    const originalName = data?.original_name || '';

    card.className = "file-card error-shake";
    card.style.borderColor = 'var(--danger)';
    card.innerHTML = `
        <span class="text-red-500 text-sm">⚠️ ${msg}</span>
        <button onclick="removeFile('${id}', '${originalName}')" class="btn btn-icon btn-secondary">✕</button>`;
}

function triggerShake(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.classList.add('error-shake');
        setTimeout(() => el.classList.remove('error-shake'), 500);
    }
}

function updateBatchVisibility() {
    // Current logic just updates the batch dropdown text/content if needed
    // If we want intelligent hiding/showing of groups in batch dropdown, we'd need to re-render it.
    // For now, let's just re-init text
    updateBatchDropdownUI();
}

function applyBatchFormat(format) {
    if (!format) return;

    let count = 0;

    // Find all file card select dropdowns (native selects)
    document.querySelectorAll('[id^="select-wrapper-"]').forEach(wrapper => {
        const select = wrapper.querySelector('select');
        if (!select) return;

        // Check if this format exists in options
        const option = Array.from(select.options).find(opt => opt.value === format);
        if (option) {
            // Set the value
            select.value = format;

            // Visual feedback - briefly highlight
            select.style.boxShadow = '0 0 0 2px #0071e3';
            setTimeout(() => {
                select.style.boxShadow = '';
            }, 300);

            count++;
        }
    });

    if (count > 0) {
        showToast(t('toasts.batchSuccess').replace('format', format.toUpperCase()));
    } else {
        showToast(t('toasts.batchError'));
    }

    // Reset batch dropdown to "Apply All"
    const batchSelect = document.querySelector('#batch-select-container select');
    if (batchSelect) batchSelect.value = '';
}

async function convertAll() {
    const buttons = document.querySelectorAll('button[onclick^="startConversion"]');
    if (buttons.length === 0) return showToast(t('toasts.noFiles'));

    const total = buttons.length;
    let completed = 0;

    // Show progress bar
    const progressContainer = document.getElementById('batch-progress');
    const progressBar = document.getElementById('batch-progress-bar');
    const progressText = document.getElementById('batch-progress-text');

    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = `0/${total}`;

    showToast(t('toasts.converting'));

    for (const btn of buttons) {
        btn.click();
        await new Promise(r => setTimeout(r, 500));

        completed++;
        const percentage = (completed / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${completed}/${total}`;

        // Change to green when complete
        if (completed === total) {
            progressBar.classList.remove('from-blue-500', 'to-green-500');
            progressBar.classList.add('bg-green-500');
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                progressBar.classList.remove('bg-green-500');
                progressBar.classList.add('from-blue-500', 'to-green-500');
            }, 2000);
        }
    }
}

async function downloadAll() {
    const links = document.querySelectorAll('a[download]');
    const filenames = Array.from(links).map(a => a.href.split('/').pop());
    if (!filenames.length) return showToast(t('toasts.noDownload'));

    showToast(t('toasts.zipping'));
    try {
        const res = await fetch('/api/download-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames })
        });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "converted_files.zip";
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
        } else {
            showToast(t('toasts.zipError'));
        }
    } catch {
        showToast(t('toasts.connError'));
    }
}

function checkDownloadAllButton() {
    if (document.querySelectorAll('a[download]').length > 0) {
        document.getElementById('btn-download-all')?.classList.remove('hidden');
    }
}

// --- AI Workspace and Settings Modal Implementation ---

let activeWorkspaceFileId = null;
let workspaceFiles = new Map(); // fileId -> fileData
let manualEditMode = false;

// 1. Settings Modal Controls
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const input = document.getElementById('gemini-key-input');
    if (modal && input) {
        input.value = localStorage.getItem('gemini_api_key') || '';
        modal.classList.remove('hidden');
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
}

function saveSettings() {
    const input = document.getElementById('gemini-key-input');
    if (input) {
        const key = input.value.trim();
        localStorage.setItem('gemini_api_key', key);
        showToast('Settings saved successfully!');
        closeSettingsModal();
    }
}

// 2. Toggle Views
function toggleWorkspace() {
    const isWorkspaceVisible = !document.getElementById('workspace-section').classList.contains('hidden');
    const toggleBtn = document.getElementById('btn-workspace-toggle');
    const toggleText = document.getElementById('toggle-btn-text');

    if (isWorkspaceVisible) {
        // Switch back to Main Converter
        document.getElementById('workspace-section').classList.add('hidden');
        document.getElementById('hero-section').classList.remove('hidden');
        
        // If files are loaded, keep processing area open
        if (fileRegistry.size > 0) {
            processingArea.classList.remove('hidden');
            dropZone.classList.add('hidden');
        } else {
            dropZone.classList.remove('hidden');
            processingArea.classList.add('hidden');
        }
        document.getElementById('features-section').classList.remove('hidden');
        
        if (toggleBtn && toggleText) {
            toggleBtn.className = "btn btn-secondary btn-sm mr-2 flex items-center gap-1 font-medium";
            toggleText.textContent = "AI Workspace";
        }
    } else {
        // Switch to AI Workspace view
        document.getElementById('workspace-section').classList.remove('hidden');
        document.getElementById('hero-section').classList.add('hidden');
        dropZone.classList.add('hidden');
        processingArea.classList.add('hidden');
        document.getElementById('features-section').classList.add('hidden');
        
        if (toggleBtn && toggleText) {
            toggleBtn.className = "btn btn-primary btn-sm mr-2 flex items-center gap-1 font-semibold";
            toggleText.textContent = "Exit Workspace";
        }
        
        // Sync document lists
        syncWorkspaceDocumentList();
    }
}

// 3. Document Sync
function syncWorkspaceDocumentList() {
    const fileListContainer = document.getElementById('workspace-file-list');
    if (!fileListContainer) return;
    
    fileListContainer.innerHTML = '';
    
    // Convert fileRegistry Map into UI list
    if (fileDataStore.size === 0) {
        fileListContainer.innerHTML = `
            <div class="no-files-placeholder text-center text-xs text-muted py-6">
                No documents loaded.<br>Upload a file or click Open in Workspace.
            </div>
        `;
        return;
    }
    
    fileDataStore.forEach((data, id) => {
        const icon = getIconForType(data.type);
        const isActive = activeWorkspaceFileId === id;
        
        const item = document.createElement('div');
        item.className = `workspace-file-item ${isActive ? 'active' : ''}`;
        item.onclick = () => loadDocumentIntoEditor(id);
        item.innerHTML = `
            <span class="mr-2">${icon}</span>
            <span class="file-name" title="${data.original_name}">${data.original_name}</span>
        `;
        fileListContainer.appendChild(item);
    });
}

// 4. Open file in Workspace
function openInWorkspace(id) {
    activeWorkspaceFileId = id;
    
    // Ensure we are in workspace view
    const isWorkspaceVisible = !document.getElementById('workspace-section').classList.contains('hidden');
    if (!isWorkspaceVisible) {
        toggleWorkspace();
    } else {
        syncWorkspaceDocumentList();
        loadDocumentIntoEditor(id);
    }
}

// 5. Load Document Text
async function loadDocumentIntoEditor(id) {
    activeWorkspaceFileId = id;
    syncWorkspaceDocumentList();
    
    const data = fileDataStore.get(id);
    if (!data) return;
    
    // Set UI details
    document.getElementById('editor-file-name').textContent = data.original_name;
    document.getElementById('editor-file-icon').textContent = getIconForType(data.type);
    
    const badge = document.getElementById('editor-file-badge');
    badge.textContent = data.extension.replace('.', '').toUpperCase();
    
    // Enable/disable OCR button
    const ocrBtn = document.getElementById('btn-run-ocr');
    if (ocrBtn) {
        const isImage = data.type.toLowerCase() === 'image';
        ocrBtn.disabled = !isImage;
    }
    
    // Lock manual edits by default
    setManualEdit(false);
    
    const textarea = document.getElementById('editor-textarea');
    textarea.value = 'Loading text content...';
    updateGutter();
    
    try {
        const res = await fetch('/api/document/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: data.filename })
        });
        
        const result = await res.json();
        if (result.success) {
            textarea.value = result.text || '';
        } else {
            textarea.value = `Error loading file content: ${result.error}`;
        }
    } catch (e) {
        textarea.value = 'Network error loading file content.';
    }
    
    updateGutter();
    updateStats();
}

// 6. Editor controls
function syncEditorScroll() {
    const textarea = document.getElementById('editor-textarea');
    const gutter = document.getElementById('editor-gutter');
    if (textarea && gutter) {
        gutter.scrollTop = textarea.scrollTop;
    }
}

// We want line numbers to align perfectly with paragraphs in layout
function updateGutter() {
    const textarea = document.getElementById('editor-textarea');
    const gutter = document.getElementById('editor-gutter');
    if (!textarea || !gutter) return;
    
    const lines = textarea.value.split('\n');
    const lineCount = Math.max(1, lines.length);
    
    let gutterHTML = '';
    for (let i = 1; i <= lineCount; i++) {
        gutterHTML += `<div>${i}</div>`;
    }
    gutter.innerHTML = gutterHTML;
}

function updateStats() {
    const textarea = document.getElementById('editor-textarea');
    if (!textarea) return;
    
    const text = textarea.value;
    const lines = text.split('\n').length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;
    
    document.getElementById('stat-lines').textContent = lines;
    document.getElementById('stat-words').textContent = words;
    document.getElementById('stat-chars').textContent = chars;
}

function handleEditorInput() {
    updateGutter();
    updateStats();
}

// 7. Manual Edit Mode
function toggleManualEdit() {
    setManualEdit(!manualEditMode);
}

function setManualEdit(active) {
    manualEditMode = active;
    const textarea = document.getElementById('editor-textarea');
    const btn = document.getElementById('btn-manual-edit-toggle');
    
    if (textarea && btn) {
        if (manualEditMode) {
            textarea.readOnly = false;
            textarea.classList.add('manual-edit-active');
            btn.innerHTML = `
                <svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
                <span>Lock Editor</span>
            `;
            textarea.focus();
        } else {
            textarea.readOnly = true;
            textarea.classList.remove('manual-edit-active');
            btn.innerHTML = `
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <span>Edit Manually</span>
            `;
        }
    }
}

// 8. OCR Trigger
async function runOCRTextExtraction() {
    if (!activeWorkspaceFileId) return;
    const data = fileDataStore.get(activeWorkspaceFileId);
    if (!data) return;
    
    const ocrBtn = document.getElementById('btn-run-ocr');
    const textarea = document.getElementById('editor-textarea');
    
    if (ocrBtn && textarea) {
        const originalText = ocrBtn.innerHTML;
        ocrBtn.disabled = true;
        ocrBtn.innerHTML = `⏳ Extracting...`;
        
        try {
            const res = await fetch('/api/ocr/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_path: data.filename })
            });
            const result = await res.json();
            if (result.success) {
                textarea.value = result.text || '';
                showToast('Text extracted successfully!');
            } else {
                showToast(`OCR failed: ${result.error}`);
            }
        } catch {
            showToast('Network error extracting text.');
        } finally {
            ocrBtn.disabled = false;
            ocrBtn.innerHTML = originalText;
            updateGutter();
            updateStats();
        }
    }
}

// 9. AI prompt execution
async function sendAIPrompt() {
    const promptInput = document.getElementById('ai-prompt-input');
    const textarea = document.getElementById('editor-textarea');
    const btnSend = document.getElementById('btn-send-ai');
    
    if (!promptInput || !textarea) return;
    const promptValue = promptInput.value.trim();
    if (promptValue === '') return;
    
    const textValue = textarea.value;
    const apiKey = localStorage.getItem('gemini_api_key') || '';
    
    // Get active file name
    const activeFile = fileDataStore.get(activeWorkspaceFileId);
    const filename = activeFile ? activeFile.filename : null;
    
    // Disable inputs
    promptInput.disabled = true;
    btnSend.disabled = true;
    const originalBtnHTML = btnSend.innerHTML;
    btnSend.innerHTML = `<span>Editing...</span>`;
    
    // Glow effect
    document.querySelector('.ai-input-wrapper')?.classList.add('animate-pulse');
    
    try {
        const res = await fetch('/api/ai/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textValue,
                prompt: promptValue,
                api_key: apiKey,
                filename: filename
            })
        });
        
        const result = await res.json();
        if (result.success) {
            textarea.value = result.text || '';
            promptInput.value = '';
            showToast('Document updated by AI!');
        } else {
            showToast(`AI error: ${result.error}`);
            // If it is a key error, open settings modal automatically
            if (result.error.includes('API Key is missing')) {
                openSettingsModal();
            }
        }
    } catch {
        showToast('Network error during AI edits.');
    } finally {
        promptInput.disabled = false;
        btnSend.disabled = false;
        btnSend.innerHTML = originalBtnHTML;
        document.querySelector('.ai-input-wrapper')?.classList.remove('animate-pulse');
        updateGutter();
        updateStats();
    }
}

function applyQuickPrompt(instruction) {
    const promptInput = document.getElementById('ai-prompt-input');
    if (promptInput) {
        promptInput.value = instruction;
        promptInput.focus();
    }
}

// 10. Export / Save Document
async function exportDocument() {
    if (!activeWorkspaceFileId) return showToast('No document loaded to export');
    
    const data = fileDataStore.get(activeWorkspaceFileId);
    if (!data) return;
    
    const textarea = document.getElementById('editor-textarea');
    const select = document.getElementById('export-format-select');
    const btnExport = document.getElementById('btn-export-doc');
    
    if (!textarea || !select) return;
    
    const textValue = textarea.value;
    const targetFormat = select.value;
    
    const originalBtnHTML = btnExport.innerHTML;
    btnExport.disabled = true;
    btnExport.innerHTML = `⏳ Saving...`;
    
    try {
        const res = await fetch('/api/document/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textValue,
                filename: data.original_name,
                target_format: targetFormat
            })
        });
        
        const result = await res.json();
        if (result.success) {
            // Trigger download
            const a = document.createElement('a');
            a.href = result.url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Document exported successfully!');
        } else {
            showToast(`Export failed: ${result.error}`);
        }
    } catch {
        showToast('Network error exporting document.');
    } finally {
        btnExport.disabled = false;
        btnExport.innerHTML = originalBtnHTML;
    }
}
