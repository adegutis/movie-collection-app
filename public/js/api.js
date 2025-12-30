const API = {
  async getMovies(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.format) query.set('format', params.format);
    if (params.wantToUpgrade !== undefined) query.set('wantToUpgrade', params.wantToUpgrade);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const url = '/api/movies' + (query.toString() ? '?' + query.toString() : '');
    const res = await fetch(url);
    return res.json();
  },

  async getStats() {
    const res = await fetch('/api/movies/stats');
    return res.json();
  },

  async createMovie(data) {
    const res = await fetch('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateMovie(id, data) {
    const res = await fetch(`/api/movies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteMovie(id) {
    const res = await fetch(`/api/movies/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  }
};
