# Konuşma — Türkçe nutq imtihoni platformasi

Har qanday nutq/gapirish imtihonini (PDF namunadagi kabi) cheksiz marta o'tkazish uchun mo'ljallangan, brauzerda ishlaydigan, backend talab qilmaydigan platforma.

## Fayllar
- `index.html` — sahifa tuzilishi
- `style.css` — dizayn
- `app.js` — barcha mantiq: forma, vaqt hisoblagich, ovoz yozish

## Qanday ishga tushirish (VS Code)

Brauzerlar mikrofonga `file://` orqali ochilgan sahifalarda ruxsat bermasligi mumkin, shuning uchun sahifani **lokal server orqali** oching:

1. VS Code'da **Live Server** kengaytmasini o'rnating (Extensions → "Live Server" qidiring → Install).
2. `index.html` ustida o'ng tugmani bosing → **"Open with Live Server"**.
3. Brauzer ochiladi (odatda `http://127.0.0.1:5500`) — shu yerda mikrofonga ruxsat so'ralganda **Allow** bosing.

Muqobil variant (terminal orqali, agar Python o'rnatilgan bo'lsa):
```
python -m http.server 5500
```
so'ng brauzerda `http://localhost:5500` oching.

> Eng barqaror natija uchun **Google Chrome** yoki **Microsoft Edge**da ishlatish tavsiya etiladi.

## Ishlash tartibi

1. **Sozlash sahifasi** — har bir bo'lim/qism uchun savollarni (va kerak bo'lsa rasmlarni) kiritasiz, so'ng "Imtihonni boshlash" tugmasini bosasiz. Bu forma har safar qayta to'ldiriladi — shu tufayli platforma **cheksiz imtihon** uchun ishlatilaveradi.
   - **Namunani saqlash (JSON)** — bir marta tayyorlagan savol to'plamingizni faylga saqlab qo'yasiz (boshqa kompyuterga ko'chirish uchun qulay).
   - **Fayldan yuklash (JSON)** — saqlangan faylni tanlab, barcha savol va rasmlarni bir zumda formaga qaytarasiz.
   - **Mening imtihonlarim** — sozlash sahifasining yuqori qismida. Ro'yxatdan birini tanlasangiz, formaga avtomatik yuklanadi (kerak bo'lsa tahrirlashda davom etasiz). **"Boshlash →"** tugmasi esa tanlangan imtihonni darhol yuklab, imtihon sahifasiga (ism kiritish/mikrofon ekraniga) olib o'tadi — hech narsani qayta to'ldirish shart emas. "O'chirish" tanlangan namunani ro'yxatdan olib tashlaydi.
   - Forma to'ldirilgach, pastdagi **"Imtihonni saqlash"** tugmasini bosing — nom so'raladi (masalan "8-sinf, 1-variant"), tasdiqlangach imtihon **imtihonni boshlamasdan** shu brauzerda saqlanadi va yuqoridagi ro'yxatda darhol paydo bo'ladi.
2. **Talaba ma'lumoti** — imtihon sahifasiga o'tgach, avval talabaning ism-familyasi so'raladi. Bu keyinchalik yozuv fayllarini kim(lar)niki ekanini ajratish uchun ishlatiladi.
3. **Imtihon sahifasi** — mikrofonga ruxsat berilgach, platforma o'zi ketma-ket boshqaradi:
   - **1-bo'lim / 1-qism**: 3 ta savol birma-bir chiqadi — har biriga 5 soniya tayyorgarlik, 30 soniya gapirish.
   - **1-bo'lim / 2-qism**: ikkita rasm (A va B) + 3 ta savol birga chiqadi — 45 soniya tayyorgarlik, 2 daqiqa gapirish.
   - **2-bo'lim**: rasm + 3 ta savol birga — 1 daqiqa tayyorgarlik, 2 daqiqa gapirish.
   - **3-bo'lim**: mavzu (va ixtiyoriy lehiga/aleyhiga ro'yxatlari) — 1 daqiqa tayyorgarlik, 2 daqiqa gapirish.
   - Har bir "Gapirish" bosqichi boshlanishi bilan ovoz yozib olinadi va vaqt tugagach avtomatik keyingi savolga o'tadi — hech qanday tugma bosish shart emas.
   - Doimiy ko'rinib turadigan soat (yuqori o'ng burchakda) va katta doira-taymer orqali vaqt aniq kuzatiladi.
   - Gapirish paytida kichik ovoz darajasi chizig'i (level meter) mikrofon haqiqatan ishlayotganini ko'rsatib turadi.
   - **Pauza** tugmasi bosilsa, ham taymer, ham ovoz yozish to'xtaydi; **Davom ettirish** bosilganda ikkalasi ham aynan to'xtagan joyidan davom etadi (ovoz yozuvi bitta uzluksiz fayl bo'lib qoladi).
   - **Bekor qilish va qaytadan boshlash** tugmasi imtihonni istalgan payt to'xtatib, 0-dan qayta boshlashga imkon beradi (hozirgacha yozilgan javoblar saqlanmaydi, tasdiqlash so'raladi).
   - Sahifani tasodifan yopib yoki yangilab qo'yishdan himoya bor: imtihon davom etayotganda brauzer chiqishdan oldin ogohlantiradi.
   - Agar brauzer ovoz yozib olishni qo'llab-quvvatlamasa, sozlash sahifasida shu haqda ogohlantirish chiqadi.
