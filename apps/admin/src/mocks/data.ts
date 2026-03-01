export interface MockPartner {
  id: string
  storeName: string
  type: 'RESTAURANT' | 'BAKERY' | 'GROCERY' | 'CAFE'
  managerName: string
  managerEmail: string
  phone: string
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'BANNED'
  submittedAt: string
  approvedAt: string | null
  address: string
  basketsTotal: number
  revenueTotal: number
  commissionRate: number
  rating: number
  reviewCount: number
}

export interface MockConsumer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  registeredAt: string
  reservationsCount: number
  noShowCount: number
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'
  totalSpent: number
}

export interface MockClaim {
  id: string
  consumerId: string
  consumerName: string
  partnerId: string
  partnerName: string
  reservationId: string
  type: 'MISSING_ITEM' | 'QUALITY_ISSUE' | 'WRONG_BASKET' | 'NO_SHOW_DISPUTE'
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED'
  urgency: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  createdAt: string
  updatedAt: string
  amount: number | null
  resolution: string | null
}

export interface MockReview {
  id: string
  consumerId: string
  consumerName: string
  partnerId: string
  partnerName: string
  rating: number
  comment: string
  createdAt: string
  flagged: boolean
}

export interface MockAuditEntry {
  id: string
  userId: string
  userName: string
  action: string
  category: 'AUTH' | 'PARTNER' | 'CONSUMER' | 'FINANCE' | 'SETTINGS' | 'CLAIM'
  details: string
  createdAt: string
  ip: string
}

export interface MockFraudAlert {
  id: string
  type: 'VELOCITY_ABUSE' | 'PAYMENT_ANOMALY' | 'ACCOUNT_TAKEOVER' | 'BASKET_FRAUD'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  entityType: 'CONSUMER' | 'PARTNER'
  entityId: string
  entityName: string
  description: string
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
  resolvedAt: string | null
}

export interface MockRevenueDataPoint {
  date: string
  revenue: number
  baskets: number
  commission: number
}

// Partners mock data
export const mockPartners: MockPartner[] = [
  {
    id: 'partner-001',
    storeName: 'La Boulangerie du Soleil',
    type: 'BAKERY',
    managerName: 'Marie Dupont',
    managerEmail: 'marie@boulangerie-soleil.mu',
    phone: '+230 5901 2345',
    status: 'PENDING',
    submittedAt: '2026-02-25T08:30:00Z',
    approvedAt: null,
    address: '12 Rue La Bourdonnais, Port-Louis',
    basketsTotal: 0,
    revenueTotal: 0,
    commissionRate: 15,
    rating: 0,
    reviewCount: 0,
  },
  {
    id: 'partner-002',
    storeName: 'Chez Ramdhun',
    type: 'RESTAURANT',
    managerName: 'Rajesh Ramdhun',
    managerEmail: 'rajesh@chezramdhun.mu',
    phone: '+230 5712 8890',
    status: 'PENDING',
    submittedAt: '2026-02-27T14:15:00Z',
    approvedAt: null,
    address: '45 Royal Road, Quatre-Bornes',
    basketsTotal: 0,
    revenueTotal: 0,
    commissionRate: 15,
    rating: 0,
    reviewCount: 0,
  },
  {
    id: 'partner-003',
    storeName: 'Island Fresh Market',
    type: 'GROCERY',
    managerName: 'Priya Nair',
    managerEmail: 'priya@islandfresh.mu',
    phone: '+230 5834 6677',
    status: 'ACTIVE',
    submittedAt: '2026-01-10T09:00:00Z',
    approvedAt: '2026-01-12T10:30:00Z',
    address: '8 Mahebourg Road, Rose-Hill',
    basketsTotal: 142,
    revenueTotal: 24850,
    commissionRate: 15,
    rating: 4.7,
    reviewCount: 89,
  },
  {
    id: 'partner-004',
    storeName: 'Cafe des Arts',
    type: 'CAFE',
    managerName: 'Sophie Martin',
    managerEmail: 'sophie@cafedesarts.mu',
    phone: '+230 5623 4410',
    status: 'ACTIVE',
    submittedAt: '2025-12-05T11:00:00Z',
    approvedAt: '2025-12-07T09:15:00Z',
    address: '3 Place d\'Armes, Port-Louis',
    basketsTotal: 231,
    revenueTotal: 38420,
    commissionRate: 12,
    rating: 4.9,
    reviewCount: 156,
  },
  {
    id: 'partner-005',
    storeName: 'Speedy Snacks',
    type: 'RESTAURANT',
    managerName: 'Karim Osman',
    managerEmail: 'karim@speedysnacks.mu',
    phone: '+230 5955 3322',
    status: 'SUSPENDED',
    submittedAt: '2025-11-20T08:00:00Z',
    approvedAt: '2025-11-22T10:00:00Z',
    address: '77 Moka Road, Curepipe',
    basketsTotal: 58,
    revenueTotal: 8900,
    commissionRate: 15,
    rating: 3.2,
    reviewCount: 34,
  },
]

