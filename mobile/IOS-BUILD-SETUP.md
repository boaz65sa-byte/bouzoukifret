# Building the iOS version on a Mac

Context: `mobile/capacitor.config.json` already exists (app ID `com.bouzoukifret.app`), but the
Capacitor project itself was never initialized — there's no `mobile/package.json` and no
`mobile/ios` folder. This needs a Mac with Xcode; there's no cloud-build path for Capacitor
the way EAS Build works for Expo/React Native apps.

## 1. Clone the project

```bash
git clone https://github.com/boaz65sa-byte/bouzoukifret.git
cd bouzoukifret/mobile
```

## 2. Install required tools (if not already present)

```bash
brew install node
sudo gem install cocoapods
npm install -g @capacitor/cli
```

## 3. Initialize the Capacitor project (not done yet — only the config file exists)

```bash
npm init -y
npm install @capacitor/core @capacitor/ios @capacitor/android
npx cap add ios
npx cap sync ios
```

## 4. Open in Xcode and build

```bash
npx cap open ios
```

In Xcode:
- Sign in with your Apple Developer account (Xcode → Settings → Accounts)
- Select your Team under the project's Signing settings
- Product → Archive, then upload to App Store Connect via the Organizer window

## Notes

- App Store Connect itself is domain-blocked for Claude's browser tools — any App Store Connect
  steps (demo account, Sign-In Information, submitting for review) need to be done by the user
  directly, same as with WinrSwipe's iOS submission.
- WinrSwipe's iOS submission (this session) hit rejections for: missing Sign in with Apple,
  fake/missing demo reviewer account, and a broken Support URL (Vercel deployment protection).
  Worth checking Bouzouki Academy's own Support URL and any login flow for the same issues before
  submitting, if applicable.
