import HeroForm from './forms/HeroForm.jsx';
import AboutForm from './forms/AboutForm.jsx';
import ProjectsForm from './forms/ProjectsForm.jsx';
import SkillsForm from './forms/SkillsForm.jsx';
import ExperienceForm from './forms/ExperienceForm.jsx';
import ContactForm from './forms/ContactForm.jsx';

export default function ContentForm({ section, onChange }) {
  switch (section.type) {
    case 'hero': return <HeroForm content={section.content} variant={section.variant} onChange={onChange} />;
    case 'about': return <AboutForm content={section.content} onChange={onChange} />;
    case 'projects': return <ProjectsForm content={section.content} onChange={onChange} />;
    case 'skills': return <SkillsForm content={section.content} onChange={onChange} />;
    case 'experience': return <ExperienceForm content={section.content} onChange={onChange} />;
    case 'contact': return <ContactForm content={section.content} onChange={onChange} />;
    default: return null;
  }
}
