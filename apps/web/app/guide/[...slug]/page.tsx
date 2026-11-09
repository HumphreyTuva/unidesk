import ComingSoon from '@/components/ComingSoon';

// Catches /guide/timetable, /guide/venues, /guide/call-off, /guide/offices until each one is built.
export default function GuideItem() {
  return <ComingSoon title="Coming soon" note="This part of the guide is built in a later step." />;
}
