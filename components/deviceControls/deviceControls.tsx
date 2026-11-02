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
const BRIGHTNESS_STEP = 5;
const BRIGHTNESS_PEAK_INDEX = 100 / BRIGHTNESS_STEP;
const BRIGHTNESS_VALUES = Array.from(
  { length: BRIGHTNESS_PEAK_INDEX * 2 },
  (_, index) => (index <= BRIGHTNESS_PEAK_INDEX ? index : BRIGHTNESS_PEAK_INDEX * 2 - index) * BRIGHTNESS_STEP,
);
const HUE_MIN = -32;
const HUE_VALUES = Array.from({ length: 64 }, (_, index) => index + HUE_MIN);

const FULL_LIGHTNESS = 0b1100_0000;
const RED = createLightColor(FULL_LIGHTNESS);
const STRIP_COLORS = Array.from({ length: 64 }, (_, hue) => createLightColor(FULL_LIGHTNESS | hue));
const COLOR_UID_PREFIX = 'color-';
const CAROUSEL_OPTIONS = { loop: true, dragFree: true, align: 'center', containScroll: false } as const;
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

const findClosestIndex = (values: number[], value: number) =>
  values.reduce(
    (closest, candidate, index) =>
      Math.abs(candidate - value) < Math.abs((values[closest] as number) - value) ? index : closest,
    0,
  );

const findCenteredSlide = (slides: HTMLElement[], root: HTMLElement) => {
  const { left, width } = root.getBoundingClientRect();
  const center = left + width / 2;
  const distanceToCenter = (slide: HTMLElement) => {
    const rect = slide.getBoundingClientRect();
    return Math.abs(rect.left + rect.width / 2 - center);
  };

  return slides.reduce(
    (closest, slide, index) =>
      distanceToCenter(slide) < distanceToCenter(slides[closest] as HTMLElement) ? index : closest,
    0,
  );
};

interface ValueCarouselProps {
  label: string;
  values: number[];
  value: number;
  formatValue: (value: number) => string;
  renderSlide: (value: number, isSelected: boolean) => ReactNode;
  action?: ReactNode;
  onChange: (value: number) => void;
}

