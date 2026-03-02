/**
 * BienBon.mu — Database Seed for Admin Dashboard Demo
 * Run with: npx tsx prisma/seed.ts
 */
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env['DATABASE_URL'] ?? 'postgresql://postgres:password@localhost:5432/bienbon';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding BienBon database...');

  // ── 1. Admin User ──
  const adminUser = await prisma.user.upsert({
    where: { supabaseId: '4912cab5-ea24-427b-8905-7e6d8a3ebb4a' },
    update: {},
    create: {
      id: '00000000-0001-0000-0000-000000000001',
      supabaseId: '4912cab5-ea24-427b-8905-7e6d8a3ebb4a',
      email: 'admin@bienbon.mu',
      firstName: 'Admin',
      lastName: 'BienBon',
      status: 'ACTIVE',
    },
  });
  console.log(`Admin user: ${adminUser.id}`);

  // Admin roles
  await prisma.userRole.upsert({
    where: { userId_role: { userId: adminUser.id, role: 'SUPER_ADMIN' } },
    update: {},
    create: { userId: adminUser.id, role: 'SUPER_ADMIN' },
  });
  await prisma.userRole.upsert({
    where: { userId_role: { userId: adminUser.id, role: 'ADMIN' } },
    update: {},
    create: { userId: adminUser.id, role: 'ADMIN' },
  });
  await prisma.adminProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, department: 'Management' },
  });

  // ── 2. Consumer Users (8) ──
  const consumers = [
    { first: 'Maya', last: 'Dupont', email: 'maya.dupont@email.com', phone: '+23057001001', status: 'ACTIVE' as const, days: 60, prefs: ['vegetarian'], code: 'MAYA2026' },
    { first: 'Raj', last: 'Patel', email: 'raj.patel@email.com', phone: '+23057001002', status: 'ACTIVE' as const, days: 55, prefs: ['halal'], code: 'RAJ2026' },
    { first: 'Sophie', last: 'Li', email: 'sophie.li@email.com', phone: '+23057001003', status: 'ACTIVE' as const, days: 45, prefs: [], code: 'SOPHIE2026' },
    { first: 'Jean', last: 'Baptiste', email: 'jean.baptiste@email.com', phone: '+23057001004', status: 'SUSPENDED' as const, days: 40, prefs: [], code: 'JEAN2026' },
    { first: 'Aisha', last: 'Khan', email: 'aisha.khan@email.com', phone: '+23057001005', status: 'ACTIVE' as const, days: 35, prefs: ['halal', 'vegetarian'], code: 'AISHA2026' },
    { first: 'Pierre', last: 'Roux', email: 'pierre.roux@email.com', phone: '+23057001006', status: 'ACTIVE' as const, days: 30, prefs: [], code: 'PIERRE2026' },
    { first: 'Nadia', last: 'Smith', email: 'nadia.smith@email.com', phone: '+23057001007', status: 'BANNED' as const, days: 25, prefs: [], code: 'NADIA2026' },
    { first: 'Kevin', last: 'Wong', email: 'kevin.wong@email.com', phone: '+23057001008', status: 'ACTIVE' as const, days: 20, prefs: ['gluten-free'], code: 'KEVIN2026' },
  ];

  const consumerUsers: { id: string }[] = [];
  for (let i = 0; i < consumers.length; i++) {
    const c = consumers[i];
    const fakeSupabaseId = `consumer-${String(i + 1).padStart(3, '0')}-fake`;
    const user = await prisma.user.upsert({
      where: { supabaseId: fakeSupabaseId },
      update: {},
      create: {
        supabaseId: fakeSupabaseId,
        email: c.email,
        phone: c.phone,
        firstName: c.first,
        lastName: c.last,
        status: c.status,
        createdAt: new Date(Date.now() - c.days * 86400000),
      },
    });
    consumerUsers.push(user);
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: 'CONSUMER' } },
      update: {},
      create: { userId: user.id, role: 'CONSUMER' },
    });
    await prisma.consumerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        dietaryPreferences: c.prefs,
        referralCode: c.code,
      },
    });
  }
  console.log(`${consumerUsers.length} consumers created`);

  // ── 3. Partner Users (4) ──
  const partners = [
    { first: 'Marie', last: 'Laurent', email: 'marie@islandbakery.mu', phone: '+23057002001', days: 80, status: 'ACTIVE' as const },
    { first: 'Dev', last: 'Sharma', email: 'dev@cafedesarts.mu', phone: '+23057002002', days: 70, status: 'ACTIVE' as const },
    { first: 'Lin', last: 'Chen', email: 'contact@freshmarket.mu', phone: '+23057002003', days: 60, status: 'ACTIVE' as const },
    { first: 'Yuki', last: 'Tanaka', email: 'info@sushimu.mu', phone: '+23057002004', days: 5, status: 'ACTIVE' as const },
  ];

  const partnerProfileIds: string[] = [];
  const partnerUserIds: string[] = [];
  for (let i = 0; i < partners.length; i++) {
    const p = partners[i];
    const fakeSupabaseId = `partner-${String(i + 1).padStart(3, '0')}-fake`;
    const user = await prisma.user.upsert({
      where: { supabaseId: fakeSupabaseId },
      update: {},
      create: {
        supabaseId: fakeSupabaseId,
        email: p.email,
        phone: p.phone,
        firstName: p.first,
        lastName: p.last,
        status: p.status,
        createdAt: new Date(Date.now() - p.days * 86400000),
      },
    });
    partnerUserIds.push(user.id);
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: 'PARTNER' } },
      update: {},
      create: { userId: user.id, role: 'PARTNER' },
    });
    const pStatus = i === 3 ? 'PENDING' as const : 'ACTIVE' as const;
    const profile = await prisma.partnerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        status: pStatus,
        submittedAt: new Date(Date.now() - p.days * 86400000),
        validatedAt: pStatus === 'ACTIVE' ? new Date(Date.now() - (p.days - 5) * 86400000) : undefined,
        registrationChannel: i === 2 ? 'ADMIN_INVITE' : 'WEB_FORM',
      },
    });
    partnerProfileIds.push(profile.id);
  }
  console.log(`${partnerUserIds.length} partners created`);

  // ── 4. Stores (4) ──
  const storesData = [
    { name: 'Island Bakery', type: 'BAKERY' as const, address: '12 Rue des Artisans, Port Louis', city: 'Port Louis', lat: -20.1609, lng: 57.5012 },
    { name: 'Cafe des Arts', type: 'CAFE' as const, address: '45 Avenue des Fleurs, Curepipe', city: 'Curepipe', lat: -20.3166, lng: 57.5200 },
    { name: 'Fresh Market', type: 'SUPERMARKET' as const, address: '78 Grand Baie Road, Grand Baie', city: 'Grand Baie', lat: -20.0124, lng: 57.5820 },
    { name: 'Sushi Mu', type: 'RESTAURANT' as const, address: '23 Coastal Road, Flic en Flac', city: 'Flic en Flac', lat: -20.2960, lng: 57.3640 },
  ];

  const storeIds: string[] = [];
  for (let i = 0; i < storesData.length; i++) {
    const s = storesData[i];
    const store = await prisma.store.create({
      data: {
        name: s.name,
        type: s.type,
        address: s.address,
        city: s.city,
        latitude: s.lat,
        longitude: s.lng,
        description: `${s.name} — partenaire BienBon depuis ${partners[i].days} jours`,
        phone: partners[i].phone,
        avgRating: 3.5 + Math.random() * 1.5,
        totalReviews: Math.floor(10 + Math.random() * 40),
        status: 'ACTIVE',
      },
    });
    storeIds.push(store.id);

    // Link partner to store
    await prisma.partnerStore.create({
      data: {
        partnerId: partnerProfileIds[i],
        storeId: store.id,
        storeRole: 'OWNER',
      },
    });
  }
  console.log(`${storeIds.length} stores created`);

  // ── 5. Categories ──
  const categories = [
    { slug: 'boulangerie', namesFr: 'Boulangerie', namesEn: 'Bakery', icon: 'bread' },
    { slug: 'restaurant', namesFr: 'Restaurant', namesEn: 'Restaurant', icon: 'utensils' },
    { slug: 'epicerie', namesFr: 'Epicerie', namesEn: 'Grocery', icon: 'shopping-cart' },
    { slug: 'cafe', namesFr: 'Cafe', namesEn: 'Cafe', icon: 'coffee' },
    { slug: 'patisserie', namesFr: 'Patisserie', namesEn: 'Pastry', icon: 'cake' },
  ];

  const categoryIds: string[] = [];
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryIds.push(c.id);
  }
  console.log(`${categoryIds.length} categories created`);

  // ── 6. Tags ──
  const tags = [
    { slug: 'vegetarien', namesFr: 'Vegetarien', namesEn: 'Vegetarian' },
    { slug: 'halal', namesFr: 'Halal', namesEn: 'Halal' },
    { slug: 'bio', namesFr: 'Bio', namesEn: 'Organic' },
    { slug: 'sans-gluten', namesFr: 'Sans gluten', namesEn: 'Gluten free' },
    { slug: 'local', namesFr: 'Local', namesEn: 'Local' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
  }
  console.log(`${tags.length} tags created`);

  // ── 7. Baskets (12) — spread across stores and dates ──
  const basketsData = [
    { storeIdx: 0, catIdx: 0, title: 'Panier Boulanger Surprise', orig: 800, sell: 350, qty: 5, stock: 2, status: 'PUBLISHED' as const, daysAgo: 0 },
    { storeIdx: 0, catIdx: 0, title: 'Panier Viennoiseries', orig: 600, sell: 250, qty: 4, stock: 0, status: 'SOLD_OUT' as const, daysAgo: 1 },
    { storeIdx: 0, catIdx: 4, title: 'Panier Patisserie Fine', orig: 1200, sell: 500, qty: 3, stock: 1, status: 'PUBLISHED' as const, daysAgo: 0 },
    { storeIdx: 1, catIdx: 3, title: 'Panier Cafe du Jour', orig: 500, sell: 200, qty: 6, stock: 3, status: 'PUBLISHED' as const, daysAgo: 0 },
    { storeIdx: 1, catIdx: 3, title: 'Panier Brunch Surprise', orig: 900, sell: 400, qty: 3, stock: 0, status: 'SOLD_OUT' as const, daysAgo: 2 },
    { storeIdx: 2, catIdx: 2, title: 'Panier Fruits & Legumes', orig: 700, sell: 300, qty: 8, stock: 4, status: 'PUBLISHED' as const, daysAgo: 0 },
    { storeIdx: 2, catIdx: 2, title: 'Panier Epicerie Mixte', orig: 1000, sell: 450, qty: 5, stock: 0, status: 'ENDED' as const, daysAgo: 3 },
    { storeIdx: 2, catIdx: 2, title: 'Panier Bio du Marche', orig: 1500, sell: 650, qty: 4, stock: 2, status: 'PUBLISHED' as const, daysAgo: 0 },
    { storeIdx: 3, catIdx: 1, title: 'Panier Sushi du Soir', orig: 1800, sell: 750, qty: 3, stock: 1, status: 'PUBLISHED' as const, daysAgo: 0 },
    { storeIdx: 3, catIdx: 1, title: 'Panier Bento Surprise', orig: 1000, sell: 450, qty: 4, stock: 0, status: 'SOLD_OUT' as const, daysAgo: 1 },
    { storeIdx: 0, catIdx: 0, title: 'Pain du Matin', orig: 400, sell: 150, qty: 10, stock: 0, status: 'ENDED' as const, daysAgo: 7 },
    { storeIdx: 1, catIdx: 3, title: 'Gouter Surprise', orig: 600, sell: 250, qty: 5, stock: 0, status: 'ENDED' as const, daysAgo: 5 },
  ];

  const basketIds: string[] = [];
  for (const b of basketsData) {
    const now = new Date();
    const pickupStart = new Date(now.getTime() - b.daysAgo * 86400000 + 14 * 3600000);
    const pickupEnd = new Date(pickupStart.getTime() + 3 * 3600000);
    const basket = await prisma.basket.create({
      data: {
        storeId: storeIds[b.storeIdx],
        title: b.title,
        originalPrice: b.orig,
        sellingPrice: b.sell,
        quantity: b.qty,
        stock: b.stock,
        categoryId: categoryIds[b.catIdx],
        pickupStart,
        pickupEnd,
        status: b.status,
        createdAt: new Date(now.getTime() - b.daysAgo * 86400000),
      },
    });
    basketIds.push(basket.id);
  }
  console.log(`${basketIds.length} baskets created`);

  // ── 8. Reservations (15) — to generate revenue data ──
  const reservationStatuses = ['CONFIRMED', 'PICKED_UP', 'NO_SHOW', 'CANCELLED_CONSUMER'] as const;
  const reservationIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const consumerIdx = i % consumerUsers.length;
    const basketIdx = i % basketIds.length;
    const status = reservationStatuses[i % reservationStatuses.length];
    const daysAgo = Math.floor(i * 2) + 1;
    const price = basketsData[basketIdx].sell;

    const reservation = await prisma.reservation.create({
      data: {
        basketId: basketIds[basketIdx],
        consumerId: consumerUsers[consumerIdx].id,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        status,
        qrCode: `QR-${String(i + 1).padStart(4, '0')}`,
        pinCode: String(100000 + i),
        confirmedAt: status !== 'CANCELLED_CONSUMER' ? new Date(Date.now() - daysAgo * 86400000) : undefined,
        pickedUpAt: status === 'PICKED_UP' ? new Date(Date.now() - daysAgo * 86400000 + 3600000) : undefined,
        noShowAt: status === 'NO_SHOW' ? new Date(Date.now() - daysAgo * 86400000 + 7200000) : undefined,
        cancelledAt: status === 'CANCELLED_CONSUMER' ? new Date(Date.now() - daysAgo * 86400000) : undefined,
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      },
    });
    reservationIds.push(reservation.id);
  }
  console.log(`${reservationIds.length} reservations created`);

  // ── 9. Payment Transactions (for completed reservations) ──
  let txCount = 0;
  for (let i = 0; i < reservationIds.length; i++) {
    const status = reservationStatuses[i % reservationStatuses.length];
    if (status === 'CANCELLED_CONSUMER') continue;
    const basketIdx = i % basketIds.length;
    const price = basketsData[basketIdx].sell;
    const storeIdx = basketsData[basketIdx].storeIdx;
    const daysAgo = Math.floor(i * 2) + 1;

    await prisma.paymentTransaction.create({
      data: {
        reservationId: reservationIds[i],
        type: 'CAPTURE',
        status: 'SUCCEEDED',
        amount: price,
        currency: 'MUR',
        paymentMethod: 'CARD',
        providerTxId: `peach-tx-${String(i + 1).padStart(6, '0')}`,
        commissionRate: 0.15,
        commissionAmount: Math.round(price * 0.15),
        partnerNetAmount: Math.round(price * 0.85),
        consumerId: consumerUsers[i % consumerUsers.length].id,
        partnerId: partnerUserIds[storeIdx],
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      },
    });
    txCount++;
  }
  console.log(`${txCount} payment transactions created`);

  // ── 10. Claim Reasons ──
  const claimReasons = [
    { slug: 'missing_item', labelFr: 'Article manquant', labelEn: 'Missing item' },
    { slug: 'quality_issue', labelFr: 'Probleme de qualite', labelEn: 'Quality issue' },
    { slug: 'wrong_basket', labelFr: 'Mauvais panier', labelEn: 'Wrong basket' },
    { slug: 'no_show_dispute', labelFr: 'No-show conteste', labelEn: 'No-show disputed' },
  ];
  for (const r of claimReasons) {
    await prisma.claimReason.upsert({
      where: { slug: r.slug },
      update: {},
      create: r,
    });
  }

  // ── 11. Claims (5) ──
  const claims = [
    { consumerIdx: 0, resIdx: 0, reason: 'missing_item', status: 'OPEN' as const, desc: 'Il manquait 2 croissants dans mon panier' },
    { consumerIdx: 1, resIdx: 1, reason: 'quality_issue', status: 'IN_REVIEW' as const, desc: 'Les fruits etaient abimes' },
    { consumerIdx: 2, resIdx: 4, reason: 'wrong_basket', status: 'RESOLVED' as const, desc: 'J\'ai recu un panier boulangerie au lieu de cafe' },
    { consumerIdx: 4, resIdx: 8, reason: 'no_show_dispute', status: 'OPEN' as const, desc: 'J\'etais present mais le commerce etait ferme' },
    { consumerIdx: 5, resIdx: 5, reason: 'quality_issue', status: 'REJECTED' as const, desc: 'Les legumes semblaient pas frais' },
  ];

  for (const c of claims) {
    await prisma.claim.create({
      data: {
        reservationId: reservationIds[c.resIdx],
        consumerId: consumerUsers[c.consumerIdx].id,
        reasonSlug: c.reason,
        description: c.desc,
        status: c.status,
        resolvedAt: c.status === 'RESOLVED' || c.status === 'REJECTED' ? new Date() : undefined,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000),
      },
    });
  }
  console.log(`${claims.length} claims created`);

  // ── 12. Reviews (8) ──
  const reviewsData = [
    { consumerIdx: 0, partnerIdx: 0, resIdx: 1, rating: 5, comment: 'Excellent panier, tres genereux!' },
    { consumerIdx: 1, partnerIdx: 1, resIdx: 5, rating: 4, comment: 'Bon rapport qualite-prix' },
    { consumerIdx: 2, partnerIdx: 2, resIdx: 9, rating: 3, comment: 'Correct mais sans plus' },
    { consumerIdx: 4, partnerIdx: 0, resIdx: 2, rating: 5, comment: 'Toujours au top cette boulangerie' },
    { consumerIdx: 5, partnerIdx: 1, resIdx: 6, rating: 2, comment: 'Panier un peu decevant cette fois' },
    { consumerIdx: 7, partnerIdx: 2, resIdx: 10, rating: 4, comment: 'Bons produits frais' },
    { consumerIdx: 0, partnerIdx: 3, resIdx: 12, rating: 1, comment: 'Sushis pas frais du tout, degoute' },
    { consumerIdx: 3, partnerIdx: 0, resIdx: 14, rating: 4, comment: 'Bonne surprise comme d\'habitude' },
  ];

  for (const r of reviewsData) {
    await prisma.review.create({
      data: {
        reservationId: reservationIds[r.resIdx],
        consumerId: consumerUsers[r.consumerIdx].id,
        partnerId: partnerUserIds[r.partnerIdx],
        rating: r.rating,
        comment: r.comment,
        editableUntil: new Date(Date.now() + 7 * 86400000),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000),
      },
    });
  }
  console.log(`${reviewsData.length} reviews created`);

  // ── 13. Fraud Rules ──
  const fraudRules = [
    { slug: 'no-show-threshold', nameFr: 'Seuil de no-show', descFr: 'Suspendre automatiquement un consommateur apres 5 no-shows en 30 jours', actorType: 'CONSUMER', metric: 'no_show_count', operator: '>=', threshold: 5, windowDays: 30, action: 'SUSPEND', severity: 'HIGH' as const, isActive: true },
    { slug: 'velocity-abuse', nameFr: 'Abus de velocite reservation', descFr: 'Alerter si plus de 10 reservations en 1 heure', actorType: 'CONSUMER', metric: 'reservation_count', operator: '>=', threshold: 10, windowHours: 1, action: 'ALERT', severity: 'MEDIUM' as const, isActive: true },
    { slug: 'multi-location', nameFr: 'Multi-localisation', descFr: 'Alerter si connexions depuis plus de 2 pays en 24h', actorType: 'CONSUMER', metric: 'country_count', operator: '>=', threshold: 2, windowHours: 24, action: 'ALERT', severity: 'MEDIUM' as const, isActive: true },
    { slug: 'payment-failures', nameFr: 'Tentatives paiement refusees', descFr: 'Alerter si 3 paiements refuses consecutifs', actorType: 'CONSUMER', metric: 'failed_payment_count', operator: '>=', threshold: 3, action: 'ALERT', severity: 'LOW' as const, isActive: false },
  ];

  for (const r of fraudRules) {
    await prisma.fraudRule.upsert({
      where: { slug: r.slug },
      update: {},
      create: {
        slug: r.slug,
        nameFr: r.nameFr,
        descriptionFr: r.descFr,
        actorType: r.actorType,
        metric: r.metric,
        operator: r.operator,
        threshold: r.threshold,
        windowDays: r.windowDays,
        windowHours: r.windowHours,
        action: r.action,
        severity: r.severity,
        isActive: r.isActive,
      },
    });
  }
  console.log(`${fraudRules.length} fraud rules created`);

  // ── 14. Fraud Alerts (4) ──
  const fraudAlertsData = [
    { actorId: consumerUsers[6].id, severity: 'HIGH' as const, status: 'NEW' as const, type: 'VELOCITY_ABUSE', details: { message: '15 reservations en 30 minutes', count: 15, window: '30min' }, daysAgo: 2 },
    { actorId: consumerUsers[3].id, severity: 'MEDIUM' as const, status: 'INVESTIGATED' as const, type: 'NO_SHOW_PATTERN', details: { message: '5 no-shows en 2 semaines', count: 5, window: '14d' }, daysAgo: 8 },
    { actorId: consumerUsers[1].id, severity: 'LOW' as const, status: 'FALSE_POSITIVE' as const, type: 'PAYMENT_ANOMALY', details: { message: '3 paiements refuses - carte expiree', count: 3 }, daysAgo: 12 },
    { actorId: consumerUsers[5].id, severity: 'CRITICAL' as const, status: 'NEW' as const, type: 'ACCOUNT_TAKEOVER', details: { message: 'Connexions depuis 4 pays differents en 2h', countries: ['MU', 'FR', 'IN', 'ZA'] }, daysAgo: 1 },
  ];

  const fraudAlertIds: string[] = [];
  for (const a of fraudAlertsData) {
    const alert = await prisma.fraudAlert.create({
      data: {
        alertType: a.type,
        actorType: 'CONSUMER',
        actorId: a.actorId,
        severity: a.severity,
        status: a.status,
        details: a.details,
        createdAt: new Date(Date.now() - a.daysAgo * 86400000),
      },
    });
    fraudAlertIds.push(alert.id);
  }
  console.log(`${fraudAlertsData.length} fraud alerts created`);

  // ── 15. Fraud Suspensions (2) ── (need alertId + ruleId)
  // Get fraud rule IDs
  const noShowRule = await prisma.fraudRule.findUnique({ where: { slug: 'no-show-threshold' } });
  const velocityRule = await prisma.fraudRule.findUnique({ where: { slug: 'velocity-abuse' } });

  if (noShowRule && velocityRule) {
    await prisma.fraudSuspension.create({
      data: {
        userId: consumerUsers[3].id,
        alertId: fraudAlertIds[1],
        ruleId: noShowRule.id,
        suspensionType: 'AUTOMATIC',
        reasonFr: 'Trop de no-shows consecutifs',
        status: 'ACTIVE',
        durationHours: 720,
        createdAt: new Date(Date.now() - 5 * 86400000),
      },
    });
    await prisma.fraudSuspension.create({
      data: {
        userId: consumerUsers[6].id,
        alertId: fraudAlertIds[0],
        ruleId: velocityRule.id,
        suspensionType: 'MANUAL',
        reasonFr: 'Suspicion de fraude — activite anormale',
        status: 'ACTIVE',
        durationHours: null,
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
    });
    console.log('2 fraud suspensions created');
  }

  // ── 16. Commission Config ──
  await prisma.commissionConfig.create({
    data: {
      scope: 'global',
      commissionRate: 0.15,
      feeMinimum: 25,
      effectiveFrom: new Date(Date.now() - 90 * 86400000),
      createdBy: adminUser.id,
      notes: 'Taux standard 15%',
    },
  });
  console.log('Commission config created');

  // ── 17. Audit Logs (10) ──
  const auditActions = [
    { action: 'partner.approve', entityType: 'Partner', changes: { status: { from: 'PENDING', to: 'ACTIVE' } }, metadata: { partnerName: 'Island Bakery' } },
    { action: 'partner.approve', entityType: 'Partner', changes: { status: { from: 'PENDING', to: 'ACTIVE' } }, metadata: { partnerName: 'Cafe des Arts' } },
    { action: 'claim.resolve', entityType: 'Claim', changes: { status: { from: 'OPEN', to: 'RESOLVED' }, resolutionType: 'PARTIAL_REFUND' }, metadata: { claimId: 3 } },
    { action: 'user.suspend', entityType: 'User', changes: { status: { from: 'ACTIVE', to: 'SUSPENDED' } }, metadata: { reason: 'no-shows repetes' } },
    { action: 'fraud.alert_create', entityType: 'FraudAlert', changes: null, metadata: { severity: 'HIGH', actorName: 'Nadia Smith' } },
    { action: 'settings.commission_update', entityType: 'CommissionConfig', changes: { commissionRate: { from: 0.12, to: 0.15 } }, metadata: {} },
    { action: 'partner.approve', entityType: 'Partner', changes: { status: { from: 'PENDING', to: 'ACTIVE' } }, metadata: { partnerName: 'Fresh Market' } },
    { action: 'user.ban', entityType: 'User', changes: { status: { from: 'SUSPENDED', to: 'BANNED' } }, metadata: { reason: 'fraude confirmee' } },
    { action: 'claim.reject', entityType: 'Claim', changes: { status: { from: 'OPEN', to: 'REJECTED' } }, metadata: { claimId: 5 } },
    { action: 'auth.login', entityType: 'Session', changes: null, metadata: { ip: '196.192.168.1', location: 'Port Louis' } },
  ];

  for (let i = 0; i < auditActions.length; i++) {
    const a = auditActions[i];
    await prisma.auditLog.create({
      data: {
        action: a.action,
        actorType: 'ADMIN',
        actorId: adminUser.id,
        entityType: a.entityType,
        changes: a.changes,
        metadata: a.metadata,
        createdAt: new Date(Date.now() - (i + 1) * 86400000),
      },
    });
  }
  console.log(`${auditActions.length} audit logs created`);

  console.log('\nSeed complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Seed error:', e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
