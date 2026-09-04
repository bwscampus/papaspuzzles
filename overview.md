# Papa's Puzzles — Product Overview

Founder: Berkeley Katz · Contact: info@papaspuzzles.org · Last clarified: 2026-09-04

The technical design that implements this document lives in [docs/technical-design.md](docs/technical-design.md).

## 1. Vision

The overall goal of Papa's Puzzles is to be a nonprofit organization and to be extended to other regions and cities such as San Francisco. There would be numerous branches being run by different students at a school in that area. That would happen once I become successful in the Los Angeles branch.

Papa's Puzzles works as a puzzle trading system which trades puzzlers' old puzzles for exciting new ones. New puzzlers trade using two of their puzzles and pick one from the collection. One of the puzzles they give goes to a pre-picked charity. Returning traders have a 1-for-1 trading system. Anyone can also simply donate puzzles and gain credits that they can use to claim puzzles in the future.

## 2. Definitions

| Term | Meaning |
| --- | --- |
| **Puzzle** | Has a name, piece count, theme, condition, and a photo. Piece count is one of 100, 300, 500, 1000, 2000+. Theme is one of Animals, Landscape, Art, Food, Cityscape, Movies, Other. Condition is new, good, or fair. There is **no** easy / medium / hard category. |
| **Puzzle status** | `pending review` (submitted, not yet public) → `available` (shown on Explore) → `reserved` (picked in a trade or with credits, hand-off not done yet) → `traded` (handed off in a trade) or `claimed` (handed off for credits). A puzzle can also be `rejected` by the admin. Explore shows only `available` puzzles. |
| **Account** | Optional. Email + password. You need an account to use credits and to see My Trades. Everything is tied to your email, so anything you did as a guest shows up once you create an account with the same email. |
| **New vs returning trader** | **Returning** = this email has at least one completed trade or one accepted donation. **New** = neither. The system decides this from the email, so it works before signing in. |
| **Credit** | One credit claims one available puzzle. Credits never expire. |

## 3. Rules

### Start a Trade
1. New traders give **2** puzzles and pick **1**. Returning traders give **1** and pick **1**. The website enforces this.
2. The puzzle you pick is reserved for you immediately so nobody else can take it.
3. The puzzles you give go into review and appear on Explore once the admin approves them.
4. You choose a drop-off date and a time slot (10 AM, 12 PM, 2 PM, or 4 PM).
5. After the hand-off, the admin marks the trade **completed**. You are now a returning trader. If the trade does not happen, the admin **cancels** it and the picked puzzle goes back on Explore.

### Donate Now
1. Enter your name, email, and one or more puzzles ("Add Another Puzzle" as many times as you like).
2. Puzzles go into review. When the admin **accepts** your donation, the puzzles appear on Explore and you earn credits.
3. Credits: if you were a **new** trader when the donation was accepted, you earn (number of puzzles − 1). Otherwise you earn 1 credit per puzzle.
4. After submitting you see: "Thanks! Once approved you'll have about N credits." (N is computed from your current status.)

### Use Your Credits
1. Sign in. You can pick as many available puzzles as you have credits.
2. The puzzles are reserved and the credits are deducted right away. The admin marks the pick-up **fulfilled** after hand-off, or **cancels** it and refunds the credits.

### Charity
Which of a new trader's two puzzles goes to charity is decided offline. The website does not track it.

### Photo check
The admin's review is the check that a photo is a real puzzle. There is no automated check for now.

## 4. Website pages

**Home** — the video, the phrase, the 3 steps (Donate, Choose, Swap), the quote, and the 3 buttons: **Start a Trade**, **Donate Now**, **Use Your Credits**. Colors match the logo.

**Start a Trade** — a form with 3 stages:
1. Info (name, email). The site tells you whether you are a new or returning trader.
2. Puzzle info (name, pieces, theme, condition, photo) — two forms for new traders, one for returning.
3. Choose the puzzle you want, then pick a drop-off date and time slot.

**Donate Now** — same puzzle form as Start a Trade, one or more puzzles, with "Add Another Puzzle". Ends with the credits message above.

**Use Your Credits** — shows your balance and lets you pick that many puzzles.

**Explore** — all available puzzles with their photos. Filter by **theme** and **piece count** only.

**My Trades** — once signed in, your past trades (what you gave and received), your donations and the credits they earned, and your credit pick-ups.

**Sign in** — create an account or sign in with email and password; reset password by email.

**About Us** — Mission Statement, Our Values, Our Story, the quote, the founder photo, and the founder's info (Berkeley Katz, Papa's Puzzles Founder, info@papaspuzzles.org).

**Admin** (founder's account only) —
- **Puzzles**: every puzzle with a status column; approve, reject, edit, delete.
- **Add Inventory**: add puzzles with the same fields as Donate but without personal information.
- **Users**: everyone who has made an account, with credits and trader status.
- **Trades**: every trade with drop-off details; mark completed or cancelled.
- **Donations & Credits**: pending donations to accept or reject; credits awarded; credit pick-ups to fulfil.

## 5. Out of scope for now
- Multiple branches or regions.
- Charity tracking.
- Automated photo checking.
- Requesting a puzzle that is not in the collection.

## 6. Website content

**Phrase**
Trade your puzzles for exciting new ones!

**Quote**
"Every finished puzzle deserves a second life, and every puzzler deserves a new challenge."

**Mission Statement**
At Papa's Puzzles, we strive to develop a joyful trading system where one can trade in used puzzles and receive exciting new ones! Papa's Puzzles is developing a trading marketplace, where used puzzles can be traded to new puzzlers, while also providing various charities the opportunity to expand their supply – hopefully bringing a smile to someone else's face. Not only are puzzles amazing to do, they help build problem-solving skills, stress management, and can bring people together. Papa's Puzzles is here to inspire connection, creativity, and fun — one piece at a time!

**Our Values**
- **Joy** — We believe that everything in life should have joy in it. Whether it is hanging out with a friend or clicking submit on the puzzle form, we hope that exchanging Papa's Puzzles will bring a smile to your face.
- **Excitement** — With every new trade you experience a certain thrill of receiving a new challenge. Our objective is to have a surprise every time you open a Papa's Puzzles box.
- **Innovative** — We reimagined the puzzle lifecycle through our trading system. We hope to promote a fun and accessible activity to all.
- **Uplift** — We value the power of giving to everybody. Every puzzle donation will be repurposed to a charity that strives to help people. We hope to include everybody who shares the same joys.

**Our Story**

*Memories* — Berkeley Katz, our founder, has always enjoyed doing puzzles. She goes to Oregon every year where she enjoys beautiful views and early mornings working on puzzles with her grandpa, who also shares this passion. Since then, she has been ordering puzzles and had the problem of not knowing what to do once she has completed them. She could either let them sit around or recycle them for a better cause.

*Now it all started* — Berkeley began to have what almost seemed like an obsession with puzzles. Every spare minute would be her enjoying one. She realized that once she finished one it would just lay around, so she wanted to be able to upcycle while still being able to receive new puzzles! Once she initiated the idea, there was nothing holding her back. Ever since then, she has been so excited for new people to experience the joy and excitement Papa's Puzzles bring.

**Founder**
Berkeley Katz, Papa's Puzzles Founder — info@papaspuzzles.org
