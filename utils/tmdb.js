// ==========================================================
// utils/tmdb.js
// ==========================================================
// A small wrapper around the TMDb (The Movie Database) REST API.
// Every function here returns plain JS data - no discord.js
// classes - so it can be reused anywhere in the bot.

const axios = require('axios');

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// We always pass the api_key on every single request explicitly
// (instead of relying on axios instance defaults) to guarantee it
// is never accidentally dropped.
function tmdbGet(endpoint, extraParams = {}) {
  return axios.get(`${BASE_URL}${endpoint}`, {
    params: { api_key: process.env.TMDB_API_KEY, ...extraParams },
    timeout: 8000,
  });
}

// Searches TMDb for movies matching a text query.
// Returns the raw array of TMDb search results.
async function searchMovies(query) {
  const response = await tmdbGet('/search/movie', { query, include_adult: false });
  return response.data.results || [];
}

// Fetches full details for one movie, including trailer info
// (via append_to_response=videos), in a single request.
async function getMovieDetails(tmdbId) {
  const response = await tmdbGet(`/movie/${tmdbId}`, { append_to_response: 'videos' });
  return response.data;
}

function getPosterUrl(posterPath) {
  return posterPath ? `${IMAGE_BASE_URL}${posterPath}` : null;
}

// Finds the best YouTube trailer link from a movie details
// response's videos.results array, or null if there isn't one.
function getTrailerUrl(details) {
  const videos = details?.videos?.results || [];
  const trailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    videos.find((v) => v.site === 'YouTube');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function getTmdbUrl(tmdbId) {
  return `https://www.themoviedb.org/movie/${tmdbId}`;
}

function formatGenres(genres = []) {
  return genres.map((g) => g.name).join(', ') || 'Unknown';
}

function formatYear(releaseDate) {
  return releaseDate ? releaseDate.slice(0, 4) : 'Unknown';
}

module.exports = {
  searchMovies,
  getMovieDetails,
  getPosterUrl,
  getTrailerUrl,
  getTmdbUrl,
  formatGenres,
  formatYear,
};
