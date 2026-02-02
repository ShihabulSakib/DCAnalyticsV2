import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * useAnalyticsEngine - Offline-first analytics data processing hook
 * 
 * Fetches minified analytics JSON and performs client-side aggregation.
 * Designed for instant loading on low-bandwidth mobile connections.
 * 
 * Data Format (Micro-JSON):
 * {
 *   "meta": { "name": "HSC 2024", "total": 1200 },
 *   "subjects": { "101": "Bangla", "102": "English" },
 *   "data": [
 *     ["A", "Science", { "101": 5.0, "102": 4.0 }],
 *     ["B", "Humanities", { "101": 3.5, "102": 0.0 }]
 *   ]
 * }
 */

const CACHE_PREFIX = 'analytics_';

/**
 * Decompress gzipped response using browser's DecompressionStream
 */
async function decompressGzip(response) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = response.body.pipeThrough(ds);
    const reader = decompressedStream.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const blob = new Blob(chunks);
    const text = await blob.text();
    return JSON.parse(text);
}

/**
 * Custom hook for analytics data fetching and processing
 * @param {string|number} examId - Exam ID to load analytics for
 * @param {object} filters - { section: 'A'|'All', group: 'Science'|'All' }
 */
export function useAnalyticsEngine(examId, filters = { section: 'All', group: 'All' }) {
    const [rawData, setRawData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch and cache analytics data
    useEffect(() => {
        if (!examId) {
            setLoading(false);
            return;
        }

        const cacheKey = `${CACHE_PREFIX}${examId}`;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Check localStorage cache first
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    console.log(`[Analytics] Loaded exam ${examId} from cache`);
                    setRawData(JSON.parse(cached));
                    setLoading(false);
                    return;
                }

                // Try to fetch gzipped version first
                const baseUrl = '/data/analytics';
                let data;

                try {
                    const gzResponse = await fetch(`${baseUrl}/exam_${examId}.json.gz`);
                    if (gzResponse.ok) {
                        console.log(`[Analytics] Decompressing exam_${examId}.json.gz`);
                        data = await decompressGzip(gzResponse);
                    } else {
                        throw new Error('Gzip not available');
                    }
                } catch (gzErr) {
                    // Fallback to uncompressed JSON
                    console.log(`[Analytics] Falling back to uncompressed JSON`);
                    const response = await fetch(`${baseUrl}/exam_${examId}.json`);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    data = await response.json();
                }

                // Cache in localStorage
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(data));
                } catch (e) {
                    console.warn('[Analytics] localStorage quota exceeded, skipping cache');
                }

                setRawData(data);
                console.log(`[Analytics] Loaded exam ${examId}: ${data.meta.total} students`);
            } catch (err) {
                console.error('[Analytics] Failed to load:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [examId]);

    // Memoized filtered data based on section/group
    const filteredData = useMemo(() => {
        if (!rawData?.data) return [];

        return rawData.data.filter(([section, group]) => {
            const sectionMatch = filters.section === 'All' || section === filters.section;
            const groupMatch = filters.group === 'All' || group === filters.group;
            return sectionMatch && groupMatch;
        });
    }, [rawData, filters.section, filters.group]);

    // Calculate pass/fail statistics
    const passFailStats = useMemo(() => {
        if (!filteredData.length) {
            return { passed: 0, failed: 0, passRate: 0, total: 0 };
        }

        let passed = 0;
        let failed = 0;

        for (const [, , marks] of filteredData) {
            // A student fails if any subject has GP = 0
            const hasFail = Object.values(marks).some(gp => gp === 0);
            if (hasFail) {
                failed++;
            } else {
                passed++;
            }
        }

        const total = passed + failed;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        return { passed, failed, passRate, total };
    }, [filteredData]);

    // Calculate per-subject statistics
    const subjectStats = useMemo(() => {
        if (!rawData?.subjects || !filteredData.length) return [];

        const subjects = rawData.subjects;
        const stats = {};

        // Initialize stats for each subject
        for (const [id, name] of Object.entries(subjects)) {
            stats[id] = {
                id,
                name,
                totalGP: 0,
                count: 0,
                gradeDistribution: { 'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 },
                failCount: 0
            };
        }

        // Aggregate data
        for (const [, , marks] of filteredData) {
            for (const [subjectId, gp] of Object.entries(marks)) {
                if (!stats[subjectId]) continue;

                stats[subjectId].totalGP += gp;
                stats[subjectId].count++;

                // Determine grade from GP
                if (gp === 0) {
                    stats[subjectId].gradeDistribution['F']++;
                    stats[subjectId].failCount++;
                } else if (gp === 5.0) {
                    stats[subjectId].gradeDistribution['A+']++;
                } else if (gp >= 4.0) {
                    stats[subjectId].gradeDistribution['A']++;
                } else if (gp >= 3.5) {
                    stats[subjectId].gradeDistribution['A-']++;
                } else if (gp >= 3.0) {
                    stats[subjectId].gradeDistribution['B']++;
                } else if (gp >= 2.0) {
                    stats[subjectId].gradeDistribution['C']++;
                } else {
                    stats[subjectId].gradeDistribution['D']++;
                }
            }
        }

        // Calculate averages and convert to array
        return Object.values(stats)
            .map(s => ({
                ...s,
                avgGP: s.count > 0 ? (s.totalGP / s.count).toFixed(2) : '0.00',
                failRate: s.count > 0 ? Math.round((s.failCount / s.count) * 100) : 0
            }))
            .sort((a, b) => parseFloat(b.avgGP) - parseFloat(a.avgGP));
    }, [rawData, filteredData]);

    // Get available sections from data
    const availableSections = useMemo(() => {
        if (!rawData?.data) return [];
        const sections = new Set(rawData.data.map(([section]) => section));
        return ['All', ...Array.from(sections).sort()];
    }, [rawData]);

    // Get available groups from data
    const availableGroups = useMemo(() => {
        if (!rawData?.data) return [];
        const groups = new Set(rawData.data.map(([, group]) => group));
        return ['All', ...Array.from(groups).sort()];
    }, [rawData]);

    // Clear cache utility
    const clearCache = useCallback(() => {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`[Analytics] Cleared ${keysToRemove.length} cached items`);
    }, []);

    return {
        // State
        loading,
        error,

        // Data
        meta: rawData?.meta || null,
        passFailStats,
        subjectStats,
        filteredCount: filteredData.length,

        // Filter options
        availableSections,
        availableGroups,

        // Utilities
        clearCache
    };
}

export default useAnalyticsEngine;
