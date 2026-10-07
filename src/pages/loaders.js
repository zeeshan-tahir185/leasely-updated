// One dynamic-import loader per module page. App.jsx builds its lazy routes
// from this map, and the sidebar warms a page's chunk on hover/focus so the
// first click never waits on the network. The dashboard has no entry: it's the
// landing page, statically imported in App.jsx and present in the entry chunk.
export const PAGE_LOADERS = {
  notifications: () => import("./Notifications"),
  towers: () => import("./Towers"),
  contacts: () => import("./Contacts"),
  leads: () => import("./Leads"),
  contracts: () => import("./Contracts"),
  cheques: () => import("./Cheques"),
  receipts: () => import("./Receipts"),
  vouchers: () => import("./Vouchers"),
  accounting: () => import("./Accounting"),
  maintenance: () => import("./Maintenance"),
  bills: () => import("./Bills"),
  bookings: () => import("./Bookings"),
  inventory: () => import("./Inventory"),
  cases: () => import("./Cases"),
  documents: () => import("./Documents"),
  hr: () => import("./HR"),
  banking: () => import("./Banking"),
  reports: () => import("./Reports"),
  settings: () => import("./Settings"),
};
