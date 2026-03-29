# AuctionX — British Auction RFQ System
### Full-Stack MERN Application

A complete British Auction–style RFQ (Request for Quotation) platform with real-time bidding, IPL-style auction rooms, and role-based access control.

---

## 🗂 Project Structure

```
british-auction-rfq/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── rfqController.js
│   │   ├── bidController.js
│   │   ├── roomController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── RFQ.js
│   │   ├── Bid.js
│   │   └── Room.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── rfqRoutes.js
│   │   ├── bidRoutes.js
│   │   ├── roomRoutes.js
│   │   └── adminRoutes.js
│   ├── socket/
│   │   └── auctionSocket.js
│   ├── .env
│   ├── package.json
│   └── server.js
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   └── common/
    │   │       ├── Navbar.jsx
    │   │       ├── CreateRoomModal.jsx
    │   │       └── JoinRoomModal.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── SocketContext.jsx
    │   ├── hooks/
    │   │   └── useCountdown.js
    │   ├── pages/
    │   │   ├── AuthPage.jsx
    │   │   ├── HomePage.jsx
    │   │   ├── RoomPage.jsx
    │   │   ├── RFQPage.jsx
    │   │   ├── RFQDetailPage.jsx
    │   │   └── AdminPage.jsx
    │   ├── utils/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── index.js
    │   └── index.css
    └── package.json
```

---

## ⚙️ Prerequisites

- **Node.js** v18+
- **MongoDB** v6+ (local or Atlas)
- **npm** v9+

---

## 🚀 Setup & Running Locally

### 1. Clone / Extract the project

```bash
cd british-auction-rfq
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Edit `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/british_auction_rfq
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
NODE_ENV=development
```

### 3. Start Backend

```bash
cd backend
npm run dev     # development (with nodemon)
# or
npm start       # production
```

Backend runs on: `http://localhost:5000`

> Seed scripts were removed from this repository to keep deployment clean. Create users and auction data via the app UI.

### 4. Setup Frontend

```bash
cd backend
npm run dev     # development (with nodemon)
# or
npm start       # production
```

Backend runs on: `http://localhost:5000`

### 5. Setup Frontend

```bash
cd frontend
npm install
```

### 6. Start Frontend

```bash
cd frontend
npm start
```

Frontend runs on: `http://localhost:3000`

---

## 🔐 Role-Based Access

| Role | Capabilities |
|------|-------------|
| **Admin** | Full system access, manage users, view all RFQs and rooms |
| **Buyer** | Create RFQs, manage own auctions, view bids |
| **Supplier** | Join RFQs, place bids, view rankings |
| **Host** (Room) | Create rooms, start/pause/control auctions, set config |
| **Participant** (Room) | Join rooms (public or via code), bid on players |

---

## 🏗 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (React)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ AuthPage │ │ HomePage │ │ RoomPage │ │ RFQPages  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│         │            │            │             │        │
│    AuthContext   SocketContext  Hooks         api.js    │
└─────────────────────────────────────────────────────────┘
          │ HTTP REST              │ Socket.IO
          ▼                        ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Express.js)                    │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │   Routes   │  │ Middleware│  │   Socket Handler     │ │
│  │  /api/auth │  │  JWT auth │  │  auctionSocket.js    │ │
│  │  /api/rfq  │  │  RBAC     │  │  - room:join/leave   │ │
│  │  /api/bids │  └──────────┘  │  - room:bid          │ │
│  │  /api/rooms│               │  - rfq:join          │ │
│  │  /api/admin│               │  - bid:new           │ │
│  └────────────┘               └──────────────────────┘ │
│         │                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Controllers                          │   │
│  │  authController  rfqController  bidController    │   │
│  │  roomController  adminController                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                  MongoDB (Mongoose)                      │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────────┐    │
│  │  User  │  │  RFQ   │  │  Bid   │  │    Room    │    │
│  │embedded│  │embedded│  │embedded│  │ embedded   │    │
│  │activity│  │activity│  │ quote  │  │participants│    │
│  └────────┘  └────────┘  └────────┘  └────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 British Auction Extension Flow

```
1. Supplier places a bid
2. Backend checks: Is current time within Trigger Window (X min before close)?
3. If YES → check Extension Trigger type:
   a. bid_received → always extend
   b. rank_change  → extend only if any ranking changed
   c. l1_change    → extend only if L1 (lowest bidder) changed
4. If trigger fires:
   → New Close Time = Current Close Time + Extension Duration (Y min)
   → BUT: New Close Time ≤ Forced Close Time (hard limit)
5. Emit socket event to all connected clients: time extended
6. Log the extension in RFQ activity log with reason
7. Repeat for every subsequent bid in the new window
```

