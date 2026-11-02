import { type MouseEvent, type PointerEvent, useLayoutEffect, useRef, useState } from 'react';
import { useConnectedDevices } from '../../lib/devices/devicesProvider';
import type { SaveSchemeDeviceEvent, UpdateAdjustDeviceEvent } from '../../lib/devices/devicesEvents';
import { useMessages } from '../../lib/i18n/i18n';
import { createLightColor, DEFAULT_LIGHTS_FRAME_TEMPO } from '../../lib/lights/lights.config';
import { type LightColor, type LightsAdjust, lightsFrameType } from '../../lib/lights/lights.types';
import { Button } from '../../lib/ui/button/button';
import { cn } from '../../lib/ui/utils/cn';
import { dispatchCustomEvent } from '../../lib/utils/customEvent/customEvent';
import { resolveBinaryColorStyle } from '../editor/editor.utils';
import { SchemePreview } from '../schemePreview/schemePreview';
import { useLastSentScheme } from '../schemesGallery/useSchemes';

const BRIGHTNESS_OPTIONS = [100, 75, 50, 25, 0];
const SPEED_OPTIONS = [25, 50, 100, 150, 200];
const HUE_MIN = -32;
const HUE_MAX = 31;

const STRIP_LIGHTNESS = 0b1100_0000;
const STRIP_COLORS = Array.from({ length: 64 }, (_, hue) => createLightColor(STRIP_LIGHTNESS | hue));
const STRIP_COPIES = [0, 1, 2];
const STRIP_MIDDLE_COPY = 1;
const COLOR_UID_PREFIX = 'color-';
const DRAG_THRESHOLD = 5;

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

const BrightnessControl = ({ adjust }: { adjust: LightsAdjust }) => {
  const messages = useMessages();

  return (
    <Segments
      label={messages.control.brightness}
      options={BRIGHTNESS_OPTIONS}
      value={adjust.brightness}
      format={(option) => `${option}%`}
      onChange={(brightness) => updateAdjust({ ...adjust, brightness })}
    />
  );
};

const formatHue = (hue: number) => (hue > 0 ? `+${hue}` : `${hue}`);

const HueControl = ({ adjust }: { adjust: LightsAdjust }) => {
  const messages = useMessages();
  const [draft, setDraft] = useState<number | null>(null);
  const hue = draft ?? adjust.hue;

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft !== adjust.hue) updateAdjust({ ...adjust, hue: draft });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{messages.control.hue}</span>
        <span className="flex items-center gap-2">
          <output className="font-bold text-foreground">{formatHue(hue)}</output>
          {hue !== 0 && (
            <Button size="sm" className="h-6 px-2" onClick={() => updateAdjust({ ...adjust, hue: 0 })}>
              {messages.control.reset}
            </Button>
          )}
        </span>
      </div>
      <input
        type="range"
        aria-label={messages.control.hue}
        className="w-full cursor-pointer accent-primary"
        min={HUE_MIN}
        max={HUE_MAX}
        value={hue}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </div>
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
  const strip = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragX = useRef<number | null>(null);
  const wasDragged = useRef(false);

  useLayoutEffect(() => {
    const element = strip.current;
    if (!element) return;

    const copyWidth = element.scrollWidth / STRIP_COPIES.length;
    const activeIndex = Math.max(
      0,
      STRIP_COLORS.findIndex((color) => `${COLOR_UID_PREFIX}${color}` === activeUid),
    );
    element.scrollLeft = copyWidth + (copyWidth * activeIndex) / STRIP_COLORS.length - element.clientWidth / 2;
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- center once, later picks must not move the strip
  }, []);

  const wrapAround = () => {
    const element = strip.current;
    if (!element) return;

    const copyWidth = element.scrollWidth / STRIP_COPIES.length;
    if (element.scrollLeft < copyWidth / 2) element.scrollLeft += copyWidth;
    else if (element.scrollLeft >= copyWidth * 1.5) element.scrollLeft -= copyWidth;
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    wasDragged.current = false;
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragStart.current = event.clientX;
    dragX.current = event.clientX;
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragX.current === null || dragStart.current === null) return;

    if (!wasDragged.current && Math.abs(event.clientX - dragStart.current) >= DRAG_THRESHOLD) {
      wasDragged.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (wasDragged.current) event.currentTarget.scrollLeft -= event.clientX - dragX.current;
    dragX.current = event.clientX;
  };

  const endDrag = () => {
    dragStart.current = null;
    dragX.current = null;
  };

  const skipClickAfterDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (wasDragged.current) event.stopPropagation();
    wasDragged.current = false;
  };

  return (
    <div
      ref={strip}
      data-testid="color-strip"
      onScroll={wrapAround}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={skipClickAfterDrag}
      className="-mx-1 flex cursor-grab gap-1 overflow-x-auto px-1 py-1 select-none [scrollbar-width:none] active:cursor-grabbing"
    >
      {STRIP_COPIES.flatMap((copy) =>
        STRIP_COLORS.map((color, position) => {
          const isMiddle = copy === STRIP_MIDDLE_COPY;
          const isActive = `${COLOR_UID_PREFIX}${color}` === activeUid;

          return (
            <button
              key={`${copy}-${color}`}
              type="button"
              aria-hidden={!isMiddle}
              tabIndex={isMiddle ? 0 : -1}
              aria-label={`${messages.control.color} ${position + 1}`}
              aria-pressed={isActive}
              onClick={() => selectColor(color, messages.control.color, adjust)}
              className={cn(
                'h-11 w-11 flex-none cursor-pointer rounded-lg',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive && 'shadow-[0_0_0_2px_var(--color-card),0_0_0_4px_var(--color-foreground)]',
              )}
              style={{ backgroundColor: resolveBinaryColorStyle(color) }}
            />
          );
        }),
      )}
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
    <section className="flex flex-col gap-3.5 rounded-3xl border bg-card p-4">
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