// Consumers mock data
export const mockConsumers: MockConsumer[] = [
  {
    id: 'consumer-001',
    firstName: 'Anika',
    lastName: 'Boodhoo',
    email: 'anika.boodhoo@gmail.com',
    phone: '+230 5801 2233',
    registeredAt: '2025-12-15T10:00:00Z',
    reservationsCount: 28,
    noShowCount: 0,
    status: 'ACTIVE',
    totalSpent: 3240,
  },
  {
    id: 'consumer-002',
    firstName: 'Sanjay',
    lastName: 'Lutchmanen',
    email: 'sanjay.l@hotmail.com',
    phone: '+230 5744 9988',
    registeredAt: '2025-11-30T14:00:00Z',
    reservationsCount: 15,
    noShowCount: 2,
    status: 'ACTIVE',
    totalSpent: 1800,
  },
  {
    id: 'consumer-003',
    firstName: 'Emma',
    lastName: 'Lacaze',
    email: 'emma.lacaze@yahoo.fr',
    phone: '+230 5922 7744',
    registeredAt: '2026-01-05T09:30:00Z',
    reservationsCount: 42,
    noShowCount: 1,
    status: 'ACTIVE',
    totalSpent: 5610,
  },
  {
    id: 'consumer-004',
    firstName: 'Vikash',
    lastName: 'Gopaul',
    email: 'vikash.gopaul@gmail.com',
    phone: '+230 5633 1122',
    registeredAt: '2025-10-01T08:00:00Z',
    reservationsCount: 6,
    noShowCount: 4,
    status: 'SUSPENDED',
    totalSpent: 540,
  },
  {
    id: 'consumer-005',
    firstName: 'Fatima',
    lastName: 'Osman',
    email: 'fatima.osman@gmail.com',
    phone: '+230 5855 3344',
    registeredAt: '2026-01-18T12:00:00Z',
    reservationsCount: 19,
    noShowCount: 0,
    status: 'ACTIVE',
    totalSpent: 2580,
  },
  {
    id: 'consumer-006',
    firstName: 'Lucas',
    lastName: 'Perrot',
    email: 'lucas.perrot@gmail.com',
    phone: '+230 5711 6655',
    registeredAt: '2026-02-01T11:00:00Z',
    reservationsCount: 7,
    noShowCount: 0,
    status: 'ACTIVE',
    totalSpent: 980,
  },
  {
    id: 'consumer-007',
    firstName: 'Meera',
    lastName: 'Seereekissoon',
    email: 'meera.sk@gmail.com',
    phone: '+230 5898 4433',
    registeredAt: '2025-09-15T16:00:00Z',
    reservationsCount: 3,
    noShowCount: 6,
    status: 'BANNED',
    totalSpent: 280,
  },
  {
    id: 'consumer-008',
    firstName: 'David',
    lastName: 'Chenlong',
    email: 'david.chenlong@mail.mu',
    phone: '+230 5661 2200',
    registeredAt: '2026-02-10T10:30:00Z',
    reservationsCount: 5,
    noShowCount: 0,
    status: 'ACTIVE',
    totalSpent: 620,
  },
  {
    id: 'consumer-009',
    firstName: 'Nadia',
    lastName: 'Ramsamy',
    email: 'nadia.ramsamy@gmail.com',
    phone: '+230 5777 8899',
    registeredAt: '2025-12-20T09:00:00Z',
    reservationsCount: 33,
    noShowCount: 1,
    status: 'ACTIVE',
    totalSpent: 4120,
  },
  {
    id: 'consumer-010',
    firstName: 'Kevin',
    lastName: 'Ah-Foo',
    email: 'kevin.ahfoo@gmail.com',
    phone: '+230 5522 1133',
    registeredAt: '2026-01-28T14:00:00Z',
    reservationsCount: 11,
    noShowCount: 0,
    status: 'ACTIVE',
    totalSpent: 1340,
  },
]

