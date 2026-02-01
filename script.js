// Global config
let config = null;

function getCampaignerFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = (params.get('campaigner') || params.get('campaigners') || '').trim().toLowerCase();
    return id || null;
}

var DEFAULT_CAMPAIGNER_ID = 'gautham-g-ajith';

function resolveDonationUrl(defaultUrl, callback) {
    var campaignerId = getCampaignerFromUrl() || DEFAULT_CAMPAIGNER_ID;

    if (window.location.protocol === 'file:') {
        callback(defaultUrl);
        return;
    }

    fetch('campaigners.json')
        .then(function(res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function(campaigners) {
            var c = campaigners[campaignerId];
            callback(c && c.donationUrl ? c.donationUrl : defaultUrl);
        })
        .catch(function() {
            callback(defaultUrl);
        });
}

function loadConfig() {
    try {
        const configScript = document.getElementById('site-config');
        if (configScript) {
            config = JSON.parse(configScript.textContent);
            var defaultDonationUrl = (config.ending && config.ending.contactInfo && config.ending.contactInfo.website)
                ? (config.ending.contactInfo.website.startsWith('http')
                    ? config.ending.contactInfo.website
                    : 'https://' + config.ending.contactInfo.website.replace(/^www\./, 'www.'))
                : '';
            resolveDonationUrl(defaultDonationUrl, function(donationUrl) {
                buildSlides(donationUrl);
                initializeApp();
            });
        } else {
            throw new Error('Config not found');
        }
    } catch (error) {
        console.error('Error loading config:', error);
        alert('Error loading content. Please refresh the page.');
    }
}

var MONTH_ORDER = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function sortContentByPeriod(content) {
    if (!content || !content.length) return content;
    return content.slice().sort(function(a, b) {
        var pa = (a.period || a.date || '').trim();
        var pb = (b.period || b.date || '').trim();
        if (!pa && !pb) return 0;
        if (!pa) return 1;
        if (!pb) return -1;
        var ma = pa.split(/\s+/);
        var mb = pb.split(/\s+/);
        var monthA = MONTH_ORDER[ma[0]] || 0;
        var monthB = MONTH_ORDER[mb[0]] || 0;
        var yearA = parseInt(ma[1], 10) || 0;
        var yearB = parseInt(mb[1], 10) || 0;
        if (yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
    });
}

function buildSlides(donationUrl) {
    const container = document.querySelector('.slides-container');
    if (!container || !config) return;

    let slideIndex = 0;

    const headingSlide = createHeadingSlide(config.heading, slideIndex++);
    container.appendChild(headingSlide);

    var content = sortContentByPeriod(config.content);
    content.forEach((item, index) => {
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

    const endingSlide = createEndingSlide(config.ending, slideIndex++, config.heading && config.heading.logo, donationUrl);
    container.appendChild(endingSlide);

    requestAnimationFrame(function() { syncSlideHeights(); });
}

function createHeadingSlide(heading, index) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-intro slide-year-wrap';
    slide.setAttribute('data-slide', index);
    const bannerHtml = heading.banner
        ? '<div class="intro-banner" style="background-image: url(\'' + heading.banner + '\')"></div><div class="intro-banner-overlay"></div>'
        : '';
    const logoHtml = heading.logo
        ? '<div class="intro-logo-wrap"><img src="' + heading.logo + '" alt="U&I" class="intro-logo" /></div>'
        : '';
    slide.innerHTML = (bannerHtml +
        '<div class="slide-content intro-year-wrap-content">' +
            logoHtml +
            '<p class="intro-report-label">' + (heading.subtitle || '') + '</p>' +
            '<h1 class="slide-title-large intro-report-title">' + (heading.title || '') + '</h1>' +
            (heading.description ? '<p class="slide-description intro-report-desc">' + heading.description + '</p>' : '') +
        '</div>' +
        '<div class="intro-scroll-bottom" aria-hidden="true">' +
            '<p class="scroll-hint">' + (heading.tagline || 'Scroll to explore') + '</p>' +
            '<span class="scroll-indicator-chevron"></span>' +
        '</div>');
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

    var periodHtml = (item.period || item.date) ? '<p class="slide-date">' + (item.period || item.date) + '</p>' : '';
    slide.innerHTML = (
        '<div class="image-container"></div>' +
        '<div class="slide-caption">' +
            periodHtml +
            '<h2 class="slide-title">' + (item.title || '') + '</h2>' +
            (item.description ? '<p class="slide-description">' + item.description + '</p>' : '') +
        '</div>'
    );
    const container = slide.querySelector('.image-container');
    container.appendChild(img);
    return slide;
}

function createVideoSlide(item, index, contentIndex) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-video';
    slide.setAttribute('data-slide', index);
    var periodHtml = (item.period || item.date) ? '<p class="slide-date">' + (item.period || item.date) + '</p>' : '';
    slide.innerHTML = (
        '<div class="video-container">' +
            '<video class="reel-video" playsinline muted loop preload="metadata" src="' + item.src + '"></video>' +
        '</div>' +
        '<div class="slide-caption">' +
            periodHtml +
            '<h2 class="slide-title">' + (item.title || '') + '</h2>' +
            (item.description ? '<p class="slide-description">' + item.description + '</p>' : '') +
        '</div>'
    );
    const video = slide.querySelector('video');
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) entry.target.play().catch(function() {});
            else entry.target.pause();
        });
    }, { threshold: 0.5, rootMargin: '0px 0px -10% 0px' });
    observer.observe(video);
    return slide;
}

