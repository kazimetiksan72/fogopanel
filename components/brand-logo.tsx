import Image from 'next/image';
import logo from '@/logo.png';

export default function BrandLogo({ className }: { className: string }) {
  return (
    <div className={className}>
      <Image src={logo} alt="" className="brand-image" priority />
      <span>FOGO</span>
    </div>
  );
}
