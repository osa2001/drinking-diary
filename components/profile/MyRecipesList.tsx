import { deleteRecipe } from "@/lib/actions/recipes";
import { EditableRecipeItem } from "@/components/profile/EditableRecipeItem";

type Recipe = {
  id: string;
  name: string;
  abv: number | null;
  recipe_note: string | null;
};

type MyRecipesListProps = {
  recipes: Recipe[] | null;
};

export function MyRecipesList({ recipes }: MyRecipesListProps) {
  if (!recipes || recipes.length === 0) {
    return <p className="text-sm text-slate-400">No recipes yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {recipes.map((recipe) => (
        <EditableRecipeItem
          key={recipe.id}
          recipe={recipe}
          deleteForm={
            <form action={deleteRecipe}>
              <input type="hidden" name="recipeId" value={recipe.id} />
              <button
                type="submit"
                className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
              >
                Delete
              </button>
            </form>
          }
        />
      ))}
    </ul>
  );
}
