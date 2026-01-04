import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to handle iOS visual viewport changes when keyboard appears/disappears.
 * Returns current keyboard height and whether keyboard is visible.
 */
export function useKeyboardHeight() {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const handleViewportResize = useCallback(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const viewport = window.visualViewport;
        const windowHeight = window.innerHeight;
        const viewportHeight = viewport.height;

        // Calculate keyboard height (difference between window and viewport)
        const calculatedHeight = Math.max(0, windowHeight - viewportHeight);

        setKeyboardHeight(calculatedHeight);
        setIsKeyboardVisible(calculatedHeight > 100); // Threshold to avoid false positives
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const viewport = window.visualViewport;

        viewport.addEventListener('resize', handleViewportResize);
        viewport.addEventListener('scroll', handleViewportResize);

        return () => {
            viewport.removeEventListener('resize', handleViewportResize);
            viewport.removeEventListener('scroll', handleViewportResize);
        };
    }, [handleViewportResize]);

    return { keyboardHeight, isKeyboardVisible };
}
