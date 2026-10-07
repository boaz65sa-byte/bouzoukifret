# Building the iOS app on a Mac

The live App Store app is **Bouzouki Academy 1.0** (bundle `com.bouzoukifret.app`), shipped on 13 August 2026. That binary is a Capacitor snapshot of the site from the Mac that archived it. It does not pick up later website deploys.

Android is different: the Play listing is a Trusted Web Activity of the live site, so a website deploy updates Android without a new store binary.

This repository does not contain the Xcode project. `mobile/ios/` and `mobile/www/` are gitignored and live on the Mac that already shipped 1.0. `mobile/capacitor.config.json` is in git (`appId` `com.bouzoukifret.app`, `webDir` `www`).

## Rebuild and resubmit

On the Mac that has the existing `mobile/ios` project:

```bash
git pull
npm run mobile:www
cd mobile
npx cap sync ios
npx cap open ios
```

`npm run mobile:www` copies the current site into `mobile/www`. `npx cap sync ios` copies that web bundle into the Xcode project. Do not run `npx cap add ios` again if `mobile/ios` already exists.

In Xcode:

1. Keep the existing signing team and the bundle id `com.bouzoukifret.app`.
2. Keep `NSMicrophoneUsageDescription` in `ios/App/App/Info.plist`. Do not delete it when syncing. If it is missing, add:

   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>האפליקציה משתמשת במיקרופון כדי לזהות את הצליל שאתם מנגנים או שרים בזמן אמת (מכוון, זיהוי אקורדים, תרגילי קצב) — הניתוח קורה כולו על המכשיר ואינו נשמר או נשלח.</string>
   ```

   English, if a second string is required by a localization:

   `This app uses the microphone to analyze the sound you play or sing in real time (tuner, chord detection, rhythm drills) — all analysis happens on-device and nothing is recorded or transmitted.`

3. Keep `PrivacyInfo.xcprivacy` in the App target (`ios/App/App/PrivacyInfo.xcprivacy`). Do not remove it during the archive. It must stay a member of the app target so App Store Connect still receives the privacy manifest.
4. Product → Archive.
5. Organizer → Distribute App → App Store Connect → Upload.
6. In App Store Connect, submit the new build for review. Bump the version/build number above 1.0. The August binary does not include the neck, helper, or later practice screens until this archive is accepted.

## First time on a Mac that has no `mobile/ios` yet

```bash
git pull
npm run mobile:www
cd mobile
npm init -y
npm install @capacitor/core @capacitor/ios
npx cap add ios
npx cap sync ios
```

Then add `NSMicrophoneUsageDescription` and `PrivacyInfo.xcprivacy` as above before the first archive. `cap add ios` does not copy those privacy files from this repo, because they are not stored here.

## What not to expect

There is no cloud archive for this Capacitor app. A website deploy updates the public site and the Android TWA only. iOS changes when the steps above are run on a Mac and the new build is accepted in App Store Connect.
