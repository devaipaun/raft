export type Book = {
  id: number;
  title: string;
  author: string;
  publisher: string;
  tag: string;
  description: string;
};

export const books: Book[] = [
  {
    id: 1,
    title: "Atomic Habits",
    author: "James Clear",
    publisher: "Penguin",
    tag: "Dezvoltare",
    description:
      "O carte despre schimbări mici, obiceiuri bune și sisteme care produc rezultate mari în timp.",
  },
  {
    id: 2,
    title: "Sapiens",
    author: "Yuval Noah Harari",
    publisher: "Polirom",
    tag: "Istorie",
    description:
      "O privire amplă asupra istoriei omenirii, de la vânători-culegători până la societatea modernă.",
  },
  {
    id: 3,
    title: "1984",
    author: "George Orwell",
    publisher: "Litera",
    tag: "Ficțiune",
    description:
      "Un roman clasic despre control, supraveghere, adevăr și libertatea interioară.",
  },
  {
    id: 4,
    title: "Dune",
    author: "Frank Herbert",
    publisher: "Nemira",
    tag: "SF",
    description:
      "O poveste epică despre putere, destin, ecologie și supraviețuire pe planeta Arrakis.",
  },
  {
    id: 5,
    title: "The Psychology of Money",
    author: "Morgan Housel",
    publisher: "Publica",
    tag: "Finanțe",
    description:
      "Despre cum comportamentul influențează deciziile financiare mai mult decât cifrele.",
  },
  {
    id: 6,
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    publisher: "Rao",
    tag: "Fantasy",
    description:
      "Aventura lui Bilbo Baggins într-o lume plină de creaturi, pericole și comori.",
  },
  {
    id: 7,
    title: "Deep Work",
    author: "Cal Newport",
    publisher: "Publica",
    tag: "Productivitate",
    description:
      "O carte despre concentrare profundă și valoarea muncii făcute fără distrageri.",
  },
  {
    id: 8,
    title: "Clean Code",
    author: "Robert C. Martin",
    publisher: "Prentice Hall",
    tag: "Programare",
    description:
      "Principii și exemple pentru a scrie cod clar, ușor de înțeles și de întreținut.",
  },
];