const ValueCarousel = ({ label, values, value, formatValue, renderSlide, action, onChange }: ValueCarouselProps) => {
  const [selected, setSelected] = useState(() => findClosestIndex(values, value));
  // embla reinitializes on changed options, which would interrupt a drag
  const [options] = useState({ ...CAROUSEL_OPTIONS, startIndex: selected });
  const [viewport, carousel] = useEmblaCarousel(options);
  const committed = useRef(value);
  const isAwaitingEcho = useRef(false);
  const latestOnChange = useRef(onChange);
  const selectedValue = values[selected] as number;

  useEffect(() => {
    latestOnChange.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!carousel) return;

    let frame = 0;

    const readPosition = () => {
      const next = findCenteredSlide(carousel.slideNodes(), carousel.rootNode());
      setSelected(next);
      const nextValue = values[next] as number;
      if (nextValue === committed.current) return;
      committed.current = nextValue;
      isAwaitingEcho.current = true;
      latestOnChange.current(nextValue);
    };

    // embla emits no scroll event while the pointer drags, only during momentum
    const trackDrag = () => {
      readPosition();
      frame = requestAnimationFrame(trackDrag);
    };

    const handlePointerDown = () => {
      frame = requestAnimationFrame(trackDrag);
    };

    const handlePointerUp = () => {
      cancelAnimationFrame(frame);
      readPosition();
    };

    carousel.on('scroll', readPosition);
    carousel.on('settle', readPosition);
    carousel.on('pointerDown', handlePointerDown);
    carousel.on('pointerUp', handlePointerUp);
    return () => {
      cancelAnimationFrame(frame);
      carousel.off('scroll', readPosition);
      carousel.off('settle', readPosition);
      carousel.off('pointerDown', handlePointerDown);
      carousel.off('pointerUp', handlePointerUp);
    };
  }, [carousel, values]);

  useEffect(() => {
    if (isAwaitingEcho.current && value === committed.current) isAwaitingEcho.current = false;
  });

  // a value sent by this carousel comes back a moment later, older ones must not pull it back
  useEffect(() => {
    if (!carousel || isAwaitingEcho.current || value === committed.current) return;
    committed.current = value;
    const index = findClosestIndex(values, value);
    carousel.scrollTo(index, true);
    setSelected(index);
  }, [carousel, value, values]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = selected + (event.key === 'ArrowLeft' ? -1 : 1);
    carousel?.scrollTo((next + values.length) % values.length);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <output className="font-bold text-foreground">{formatValue(selectedValue)}</output>
          {action}
        </span>
      </div>
      <div
        ref={viewport}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a carousel cannot be an input range
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={Math.min(...values)}
        aria-valuemax={Math.max(...values)}
        aria-valuenow={selectedValue}
        aria-valuetext={formatValue(selectedValue)}
        onKeyDown={handleKeyDown}
        className={cn(
          CAROUSEL_CLASS_NAME,
          'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <div className="flex">
          {values.map((slideValue, slide) => (
            <button
              // oxlint-disable-next-line react/no-array-index-key -- brightness values repeat along the loop
              key={slide}
              type="button"
              tabIndex={-1}
              aria-hidden
              className="flex-none cursor-inherit"
              onClick={() => carousel?.scrollTo(slide)}
            >
              {renderSlide(slideValue, slide === selected)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const BrightnessSlide = (brightness: number, isSelected: boolean) => (
  <span className="flex h-11 w-11 flex-col items-center justify-between py-1">
    <span className={cn('h-4 w-0.5 rounded-full bg-muted-foreground/50', isSelected && 'w-1 bg-primary')} />
    <span className={cn('text-2xs text-muted-foreground', isSelected && 'font-bold text-foreground')}>
      {brightness}
    </span>
  </span>
);

const BrightnessControl = ({ adjust }: { adjust: LightsAdjust }) => {
  const messages = useMessages();

  return (
    <ValueCarousel
      label={messages.control.brightness}
      values={BRIGHTNESS_VALUES}
      value={adjust.brightness}
      formatValue={(brightness) => `${brightness}%`}
      renderSlide={BrightnessSlide}
      onChange={(brightness) => updateAdjust({ ...adjust, brightness })}
    />
  );
};

const formatHue = (hue: number) => (hue > 0 ? `+${hue}` : `${hue}`);

const HueSlide = (hue: number, isSelected: boolean) => (
  <span className="block p-1">
    <span
      className={cn(
        'block h-9 w-9 rounded-lg',
        isSelected && 'shadow-[0_0_0_2px_var(--color-card),0_0_0_4px_var(--color-foreground)]',
      )}
      style={{ backgroundColor: resolveBinaryColorStyle(shiftColorHue(RED, hue)) }}
    />
  </span>
);

const HueControl = ({ adjust }: { adjust: LightsAdjust }) => {
  const messages = useMessages();

  return (
    <ValueCarousel
      label={messages.control.hue}
      values={HUE_VALUES}
      value={adjust.hue}
      formatValue={formatHue}
      renderSlide={HueSlide}
      action={
        adjust.hue !== 0 && (
          <Button size="sm" className="h-6 px-2" onClick={() => updateAdjust({ ...adjust, hue: 0 })}>
            {messages.control.reset}
          </Button>
        )
      }
      onChange={(hue) => updateAdjust({ ...adjust, hue })}
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
  const [options] = useState({
    ...CAROUSEL_OPTIONS,
    startIndex: Math.max(
      0,
      STRIP_COLORS.findIndex((color) => `${COLOR_UID_PREFIX}${color}` === activeUid),
    ),
  });
  const [viewport] = useEmblaCarousel(options);

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
