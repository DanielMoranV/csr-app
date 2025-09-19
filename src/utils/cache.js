/**
 * Local Cache Manager
 * Note: Uses base64 encoding for Unicode support, NOT for security encryption
 */
const storage = window.localStorage;

function base64EncodeUnicode(str) {
    const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode(`0x${p1}`);
    });

    return btoa(utf8Bytes);
}

function base64DecodeUnicode(str) {
    // Convert Base64 encoded bytes to percent-encoding, and then get the original string.
    const percentEncodedStr = atob(str)
        .split('')
        .map(function (c) {
            return `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join('');

    return decodeURIComponent(percentEncodedStr);
}

export default {
    /**
     * @param {string} key
     * @param {object} value
     * @return {Object}
     */
    setItem: (key, value) => {
        if (typeof key !== 'string' || key.trim() === '') {
            throw new Error('Key must be a non-empty string');
        }

        try {
            const encoded = base64EncodeUnicode(JSON.stringify(value));
            storage.setItem(key, encoded);
            return encoded;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new Error('Storage quota exceeded. Consider clearing old data.');
            }
            throw error;
        }
    },

    /**
     * @param {string} key
     * @returns {Boolean}
     */
    hasThis: (key) => {
        if (typeof key !== 'string') {
            return false;
        }
        return storage.getItem(key) !== null;
    },

    /**
     * @param {string} key
     * @returns {Object}
     */
    getItem: (key) => {
        if (typeof key !== 'string') {
            return null;
        }

        const item = storage.getItem(key);
        if (item !== null && typeof item !== 'undefined') {
            try {
                const decoded = JSON.parse(base64DecodeUnicode(item));
                return decoded;
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    /**
     * @param {string} key
     * @returns  {void}
     */
    removeItem: (key) => {
        if (typeof key === 'string') {
            storage.removeItem(key);
            return;
        }
    },

    /**
     * @returns {void}
     */
    cleanAll: () => {
        return storage.clear();
    },

    /**
     * @param {string[]} preserveKeys - Keys to preserve during refresh
     */
    refresh: function (preserveKeys = ['token', 'currentUser']) {
        const preservedData = {};

        // Use internal methods for consistency
        preserveKeys.forEach((key) => {
            if (typeof key === 'string' && this.hasThis(key)) {
                preservedData[key] = this.getItem(key);
            }
        });

        storage.clear();

        // Restore preserved data using internal methods
        Object.entries(preservedData).forEach(([key, value]) => {
            this.setItem(key, value);
        });
    },

    /**
     * Get all stored keys
     * @returns {string[]}
     */
    getAllKeys: () => {
        return Object.keys(storage);
    },

    /**
     * Get storage size information
     * @returns {Object}
     */
    size: () => {
        const keys = Object.keys(storage);
        let totalSize = 0;

        keys.forEach((key) => {
            const item = storage.getItem(key);
            if (item) {
                totalSize += key.length + item.length;
            }
        });

        return {
            keys: keys.length,
            bytes: totalSize,
            kb: Math.round((totalSize / 1024) * 100) / 100
        };
    },

    /**
     * Clear storage with optional key filtering
     * @param {string[]} keepKeys - Keys to preserve
     */
    clearExcept: function (keepKeys = []) {
        if (!Array.isArray(keepKeys)) {
            keepKeys = [];
        }

        const preservedData = {};
        keepKeys.forEach((key) => {
            if (typeof key === 'string' && this.hasThis(key)) {
                preservedData[key] = this.getItem(key);
            }
        });

        storage.clear();

        Object.entries(preservedData).forEach(([key, value]) => {
            this.setItem(key, value);
        });
    }
};
