# ShahanFx AI Trading Assistant

ئەم وەشانە کۆدەکەی ShahanFx دەکاتە پڕۆژەی چند-لاپەڕەیی و AI ـی ڕاستەقینەی پشتەوەی هەیە.

## لاپەڕەکان
- `/` سەرەکی
- `/pages/markets.html` بازاڕەکان
- `/pages/chart.html` چارتی ڕاستەوخۆ
- `/pages/ai.html` AI Trading Assistant
- `/pages/learning.html` کۆرس و تۆمارکردن
- `/pages/rules.html` یاساکان
- `/pages/risk.html` Risk Calculator
- `/pages/contact.html` پەیوەندی

## دامەزراندن

1. Node.js دابەزێنە.
2. لە ناو فولدەری پڕۆژە:
   `npm install`
3. `.env.example` بکە بە `.env`
4. `OPENAI_API_KEY` ـەکەت لە `.env` دابنێ.
5.:
   `npm start`
6. بکەرەوە:
   `http://localhost:3000`

## گرنگ
API key تەنها لە backend ـە و لە HTML/JavaScript ـدا دانەنراوە.

AI وێنەی چارت و پرسیاری بەکارهێنەر وەردەگرێت و شیکاری ڕێکخراو دەکات. Confidence تەنها هەڵسەنگاندنە و هیچ قازانجێک گەرەنتی ناکات.

Course registration لە `data/registrations.json` هەڵدەگیرێت. ئەگەر Telegram Bot Token و Chat ID دابنێیت، داواکارییەکان هەروەها بۆ Telegram دەنێردرێن.
