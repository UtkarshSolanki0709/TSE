import { BoomerangVideoBg } from '../components/hero/BoomerangVideoBg';
import { Header } from '../components/hero/Header';
import { HeroContent } from '../components/hero/HeroContent';

export function HeroPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <BoomerangVideoBg />
      <Header />
      <HeroContent />
    </div>
  );
}
