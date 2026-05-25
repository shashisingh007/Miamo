'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import Image from 'next/image';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const plans = [
 {
 name: 'Free',
 price: '$0',
 period: 'forever',
 features: ['5 likes per day', 'Basic discovery', 'Messages after match', '1 Beat at a time', 'Standard profile', 'Feed access'],
 current: true,
 },
 {
 name: 'Premium',
 price: '$14.99',
 period: '/month',
 popular: true,
 features: ['Unlimited likes', 'See who liked you', 'Advanced filters', 'Priority in discovery', '10 Beats', 'Read receipts', 'Profile boost monthly', 'AI match insights', 'Undo pass'],
 },
 {
 name: 'Platinum',
 price: '$29.99',
 period: '/month',
 features: ['Everything in Premium', 'Unlimited Beats', 'Invisible mode', 'Global discovery', 'Weekly boost', 'Priority support', 'Exclusive features early', 'Top pick daily', 'Advanced AI'],
 },
];

export default function PremiumPage() {
 const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
 const [purchasing, setPurchasing] = useState(false);

 useTrackPageView('premium');
 useTrackScrollDepth('premium');
 return (
 <ErrorBoundary>
 <div className="max-w-4xl mx-auto p-6 space-y-8">
 <div className="text-center">
 <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-4">
 <Image src="/assets/logo.svg" alt="Miamo Premium" width={56} height={56} className="w-full h-full object-contain" />
 </div>
 <h1 className="text-2xl font-bold">Upgrade to Premium</h1>
 <p className="text-sm text-text-muted mt-2 max-w-lg mx-auto">Get more from Miamo with advanced features, unlimited interactions, and priority visibility.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {plans.map((plan) => (
 <Card key={plan.name} className={`p-6 relative ${plan.popular ? 'border-rose-main/50 shadow-glow-sm' : ''}`}>
 {plan.popular && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-main to-rose- text-text-primary text-[10px] font-bold px-3 py-1 rounded-full">
 MOST POPULAR
 </div>
 )}
 <h3 className="text-lg font-bold">{plan.name}</h3>
 <div className="mt-2 mb-4">
 <span className="text-2xl font-bold">{plan.price}</span>
 <span className="text-sm text-text-muted">{plan.period}</span>
 </div>
 <ul className="space-y-2 mb-6">
 {plan.features.map((f) => (
 <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
 <Check className="w-3.5 h-3.5 text-rose-main shrink-0" /> {f}
 </li>
 ))}
 </ul>
 {plan.current ? (
 <Button variant="secondary" className="w-full" disabled>Current Plan</Button>
 ) : selectedPlan === plan.name ? (
 <div className="text-center space-y-2">
 <p className="text-xs text-rose-alt">✓ Selected! Payment coming soon.</p>
 <Button variant="ghost" className="w-full" onClick={() => setSelectedPlan(null)}>Cancel</Button>
 </div>
 ) : (
 <Button variant={plan.popular ? 'default' : 'secondary'} className="w-full" onClick={() => {
 setSelectedPlan(plan.name);
 setPurchasing(true);
 setTimeout(() => setPurchasing(false), 1000);
 }}>
 {purchasing && selectedPlan === plan.name ? 'Processing…' : (plan.popular ? 'Upgrade Now' : 'Choose Plan')}
 </Button>
 )}
 </Card>
 ))}
 </div>
 </div>
 </ErrorBoundary>
 );
}
