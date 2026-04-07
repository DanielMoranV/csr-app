/**
 * Creates a debounced version of the given function that delays invoking it
 * until after `delay` ms have elapsed since the last call.
 *
 * @param {Function} fn - The function to debounce.
 * @param {number} delay - Milliseconds to wait.
 * @returns {Function} Debounced function with a `cancel()` method.
 */
export function debounce(fn, delay) {
    let timeout;

    const debounced = function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };

    debounced.cancel = () => clearTimeout(timeout);

    return debounced;
}
