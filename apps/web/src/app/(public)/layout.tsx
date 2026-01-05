import { SiteLayout } from '../../components/layout/site-layout';

type PublicLayoutProps = {
  children: React.ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return <SiteLayout>{children}</SiteLayout>;
}