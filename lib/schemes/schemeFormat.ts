import {
  CONNECTION_REQUEST_EOL_INFO,
  CONNECTION_REQUEST_EOL_INFO_LENGTH,
  CONNECTION_REQUEST_HEAD_VERSION,
  CONNECTION_REQUEST_INFO_LENGTH,
  CONNECTION_REQUEST_SIZE_INFO_LENGTH,
  CONNECTION_REQUEST_TYPE,
  CONNECTION_REQUEST_TYPE_INFO_LENGTH,
} from '../connections/connections.config';
import { connectionRequestDataToBinaryData } from '../connections/connections.utils';
import { lightsFrameType } from '../lights/lights.types';
import type { LightColor, LightsFrame, LightsFrameType, LightsScheme } from '../lights/lights.types';

const SCHEME_MAX_FRAMES = 255;
const SCHEME_MAX_COLORS = 255;
const CHUNK_HEADER_LENGTH = CONNECTION_REQUEST_TYPE_INFO_LENGTH + CONNECTION_REQUEST_SIZE_INFO_LENGTH;

const FRAME_TYPES = new Set<number>(Object.values(lightsFrameType));

export const encodeScheme = (scheme: LightsScheme): Uint8Array =>
  connectionRequestDataToBinaryData([
    { type: 'head', data: { name: scheme.name } },
    ...scheme.frames.map((frame) => ({ type: 'frame' as const, data: frame })),
  ]);

const decodeHeadName = (payload: Uint8Array): string | undefined => {
  const [version, nameLength = 0] = payload;

  if (version !== CONNECTION_REQUEST_HEAD_VERSION || payload.length < 2 + nameLength) {
    return undefined;
  }

  return new TextDecoder().decode(payload.subarray(2, 2 + nameLength));
};

const decodeFrame = (payload: Uint8Array): LightsFrame | undefined => {
  const [type = -1, tempo = 0] = payload;
  const colors = payload.subarray(2);

  if (!FRAME_TYPES.has(type) || colors.length === 0 || colors.length > SCHEME_MAX_COLORS) {
    return undefined;
  }

  return { type: type as LightsFrameType, tempo, colors: [...colors] as LightColor[] };
};

export const decodeScheme = (bytes: Uint8Array): LightsScheme | undefined => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frames: LightsFrame[] = [];
  let name: string | undefined;
  let offset = 0;

  while (offset < bytes.length) {
    if (offset + CONNECTION_REQUEST_INFO_LENGTH > bytes.length) {
      return undefined;
    }

    const type = view.getUint32(offset, true);
    const size = view.getUint32(offset + CONNECTION_REQUEST_TYPE_INFO_LENGTH, true);
    const end = offset + CHUNK_HEADER_LENGTH + size;

    if (end + CONNECTION_REQUEST_EOL_INFO_LENGTH > bytes.length) {
      return undefined;
    }

    if (view.getUint32(end, true) !== CONNECTION_REQUEST_EOL_INFO) {
      return undefined;
    }

    const payload = bytes.subarray(offset + CHUNK_HEADER_LENGTH, end);

    if (type === CONNECTION_REQUEST_TYPE.head) {
      name = decodeHeadName(payload);
      if (name === undefined) return undefined;
    } else if (type === CONNECTION_REQUEST_TYPE.frame) {
      const frame = decodeFrame(payload);
      if (!frame || frames.length === SCHEME_MAX_FRAMES) return undefined;
      frames.push(frame);
    }

    offset = end + CONNECTION_REQUEST_EOL_INFO_LENGTH;
  }

  return name === undefined || frames.length === 0 ? undefined : { name, frames };
};