// Claims mock data
export const mockClaims: MockClaim[] = [
  {
    id: 'claim-001',
    consumerId: 'consumer-001',
    consumerName: 'Anika Boodhoo',
    partnerId: 'partner-003',
    partnerName: 'Island Fresh Market',
    reservationId: 'res-0134',
    type: 'MISSING_ITEM',
    status: 'OPEN',
    urgency: 'HIGH',
    description: 'J\'ai recu le panier mais il manquait les produits laitiers mentionnes.',
    createdAt: '2026-02-27T16:00:00Z',
    updatedAt: '2026-02-27T16:00:00Z',
    amount: 350,
    resolution: null,
  },
  {
    id: 'claim-002',
    consumerId: 'consumer-003',
    consumerName: 'Emma Lacaze',
    partnerId: 'partner-004',
    partnerName: 'Cafe des Arts',
    reservationId: 'res-0201',
    type: 'QUALITY_ISSUE',
    status: 'IN_REVIEW',
    urgency: 'MEDIUM',
    description: 'Le pain etait rassis et impropre a la consommation.',
    createdAt: '2026-02-26T11:30:00Z',
    updatedAt: '2026-02-27T09:00:00Z',
    amount: 180,
    resolution: null,
  },
  {
    id: 'claim-003',
    consumerId: 'consumer-005',
    consumerName: 'Fatima Osman',
    partnerId: 'partner-005',
    partnerName: 'Speedy Snacks',
    reservationId: 'res-0088',
    type: 'NO_SHOW_DISPUTE',
    status: 'OPEN',
    urgency: 'HIGH',
    description: 'Je me suis presente a l\'heure mais le commerce etait ferme.',
    createdAt: '2026-02-28T08:00:00Z',
    updatedAt: '2026-02-28T08:00:00Z',
    amount: 220,
    resolution: null,
  },
  {
    id: 'claim-004',
    consumerId: 'consumer-002',
    consumerName: 'Sanjay Lutchmanen',
    partnerId: 'partner-003',
    partnerName: 'Island Fresh Market',
    reservationId: 'res-0067',
    type: 'WRONG_BASKET',
    status: 'RESOLVED',
    urgency: 'LOW',
    description: 'J\'ai recu un panier boulangerie au lieu du panier epicerie reserve.',
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-22T14:00:00Z',
    amount: 150,
    resolution: 'Remboursement de Rs 150 effectue. Partenaire prevenu.',
  },
  {
    id: 'claim-005',
    consumerId: 'consumer-009',
    consumerName: 'Nadia Ramsamy',
    partnerId: 'partner-004',
    partnerName: 'Cafe des Arts',
    reservationId: 'res-0155',
    type: 'MISSING_ITEM',
    status: 'IN_REVIEW',
    urgency: 'MEDIUM',
    description: 'Plusieurs articles manquants dans le panier cafe.',
    createdAt: '2026-02-25T13:00:00Z',
    updatedAt: '2026-02-26T10:00:00Z',
    amount: 290,
    resolution: null,
  },
  {
    id: 'claim-006',
    consumerId: 'consumer-006',
    consumerName: 'Lucas Perrot',
    partnerId: 'partner-003',
    partnerName: 'Island Fresh Market',
    reservationId: 'res-0099',
    type: 'QUALITY_ISSUE',
    status: 'REJECTED',
    urgency: 'LOW',
    description: 'Produits perimés dans le panier.',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-17T11:00:00Z',
    amount: 120,
    resolution: 'Reclamation rejetee apres verification — produits conformes.',
  },
  {
    id: 'claim-007',
    consumerId: 'consumer-010',
    consumerName: 'Kevin Ah-Foo',
    partnerId: 'partner-004',
    partnerName: 'Cafe des Arts',
    reservationId: 'res-0210',
    type: 'WRONG_BASKET',
    status: 'RESOLVED',
    urgency: 'LOW',
    description: 'Panier different de la description.',
    createdAt: '2026-02-18T15:00:00Z',
    updatedAt: '2026-02-20T09:00:00Z',
    amount: 200,
    resolution: 'Bon de reduction de Rs 200 emis pour la prochaine commande.',
  },
  {
    id: 'claim-008',
    consumerId: 'consumer-008',
    consumerName: 'David Chenlong',
    partnerId: 'partner-003',
    partnerName: 'Island Fresh Market',
    reservationId: 'res-0233',
    type: 'MISSING_ITEM',
    status: 'OPEN',
    urgency: 'MEDIUM',
    description: 'Panier incomplet — moitie des articles absents.',
    createdAt: '2026-02-28T07:30:00Z',
    updatedAt: '2026-02-28T07:30:00Z',
    amount: 175,
    resolution: null,
  },
]

