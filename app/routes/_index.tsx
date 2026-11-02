import { DeviceControls } from '../../components/deviceControls/deviceControls';
import { DeviceStatusCard } from '../../components/deviceStatus/deviceStatus';
import { SessionLink } from '../../components/pageHeader/pageHeader';
import { SchemesRails } from '../../components/schemesGallery/schemesGallery';

const Index = () => (
  <div className="container flex w-full flex-col gap-3.5 px-4 pt-4 pb-6 md:max-w-3xl md:pt-8">
    <div className="flex items-center gap-1">
      <div className="min-w-0 flex-1">
        <DeviceStatusCard />
      </div>
      <SessionLink className="md:hidden" />
    </div>
    <DeviceControls />
    <div className="pt-1">
      <SchemesRails />
    </div>
  </div>
);

export default Index;
