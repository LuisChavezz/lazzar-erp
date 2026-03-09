import Link from "next/link";

type Opportunity = {
  initials: string;
  company: string;
  project: string;
  stage: string;
  stageClassName: string;
  amount: string;
  probability: number;
  probabilityClassName: string;
  avatarClassName: string;
};

const OPPORTUNITIES: Opportunity[] = [
  {
    initials: "TS",
    company: "Tech Solutions Inc.",
    project: "SaaS Implementation",
    stage: "Negociación",
    stageClassName:
      "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20",
    amount: "$12,500",
    probability: 75,
    probabilityClassName: "bg-amber-500",
    avatarClassName:
      "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  },
  {
    initials: "GL",
    company: "Grupo Logístico A.",
    project: "Fleet Upgrade",
    stage: "Propuesta",
    stageClassName:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20",
    amount: "$8,200",
    probability: 45,
    probabilityClassName: "bg-blue-500",
    avatarClassName:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  {
    initials: "RE",
    company: "Retail Express",
    project: "Consulting Services",
    stage: "Contacto Inicial",
    stageClassName:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
    amount: "$4,500",
    probability: 20,
    probabilityClassName: "bg-slate-400",
    avatarClassName:
      "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  },
];

export const RecentOpportunities = () => {
  return (
    <section className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/2">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Oportunidades Recientes</h3>
        </div>
        <Link
          href="/sales/orders"
          className="text-xs text-sky-600 hover:text-sky-500 font-bold uppercase tracking-wider transition-colors flex items-center gap-1 group"
          aria-label="Ver todas las oportunidades"
        >
          Ver todas
          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-170">
          <thead className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50/50 dark:bg-white/2 border-b border-slate-100 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-semibold">Cliente / Empresa</th>
              <th className="px-6 py-3 font-semibold">Etapa del Pipeline</th>
              <th className="px-6 py-3 font-semibold text-right">Valor Estimado</th>
              <th className="px-6 py-3 font-semibold text-center">Probabilidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {OPPORTUNITIES.map((opportunity) => (
              <tr key={opportunity.company} className="group hover:bg-slate-50 dark:hover:bg-white/2 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-black shadow-sm ${opportunity.avatarClassName}`}
                    >
                      {opportunity.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white group-hover:text-sky-500 transition-colors text-sm">
                        {opportunity.company}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{opportunity.project}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium shadow-sm ${opportunity.stageClassName}`}>
                    {opportunity.stage === "Negociación" ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5 animate-pulse" />
                    ) : null}
                    {opportunity.stage}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="font-mono font-medium text-slate-700 dark:text-slate-300">{opportunity.amount}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-20">
                      <div className={`h-full rounded-full ${opportunity.probabilityClassName}`} style={{ width: `${opportunity.probability}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-8">
                      {opportunity.probability}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
