# ⚔️ LARP Arena - Champions Leaderboard & UWUFUFU Tournament Voting

A modern, high-performance web application for **LARP (Live Action Role Play)** leaderboards with an interactive tournament-style **"Would You Rather" (UWUFUFU-style)** 1v1 battle voting system, Elo rating calculations, and Google Drive image support.

Designed specifically for **100% free hosting on GitHub Pages** with zero required active local backend servers!

---

## ✨ Features

- 🏆 **Leaderboard & Stats**: Live rankings powered by Elo rating algorithm (\(K=32\)), win/loss records, win streak badges, and category filters (*Characters, Costumes & Armor, Props & Weapons*).
- 🥇 **Hall of Champions Podium**: 1st, 2nd, and 3rd place gold/silver/bronze podium displays with glowing card aura.
- ⚔️ **UWUFUFU-Style 1v1 Tournament Voting**:
  - Head-to-head match cards with hover animations.
  - Bracket progress tracking (Round of 16, Quarterfinals, Semifinals, Grand Final).
  - Immediate percentage reveal & Elo change announcements.
  - Victory celebration screen with animated confetti for crowned champions!
- 👑 **Admin Portal**:
  - Add/Edit LARP materials with titles, factions, lore, tags, and custom initial Elo ratings.
  - **Google Drive Auto-Image Converter**: Paste any Google Drive shareable link (`https://drive.google.com/file/d/FILE_ID/view?usp=sharing`), and the app automatically transforms it into a direct embeddable image URL!
- 🔥 **Dual Storage Architecture**:
  - **Static / GitHub Pages Mode**: Works offline out of the box using LocalStorage & exportable `data.json`. Admin can click "Export data.json" to commit updated material lists to GitHub Pages.
  - **Free Firebase Cloud Mode**: Enter your free Firebase credentials in the Admin settings to enable real-time multi-user live voting sync across all visitors!

---

## 🚀 How to Host on GitHub Pages (Free)

1. Create a new public repository on GitHub (e.g. `larp-leaderboard`).
2. Push all project files to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial LARP Leaderboard release"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/larp-leaderboard.git
   git push -u origin main
   ```
3. In your GitHub repository settings:
   - Go to **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **Deploy from a branch**.
   - Select **Branch**: `main` and **/ (root)**.
   - Click **Save**.
4. Your site will be live at `https://YOUR_USERNAME.github.io/larp-leaderboard/`!

---

## 📸 Using Google Drive Direct Image Links

When uploading materials in the **Admin Portal**:
1. Upload your photo to Google Drive.
2. Right click the image -> **Share** -> Change general access to **"Anyone with the link"**.
3. Copy the link (e.g. `https://drive.google.com/file/d/1A2B3C4D5E6F/view?usp=sharing`).
4. Paste it directly into the **Image Source** box in the Admin Portal.
5. Click **Test Preview**. The app will automatically convert it into a high-res direct image embed URL!

---

## 🔥 Connecting Free Firebase (Optional for Multi-User Sync)

If you want live real-time voting sync between multiple users:
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a free project.
2. Add a **Web App** to your project to get your `firebaseConfig` keys.
3. Open the **Admin Portal** on your live leaderboard site (Default Password: `admin`).
4. Scroll down to **Free Firebase Cloud Configuration**.
5. Paste your `apiKey`, `projectId`, `authDomain`, and `storageBucket`, then click **Connect Firebase Live Sync**.
