
```
eDisasterAid
├─ client
│  ├─ .env
│  ├─ .env.production
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ public
│  │  ├─ favicon.svg
│  │  └─ icons.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ api
│  │  │  ├─ analytics.js
│  │  │  ├─ audit.js
│  │  │  ├─ auth.js
│  │  │  ├─ axios.js
│  │  │  ├─ disasters.js
│  │  │  ├─ distributions.js
│  │  │  ├─ donations.js
│  │  │  ├─ inventory.js
│  │  │  ├─ victims.js
│  │  │  └─ volunteers.js
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  ├─ hero.png
│  │  │  ├─ react.svg
│  │  │  └─ vite.svg
│  │  ├─ components
│  │  │  ├─ layout
│  │  │  │  ├─ Layout.jsx
│  │  │  │  ├─ Navbar.jsx
│  │  │  │  └─ Sidebar.jsx
│  │  │  └─ ui
│  │  │     ├─ Badge.jsx
│  │  │     ├─ ConfirmModal.jsx
│  │  │     ├─ LifecycleBar.jsx
│  │  │     ├─ LiveIndicator.jsx
│  │  │     ├─ LoadingSpinner.jsx
│  │  │     ├─ MapView.jsx
│  │  │     ├─ NotificationPanel.jsx
│  │  │     ├─ PriorityBadge.jsx
│  │  │     └─ StatCard.jsx
│  │  ├─ context
│  │  │  └─ AuthContext.jsx
│  │  ├─ hooks
│  │  │  ├─ useApi.js
│  │  │  └─ usePolling.js
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ admin
│  │  │  │  ├─ AdminAudit.jsx
│  │  │  │  ├─ AdminDashboard.jsx
│  │  │  │  ├─ AdminDisasters.jsx
│  │  │  │  ├─ AdminDistributions.jsx
│  │  │  │  ├─ AdminInventory.jsx
│  │  │  │  ├─ AdminReport.jsx
│  │  │  │  ├─ AdminVictims.jsx
│  │  │  │  └─ AdminVolunteers.jsx
│  │  │  ├─ citizen
│  │  │  │  ├─ CitizenDashboard.jsx
│  │  │  │  ├─ CitizenRegister.jsx
│  │  │  │  └─ CitizenTrack.jsx
│  │  │  ├─ ngo
│  │  │  │  ├─ NgoDashboard.jsx
│  │  │  │  └─ NgoDonate.jsx
│  │  │  ├─ public
│  │  │  │  ├─ Landing.jsx
│  │  │  │  ├─ Login.jsx
│  │  │  │  └─ Register.jsx
│  │  │  └─ volunteer
│  │  │     ├─ VolunteerDashboard.jsx
│  │  │     └─ VolunteerTask.jsx
│  │  └─ utils
│  │     └─ helpers.js
│  ├─ tailwind.config.js
│  ├─ vercel.json
│  └─ vite.config.js
└─ server
   ├─ .env
   ├─ config
   │  └─ db.js
   ├─ controllers
   │  ├─ analyticsController.js
   │  ├─ auditController.js
   │  ├─ authController.js
   │  ├─ disasterController.js
   │  ├─ distributionController.js
   │  ├─ donationController.js
   │  ├─ inventoryController.js
   │  ├─ victimController.js
   │  └─ volunteerController.js
   ├─ middleware
   │  ├─ authMiddleware.js
   │  ├─ errorMiddleware.js
   │  └─ roleMiddleware.js
   ├─ models
   │  ├─ AuditLog.js
   │  ├─ DisasterEvent.js
   │  ├─ Distribution.js
   │  ├─ Inventory.js
   │  ├─ Notification.js
   │  ├─ User.js
   │  └─ Victim.js
   ├─ package-lock.json
   ├─ package.json
   ├─ routes
   │  ├─ analyticsRoutes.js
   │  ├─ auditRoutes.js
   │  ├─ authRoutes.js
   │  ├─ disasterRoutes.js
   │  ├─ distributionRoutes.js
   │  ├─ donationRoutes.js
   │  ├─ inventoryRoutes.js
   │  ├─ victimRoutes.js
   │  └─ volunteerRoutes.js
   ├─ server.js
   └─ utils
      ├─ apiResponse.js
      ├─ auditLogger.js
      ├─ generateToken.js
      └─ priorityEngine.js

```