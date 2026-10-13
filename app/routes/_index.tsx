import { DeviceStatusCard, LastSentCard } from '../../components/deviceStatus/deviceStatus';
import { SessionLink } from '../../components/pageHeader/pageHeader';
import { SchemesRails } from '../../components/schemesGallery/schemesGallery';
import { useLastSentScheme } from '../../components/schemesGallery/useSchemes';

const Index = () => {
  const lastSent = useLastSentScheme();

  return (
    <div className="container flex w-full flex-col gap-3.5 px-4 pt-4 pb-6 md:max-w-3xl md:pt-8">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <DeviceStatusCard />
        </div>
        <SessionLink className="md:hidden" />
      </div>
      {lastSent && <LastSentCard schemeData={lastSent} />}
      <div className="pt-1">
        <SchemesRails />
      </div>
    </div>
  );
};

export default Index;
