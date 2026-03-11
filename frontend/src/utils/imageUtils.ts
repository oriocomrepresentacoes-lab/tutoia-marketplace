export const getOptimizedImageUrl = (url: string | null | undefined, width?: number, highQuality = false): string => {
    if (!url) return 'https://via.placeholder.com/300x200?text=Sem+Imagem';

    // Check if it's a Cloudinary URL
    if (url.includes('res.cloudinary.com')) {
        const parts = url.split('/image/upload/');
        if (parts.length === 2) {
            // q_auto:best for high quality, q_auto for standard
            const quality = highQuality ? 'q_auto:best' : 'q_auto';
            const transformation = width ? `c_scale,w_${width},f_auto,${quality}` : `f_auto,${quality}`;
            return `${parts[0]}/image/upload/${transformation}/${parts[1]}`;
        }
    }

    // Default fallback for local images or other CDNs
    return url.startsWith('http') ? url : `http://localhost:5000${url}`;
};