---

## 🗄 MongoDB Schema Summary

### User (embedded activityLog, joinedRooms)
### RFQ (embedded auctionConfig, item, invitedSuppliers, activityLog, winner)
### Bid (embedded quote with auto-calculated totalAmount)
### Room (embedded participants with purse/online tracking, config)

---

## 📡 API Reference

### Auth
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Protected |
| PUT | /api/auth/profile | Protected |

### RFQ
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/rfq/create | Buyer, Admin |
| GET | /api/rfq/list | Protected |
| GET | /api/rfq/:id | Protected |
| PUT | /api/rfq/:id/status | Buyer, Admin |
| GET | /api/rfq/:id/activity | Protected |

### Bids
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/bids/place | Supplier, Admin |
| GET | /api/bids/:rfqId | Protected |
| GET | /api/bids/my/:rfqId | Protected |

### Rooms
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/rooms/create | Protected |
| POST | /api/rooms/join | Protected |
| GET | /api/rooms/public | Protected |
| GET | /api/rooms/my | Protected |
| GET | /api/rooms/:id | Protected |
| PUT | /api/rooms/:id/config | Host |
| PUT | /api/rooms/:id/status | Host, Admin |

### Admin
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | /api/admin/stats | Admin |
| GET | /api/admin/users | Admin |
| PUT | /api/admin/users/:id | Admin |
| GET | /api/admin/rfqs | Admin |
| DELETE | /api/admin/rooms/:id | Admin |

---

## 🔌 Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `rfq:join` | `{ rfqId }` | Join RFQ live room |
| `rfq:leave` | `{ rfqId }` | Leave RFQ room |
| `room:join` | `{ roomId }` | Join auction room |
| `room:leave` | `{ roomId }` | Leave auction room |
| `room:bid` | `{ roomId, playerId, bidAmount, teamName }` | Place a bid |
| `room:hostAction` | `{ roomId, action, data }` | Host controls |
| `room:reaction` | `{ roomId, emoji }` | Send emoji |
| `room:chat` | `{ roomId, message }` | Chat message |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `bid:new` | `{ bid, allBids, extensionResult }` | New bid placed |
| `room:bidUpdate` | `{ bidAmount, teamName, ... }` | Bid in room |
| `room:started` | `{ room }` | Auction started |
| `room:paused` | — | Auction paused |
| `room:playerSold` | `{ playerName, teamName, amount }` | Player sold |
| `room:timerUpdate` | `{ timeLeft }` | Timer sync |
| `room:reactionBroadcast` | `{ emoji, from }` | Emoji reaction |
| `room:chatMessage` | `{ message, from }` | Chat broadcast |
| `rfq:statusChanged` | `{ status }` | RFQ status update |

---

## 🎨 UI Pages

| Page | URL | Description |
|------|-----|-------------|
| Login/Register | `/login` | Auth with demo account shortcuts |
| Home | `/` | Daily & Season auction tabs |
| Auction Room | `/room/:id` | Live IPL-style bidding room |
| RFQ List | `/rfq` | All RFQs with stats |
| Create RFQ | `/rfq` (form) | British Auction config form |
| RFQ Detail | `/rfq/:id` | Live bids, rankings, activity log |
| Admin | `/admin` | User management, system stats |

---

## 🎯 Key Features Implemented

- ✅ British Auction with 3 trigger types (bid received / rank change / L1 change)
- ✅ Auto auction extension capped at forced close time
- ✅ Real-time bidding via Socket.IO
- ✅ Live countdown timers (auction close + per-bid timer)
- ✅ Role-based access (Admin / Buyer / Supplier)
- ✅ Room host controls (start, pause, sold, unsold, next player)
- ✅ Public rooms (join without code) + Private rooms (join with code)
- ✅ Emoji reactions + live chat in rooms
- ✅ Supplier ranking (L1, L2, L3...) with live updates
- ✅ RFQ activity log (bids, extensions, reasons)
- ✅ Item image upload (base64)
- ✅ Admin dashboard with user management
- ✅ Embedded MongoDB data models
- ✅ JWT authentication with auto-refresh

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Socket.IO Client |
| Styling | Custom CSS (CSS Variables design system) |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose ODM |
| Real-time | Socket.IO |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Fonts | Bebas Neue, Space Grotesk, JetBrains Mono |
