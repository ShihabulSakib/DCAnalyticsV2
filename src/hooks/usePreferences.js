import { useState, useEffect } from 'react';

const usePreferences = () => {
    // Theme Preference
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });

    // Session/Group Preference
    const [preferences, setPreferences] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('userPreferences');
            return saved ? JSON.parse(saved) : { lastSession: '', lastGroup: '' };
        }
        return { lastSession: '', lastGroup: '' };
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const savePreferences = (session, group) => {
        const newPrefs = { lastSession: session, lastGroup: group };
        setPreferences(newPrefs);
        localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return { theme, toggleTheme, preferences, savePreferences };
};

export default usePreferences;
