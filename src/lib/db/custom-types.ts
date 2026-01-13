import { customType } from "drizzle-orm/pg-core";

// PostGIS Geography type for lat/lng coordinates
// Uses SRID 4326 (WGS84) - standard GPS coordinate system
export const geography = customType<{
  data: { latitude: number; longitude: number };
  driverData: string;
}>({
  dataType() {
    // Return without quotes - drizzle should pass this through directly
    return `geography(Point,4326)`;
  },
  toDriver(value) {
    // PostGIS uses longitude, latitude order (x, y)
    return `POINT(${value.longitude} ${value.latitude})`;
  },
  fromDriver(value) {
    // Parse WKT format: POINT(lng lat)
    if (typeof value === "string") {
      const match = value.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (match) {
        return {
          longitude: parseFloat(match[1]),
          latitude: parseFloat(match[2]),
        };
      }
    }
    return { latitude: 0, longitude: 0 };
  },
});

// Helper type for location data
export type GeoPoint = {
  latitude: number;
  longitude: number;
};
