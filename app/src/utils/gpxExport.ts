/**
 * GPX / KML 导出工具
 * 将活动和轨迹点导出为标准地理数据格式
 */

import type { ActivityResponseDTO, TrackPointUploadDTO } from '../types';

/** Escape special XML characters to prevent malformed output */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateGPX(
  activity: ActivityResponseDTO,
  points: TrackPointUploadDTO[],
): string {
  const trackPoints = points
    .map(p => {
      let trkpt = `      <trkpt lat="${p.latitude}" lon="${p.longitude}">`;
      if (p.altitude != null) {
        trkpt += `\n        <ele>${p.altitude.toFixed(1)}</ele>`;
      }
      trkpt += `\n        <time>${escapeXml(p.timestamp)}</time>`;
      trkpt += '\n      </trkpt>';
      return trkpt;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrekTrace"
  xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(activity.type)} - ${escapeXml(activity.startTime ?? '')}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

export function generateKML(
  activity: ActivityResponseDTO,
  points: TrackPointUploadDTO[],
): string {
  const coords = points
    .map(p => `${p.longitude},${p.latitude}${p.altitude != null ? ',' + p.altitude.toFixed(1) : ''}`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(activity.type)} - ${escapeXml(activity.startTime ?? '')}</name>
    <Placemark>
      <name>${escapeXml(activity.type)}</name>
      <LineString>
        <coordinates>
${coords}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}
