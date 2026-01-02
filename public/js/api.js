const API = {
  csrfToken: null,

  async getCsrfToken() {
    if (this.csrfToken) return this.csrfToken;
    try {
      const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
      const data = await res.json();
      this.csrfToken = data.token;
      return this.csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      return null;
    }
  },

  async getHeaders(includeContentType = true) {
    const headers = {};
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    const token = await this.getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
    return headers;
  },

  async getMovies(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.format) query.set('format', params.format);
    if (params.wantToUpgrade !== undefined) query.set('wantToUpgrade', params.wantToUpgrade);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const url = '/api/movies' + (query.toString() ? '?' + query.toString() : '');
    const res = await fetch(url, { credentials: 'same-origin' });
    return res.json();
  },

  async getStats() {
    const res = await fetch('/api/movies/stats', { credentials: 'same-origin' });
    return res.json();
  },

  async createMovie(data) {
    const res = await fetch('/api/movies', {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'same-origin'
    });
    return res.json();
  },

  async updateMovie(id, data) {
    const res = await fetch(`/api/movies/${id}`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'same-origin'
    });
    return res.json();
  },

  async deleteMovie(id) {
    const res = await fetch(`/api/movies/${id}`, {
      method: 'DELETE',
      headers: await this.getHeaders(false),
      credentials: 'same-origin'
    });
    return res.json();
  }
};
