export const getOptimizedImageUrl = (url: string | null | undefined, width?: number): string => {
    if (!url) return 'https://via.placeholder.com/300x200?text=Sem+Imagem';

    // Check if it's a Cloudinary URL
    if (url.includes('res.cloudinary.com')) {
        const parts = url.split('/image/upload/');
        if (parts.length === 2) {
            // Add auto format (f_auto) and auto quality (q_auto), then optionally resize width
            const transformation = width ? `c_scale,w_${width},f_auto,q_auto` : 'f_auto,q_auto';
            return `${parts[0]}/image/upload/${transformation}/${parts[1]}`;
        }
    }

    // Default fallback for local images or other CDNs
    return url.startsWith('http') ? url : `http://localhost:5000${url}`;
};
