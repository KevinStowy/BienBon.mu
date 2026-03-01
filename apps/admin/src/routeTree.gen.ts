/* eslint-disable */
// Manual route tree for BienBon Admin

import { Route as rootRoute } from './routes/__root'
import { Route as LoginRoute } from './routes/login'
import { Route as IndexRoute } from './routes/index'
import { Route as PartnersIndexRoute } from './routes/partners/index'
import { Route as PartnerDetailRoute } from './routes/partners/$partnerId'
import { Route as ConsumersIndexRoute } from './routes/consumers/index'
import { Route as ConsumerDetailRoute } from './routes/consumers/$consumerId'
import { Route as ModerationIndexRoute } from './routes/moderation/index'
import { Route as ClaimDetailRoute } from './routes/moderation/claims.$claimId'
import { Route as FinanceRoute } from './routes/finance'
import { Route as AuditRoute } from './routes/audit'
import { Route as FraudRoute } from './routes/fraud'
import { Route as SettingsRoute } from './routes/settings'

const routeTree = rootRoute.addChildren([
  IndexRoute,
  LoginRoute,
  PartnersIndexRoute,
  PartnerDetailRoute,
  ConsumersIndexRoute,
  ConsumerDetailRoute,
  ModerationIndexRoute,
  ClaimDetailRoute,
  FinanceRoute,
  AuditRoute,
  FraudRoute,
  SettingsRoute,
])

export { routeTree }
