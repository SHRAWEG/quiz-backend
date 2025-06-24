export enum SubscriptionPlanDuration {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  HALF_YEARLY = 'half_yearly',
  YEARLY = 'yearly',
}

export const durationInDaysMap: Record<SubscriptionPlanDuration, number> = {
  [SubscriptionPlanDuration.WEEKLY]: 7,
  [SubscriptionPlanDuration.MONTHLY]: 30,
  [SubscriptionPlanDuration.QUARTERLY]: 90,
  [SubscriptionPlanDuration.HALF_YEARLY]: 180,
  [SubscriptionPlanDuration.YEARLY]: 365,
};
