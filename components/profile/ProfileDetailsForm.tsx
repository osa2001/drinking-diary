import { saveProfile } from "@/lib/actions/profile";

type ProfileDetails = {
  display_name: string | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  tolerance_level: string | null;
} | null;

type ProfileDetailsFormProps = {
  profile: ProfileDetails;
  redirectTo?: string;
};

export function ProfileDetailsForm({ profile, redirectTo }: ProfileDetailsFormProps) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-sm shadow-black/20">
      <h2 className="text-sm font-medium text-slate-200">Profile Details</h2>
      <p className="mt-1 text-xs text-slate-400">
        Used for future BAC and intoxication estimations.
      </p>

      <form action={saveProfile} className="mt-4 space-y-3">
        {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
        <div>
          <label
            htmlFor="displayName"
            className="mb-1 block text-sm font-medium text-slate-300"
          >
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            defaultValue={profile?.display_name ?? ""}
            placeholder="e.g. Alex"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label htmlFor="gender" className="mb-1 block text-sm font-medium text-slate-300">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={profile?.gender ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="weightKg"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Weight (kg)
            </label>
            <input
              id="weightKg"
              name="weightKg"
              type="number"
              min={20}
              max={400}
              step={0.1}
              defaultValue={profile?.weight_kg ?? ""}
              placeholder="e.g. 70"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label
              htmlFor="heightCm"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Height (cm)
            </label>
            <input
              id="heightCm"
              name="heightCm"
              type="number"
              min={80}
              max={250}
              step={0.1}
              defaultValue={profile?.height_cm ?? ""}
              placeholder="e.g. 175"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="toleranceLevel"
            className="mb-1 block text-sm font-medium text-slate-300"
          >
            Tolerance level
          </label>
          <select
            id="toleranceLevel"
            name="toleranceLevel"
            defaultValue={profile?.tolerance_level ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Save profile
        </button>
      </form>
    </section>
  );
}
