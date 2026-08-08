export type AssetType =
  | "office" | "retail" | "medical" | "showroom"
  | "warehouse" | "serviced" | "education" | "land";
export type DealType = "lease" | "sale";

export interface DistrictRef { name_en: string | null; name_ar: string | null; city: string | null; }

export interface Listing {
  id: string;
  reference_code: string;
  account_id: string;
  asset_type: AssetType;
  deal_type: DealType;
  title_en: string | null;
  title_ar: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  district_id: string | null;
  area_sqm: number;
  building_grade: string;
  fitout_condition: string;
  asking_rent_sqm: number | null;
  sale_price: number | null;
  status: string;
  is_sat_listed: boolean;
  // Verification state. A badge may only be drawn from these, never from is_sat_listed.
  ownership_verified?: boolean | null;
  authorization_verified?: boolean | null;
  right_to_market_confirmed?: boolean | null;
  ad_permit_no?: string | null;
  ad_permit_number?: string | null;
  ad_permit_expires_at?: string | null;
  created_at?: string;
  availability_confirmed_at?: string | null;
  districts?: DistrictRef | null;
}

export interface RentIndexCell {
  district_id: string;
  asset_type: AssetType;
  deal_type: DealType;
  deal_count: number;
  median_achieved_sqm: number;
  confidence: "low" | "medium" | "high";
}
