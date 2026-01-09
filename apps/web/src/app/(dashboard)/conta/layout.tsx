import { SiteLayout } from '../../../components/layout/site-layout';

type ContaLayoutProps = {
  children: React.ReactNode;
};

export default function ContaLayout({ children }: ContaLayoutProps) {
  return <SiteLayout>{children}</SiteLayout>;
}
