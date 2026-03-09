const API_KEY = process.env.COCKTAILDB_API_KEY ?? "1";
const API_BASE = `https://www.thecocktaildb.com/api/json/v1/${API_KEY}`;

export type CocktailDBDrink = {
  idDrink: string;
  strDrink: string;
  strCategory: string | null;
  strAlcoholic: string | null;
  strGlass: string | null;
};

export type CocktailDBResponse = {
  drinks: CocktailDBDrink[] | null;
};

export async function searchCocktails(query: string): Promise<CocktailDBDrink[]> {
  try {
    const res = await fetch(
      `${API_BASE}/search.php?s=${encodeURIComponent(query)}`,
      { next: { revalidate: 3600 } }
    );
    const data: CocktailDBResponse = await res.json();
    return data.drinks ?? [];
  } catch {
    return [];
  }
}
