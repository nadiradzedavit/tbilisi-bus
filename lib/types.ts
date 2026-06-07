import type { BusStop } from "ttc-api/types";

export type {
  Locale,
  BusStop,
  BusArrival,
  Bus,
  BusLocation,
  BusPlan,
  VehicleMode,
} from "ttc-api/types";

export interface Vehicle {
  vehicleKey: string;
  busId: string;
  shortName: string;
  color: string;
  lat: number;
  lon: number;
  heading: number | null;
  nextStopId: string | null;
  updatedAt: number;
  direction: "forward" | "backward";
}

export interface Route {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  mode?: string;
}

export type DirectionFilter = "both" | "forward" | "backward";
export type { StyleMode } from "./map/style";

export interface RoutePolylines {
  forward: Array<[number, number]>;
  backward: Array<[number, number]>;
}

export interface RouteStop extends BusStop {
  direction: "forward" | "backward";
}

export interface JourneyLeg {
  mode: string;
  routeShortName: string;
  routeColor: string;
  fromStopName: string;
  toStopName: string;
  durationMinutes: number;
  headsign?: string;
}

export interface JourneyPlan {
  durationMinutes: number;
  walkMinutes: number;
  transfers: number;
  legs: JourneyLeg[];
}

export const FEATURED_STOP_ID = "20034";
