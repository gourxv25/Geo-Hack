import { useIntelligence } from "@/context/IntelligenceContext";

const NewsFilters = () => {
  const {
    newsCategory,
    setNewsCategory,
    newsRegion,
    setNewsRegion,
    newsStartDate,
    setNewsStartDate,
    newsEndDate,
    setNewsEndDate,
  } = useIntelligence();

  return (
    <div className="grid grid-cols-1 gap-2 border-b border-border/60 pb-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary">From</span>
        <input
          type="date"
          value={newsStartDate}
          onChange={(e) => setNewsStartDate(e.target.value)}
          className="rounded border border-border bg-accent/60 px-2 py-1 text-xs text-white"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary">To</span>
        <input
          type="date"
          value={newsEndDate}
          onChange={(e) => setNewsEndDate(e.target.value)}
          className="rounded border border-border bg-accent/60 px-2 py-1 text-xs text-white"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary">Type</span>
        <select
          value={newsCategory}
          onChange={(e) => setNewsCategory(e.target.value)}
          className="rounded border border-border bg-accent/60 px-2 py-1 text-xs text-white"
        >
          <option value="">All</option>
          <option value="geopolitical">Geopolitical</option>
          <option value="economic">Economic</option>
          <option value="defense">Defense</option>
          <option value="technology">Technology</option>
          <option value="climate">Climate</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary">Region</span>
        <input
          type="text"
          value={newsRegion}
          onChange={(e) => setNewsRegion(e.target.value)}
          placeholder="All"
          className="rounded border border-border bg-accent/60 px-2 py-1 text-xs text-white placeholder:text-text-secondary"
        />
      </label>
    </div>
  );
};

export default NewsFilters;
