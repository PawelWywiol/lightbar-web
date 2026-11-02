import { DeviceControls } from '../../components/deviceControls/deviceControls';
import { SchemesGallery } from '../../components/schemesGallery/schemesGallery';

const SchemesPage = () => (
  <div className="container flex w-full flex-col gap-4 px-4 pt-4 pb-6 md:pt-8">
    <DeviceControls />
    <SchemesGallery />
  </div>
);

export default SchemesPage;
