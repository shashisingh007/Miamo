'use client';

import { MiamoLoader } from '@/components/ui/miamo-logo';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 bg-miamo-bg flex items-center justify-center z-50">
      <MiamoLoader size={72} text="Miamo" />
    </div>
  );
}
