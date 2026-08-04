import hanoiAdmin from './hanoi-admin.json';
import hanoiStreets from './hanoi-streets.json';
import { normalizeVietnamese } from '../utils/geocode';

export interface HanoiDistrict {
  code: string;
  name: string;
  wards: string[];
}

export const HANOI_DISTRICTS: HanoiDistrict[] = hanoiAdmin as HanoiDistrict[];
export const HANOI_STREETS: string[] = hanoiStreets as string[];
export const HANOI_STREETS_NORM: string[] = HANOI_STREETS.map(normalizeVietnamese);
