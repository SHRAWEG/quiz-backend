export enum SubscriptionPlanDuration {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annually',
  YEARLY = 'yearly',
}

export const durationInDaysMap: Record<SubscriptionPlanDuration, number> = {
  [SubscriptionPlanDuration.WEEKLY]: 7,
  [SubscriptionPlanDuration.MONTHLY]: 30,
  [SubscriptionPlanDuration.QUARTERLY]: 90,
  [SubscriptionPlanDuration.SEMI_ANNUAL]: 180,
  [SubscriptionPlanDuration.YEARLY]: 365,
};
