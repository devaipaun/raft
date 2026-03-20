# 📚 RAFT — Biblioteca personală

Aplicație web pentru gestionarea bibliotecii fizice de cărți.

---

## 🚀 SETUP RAPID (după restart)

### 1. Deschide proiectul în VS Code

Folder:
C:\Users\ipaun\Documents\Projects\raft

---

### 2. Deschide terminal și instalează dependențele

npm install

---

### 3. Creează `.env.local`

În root (același nivel cu package.json):

NEXT_PUBLIC_SUPABASE_URL=URL_TAU_SUPABASE  
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHEIA_TA_ANON  

---

### 4. Pornește aplicația

npm run dev

Deschide:
http://localhost:3000

---

## 🔐 LOGIN

Admin:
/login

User-ul este în Supabase → Authentication → Users

---

## 🧠 FUNCȚIONALITĂȚI

- listă cărți cu copertă
- pagină detalii carte
- admin (protected)
- OCR (scanare imagine)
- autofill titlu + autor
- căutare manuală copertă
- fallback pe imagine proprie
- compresie automată imagine
- autocomplete pentru:
  - editură
  - tag
- preview imagini + zoom

---

## 🗄️ SUPABASE SETUP

### Database
Tabela: `books`

Câmpuri:
- id
- title
- author
- publisher
- tag
- description
- cover_url

---

### Storage

Bucket:
books-covers

IMPORTANT: exact acest nume

---

### 🔑 Policies (RLS)

#### Books - read public
create policy "Public can read books"
on public.books
for select
to public
using (true);

#### Books - insert authenticated
create policy "Authenticated users can insert books"
on public.books
for insert
to authenticated
with check (true);

#### Storage - upload
create policy "Authenticated users can upload to books-covers"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'books-covers');

#### Storage - read public
create policy "Public can read books-covers"
on storage.objects
for select
to public
using (bucket_id = 'books-covers');

---

## ⚠️ TROUBLESHOOTING

### Supabase nu merge
- verifică `.env.local`
- restart server

### Upload nu merge
- verifică policies

### Bucket not found
- verifică numele: books-covers

### Nu apar imagini
- verifică public URL
- verifică policy SELECT

---

## 🔄 GIT WORKFLOW

git status  
git add .  
git commit -m "mesaj"  
git push  

---

## 📁 STRUCTURĂ IMPORTANTĂ

src/app/page.tsx  
src/app/books/[id]/page.tsx  
src/app/admin/page.tsx  
src/app/login/page.tsx  

src/app/api/book-covers/search/route.ts  
src/lib/supabase/client.ts  

---

## 🧠 FLOW PRINCIPAL

1. Upload imagine  
2. OCR  
3. Autofill  
4. Căutare copertă  
5. Selectare  
6. Fallback (imagine proprie)  
7. Salvare  

---

## 📌 IMPORTANT

- `.env.local` NU este în GitHub  
- bucket name trebuie să fie EXACT  
- OCR nu este perfect  
- fallback este normal  

---

## 🚧 NEXT STEPS

- copertă spate  
- îmbunătățire OCR  
- search în bibliotecă  
- deploy pe Vercel  