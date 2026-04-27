import axios from "axios";
import 'dotenv/config'

const normalizeGoogleBook = (item) => {
  const v = item.volumeInfo
  if (!v || !v.title) return null

  return {
    title: v.title,
    description: v.description?.slice(0, 2000) || null,
    coverUrl: v.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    isbn: v.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier || null,
    publishedYear: v.publishedDate ? parseInt(v.publishedDate.slice(0, 4)) : null,
    publisher: v.publisher || null,
    language: v.language ? [v.language] : [],
    pageCount: v.pageCount || null,
    googleBooksId: item.id,
    openLibraryId: null,
    authorName: v.authors?.[0]?.trim() || 'Desconhecido',
    genres: v.categories || []
  }
}

const normalizeOpenLibraryBook = (doc) => {
  return {
    title: doc.title,
    description: null,
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
    isbn: doc.isbn?.[0] || null,
    publishedYear: doc.first_publish_year || null,
    publisher: doc.publisher?.[0] || null,
    language: doc.language || [],
    pageCount: doc.number_of_pages_median || null,
    googleBooksId: null,
    openLibraryId: doc.key || null,
    authorName: doc.author_name?.[0]?.trim() || 'Desconhecido',
    genres: doc.subject?.slice(0, 3) || []
  }
}

export const searchGoogleBooks = async (query) => {
  try {
    const res = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: {
        q: query,
        maxResults: 10,
        key: process.env.GOOGLE_BOOKS_KEY
      }
    })
    
    return (res.data.items || []).map(normalizeGoogleBook).filter(Boolean)
  } catch (err) {
    console.error('Erro Google Books:', err.message)
    return []
  }
}

export const searchOpenLibrary = async (query) => {
  try {
    const res = await axios.get('https://openlibrary.org/search.json', {
      params: { q: query, limit: 10 }
    })
    
    const docs = res.data.docs || []
    
    return docs.map(normalizeOpenLibraryBook)
  } catch (err) {
    console.error('Erro Open Library:', err.message)
    return []
  }
}

export const getOpenLibraryDetails = async (workId) => {
  try {
    const [workRes, editionsRes] = await Promise.all([
      axios.get(`https://openlibrary.org${workId}.json`),
      axios.get(`https://openlibrary.org${workId}/editions.json`)
    ])

    const work = workRes.data
    console.log('subjects do work:', work.subjects)
    const editions = editionsRes.data.entries || []

    const bestEdition = editions.find(e => 
        e.number_of_pages && 
        e.isbn_13 && 
        e.physical_format !== 'eAudiobook' &&
        e.physical_format !== 'Audio CD'
        ) || editions.find(e => 
        e.number_of_pages
    ) || editions[0] || {}

    const description = typeof work.description === 'string'
      ? work.description
      : work.description?.value || null

    return {
      description,
      isbn: bestEdition.isbn_13?.[0] || bestEdition.isbn_10?.[0] || null,
      pageCount: bestEdition.number_of_pages || parseInt(bestEdition.pagination) || null,
      publisher: bestEdition.publishers?.[0] || null,
      genres: work.subjects?.slice(0, 20) || []
    }
  } catch (err) {
    console.error('Erro detalhes Open Library:', err.message)
    return { description: null, isbn: null, pageCount: null, publisher: null }
  }
}

export const getOpenLibraryAuthorDetails = async (authorId) => {
  try {
    const res = await axios.get(`https://openlibrary.org${authorId}.json`)
    const data = res.data

    const bio = typeof data.bio === 'string'
      ? data.bio
      : data.bio?.value || null

    const photoUrl = data.photos?.[0]
      ? `https://covers.openlibrary.org/a/id/${data.photos[0]}-L.jpg`
      : null

    return { bio, photoUrl }
  } catch (err) {
    console.error('Erro detalhes autor Open Library:', err.message)
    return { bio: null, photoUrl: null }
  }
}