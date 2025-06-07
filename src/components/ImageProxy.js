import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const ImageProxy = ({ src, alt, className = '', fallbackText = 'U', onError, onLoad }) => {
    const [imageSrc, setImageSrc] = useState(src);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        setImageSrc(src);
        setHasError(false);
        setIsLoading(true);
    }, [src]);
    const handleImageError = () => {
        console.log(`❌ Image failed to load: ${imageSrc}`);
        setHasError(true);
        setIsLoading(false);
        // Try alternative methods for external images
        if (imageSrc && !imageSrc.includes('cors-anywhere') && !imageSrc.includes('firebase')) {
            console.log('🔄 Attempting alternative image loading...');
            // Try with a different approach - fetch as blob
            fetch(imageSrc, { mode: 'no-cors' })
                .then(() => {
                // If fetch succeeds, the image might work with different loading strategy
                setImageSrc(`${imageSrc}?${Date.now()}`); // Cache bust
            })
                .catch(() => {
                console.log('🚫 All image loading methods failed');
                setHasError(true);
                onError?.();
            });
        }
        else {
            onError?.();
        }
    };
    const handleImageLoad = () => {
        console.log(`✅ Image loaded successfully: ${imageSrc}`);
        setIsLoading(false);
        setHasError(false);
        onLoad?.();
    };
    if (hasError || !imageSrc) {
        return (_jsx("div", { className: `${className} bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold`, children: fallbackText }));
    }
    return (_jsxs("div", { className: `relative ${className}`, children: [_jsx("img", { src: imageSrc, alt: alt, className: "w-full h-full object-cover", crossOrigin: "anonymous", referrerPolicy: "no-referrer", loading: "lazy", onLoad: handleImageLoad, onError: handleImageError, style: {
                    opacity: isLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease'
                } }), isLoading && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm", children: _jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }) }))] }));
};
export default ImageProxy;
