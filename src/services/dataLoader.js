/**
 * DataLoader Service - JSON-based Data Loading for DCAnalyticsV2
 * 
 * Loads student results from pre-generated JSON files instead of API.
 * Supports both v1.0 (legacy) and v2.0 (group-aware) formats.
 * 
 * Fallback: To disable JSON and revert to API, set USE_JSON_DATA = false
 */

// Feature flag for easy rollback
const USE_JSON_DATA = true; // Set to false to revert to API-based loading

class DataLoader {
  constructor() {
    this.cache = new Map();
    // In production, this would be your CDN URL
    // In development, it points to the local public/data folder
    this.baseUrl = '/data';
  }


  /**
   * Load merit list from JSON file
   * @param {string|number} examId 
   * @returns {Promise<Object>} Merit list data
   */
  async loadMeritList(examId) {
    const cacheKey = `merit_${examId}`;

    // Check memory cache
    if (this.cache.has(cacheKey)) {
      console.log(`[DataLoader] Merit list ${examId} loaded from memory cache`);
      return this.cache.get(cacheKey);
    }

    try {
      // Check localStorage cache
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache.set(cacheKey, parsed);
        console.log(`[DataLoader] Merit list ${examId} loaded from localStorage`);
        return parsed;
      }

      // Fetch from server
      console.log(`[DataLoader] Fetching merit list ${examId} from server...`);
      const response = await fetch(`${this.baseUrl}/merit_list_${examId}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache in memory and localStorage
      this.cache.set(cacheKey, data);
      localStorage.setItem(cacheKey, JSON.stringify(data));

      console.log(`[DataLoader] Merit list ${examId} loaded successfully (v${data.v || '1.0'})`);
      return data;
    } catch (error) {
      console.error(`[DataLoader] Failed to load merit list ${examId}:`, error);
      throw error;
    }
  }

  /**
   * Load detailed marksheet from JSON file
   * @param {string|number} examId 
   * @returns {Promise<Object>} Marksheet data
   */
  async loadMarks(examId) {
    const cacheKey = `marks_${examId}`;

    // Check memory cache
    if (this.cache.has(cacheKey)) {
      console.log(`[DataLoader] Marks ${examId} loaded from memory cache`);
      return this.cache.get(cacheKey);
    }

    try {
      // Check localStorage cache
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache.set(cacheKey, parsed);
        console.log(`[DataLoader] Marks ${examId} loaded from localStorage`);
        return parsed;
      }

      // Fetch from server
      console.log(`[DataLoader] Fetching marks ${examId} from server...`);
      const response = await fetch(`${this.baseUrl}/marks_${examId}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache in memory and localStorage
      this.cache.set(cacheKey, data);
      localStorage.setItem(cacheKey, JSON.stringify(data));

      console.log(`[DataLoader] Marks ${examId} loaded successfully (v${data.v || '1.0'})`);
      return data;
    } catch (error) {
      console.error(`[DataLoader] Failed to load marks ${examId}:`, error);
      throw error;
    }
  }

  /**
   * Extract marks for a specific student from the optimized array format.
   * Handles both v1.0 and v2.0 formats automatically.
   * 
   * @param {Object} marksData - The marks JSON data
   * @param {string} studentRoll - Student roll number
   * @returns {Array<{subject: string, total: number}>|null} Array of subject marks
   */
  getStudentMarks(marksData, studentRoll) {
    if (!marksData || !marksData.marks || !marksData.marks[studentRoll]) {
      console.warn(`[DataLoader] No marks found for student ${studentRoll}`);
      return null;
    }

    const version = marksData.v || "1.0";

    if (version === "2.0" || version === "2.1") {
      // v2.0 format: group-aware subjects
      const studentData = marksData.marks[studentRoll];
      const group = studentData.g || 'Science'; // Default to 'Science' if group is missing
      const subjects = marksData.groups[group] || [];

      if (!subjects.length) {
        console.error(`[DataLoader] No subjects found for group: ${group}`);
        return null;
      }

      // Handle v2.0 (Array marks only) and v2.1 (Array marks, grades, gps)
      if (Array.isArray(studentData.m)) {
        // Check if we have grades and gpa arrays (v2.1)
        const hasDetails = Array.isArray(studentData.gr) && Array.isArray(studentData.gp);

        return subjects.map((subj, idx) => ({
          subject: subj,
          total: studentData.m[idx] || 0,
          grade: hasDetails ? (studentData.gr[idx] || '-') : '-',
          gp: hasDetails ? (studentData.gp[idx] || 0) : null
        }));
      } else {
        // This case handles older v2.0 where 'm' might be a dictionary (similar to v1.0 but group-aware)
        // Or if 'm' is missing/malformed, it will return 0 for total.
        return subjects.map(subj => ({
          subject: subj,
          total: studentData.m?.[subj] || 0,
          grade: '-',
          gp: null
        }));
      }
    } else {
      // v1.0 format: flat subject list (legacy)
      const marksArray = marksData.marks[studentRoll];
      const subjects = marksData.meta.subjects;

      return subjects.map((subjectName, index) => ({
        subject: subjectName,
        total: marksArray[index] || 0,
      }));
    }
  }

  /**
   * Clear all caches (useful after data updates)
   */
  clearCache() {
    console.log('[DataLoader] Clearing all caches...');
    this.cache.clear();

    // Clear only merit_* and marks_* from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('merit_') || key.startsWith('marks_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    console.log(`[DataLoader] Cleared ${keysToRemove.length} cached items`);
  }

  /**
   * Check if JSON loading is enabled
   */
  isEnabled() {
    return USE_JSON_DATA;
  }
}

export default new DataLoader();
export { USE_JSON_DATA };
