import useEmblaCarousel from 'embla-carousel-react';
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useConnectedDevices } from '../../lib/devices/devicesProvider';
import type { SaveSchemeDeviceEvent, UpdateAdjustDeviceEvent } from '../../lib/devices/devicesEvents';
import { useMessages } from '../../lib/i18n/i18n';
import { createLightColor, DEFAULT_LIGHTS_FRAME_TEMPO, shiftColorHue } from '../../lib/lights/lights.config';
import { type LightColor, type LightsAdjust, lightsFrameType } from '../../lib/lights/lights.types';
import { Button } from '../../lib/ui/button/button';
import { cn } from '../../lib/ui/utils/cn';
import { dispatchCustomEvent } from '../../lib/utils/customEvent/customEvent';
import { resolveBinaryColorStyle } from '../editor/editor.utils';
import { SchemePreview } from '../schemePreview/schemePreview';
import { useLastSentScheme } from '../schemesGallery/useSchemes';

const SPEED_OPTIONS = [25, 50, 100, 150, 200];
const BRIGHTNESS_STEPS = 101;
const BRIGHTNESS_LABEL_STEP = 10;
const HUE_MIN = -32;
const HUE_STEPS = 64;

const FULL_LIGHTNESS = 0b1100_0000;
const RED = createLightColor(FULL_LIGHTNESS);
const STRIP_COLORS = Array.from({ length: 64 }, (_, hue) => createLightColor(FULL_LIGHTNESS | hue));
const COLOR_UID_PREFIX = 'color-';
const CAROUSEL_OPTIONS = { dragFree: true, align: 'center', containScroll: false } as const;
const CAROUSEL_CLASS_NAME = 'cursor-grab touch-pan-y overflow-hidden select-none active:cursor-grabbing';

type ControlTab = 'scheme' | 'color';

const resolveTab = (uid: string | undefined): ControlTab => (uid?.startsWith(COLOR_UID_PREFIX) ? 'color' : 'scheme');

const updateAdjust = (adjust: LightsAdjust) => {
  dispatchCustomEvent<UpdateAdjustDeviceEvent>({ name: 'app:update:adjust', detail: adjust });
};

interface SegmentsProps {
  label: string;
  options: number[];
  value: number;
  format: (option: number) => string;
  onChange: (option: number) => void;
}

const Segments = ({ label, options, value, format, onChange }: SegmentsProps) => (
  <fieldset className="flex min-w-0 flex-col gap-1.5">
    <legend className="pb-1.5 text-xs text-muted-foreground">{label}</legend>
    <div className="grid grid-flow-col auto-cols-fr gap-1.5">
      {options.map((option) => (
        <Button
          key={option}
          size="sm"
          className="px-1"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {format(option)}
        </Button>
      ))}
    </div>
  </fieldset>
);

interface ValueCarouselProps {
  label: string;
  count: number;
  loop: boolean;
  index: number;
  formatValue: (index: number) => string;
  renderSlide: (index: number, isSelected: boolean) => ReactNode;
  action?: ReactNode;
  onChange: (index: number) => void;
}

