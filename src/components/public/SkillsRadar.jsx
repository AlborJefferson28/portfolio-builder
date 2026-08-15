import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

export default function SkillsRadar({ content }) {
  return (
    <section className="pf-section pf-skills">
      <p className="pf-eyebrow">// habilidades</p>
      <h2 className="pf-skills-heading">Habilidades</h2>
      <div className="pf-chart-wrap" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={content.items} outerRadius="70%">
            <PolarGrid stroke="#B5AC98" />
            <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#8A8272', fontFamily: 'var(--font-body)' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="level" stroke="#D97757" fill="#D97757" fillOpacity={0.28} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