// Reviews mock data
export const mockReviews: MockReview[] = [
  {
    id: 'review-001',
    consumerId: 'consumer-001',
    consumerName: 'Anika Boodhoo',
    partnerId: 'partner-003',
    partnerName: 'Island Fresh Market',
    rating: 5,
    comment: 'Super panier, bien garni et frais !',
    createdAt: '2026-02-20T12:00:00Z',
    flagged: false,
  },
  {
    id: 'review-002',
    consumerId: 'consumer-003',
    consumerName: 'Emma Lacaze',
    partnerId: 'partner-004',
    partnerName: 'Cafe des Arts',
    rating: 5,
    comment: 'Excellent cafe, produits de qualite. Je recommande vivement !',
    createdAt: '2026-02-22T09:00:00Z',
    flagged: false,
  },
  {
    id: 'review-003',
    consumerId: 'consumer-004',
    consumerName: 'Vikash Gopaul',
    partnerId: 'partner-005',
    partnerName: 'Speedy Snacks',
    rating: 1,
    comment: 'Nul ! Commerce ferme a mon arrivee. Pas serieux du tout !!!',
    createdAt: '2026-02-15T18:00:00Z',
    flagged: true,
  },
  {
    id: 'review-004',
    consumerId: 'consumer-009',
    consumerName: 'Nadia Ramsamy',
    partnerId: 'partner-003',
    partnerName: 'Island Fresh Market',
    rating: 4,
    comment: 'Bonne selection de produits. Personnel accueillant.',
    createdAt: '2026-02-24T11:00:00Z',
    flagged: false,
  },
  {
    id: 'review-005',
    consumerId: 'consumer-005',
    consumerName: 'Fatima Osman',
    partnerId: 'partner-004',
    partnerName: 'Cafe des Arts',
    rating: 5,
    comment: 'Le meilleur endroit pour un panier surprise ! Toujours de bonnes surprises.',
    createdAt: '2026-02-26T10:00:00Z',
    flagged: false,
  },
]

// Dashboard KPIs
export const mockDashboardKpis = {
  totalRevenue: 124380,
  revenueGrowth: 18.5,
  totalBaskets: 1247,
  basketsGrowth: 24.2,
  activePartners: 2,
  partnersGrowth: 5.0,
  activeConsumers: 8,
  consumersGrowth: 12.3,
  openClaims: 3,
  claimsGrowth: -8.0,
  commissionEarned: 18657,
  commissionGrowth: 22.1,
}

// 30-day revenue chart data
export const mockRevenueData: MockRevenueDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date('2026-01-30')
  date.setDate(date.getDate() + i)
  const base = 3500 + Math.random() * 2000
  const baskets = Math.floor(30 + Math.random() * 25)
  return {
    date: date.toISOString().slice(0, 10),
    revenue: Math.round(base),
    baskets,
    commission: Math.round(base * 0.15),
  }
})

