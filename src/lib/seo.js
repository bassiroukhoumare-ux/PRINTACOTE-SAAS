export const updateSEO = ({ title, description, imageUrl, url }) => {
    if (title) {
        document.title = title;
        updateMeta('property', 'og:title', title);
        updateMeta('name', 'twitter:title', title);
    }
    if (description) {
        updateMeta('name', 'description', description);
        updateMeta('property', 'og:description', description);
        updateMeta('name', 'twitter:description', description);
    }
    if (imageUrl) {
        // Ensure image URL is absolute
        const absoluteImageUrl = imageUrl.startsWith('http') 
            ? imageUrl 
            : `${window.location.origin}${imageUrl}`;
        updateMeta('property', 'og:image', absoluteImageUrl);
        updateMeta('name', 'twitter:image', absoluteImageUrl);
    }
    if (url) {
        const absoluteUrl = url.startsWith('http')
            ? url
            : `${window.location.origin}${url}`;
        updateMeta('property', 'og:url', absoluteUrl);
    }
};

const updateMeta = (attrName, attrValue, contentValue) => {
    let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
    }
    element.setAttribute('content', contentValue);
};
