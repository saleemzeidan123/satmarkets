export type AssetType = "office" | "retail" | "warehouse" | "land";
export type DealType = "lease" | "sale";

export interface Listing {
  id: string;
  reference_code: string;
  asset_type: AssetType;
  deal_type: DealType;
  title_en: string | null;
  title_ar: string | null;
  district_id: string | null;
  area_sqm: number;
  building_grade: string;
  fitout_condition: string;
  asking_rent_sqm: number | null;
  sale_price: number | null;
  status: string;
  is_sat_listed: boolean;
}

export interface RentIndexCell {
  district_id: string;
  asset_type: AssetType;
  deal_type: DealType;
  deal_count: number;
  median_achieved_sqm: number;
  confidence: "low" | "medium" | "high";
}
