/**
 * fmt(number)
 * Formats a number as a USD currency string with exactly 2 decimal places.
 * Treats null and undefined as 0 via the ?? guard.
 * @param {number|null|undefined} amount
 * @returns {string} 
 */

export function fmt(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(amount ?? 0)
}

/**
 * formatDate(dateStr)
 * Formats a timestamp string as a readable date.
 * @param {string} dateStr  
 * @returns {string} 
 */
export function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    })
}
