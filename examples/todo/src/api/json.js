/**
 * @param {unknown} data
 * @param {number} [status]
 * @returns {Response}
 */
export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
    });
}
