import type { Book, LibraryQuery, PersonalBook } from '../../types';

// Fictional metadata only. No third-party book text or cover artwork is included.
const books: Book[] = [
  {
    id: 'a-place-between',
    title: 'A Place Between',
    author: 'Elena Marlow',
    description:
      'A letter sent to the wrong address brings two strangers to a small coastal town. Across one unhurried summer, they learn that belonging sometimes begins in the places we never meant to stay.',
    genre: 'Fiction',
    format: 'EPUB',
    color: 'terracotta',
    motif: 'arch',
    coverLabel: 'A NOVEL',
    year: 2025,
    length: '12 chapters',
  },
  {
    id: 'the-art-of-noticing',
    title: 'The Art of Noticing',
    author: 'Oliver Hayes',
    description:
      'Small observations, open windows, and the quiet pleasure of paying attention. A collection of imagined essays about finding something extraordinary in an ordinary day.',
    genre: 'Essays',
    format: 'EPUB',
    color: 'olive',
    motif: 'leaves',
    coverLabel: 'NOTES ON THE EVERYDAY',
    year: 2024,
    length: '18 essays',
  },
  {
    id: 'under-a-distant-sun',
    title: 'Under a Distant Sun',
    author: 'Luca Arden',
    description:
      'An astronomer returns to the mountain observatory where she grew up. Among forgotten star charts and unfinished conversations, a new constellation begins to take shape.',
    genre: 'Fiction',
    format: 'PDF',
    color: 'navy',
    motif: 'orbit',
    coverLabel: 'A NOVEL',
    year: 2025,
    length: '224 pages',
  },
  {
    id: 'a-slower-kind-of-life',
    title: 'A Slower Kind of Life',
    author: 'Ada Wren',
    description:
      'An invitation to make a little space. Thoughtful reflections on time, attention, and building a daily rhythm that leaves room for the things you love.',
    genre: 'Mindful living',
    format: 'EPUB',
    color: 'cream',
    motif: 'window',
    coverLabel: 'MAKE ROOM FOR WHAT MATTERS',
    year: 2023,
    length: '10 chapters',
  },
  {
    id: 'where-the-river-bends',
    title: 'Where the River Bends',
    author: 'Mira Solis',
    description:
      'A journey on foot along a river, from its highland source to the sea. Field notes and encounters become a meditation on landscape, memory, and the paths we choose.',
    genre: 'Nature',
    format: 'PDF',
    color: 'sage',
    motif: 'waves',
    coverLabel: 'FIELD NOTES & WANDERINGS',
    year: 2024,
    length: '168 pages',
  },
  {
    id: 'the-shape-of-silence',
    title: 'The Shape of Silence',
    author: 'Theo Laurent',
    description:
      'Spare, luminous poems about the spaces between things: the pause before rain, the hush after a train leaves, and everything a quiet room can hold.',
    genre: 'Poetry',
    format: 'EPUB',
    color: 'plum',
    motif: 'orbit',
    coverLabel: 'SELECTED POEMS',
    year: 2025,
    length: '42 poems',
  },
  {
    id: 'the-long-way-home',
    title: 'The Long Way Home',
    author: 'Emilia North',
    description:
      'A mapmaker takes the scenic route back to her childhood village. A story of old friendships, unfamiliar roads, and the unexpected gift of getting a little lost.',
    genre: 'Fiction',
    format: 'EPUB',
    color: 'ochre',
    motif: 'mountain',
    coverLabel: 'A NOVEL',
    year: 2024,
    length: '16 chapters',
  },
  {
    id: 'rooms-for-thought',
    title: 'Rooms for Thought',
    author: 'Sam Ellis',
    description:
      'What makes a place feel like our own? An imagined notebook of interiors, objects, and the small rituals that turn the places we inhabit into a home.',
    genre: 'Essays',
    format: 'PDF',
    color: 'blue',
    motif: 'window',
    coverLabel: 'ON SPACE & BELONGING',
    year: 2023,
    length: '96 pages',
  },
];

export const catalogRepository = {
  async list(): Promise<Book[]> {
    return books.map((book) => ({ ...book }));
  },
};

export const defaultPersonalBook: PersonalBook = {
  status: 'want-to-read',
  favorite: false,
  percentage: 0,
  lastReadAt: null,
};

export const seedPersonal: Record<string, PersonalBook> = {
  'a-place-between': {
    status: 'reading',
    favorite: true,
    percentage: 38,
    lastReadAt: '2026-01-03T12:00:00Z',
  },
  'the-art-of-noticing': {
    status: 'reading',
    favorite: false,
    percentage: 62,
    lastReadAt: '2026-01-02T12:00:00Z',
  },
  'where-the-river-bends': {
    status: 'finished',
    favorite: true,
    percentage: 100,
    lastReadAt: '2026-01-01T12:00:00Z',
  },
};

export function selectBooks(
  catalog: Book[],
  personal: Record<string, PersonalBook>,
  query: LibraryQuery,
): Book[] {
  const search = query.search.trim().toLocaleLowerCase();
  return catalog
    .filter((book) => {
      const state = personal[book.id] ?? defaultPersonalBook;
      return (
        (!search ||
          `${book.title} ${book.author} ${book.genre}`.toLocaleLowerCase().includes(search)) &&
        (query.shelf === 'all' ||
          (query.shelf === 'favorites' ? state.favorite : state.status === query.shelf)) &&
        (query.format === 'all' || book.format === query.format) &&
        (query.genre === 'all' || book.genre === query.genre)
      );
    })
    .sort((a, b) => {
      if (query.sort === 'title') return a.title.localeCompare(b.title);
      if (query.sort === 'author') return a.author.localeCompare(b.author);
      return (personal[b.id]?.lastReadAt ?? '').localeCompare(personal[a.id]?.lastReadAt ?? '');
    });
}