// Audit log
export const mockAuditEntries: MockAuditEntry[] = [
  {
    id: 'audit-001',
    userId: 'admin-001',
    userName: 'Admin Jean',
    action: 'PARTNER_APPROVED',
    category: 'PARTNER',
    details: 'Approbation du partenaire Island Fresh Market (partner-003)',
    createdAt: '2026-01-12T10:30:00Z',
    ip: '196.1.45.22',
  },
  {
    id: 'audit-002',
    userId: 'admin-001',
    userName: 'Admin Jean',
    action: 'PARTNER_SUSPENDED',
    category: 'PARTNER',
    details: 'Suspension de Speedy Snacks (partner-005) — multiples plaintes',
    createdAt: '2026-02-10T14:00:00Z',
    ip: '196.1.45.22',
  },
  {
    id: 'audit-003',
    userId: 'admin-002',
    userName: 'Admin Sophie',
    action: 'CLAIM_RESOLVED',
    category: 'CLAIM',
    details: 'Resolution reclamation claim-004 — remboursement Rs 150',
    createdAt: '2026-02-22T14:00:00Z',
    ip: '196.1.33.88',
  },
  {
    id: 'audit-004',
    userId: 'admin-002',
    userName: 'Admin Sophie',
    action: 'CONSUMER_SUSPENDED',
    category: 'CONSUMER',
    details: 'Suspension consommateur Vikash Gopaul (consumer-004) — 4 no-shows',
    createdAt: '2026-02-23T09:00:00Z',
    ip: '196.1.33.88',
  },
  {
    id: 'audit-005',
    userId: 'superadmin-001',
    userName: 'SuperAdmin Root',
    action: 'SETTINGS_UPDATED',
    category: 'SETTINGS',
    details: 'Mise a jour du taux de commission global : 15% → 12% pour partenaires premium',
    createdAt: '2026-02-15T11:00:00Z',
    ip: '196.1.10.1',
  },
  {
    id: 'audit-006',
    userId: 'admin-001',
    userName: 'Admin Jean',
    action: 'AUTH_LOGIN',
    category: 'AUTH',
    details: 'Connexion reussie depuis Port-Louis',
    createdAt: '2026-02-28T08:00:00Z',
    ip: '196.1.45.22',
  },
  {
    id: 'audit-007',
    userId: 'admin-002',
    userName: 'Admin Sophie',
    action: 'FINANCE_PAYOUT_APPROVED',
    category: 'FINANCE',
    details: 'Approbation virement partenaire Island Fresh Market — Rs 18,450',
    createdAt: '2026-02-25T16:00:00Z',
    ip: '196.1.33.88',
  },
  {
    id: 'audit-008',
    userId: 'admin-001',
    userName: 'Admin Jean',
    action: 'CLAIM_REJECTED',
    category: 'CLAIM',
    details: 'Rejet reclamation claim-006 apres verification photo',
    createdAt: '2026-02-17T11:00:00Z',
    ip: '196.1.45.22',
  },
  {
    id: 'audit-009',
    userId: 'superadmin-001',
    userName: 'SuperAdmin Root',
    action: 'ADMIN_USER_CREATED',
    category: 'AUTH',
    details: 'Creation compte admin Admin Sophie (admin-002)',
    createdAt: '2025-12-01T09:00:00Z',
    ip: '196.1.10.1',
  },
  {
    id: 'audit-010',
    userId: 'admin-001',
    userName: 'Admin Jean',
    action: 'CONSUMER_BANNED',
    category: 'CONSUMER',
    details: 'Bannissement consommateur Meera Seereekissoon (consumer-007) — abus no-show',
    createdAt: '2026-02-05T10:00:00Z',
    ip: '196.1.45.22',
  },
]

