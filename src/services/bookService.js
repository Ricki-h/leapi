import axios from "axios";
import 'dotenv/config'

const normalizeGoogleBook = (item) => {
    const v = item.VolumeInfo
    return {
        title: v.title,
        description: v.description?.slice(0, 2000) || null,
        coverUrl: v.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
        isbn: v.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier || null,
        publishedYear: v.publishedDate ? parseInt(v.publishedDate.slice(0, 4)) : null,
        publisher: v.publisher || null,
        language: v.language || null,
        pageCount: v.pageCount || null,
        googleBooksId: item.id,
        authorName: v.authors?.[0] || 'Desconhecido',
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
        language: doc.language?.[0] || null,
        pageCount: doc.number_of_pages_median || null,
        googleBooksId: null,
        openLibraryId: doc.key || null,
        authorName: doc.author_name?.[0] || 'Desconhecido',
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
    return (res.data.items || []).map(normalizeGoogleBook)
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
    return (res.data.docs || []).map(normalizeOpenLibraryBook)
  } catch (err) {
    console.error('Erro Open Library:', err.message)
    return []
  }
}