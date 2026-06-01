# OpenFragment — сценарий видео «Как пользоваться платформой»

Я не могу сгенерировать готовый MP4 в этом чате. Ниже — **пошаговый сценарий** для:

1. **Записи экрана** (macOS: QuickTime / OBS) + монтаж в CapCut / DaVinci
2. **ИИ-озвучки** (ElevenLabs, HeyGen) по тексту ниже
3. **ИИ-ролика по кадрам** (Runway, Kling, Sora) — промпты в таблице

**Длина:** 60–90 секунд · **Формат:** 16:9, 1080p · **Сайт:** https://www.openfragment.live

---

## Структура ролика (7 сцен)

| #   | Длительность | На экране                                           | Текст за кадром (RU)                                                                                           |
| --- | ------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 0:00–0:08    | Лендинг, кнопка **Launch Now**                      | «OpenFragment — launchpad для jetton на TON. Запускайте токен за секунды, без отдачи seed-фразы.»              |
| 2   | 0:08–0:18    | Вкладка **Create**, **Connect Wallet**              | «Подключите любой кошелёк с TON Connect: Tonkeeper, MyTonWallet, Telegram Wallet.»                             |
| 3   | 0:18–0:35    | Форма: имя, символ, supply, лого, соцсети           | «Заполните имя, тикер, supply и загрузите лого — метаданные попадут on-chain. Стоимость деплоя — около 2 TON.» |
| 4   | 0:35–0:48    | Подпись транзакции в кошельке → **Jetton Deployed** | «Подтвердите в кошельке. Контракт TEP-74 деплоится и минтится в одной транзакции — без снайперов на деплое.»   |
| 5   | 0:48–0:58    | Кнопка **View on Launchpad** → карточка токена      | «Токен сразу в публичном launchpad — видят все, кошелёк для просмотра не нужен.»                               |
| 6   | 0:58–1:15    | **Trade** → STON.fi, Tonviewer                      | «Торгуйте на STON.fi и DeDust. Эксплореры подхватывают лого и соцсети автоматически.»                          |
| 7   | 1:15–1:25    | Логотип + URL + @openfragment                       | «openfragment.live — создайте свой jetton на TON. Подписывайтесь: @openfragment»                               |

---

## Промпты для ИИ-видео (если без записи экрана)

Используйте **реальные скриншоты сайта** как reference image, если сервис поддерживает — так ролик будет узнаваемым.

**Сцена 1 — лендинг**  
`Cinematic UI mockup, dark and light split, crypto launchpad hero "OpenFragment", TON blue accent #0098EA, minimal fintech, 4K, no fake logos`

**Сцена 4 — кошелёк**  
`Smartphone screen Tonkeeper confirming TON transaction, jetton deploy, clean UI, shallow depth of field`

**Сцена 5 — launchpad grid**  
`Dashboard grid of token cards, name symbol market cap, modern SaaS, white cards, blue accents`

---

## Чеклист перед записью

- [ ] На production **нет** демо-токенов (`VITE_LAUNCHPAD_DEMO` не `true`)
- [ ] Кошелёк на **mainnet** с ≥ 2 TON + gas
- [ ] Уникальное имя/символ для демо (например `DEMO` / `OFD`)
- [ ] Закройте лишние вкладки и уведомления
- [ ] Запись 1920×1080, курсор медленный, пауза 2 сек на каждой кнопке

---

## Текст для поста под видео (X / Telegram)

```
Как запустить jetton на TON за ~2 минуты 👇

1️⃣ openfragment.live → Create
2️⃣ TON Connect + форма токена
3️⃣ Подпись в кошельке
4️⃣ Токен в Launchpad для всех
5️⃣ Trade на STON.fi

Non-custodial · TEP-74 · Tolk

@openfragment #TON #BuildOnTON
```

---

## Английская озвучка (опционально)

> OpenFragment is a native TON jetton launchpad. Connect any TON Connect wallet, fill in your token details, confirm one transaction — your TEP-74 jetton goes live and appears on the public launchpad. Trade on STON.fi from day one. openfragment.live