// Fraud alerts
export const mockFraudAlerts: MockFraudAlert[] = [
  {
    id: 'fraud-001',
    type: 'VELOCITY_ABUSE',
    severity: 'HIGH',
    entityType: 'CONSUMER',
    entityId: 'consumer-007',
    entityName: 'Meera Seereekissoon',
    description: '6 reservations non-honorees en 2 semaines. Seuil de 5 depasse.',
    status: 'RESOLVED',
    createdAt: '2026-02-04T15:00:00Z',
    resolvedAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'fraud-002',
    type: 'BASKET_FRAUD',
    severity: 'CRITICAL',
    entityType: 'PARTNER',
    entityId: 'partner-005',
    entityName: 'Speedy Snacks',
    description: 'Commerce ferme lors de 3 creations de reservations consecutives. Fraude probable.',
    status: 'INVESTIGATING',
    createdAt: '2026-02-09T10:00:00Z',
    resolvedAt: null,
  },
  {
    id: 'fraud-003',
    type: 'VELOCITY_ABUSE',
    severity: 'MEDIUM',
    entityType: 'CONSUMER',
    entityId: 'consumer-004',
    entityName: 'Vikash Gopaul',
    description: '4 no-shows en 30 jours. Pattern suspect.',
    status: 'RESOLVED',
    createdAt: '2026-02-20T08:00:00Z',
    resolvedAt: '2026-02-23T09:00:00Z',
  },
  {
    id: 'fraud-004',
    type: 'PAYMENT_ANOMALY',
    severity: 'HIGH',
    entityType: 'CONSUMER',
    entityId: 'consumer-002',
    entityName: 'Sanjay Lutchmanen',
    description: '3 tentatives de paiement refusees suivies d\'une acceptation suspecte.',
    status: 'ACTIVE',
    createdAt: '2026-02-27T22:00:00Z',
    resolvedAt: null,
  },
  {
    id: 'fraud-005',
    type: 'ACCOUNT_TAKEOVER',
    severity: 'CRITICAL',
    entityType: 'CONSUMER',
    entityId: 'consumer-006',
    entityName: 'Lucas Perrot',
    description: 'Connexion depuis 3 pays differents en 24h. Possible prise de controle du compte.',
    status: 'ACTIVE',
    createdAt: '2026-02-28T06:00:00Z',
    resolvedAt: null,
  },
]

// Recent activity feed
export interface MockActivityEvent {
  id: string
  type: 'PARTNER_REGISTERED' | 'CLAIM_OPENED' | 'RESERVATION_COMPLETED' | 'CONSUMER_BANNED' | 'PAYOUT_APPROVED'
  actor: string
  description: string
  timestamp: string
}

export const mockRecentActivity: MockActivityEvent[] = [
  {
    id: 'act-001',
    type: 'PARTNER_REGISTERED',
    actor: 'Rajesh Ramdhun',
    description: 'Nouveau partenaire en attente : Chez Ramdhun',
    timestamp: '2026-02-27T14:15:00Z',
  },
  {
    id: 'act-002',
    type: 'CLAIM_OPENED',
    actor: 'David Chenlong',
    description: 'Nouvelle reclamation — Panier incomplet (Island Fresh Market)',
    timestamp: '2026-02-28T07:30:00Z',
  },
  {
    id: 'act-003',
    type: 'CLAIM_OPENED',
    actor: 'Fatima Osman',
    description: 'Reclamation no-show ouverture (Speedy Snacks)',
    timestamp: '2026-02-28T08:00:00Z',
  },
  {
    id: 'act-004',
    type: 'RESERVATION_COMPLETED',
    actor: 'Anika Boodhoo',
    description: 'Reservation completee — Cafe des Arts',
    timestamp: '2026-02-28T09:00:00Z',
  },
  {
    id: 'act-005',
    type: 'PARTNER_REGISTERED',
    actor: 'Marie Dupont',
    description: 'Nouveau partenaire en attente : La Boulangerie du Soleil',
    timestamp: '2026-02-25T08:30:00Z',
  },
  {
    id: 'act-006',
    type: 'PAYOUT_APPROVED',
    actor: 'Admin Sophie',
    description: 'Virement Island Fresh Market approuve — Rs 18,450',
    timestamp: '2026-02-25T16:00:00Z',
  },
  {
    id: 'act-007',
    type: 'CONSUMER_BANNED',
    actor: 'Admin Jean',
    description: 'Consommateur Meera Seereekissoon banni — abus no-show',
    timestamp: '2026-02-05T10:00:00Z',
  },
  {
    id: 'act-008',
    type: 'RESERVATION_COMPLETED',
    actor: 'Emma Lacaze',
    description: 'Reservation completee — Island Fresh Market',
    timestamp: '2026-02-27T12:00:00Z',
  },
  {
    id: 'act-009',
    type: 'CLAIM_OPENED',
    actor: 'Anika Boodhoo',
    description: 'Reclamation article manquant (Island Fresh Market)',
    timestamp: '2026-02-27T16:00:00Z',
  },
  {
    id: 'act-010',
    type: 'RESERVATION_COMPLETED',
    actor: 'Nadia Ramsamy',
    description: 'Reservation completee — Cafe des Arts',
    timestamp: '2026-02-26T18:00:00Z',
  },
]
