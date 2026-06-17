# RideSync

A real-time ride-hailing application built with React Native (Expo) and Node.js, supporting live driver tracking, OTP-verified rides, and full socket-based lifecycle management.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Socket Events](#socket-events)
- [Ride Lifecycle](#ride-lifecycle)
- [Architecture Decisions](#architecture-decisions)
- [Push Notifications](#push-notifications)
- [Roadmap](#roadmap)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React Native + Expo | Cross-platform mobile app |
| Expo Router | File-based navigation |
| NativeWind (Tailwind) | Styling |
| React Native Maps | Map rendering and route display |
| Socket.io Client | Real-time communication |
| TypeScript | Type safety |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express.js | REST API server |
| Socket.io | Real-time events |
| MongoDB + Mongoose | Database |
| JWT | Authentication (access + refresh tokens) |

### External Services
| Service | Purpose |
|---|---|
| Google Maps Directions API | Route polyline and ETA |
| Google Places API | Destination search/autocomplete |
| Google Geocoding API | Address ↔ coordinate resolution |
| Cloudinary | Profile and avatar image uploads |
| Expo Push Notifications | Push notification delivery |

---

## Features

### Rider
- Search for a destination with Google Places autocomplete
- View route, distance, and fare estimate before booking
- Real-time driver matching with geo-dispatch (5km radius)
- Live driver location tracking on map
- OTP-based ride start verification
- Ride history and trip summary
- Push notifications for ride accepted, driver arriving, ride started, ride completed

### Driver
- Toggle online/offline availability
- Receive real-time ride requests via socket and push notification
- Accept or decline incoming requests
- Navigation route to pickup and destination
- OTP verification to start ride
- Active ride management (arriving → started → completed)
- Re-dispatch on cancellation (excluding cancelling driver)

### Platform
- JWT authentication with refresh token rotation
- Forgot/reset/change password flows
- Socket reconnection and app recovery
- Background and foreground state handling
- Active ride protection (no double bookings)
- Race condition protection on ride acceptance

---

## Project Structure

```
RideSync/
├── Backend/
│   └── src/
│       ├── config/          # env.js, db config
│       ├── controllers/     # user, driver, ride controllers
│       ├── models/          # User, Driver, Ride mongoose models
│       ├── routes/          # Express route definitions
│       ├── services/        # notification.service.js, etc.
│       ├── middleware/      # auth middleware, error handlers
│       └── socket.js        # Socket.io server and event handlers
│
└── Frontend/
    └── app/
        ├── (auth)/          # signin, signup, forgot password
        ├── (rider)/         # home, create-ride, live-tracking, etc.
        ├── (driver)/        # home, active-ride, ride-request-modal
        ├── _layout.tsx      # Root layout, notification listeners
        └── index.tsx        # Auth check + push token registration
    └── services/
        ├── auth.ts          # Token refresh logic
        ├── socket.ts        # Socket singleton
        ├── notifications.ts # Push token registration and tap handling
        └── storage.ts       # SecureStore wrapper
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)
- Expo CLI (`npm install -g expo-cli`)
- Google Cloud project with Maps, Places, and Geocoding APIs enabled
- Cloudinary account

### Backend Setup

```bash
cd Backend
npm install
cp .env.example .env
# Fill in your environment variables (see below)
npm run dev
```

### Frontend Setup

```bash
cd Frontend
npm install
cp .env.example .env
# Fill in your environment variables (see below)
npx expo run:android   # or run:ios
```

> Push notifications require a **physical device** and a **development build** — they do not work in Expo Go.

---

## Environment Variables

### Backend `.env`

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ridesync

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GOOGLE_MAPS_API_KEY=your_google_maps_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

EXPO_ACCESS_TOKEN=your_expo_token   # Optional — for higher push notification rate limits
```

### Frontend `.env`

```env
EXPO_PUBLIC_API_URL=http://your-backend-ip:5000
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/users/register` | Register new user |
| POST | `/users/login` | Login and receive tokens |
| POST | `/users/refresh-token` | Rotate refresh token |
| POST | `/users/forgot-password` | Send reset email |
| POST | `/users/reset-password` | Reset with token |
| POST | `/users/change-password` | Change password (auth required) |
| POST | `/users/push-token` | Register Expo push token |
| DELETE | `/users/push-token` | Remove push token on logout |

### Driver

| Method | Endpoint | Description |
|---|---|---|
| GET | `/drivers/profile` | Get driver profile |
| PUT | `/drivers/status` | Toggle online/offline |
| POST | `/drivers/upload-license` | Upload license document |
| POST | `/drivers/upload-vehicle-docs` | Upload vehicle documents |

### Rides

| Method | Endpoint | Description |
|---|---|---|
| POST | `/rides` | Create a ride request |
| GET | `/rides/available` | Get nearby available rides (driver) |
| GET | `/rides/current` | Get active ride for current user |
| GET | `/rides/history` | Paginated ride history |
| PUT | `/rides/:id/accept` | Driver accepts ride |
| PUT | `/rides/:id/arriving` | Driver marks arriving |
| PUT | `/rides/:id/start` | Start ride with OTP |
| PUT | `/rides/:id/complete` | Complete ride |
| PUT | `/rides/:id/cancel` | Cancel ride |

---

## Socket Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `update_location` | `{ latitude, longitude }` | Driver sends current location |

### Server → Client

| Event | Description |
|---|---|
| `NEW_RIDE_REQUEST` | Emitted to nearby available drivers when a ride is created |
| `RIDE_ACCEPTED` | Emitted to rider when driver accepts |
| `RIDE_UNAVAILABLE` | Emitted to rider if no drivers available |
| `RIDE_STATUS_UPDATED` | Emitted to ride room on any status change |
| `RIDE_CANCELLED` | Emitted to relevant party on cancellation |
| `DRIVER_LOCATION_UPDATED` | Emitted to rider in ride room with driver coords |

### Socket Rooms

| Room | Members |
|---|---|
| `user:{userId}` | Individual user targeting |
| `drivers:available` | All online drivers |
| `ride-request:{rideId}` | Drivers receiving a specific request |
| `ride:{rideId}` | Rider + driver in an active ride |

---

## Ride Lifecycle

```
requested
   ↓
accepted
   ↓
arriving
   ↓
started
   ↓
completed
```

**Cancellation rules:**

| State | Who cancels | Result |
|---|---|---|
| `requested` | Rider | → `cancelled` |
| `accepted` / `arriving` | Rider | → `cancelled` |
| `accepted` / `arriving` | Driver | → back to `requested`, geo-dispatch re-runs (cancelling driver excluded) |

---

## Architecture Decisions

### Backend is Source of Truth

No heavy global state on the frontend. Every screen recovery goes through `GET /rides/current`, which returns the active ride and maps status to the correct screen:

| Ride Status | Screen |
|---|---|
| `requested` | `/(rider)/searching-driver` |
| `accepted` | `/(rider)/driver-assigned` |
| `arriving` / `started` | `/(rider)/live-tracking` |
| `completed` | `/(rider)/ride-complete` |
| any active (driver) | `/(driver)/active-ride` |

### Socket + Push are Additive

Push notifications are fire-and-forget — every `notificationService` call in `ride.controller.js` is wrapped in `try/catch`. A push failure never propagates to the HTTP response or breaks the ride flow.

### Driver Location Throttling

Driver location updates are throttled to one update every 2 seconds on the server to prevent flooding the ride room.

### Fare Calculation

```
Fare = ₹30 (base) + ₹22 × distance (km)
```

---

## Push Notifications

RideSync uses **Expo Push Notifications** (`expo-notifications`) for all transactional ride alerts.

### Notification Triggers

| Event | Recipient | Message |
|---|---|---|
| Ride created | Nearby drivers | New ride request nearby |
| Ride accepted | Rider | Driver is on the way |
| Driver arriving | Rider | Driver is arriving at pickup |
| Ride started | Rider | Your ride has started |
| Ride completed | Rider | Trip complete — fare summary |
| Rider cancelled | Driver | Rider cancelled the ride |
| Driver cancelled | Rider | Driver cancelled — finding another |

### Token Lifecycle

1. **Login** → frontend registers Expo push token via `POST /users/push-token`
2. **App launch** → re-registers token after successful `refreshAccessToken()`
3. **Logout** → token cleared via `DELETE /users/push-token`
4. **Invalid token** → server self-heals by clearing `expoPushToken` from DB when Expo returns `DeviceNotRegistered`

> Push notifications require a real device. Simulator/emulator will silently skip token registration.

---

## Roadmap

### In Progress
- Push Notifications (Expo Push)

### Planned
1. **Admin Verification Panel** — approve/reject driver documents
2. **Ratings & Reviews** — post-ride ratings for drivers and riders
3. **Driver Earnings Dashboard** — daily/weekly earnings breakdown

### Current Focus
The codebase is in **stabilization and production hardening** mode. No new core ride features are being added until the existing lifecycle, socket reliability, and notification layer are fully tested on physical devices.

---

## Contributing

1. **Audit before building** — check existing implementations before creating new files.
2. **Reuse over recreate** — enhance existing utilities rather than duplicating logic.
3. **Fix before adding** — stability takes priority over new features.
4. **Push notifications are additive** — never let notification failures affect ride state.
