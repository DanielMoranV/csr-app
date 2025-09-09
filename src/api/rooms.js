import axios from './axios';

/**
 * API service for Rooms management.
 * Based on the provided API guide.
 */
export const rooms = {
    /**
     * Gets a list of all rooms, with options for filtering, sorting, and pagination.
     * @param {object} params - Query parameters.
     * @returns {Promise}
     */
    getAll: (params = {}) => axios.get('/rooms', { params }),

    /**
     * Creates a new room.
     * @param {object} roomData - The data for the new room.
     * @returns {Promise}
     */
    create: (roomData) => axios.post('/rooms', roomData),

    /**
     * Retrieves a specific room by its ID.
     * @param {number} id - The ID of the room.
     * @returns {Promise}
     */
    getById: (id) => axios.get(`/rooms/${id}`),

    /**
     * Updates an existing room.
     * @param {number} id - The ID of the room to update.
     * @param {object} roomData - The new data for the room.
     * @returns {Promise}
     */
    update: (id, roomData) => axios.put(`/rooms/${id}`, roomData),

    /**
     * Deletes a room.
     * @param {number} id - The ID of the room to delete.
     * @returns {Promise}
     */
    delete: (id) => axios.delete(`/rooms/${id}`),

    /**
     * Toggles the is_active status of a room.
     * @param {number} id - The ID of the room to modify.
     * @returns {Promise}
     */
    toggleStatus: (id) => axios.patch(`/rooms/${id}/toggle-status`),

    /**
     * Searches for rooms by number or notes.
     * @param {object} params - Query parameters (q, is_active, etc.).
     * @returns {Promise}
     */
    search: (params = {}) => axios.get('/rooms/search', { params })
};
