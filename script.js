// Global config
let config = null;

function loadConfig() {
    try {
        const configScript = document.getElementById('site-config');
        if (configScript) {
            config = JSON.parse(configScript.textContent);
            buildSlides();
            initializeApp();
        } else {
            throw new Error('Config not found');
        }
    } catch (error) {
        console.error('Error loading config:', error);
        alert('Error loading content. Please refresh the page.');
    }
}

function buildSlides() {
    const container = document.querySelector('.slides-container');
    if (!container || !config) return;

    let slideIndex = 0;

    const headingSlide = createHeadingSlide(config.heading, slideIndex++);
    container.appendChild(headingSlide);

    config.content.forEach((item, index) => {
        let slide;
        if (item.type === 'video') {
            slide = createVideoSlide(item, slideIndex++, index);
        } else if (item.type === 'collage') {
            slide = createCollageSlide(item, slideIndex++, index);
        } else {
            slide = createImageSlide(item, slideIndex++, index);
        }
        container.appendChild(slide);
    });

    const endingSlide = createEndingSlide(config.ending, slideIndex++);
    container.appendChild(endingSlide);

    requestAnimationFrame(() => syncSlideHeights());
}

function createHeadingSlide(heading, index) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-intro slide-year-wrap';
    slide.setAttribute('data-slide', index);
    const logoHtml = heading.logo
        ? `<div class="intro-logo-wrap"><img src="${heading.logo}" alt="U&I" class="intro-logo" /></div>`
        : '';
    slide.innerHTML = `
        <div class="slide-content intro-year-wrap-content">
            ${logoHtml}
            <p class="intro-report-label">${heading.subtitle || ''}</p>
            <h1 class="slide-title-large intro-report-title">${heading.title || ''}</h1>
            ${heading.description ? `<p class="slide-description intro-report-desc">${heading.description}</p>` : ''}
            <div class="scroll-hint">${heading.tagline || '↓ Scroll to explore'}</div>
        </div>
    `;
    return slide;
}

function createImageSlide(item, index, contentIndex) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-image';
    slide.setAttribute('data-slide', index);

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.title || 'U&I Activity';
    img.className = 'reel-image';
    img.loading = 'lazy';
    img.addEventListener('load', function() { optimizeImageForMobile(this); });
    img.addEventListener('error', function() { this.style.display = 'none'; });

    slide.innerHTML = `
        <div class="image-container"></div>
        <div class="slide-caption">
            <h2 class="slide-title">${item.title || ''}</h2>
            ${item.description ? `<p class="slide-description">${item.description}</p>` : ''}
        </div>
    `;
    const container = slide.querySelector('.image-container');
    container.appendChild(img);
    return slide;
}

function createVideoSlide(item, index, contentIndex) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-video';
    slide.setAttribute('data-slide', index);
    slide.innerHTML = `
        <div class="video-container">
            <video class="reel-video" playsinline muted loop preload="metadata" src="${item.src}"></video>
        </div>
        <div class="slide-caption">
            <h2 class="slide-title">${item.title || ''}</h2>
            ${item.description ? `<p class="slide-description">${item.description}</p>` : ''}
        </div>
    `;
    const video = slide.querySelector('video');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.play().catch(() => {});
            else entry.target.pause();
        });
    }, { threshold: 0.5 });
    observer.observe(video);
    return slide;
}

function createCollageSlide(item, index, contentIndex) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-collage';
    slide.setAttribute('data-slide', index);
    const caption = item.caption || item.description || '';
    slide.innerHTML = `
        <div class="collage-container">
            <img src="${item.src}" alt="${item.title || ''}" class="collage-image" loading="lazy" />
        </div>
        ${caption ? `<div class="slide-caption slide-caption-minimal"><p class="slide-description">${caption}</p></div>` : ''}
    `;
    return slide;
}

function createEndingSlide(ending, index) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-ending';
    slide.setAttribute('data-slide', index);
    const website = ending.contactInfo?.website || '';
    const ctaUrl = website.startsWith('http') ? website : 'https://' + website.replace(/^www\./, 'www.');
    const audit = ending.auditReport || {};
    const auditUrl = audit.url || '';
    const auditHtml = auditUrl
        ? `<a href="${auditUrl}" target="_blank" rel="noopener" class="cta-button cta-button-secondary">${audit.text || 'View Annual Audit Report'}</a>`
        : '';
    slide.innerHTML = `
        <div class="slide-content ending-content">
            <h2 class="slide-title-large">${ending.title || ''}</h2>
            <p class="ending-subtitle">${ending.subtitle || ''}</p>
            <p class="slide-description">${ending.description || ''}</p>
            <a href="${ctaUrl}" target="_blank" rel="noopener" class="cta-button">${ending.ctaButton?.text || 'Support Our Mission'}</a>
            ${auditHtml}
            <p class="ending-message">${ending.contactInfo?.message || ''}</p>
        </div>
    `;
    return slide;
}

function optimizeImageForMobile(img) {
    if (window.innerWidth < 768 && img.naturalWidth > 0) {
        img.style.objectFit = 'cover';
    }
}

function syncSlideHeights() {
    const container = document.querySelector('.slides-container');
    if (!container) return;
    const h = container.clientHeight;
    document.querySelectorAll('.slides-container .slide').forEach(slide => {
        slide.style.height = h + 'px';
        slide.style.minHeight = h + 'px';
        slide.style.maxHeight = h + 'px';
    });
}

function initializeApp() {
    const container = document.querySelector('.slides-container');
    if (!container) return;

    syncSlideHeights();
    window.addEventListener('resize', syncSlideHeights);

    // Progress bar
    function updateProgress() {
        const fill = document.querySelector('.progress-fill');
        if (!fill) return;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        fill.style.width = pct + '%';
    }
    container.addEventListener('scroll', updateProgress);
    updateProgress();

    // Optional: keyboard and wheel for desktop
    container.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            container.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            container.scrollBy({ top: -container.clientHeight, behavior: 'smooth' });
        }
    });
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
} else {
    loadConfig();
}
