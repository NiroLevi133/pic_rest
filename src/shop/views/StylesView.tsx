import { Eye, UserX } from 'lucide-react';
import { STYLES, STYLE_GROUPS } from '../styles';
import StyleCard from '../components/StyleCard';

export default function StylesView() {
  return (
    <div className="k-container pt-10">
      <div className="text-center">
        <h1 className="k-h text-4xl sm:text-5xl">בחרו סגנון ליצירה שלכם</h1>
        <div className="mt-4 flex justify-center gap-6 text-sm font-medium text-[var(--k-muted)]">
          <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> תצוגה מקדימה בחינם</span>
          <span className="flex items-center gap-1.5"><UserX className="w-4 h-4" /> בלי הרשמה</span>
        </div>
      </div>
      {STYLE_GROUPS.map((g) => (
        <section key={g.id} className="mt-12">
          <h2 className="k-h text-2xl sm:text-3xl">{g.title}</h2>
          <p className="text-[var(--k-muted)] mt-1">{g.description}</p>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-6">
            {STYLES.filter((s) => s.group === g.id).map((s) => <StyleCard key={s.id} style={s} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
