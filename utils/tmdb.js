// ==========================================================
// utils/tmdb.js
// ==========================================================
// A wrapper around the TMDb (The Movie Database) REST API.
// Every function here returns plain JS data - no discord.js
// classes - so it can be reused anywhere in the bot.

const axios = require('axios');

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const GENRE_LIST = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
];

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

// Fetches details with both videos and cast/crew credits
async function getMovieDetailsWithCredits(tmdbId) {
  const response = await tmdbGet(`/movie/${tmdbId}`, { append_to_response: 'videos,credits' });
  return response.data;
}

// Fetches streaming, rent, and buy providers (powered by JustWatch)
async function getWatchProviders(tmdbId, countryCode = 'US') {
  const response = await tmdbGet(`/movie/${tmdbId}/watch/providers`);
  const results = response.data?.results || {};
  const country = results[countryCode.toUpperCase()] || null;
  return country;
}

// Fetches recommendations or falls back to similar movies
async function getRecommendations(tmdbId) {
  try {
    const recsResponse = await tmdbGet(`/movie/${tmdbId}/recommendations`);
    const results = recsResponse.data?.results || [];
    if (results.length > 0) return results;
  } catch {
    // Continue to fallback
  }

  const similarResponse = await tmdbGet(`/movie/${tmdbId}/similar`);
  return similarResponse.data?.results || [];
}

// Fetches popular movies
async function getPopularMovies(page = 1) {
  const response = await tmdbGet('/movie/popular', { page });
  return response.data?.results || [];
}

// Fetches top rated movies
async function getTopRatedMovies(page = 1) {
  const response = await tmdbGet('/movie/top_rated', { page });
  return response.data?.results || [];
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
  GENRE_LIST,
  searchMovies,
  getMovieDetails,
  getMovieDetailsWithCredits,
  getWatchProviders,
  getRecommendations,
  getPopularMovies,
  getTopRatedMovies,
  getPosterUrl,
  getTrailerUrl,
  getTmdbUrl,
  formatGenres,
  formatYear,
};
