const API_BASE = "https://api.punkapi.com/v2";

export type PunkBeer = {
  id: number;
  name: string;
  tagline: string | null;
  abv: number;
  first_brewed: string | null;
};

export async function searchBeers(query: string): Promise<PunkBeer[]> {
  try {
    const res = await fetch(
      `${API_BASE}/beers?beer_name=${encodeURIComponent(query)}&per_page=10`,
      { next: { revalidate: 3600 } }
    );
    const data: PunkBeer[] = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