const ValueCarousel = ({
  label,
  count,
  loop,
  index,
  formatValue,
  renderSlide,
  action,
  onChange,
}: ValueCarouselProps) => {
  const [viewport, carousel] = useEmblaCarousel({ ...CAROUSEL_OPTIONS, loop, startIndex: index });
  const [selected, setSelected] = useState(index);
  const committed = useRef(index);
  const latestOnChange = useRef(onChange);

  useEffect(() => {
    latestOnChange.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!carousel) return;

    const handleSelect = () => {
      const next = carousel.selectedScrollSnap();
      setSelected(next);
      if (next === committed.current) return;
      committed.current = next;
      latestOnChange.current(next);
    };

    carousel.on('select', handleSelect);
    return () => {
      carousel.off('select', handleSelect);
    };
  }, [carousel]);

  useEffect(() => {
    if (!carousel || index === committed.current) return;
    committed.current = index;
    carousel.scrollTo(index, true);
  }, [carousel, index]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = selected + (event.key === 'ArrowLeft' ? -1 : 1);
    carousel?.scrollTo(loop ? (next + count) % count : Math.min(count - 1, Math.max(0, next)));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <output className="font-bold text-foreground">{formatValue(selected)}</output>
          {action}
        </span>
      </div>
      <div
        ref={viewport}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a carousel cannot be an input range
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={selected}
        aria-valuetext={formatValue(selected)}
        onKeyDown={handleKeyDown}
        className={cn(
          CAROUSEL_CLASS_NAME,
          'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <div className="flex">
          {Array.from({ length: count }, (_, slide) => (
            <button
              key={slide}
              type="button"
              tabIndex={-1}
              aria-hidden
              className="flex-none cursor-inherit"
              onClick={() => carousel?.scrollTo(slide)}
            >
              {renderSlide(slide, slide === selected)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const BrightnessSlide = (brightness: number, isSelected: boolean) => {
  const isLabeled = brightness % BRIGHTNESS_LABEL_STEP === 0;

  return (
    <span className="relative flex h-11 w-2 flex-col items-center justify-start pt-1">
      <span
        className={cn(
          'w-0.5 rounded-full',
          isLabeled ? 'h-5 bg-foreground' : 'h-3 bg-muted-foreground/50',
          isSelected && 'h-6 w-1 bg-primary',
        )}
      />
      {isLabeled && <span className="absolute bottom-0 text-2xs text-muted-foreground">{brightness}</span>}
    </span>
  );
};

const BrightnessControl = ({ adjust }: { adjust: LightsAdjust }) => {
  const messages = useMessages();

  return (
    <ValueCarousel
      label={messages.control.brightness}
      count={BRIGHTNESS_STEPS}
      loop={false}
      index={adjust.brightness}
      formatValue={(brightness) => `${brightness}%`}
      renderSlide={BrightnessSlide}
      onChange={(brightness) => updateAdjust({ ...adjust, brightness })}
    />
  );
};

const formatHue = (hue: number) => (hue > 0 ? `+${hue}` : `${hue}`);

const HueSlide = (index: number, isSelected: boolean) => (
  <span className="block p-1">
    <span
      className={cn(
        'block h-9 w-9 rounded-lg',
        isSelected && 'shadow-[0_0_0_2px_var(--color-card),0_0_0_4px_var(--color-foreground)]',
      )}
      style={{ backgroundColor: resolveBinaryColorStyle(shiftColorHue(RED, index + HUE_MIN)) }}
    />
  </span>
);

const HueControl = ({ adjust }: { adjust: LightsAdjust }) => {
  const messages = useMessages();

  return (
    <ValueCarousel
      label={messages.control.hue}
      count={HUE_STEPS}
      loop
      index={adjust.hue - HUE_MIN}
      formatValue={(index) => formatHue(index + HUE_MIN)}
      renderSlide={HueSlide}
      action={
        adjust.hue !== 0 && (
          <Button size="sm" className="h-6 px-2" onClick={() => updateAdjust({ ...adjust, hue: 0 })}>
            {messages.control.reset}
          </Button>
        )
      }
      onChange={(index) => updateAdjust({ ...adjust, hue: index + HUE_MIN })}
    />
  );
};

const selectColor = (color: LightColor, name: string, adjust: LightsAdjust | undefined) => {
  dispatchCustomEvent<SaveSchemeDeviceEvent>({
    name: 'app:save:scheme',
    detail: {
      uid: `${COLOR_UID_PREFIX}${color}`,
      adjust: adjust && { ...adjust, hue: 0 },
      scheme: {
        name,
        frames: [
          {
            type: lightsFrameType.step,
            shuffle: false,
            hueShift: 0,
            pixelShift: 0,
            tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
            colors: [color],
          },
        ],
      },
    },
  });
};

const ColorStrip = ({ activeUid, adjust }: { activeUid: string | undefined; adjust: LightsAdjust | undefined }) => {
  const messages = useMessages();
  const [viewport] = useEmblaCarousel({
    ...CAROUSEL_OPTIONS,
    loop: true,
    startIndex: Math.max(
      0,
      STRIP_COLORS.findIndex((color) => `${COLOR_UID_PREFIX}${color}` === activeUid),
    ),
  });

  return (
    <div ref={viewport} data-testid="color-strip" className={CAROUSEL_CLASS_NAME}>
      <div className="flex">
        {STRIP_COLORS.map((color, position) => (
          <button
            key={color}
            type="button"
            aria-label={`${messages.control.color} ${position + 1}`}
            aria-pressed={`${COLOR_UID_PREFIX}${color}` === activeUid}
            onClick={() => selectColor(color, messages.control.color, adjust)}
            className="group flex-none cursor-inherit p-1 focus-visible:outline-none"
          >
            <span
              className={cn(
                'block h-11 w-11 rounded-lg group-focus-visible:ring-2 group-focus-visible:ring-ring',
                'group-aria-pressed:shadow-[0_0_0_2px_var(--color-card),0_0_0_4px_var(--color-foreground)]',
              )}
              style={{ backgroundColor: resolveBinaryColorStyle(color) }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export const DeviceControls = () => {
  const messages = useMessages();
  const { selectedDevice } = useConnectedDevices();
  const lastSent = useLastSentScheme();
  const lastSentUid = lastSent?.uid;
  const [tab, setTab] = useState(() => resolveTab(lastSentUid));
  const [syncedUid, setSyncedUid] = useState(lastSentUid);
  const info = selectedDevice?.info;

  if (syncedUid !== lastSentUid) {
    setSyncedUid(lastSentUid);
    setTab(resolveTab(lastSentUid));
  }

  if (!info) return null;

  const { adjust } = info.data;
  const tabs: [ControlTab, string][] = [
    ['scheme', messages.control.scheme],
    ['color', messages.control.color],
  ];

  return (
    <section className="flex min-w-0 flex-col gap-3.5 rounded-3xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          {lastSent && <span className="text-xs text-muted-foreground">{messages.schemes.lastSent}</span>}
          <h2 className="truncate text-hero font-extrabold tracking-tight">
            {lastSent?.scheme.name ?? messages.control.empty}
          </h2>
        </div>
        <div className="flex flex-none gap-1.5">
          {tabs.map(([value, label]) => (
            <Button key={value} size="sm" aria-pressed={tab === value} onClick={() => setTab(value)}>
              {label}
            </Button>
          ))}
        </div>
      </div>
      {tab === 'scheme' ? (
        <>
          {lastSent && <SchemePreview frames={lastSent.scheme.frames} pitch={22} />}
          {adjust && (
            <>
              <BrightnessControl adjust={adjust} />
              <Segments
                label={messages.control.speed}
                options={SPEED_OPTIONS}
                value={adjust.speed}
                format={(option) => `x${option / 100}`}
                onChange={(speed) => updateAdjust({ ...adjust, speed })}
              />
              <HueControl adjust={adjust} />
            </>
          )}
        </>
      ) : (
        <>
          <ColorStrip activeUid={lastSentUid} adjust={adjust} />
          {adjust && <BrightnessControl adjust={adjust} />}
        </>
      )}
    </section>
  );
};