4. **Natijalar sahifasi** — talaba ismi va sana ko'rsatiladi; har bir bo'lim/savol uchun yozilgan ovozni shu yerda tinglash, alohida yuklab olish yoki barchasini ZIP qilib yuklab olish mumkin.

## Vaqtlarni o'zgartirish

`app.js` faylining eng boshida `CONFIG` obyekti bor — barcha tayyorgarlik/gapirish vaqtlari shu yerda soniyalarda yozilgan. Xohlagan raqamni o'zgartiring, boshqa joyga tegish shart emas.

> **Eslatma:** original PDF namunada 1-bo'lim 2-qismi uchun faqat tayyorgarlik vaqti (45 soniya) ko'rsatilgan, gapirish vaqti aniq berilmagan edi. Shuning uchun bu yerda 2-bo'lim/3-bo'lim bilan bir xil qilib **2 daqiqa** qo'yilgan — kerak bo'lsa `CONFIG.bolim1_qism2.speakSec` qiymatini o'zgartiring.

## GitHub'ga yuklash

```
git init
git add .
git commit -m "Konuşma platformasi"
git branch -M main
git remote add origin https://github.com/<username>/<repo-nomi>.git
git push -u origin main
```

(Avval GitHub'da bo'sh repository yarating va yuqoridagi `<username>` va `<repo-nomi>`ni o'zingiznikiga almashtiring.)

## Railway'ga deploy qilish

Loyihada `server.js` (kutubxonasiz statik server) va `package.json` bor — Railway buni avtomatik Node ilovasi sifatida taniydi.

1. [railway.app](https://railway.app)ga GitHub hisobingiz bilan kiring.
2. **New Project → Deploy from GitHub repo** tugmasini bosing, repositoryingizni tanlang.
3. Railway avtomatik build qilib, `npm start` (ya'ni `node server.js`) buyrug'i bilan ishga tushiradi — qo'shimcha sozlash shart emas.
4. Deploy tugagach, **Settings → Networking → Generate Domain** orqali ochiq havola (https) oling.

> **Muhim:** mikrofon (`getUserMedia`) faqat **https** yoki `localhost` orqali ishlaydi. Railway domeni avtomatik https bo'lgani uchun bu yerda muammo bo'lmaydi — aksincha, bu ham VS Code Live Server'dagi mahalliy sinovdan ko'ra ishonchliroq variant.

## Texnik eslatmalar
- **"Saqlangan imtihonlar"** faqat shu brauzer + shu kompyuterda saqlanadi (localStorage). Boshqa kompyuterda yoki boshqa brauzerda ishlatish uchun **"Namunani saqlash (JSON)"** orqali faylga eksport qilib, o'sha yerda **"Fayldan yuklash"** qiling.
- Ovoz yozuvlari `.webm` formatida saqlanadi (Chrome/Edge/Firefoxda standart).
- Rasm va savollar faqat joriy sessiyada xotirada saqlanadi — sahifani yopsangiz, forma tozalanadi (agar kerak bo'lsa, keyingi versiyada saqlab qo'yish qo'shilishi mumkin).
- Hech qanday tashqi server yoki backend kerak emas — hammasi brauzerning o'zida ishlaydi.
