# CampusPool — React + Tailwind handoff (classifieds board + auth)

Browsing is fully public. Posting requires an account (mocked auth — see
`api/rides.js`). Tapping "Post an ad" while logged out shows a friendly gate
with Log in / Sign up, and lands the user on the post form right after.

## Requirements
- React 18+, Tailwind CSS, `lucide-react` (`npm i lucide-react`)

## Structure
```
CampusPoolDashboard.jsx   Mount this. Owns view + auth state.
api/rides.js              login/signup/logout/getCurrentUser, fetchRides,
                           fetchMyRides, fetchAllRides, postAd, deleteRide.
                           Every fetch()-based backend call is commented in
                           above the mock — swap and delete the mock lines.
components/
  BrowseView.jsx, RideCard.jsx, ContactModal.jsx   Public ad feed + contact.
  PostAdView.jsx, PostGate.jsx                      Post form / login gate.
  LoginView.jsx, SignupView.jsx                     Auth forms.
  MyAdsView.jsx, AdminView.jsx                      Own ads / all ads, with
                                                     inline delete confirm.
  Tabs.jsx, Toast.jsx
```

## Demo accounts (mock only)
- Admin: admin@campuspool.pk / admin123
- Student: ayesha@campuspool.pk / demo123

## Usage
```jsx
import CampusPoolDashboard from './react-handoff/CampusPoolDashboard';
export default function Page() { return <CampusPoolDashboard />; }
```

## Hooking up your backend
Edit only `api/rides.js`. Auth is currently mocked with an in-memory user
list + a `localStorage` session flag — replace each function's body with the
`fetch()` call already commented above it (session/cookie handling depends
on your backend: swap the mock `localStorage` check for a real `/api/me`
call in `getCurrentUser`).