function createCollageSlide(item, index, contentIndex) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-collage';
    slide.setAttribute('data-slide', index);
    const caption = item.caption || item.description || '';
    var periodHtml = (item.period || item.date) ? '<p class="slide-date">' + (item.period || item.date) + '</p>' : '';
    slide.innerHTML = (
        '<div class="collage-container">' +
            '<img src="' + item.src + '" alt="' + (item.title || '') + '" class="collage-image" loading="lazy" />' +
        '</div>' +
        (caption || periodHtml ? '<div class="slide-caption slide-caption-minimal">' + periodHtml + (caption ? '<p class="slide-description">' + caption + '</p>' : '') + '</div>' : '')
    );
    return slide;
}

function createEndingSlide(ending, index, logoUrl, donationUrlOverride) {
    const slide = document.createElement('section');
    slide.className = 'slide slide-ending';
    slide.setAttribute('data-slide', index);
    var ctaUrl;
    if (donationUrlOverride) {
        ctaUrl = donationUrlOverride;
    } else {
        const website = ending.contactInfo && ending.contactInfo.website ? ending.contactInfo.website : '';
        ctaUrl = website.startsWith('http') ? website : 'https://' + website.replace(/^www\./, 'www.');
    }
    const audit = ending.auditReport || {};
    const auditUrl = audit.url || '';
    const auditHtml = auditUrl
        ? '<a href="' + auditUrl + '" target="_blank" rel="noopener" class="cta-button cta-button-secondary">' + (audit.text || 'View Annual Audit Report') + '</a>'
        : '';
    const logoHtml = logoUrl
        ? '<div class="ending-logo-wrap"><img src="' + logoUrl + '" alt="U&I" class="ending-logo" /></div>'
        : '';
    slide.innerHTML = (
        '<div class="ending-content">' +
            '<div class="ending-card">' +
                logoHtml +
                '<div class="ending-accent"></div>' +
                '<h2 class="ending-title">' + (ending.title || '') + '</h2>' +
                '<p class="ending-subtitle">' + (ending.subtitle || '') + '</p>' +
                '<p class="ending-description">' + (ending.description || '') + '</p>' +
                '<div class="ending-cta-group">' +
                    '<a href="' + ctaUrl + '" target="_blank" rel="noopener" class="cta-button">' + (ending.ctaButton && ending.ctaButton.text ? ending.ctaButton.text : 'Support Our Mission') + '</a>' +
                    auditHtml +
                '</div>' +
                '<p class="ending-message">' + (ending.contactInfo && ending.contactInfo.message ? ending.contactInfo.message : '') + '</p>' +
            '</div>' +
        '</div>'
    );
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
    document.querySelectorAll('.slides-container .slide').forEach(function(slide) {
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
    var resizeObserver = new ResizeObserver(function() {
        syncSlideHeights();
    });
    resizeObserver.observe(container);

    // Progress bar - RAF throttle to reduce lag, passive listener for scroll
    var progressRaf = null;
    function updateProgress() {
        const fill = document.querySelector('.progress-fill');
        if (!fill) return;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        fill.style.width = pct + '%';
    }
    function onScroll() {
        if (progressRaf != null) return;
        progressRaf = requestAnimationFrame(function() {
            updateProgress();
            progressRaf = null;
        });
    }
    container.addEventListener('scroll', onScroll, { passive: true });
    updateProgress();

    // Optional: keyboard and wheel for desktop
    container.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault();
            container.scrollBy({ top: container.clientHeight, behavior: 'smooth' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            container.scrollBy({ top: -container.clientHeight, behavior: 'smooth' });
        }
    });
}

function startBackgroundMusic() {
    var audio = document.getElementById('bg-music');
    if (!audio) return;
    audio.volume = 0.25;
    audio.play().catch(function() {});
}

function initMuteButton() {
    var audio = document.getElementById('bg-music');
    var btn = document.getElementById('mute-btn');
    if (!audio || !btn) return;

    function updateMuteState() {
        var isMuted = audio.muted;
        btn.setAttribute('aria-label', isMuted ? 'Unmute music' : 'Mute music');
        btn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
        btn.classList.toggle('is-muted', isMuted);
    }

    btn.addEventListener('click', function() {
        audio.muted = !audio.muted;
        updateMuteState();
    });

    audio.addEventListener('volumechange', updateMuteState);
    updateMuteState();
}

document.addEventListener('click', startBackgroundMusic, { once: true });
document.addEventListener('touchstart', startBackgroundMusic, { once: true });

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMuteButton);
} else {
    initMuteButton();
}

// Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
} else {
    loadConfig();
}
