import { SiteLayout } from '../../../components/layout/site-layout';

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <SiteLayout>{children}</SiteLayout>;
}
