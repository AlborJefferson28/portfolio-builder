import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
} from 'recharts';

export default function SkillsBar({ content }) {
  return (
    <section className="pf-section pf-skills">
      <p className="pf-eyebrow">// habilidades</p>
      <h2 className="pf-skills-heading">Habilidades</h2>
      <div className="pf-chart-wrap" style={{ height: Math.max(220, content.items.length * 46) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={content.items} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 13, fill: '#8A8272', fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="level" fill="#D97757" radius={[0, 6, 6, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
